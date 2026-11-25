// Prepares private SQL data batches; never prints the catalogue or credentials.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const args = process.argv.slice(2);
function argument(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error('Provide ' + name);
  return path.resolve(args[index + 1]);
}
const source = argument('--source');
const output = argument('--out');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const relative = path.relative(repo, output);
if (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) {
  throw new Error('Private import output must be outside the repository.');
}
const bytes = await readFile(source);
const payload = JSON.parse(bytes.toString('utf8'));
if (payload.format !== 'PMDF-ANKI-IMPORT-v1' || !Array.isArray(payload.cards) || payload.cards.length !== 2624) {
  throw new Error('Unexpected catalogue format or count.');
}
const ids = payload.cards.map(card => String(card.id));
if (ids.some(id => !id || id === 'undefined') || new Set(ids).size !== ids.length) throw new Error('Missing or duplicate card IDs.');
const sourceHash = createHash('sha256').update(bytes).digest('hex');
const expectedSource = '124e9f0f3b811a7b379fd0a4da2bc9fc8a55213bd1571bca61521a5803d191ae';
if (sourceHash !== expectedSource) throw new Error('The private source differs from the reviewed catalogue.');
const db = new PGlite();
let jsonbHash;
try {
  jsonbHash = (await db.query("select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') as hash", [JSON.stringify(payload)])).rows[0].hash;
} finally { await db.close(); }

function literal(value) {
  const json = JSON.stringify(value);
  const tag = '$pmdf_' + createHash('sha256').update(json).digest('hex').slice(0, 24) + '$';
  if (json.includes(tag)) throw new Error('Unexpected SQL delimiter in catalogue.');
  return tag + json + tag + '::jsonb';
}
await mkdir(output, { recursive: true, mode: 0o700 });
const metadata = { ...payload, cards: [] };
let index = 0;
async function save(label, sql) {
  const name = String(index++).padStart(3, '0') + '_' + label + '.sql';
  await writeFile(path.join(output, name), sql + '\n', { mode: 0o600 });
}
await save('initialize', `begin;
update pmdf_private.access_config set enabled=false where singleton;
insert into pmdf_private.access_catalog(singleton,payload,source_sha256)
values(true,${literal(metadata)},'${sourceHash}')
on conflict(singleton) do update set payload=excluded.payload,source_sha256=excluded.source_sha256,updated_at=now();
commit;`);
for (let start = 0; start < payload.cards.length; start += 150) {
  const batch = payload.cards.slice(start, start + 150);
  await save('cards', `update pmdf_private.access_catalog
set payload=jsonb_set(payload,'{cards}',(payload->'cards') || ${literal(batch)}),updated_at=now()
where singleton and source_sha256='${sourceHash}';`);
}
await save('verify', `do $$
declare v_count integer; v_hash text;
begin
select jsonb_array_length(payload->'cards'),encode(sha256(convert_to(payload::text,'UTF8')),'hex')
into v_count,v_hash from pmdf_private.access_catalog where singleton;
if v_count is distinct from 2624 or v_hash is distinct from '${jsonbHash}' then
raise exception 'Catalogue import incomplete or changed';
end if;
end; $$;
select jsonb_array_length(payload->'cards') as cards,source_sha256,
encode(sha256(convert_to(payload::text,'UTF8')),'hex') as jsonb_sha256
from pmdf_private.access_catalog where singleton;`);
console.log(JSON.stringify({ files: index, cards: payload.cards.length, source_sha256: sourceHash, jsonb_sha256: jsonbHash, output }, null, 2));
