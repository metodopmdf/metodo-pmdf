'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const assets = path.join(__dirname, '..', 'assets');
const source = fs.readFileSync(path.join(assets, 'pmdf-anki-catalog.js'), 'utf8');
const bytes = process.env.PMDF_PRIVATE_CATALOG ? fs.readFileSync(process.env.PMDF_PRIVATE_CATALOG) : null;
const data = bytes ? JSON.parse(bytes) : require('./fixtures/catalog.cjs');
const ioRoot = {};
new Function('window', fs.readFileSync(path.join(assets, 'pmdf-flashcard-io.js'), 'utf8'))(ioRoot);
const io = ioRoot.PMDFFlashcardIO;
const PAGE = 'https://metodopmdf.github.io/metodo-pmdf/';
function loadModule(extra = {}) {
  const root = {location: {href: PAGE}, document: {baseURI: PAGE}, ...extra};
  new Function('window', source)(root);
  return {api: root.PMDFAnkiCatalog, root};
}
const {api} = loadModule();
if (bytes) assert.equal(createHash('sha256').update(bytes).digest('hex'),
  '124e9f0f3b811a7b379fd0a4da2bc9fc8a55213bd1571bca61521a5803d191ae');
assert.equal(api.validate(data), data);
assert.equal(data.cards.length, 2624);
assert.equal(new Set(data.cards.map(card => card.id)).size, 2624);
assert.equal(api.disciplines(data).length, 22);
assert.equal(new Set(data.cards.map(card => card.disciplina + '|' + card.assunto)).size, 130);
assert.deepEqual(api.filtered(data), data.cards);
assert.deepEqual(api.filtered(data, {discipline: 'Não existe'}), []);
assert.deepEqual(api.topics(data, 'Não existe'), []);
const covered = new Set();
for (const discipline of api.disciplines(data)) {
  for (const topic of api.topics(data, discipline)) {
    const selected = api.filtered(data, {discipline, topic});
    assert(selected.length > 0);
    for (const card of selected) {
      assert.equal(card.disciplina, discipline);
      assert.equal(card.assunto, topic);
      assert(!covered.has(card.id));
      covered.add(card.id);
    }
  }
}
assert.equal(covered.size, 2624);

const original = JSON.stringify(data);
const mapped = api.toCards(data.cards), validated = io.validateCards(mapped);
assert.equal(mapped.length, 2624);
assert.equal(validated.length, 2624);
assert.deepEqual(api.toCards([]), []);
for (let index = 0; index < data.cards.length; index++) {
  const row = data.cards[index], card = mapped[index];
  for (const field of ['id', 'front', 'back']) {
    assert.equal(card[field], row[field], 'A adaptação não pode alterar ' + field);
    assert.equal(validated[index][field], row[field], 'A validação IO não pode alterar ' + field);
  }
  assert.equal(card.law, row.disciplina);
  assert.equal(card.article, row.assunto);
  assert.equal(card.reference, row.assunto);
  assert.equal(card.answer, row.answer);
  assert.deepEqual(card.editorialFlags, row.flags);
  assert.notEqual(card.editorialFlags, row.flags, 'O adaptador deve copiar os metadados mutáveis');
  assert.equal(card.reviewed_source, row.reviewed_source);
  assert.equal(card.origin, row.origin);
  assert.equal(validated[index].answer, row.answer);
  assert.deepEqual(validated[index].editorialFlags, row.flags);
  assert.equal(validated[index].reviewed_source, row.reviewed_source);
  assert.equal(validated[index].origin, row.origin);
  if (row.reviewed_source) {
    assert(card.warning.includes(row.reviewed_source));
    assert(card.extra.includes(row.reviewed_source));
  }
  if (row.flags.includes('verificar_vigencia_juridica')) assert.match(card.warning, /confira a norma/);
  if (row.flags.includes('imagem_do_original_nao_embutida')) assert.match(card.warning, /Imagem referenciada/);
  if (row.flags.includes('texto_incompleto_na_fonte')) assert.match(card.warning, /Trecho incompleto/);
  if (row.flags.includes('verso_extenso')) assert.match(card.warning, /comentário original.*extenso/);
}
assert.equal(JSON.stringify(data), original, 'Filtrar/adaptar não pode modificar a base');
// O adaptador conserva o texto literal; o renderizador escapa e o Anki recebe
// #html:false, impedindo que trechos de material se tornem marcação executável.
const hostile = {...data.cards[0], id: 'cfo-gst-123456789',
  front: '<img src=x onerror="alert(1)">', back: '<script>alert(2)</script>',
  flags: ['__proto__'], reviewed_source: ''};
const escapedCard = io.validateCards(api.toCards([hostile]))[0];
assert.equal(escapedCard.front, hostile.front);
assert.equal(escapedCard.back, hostile.back);
assert.equal(io.escapeHtml(escapedCard.front), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
assert.match(io.serialize([escapedCard], 'basic').content, /#html:false/);
assert.match(escapedCard.warning, /Observação do acervo: __proto__/);

for (const wrong of [null, {}, {format: 'outro', cards: data.cards}, {format: data.format, cards: []},
  {format: data.format, cards: [data.cards[0], data.cards[0]]},
  {format: data.format, cards: [{...data.cards[0], id: 'novo-id'}]},
  {format: data.format, cards: [{...data.cards[0], disciplina: {label: 'inválida'}}]},
  {format: data.format, cards: [{...data.cards[0], flags: 'inválido'}]},
  {format: data.format, cards: [{...data.cards[0], answer: 'TALVEZ'}]}]) {
  assert.throws(() => api.validate(wrong), /inválid/);
}

(async () => {
  let count = 0, active = true;
  const access = {isActive: () => active, fetchCatalog: async () => {count++; return data;}};
  const cached = loadModule({PMDFAccess: access}).api;
  const first = cached.load(), simultaneous = cached.load();
  assert.equal(first, simultaneous);
  assert.equal(await first, data);
  assert.equal(await cached.load(), data);
  assert.equal(count, 1);
  active = false;
  await assert.rejects(cached.load(), /compra ativa/);
  active = true;
  cached.clear();
  assert.equal(await cached.load(), data);
  assert.equal(count, 2);
  for (const failure of ['network', 'schema']) {
    let attempts = 0;
    const retry = loadModule({PMDFAccess: {isActive: () => true, fetchCatalog: async () => {
      if (++attempts === 1) {
        if (failure === 'network') throw Error('Network failure');
        return {format: data.format, cards: [data.cards[0], data.cards[0]]};
      }
      return data;
    }}}).api;
    await assert.rejects(retry.load());
    assert.equal(await retry.load(), data);
    assert.equal(attempts, 2);
  }
  let resolve;
  const delayed = loadModule({PMDFAccess: {isActive: () => true,
    fetchCatalog: () => new Promise(done => {resolve = done;})}}).api;
  const late = delayed.load();
  await Promise.resolve();
  delayed.clear();
  resolve(data);
  await assert.rejects(late, /acesso mudou/);
  await assert.rejects(loadModule().api.load(), /compra ativa/);
  assert(!fs.existsSync(path.join(assets, 'bancos', 'anki.json')), 'O catálogo comercial não pode estar no site público');
  console.log('QA ANKI CATALOG PASS: acesso obrigatório, cache revogável, resposta tardia recusada, filtros e fidelidade dos cartões');
})().catch(error => { console.error(error); process.exitCode = 1; });
