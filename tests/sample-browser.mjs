import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import '../scripts/build.mjs';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const sample = JSON.parse(await readFile(path.join(dist,'assets/bancos/amostra-anki.json'),'utf8'));
const id = sample.cards[0].id, archived = 'cfo-gst-10000000001';
const legacyKey = 'pmdf:flashcards:anki:v1';
const files = {'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const server = createServer(async (req,res) => {
  try {
    const pathname = new URL(req.url,'http://localhost').pathname;
    const file = path.resolve(dist, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(dist) || !(await stat(file)).isFile()) throw new Error('not found');
    res.writeHead(200, {'content-type':files[path.extname(file)] || 'application/octet-stream'});
    res.end(await readFile(file));
  } catch (_) { res.writeHead(404).end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  assert.equal((await fetch(origin+'/assets/bancos/anki.json')).status,404);
  assert.equal((await fetch(origin+'/tests/catalog-progress.test.cjs')).status,404);
  assert.equal((await fetch(origin+'/supabase/')).status,404);
  browser = await chromium.launch({headless:true,executablePath:process.env.PMDF_CHROMIUM_PATH || undefined,args:['--no-sandbox']});
  for (const width of [1440,390]) {
    const page = await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
    const old = {version:1,schedule:{[id]:{box:3,due:1980000000000,front:'texto privado'},[archived]:{box:2,due:1980000000000}}};
    await page.addInitScript(({key,old})=>localStorage.setItem(key,JSON.stringify(old)),{key:legacyKey,old});
    await page.goto(origin);
    await page.waitForFunction(()=>document.getElementById('catalog-total')?.textContent==='52');
    assert.equal(await page.locator('#catalog-disciplines').innerText(),'22');
    assert.equal(await page.getByRole('link',{name:/comprar|checkout/i}).count(),0);
    await page.locator('#anki-cfo-disciplina').selectOption(sample.cards[0].disciplina);
    assert.match(await page.locator('#catalog-selection').innerText(),/^\d+ cartões? nesta seleção/);
    await page.getByText('Levar meu progresso',{exact:true}).click();
    const pending = page.waitForEvent('download');
    await page.locator('#export-catalog-progress').click();
    const file = await pending;
    const raw = await readFile(await file.path(),'utf8');
    const backup = JSON.parse(raw);
    assert.equal(backup.format,'PMDF-CATALOG-PROGRESS-v1');
    assert(backup.entries.some(row=>row.id===id));
    assert(backup.entries.some(row=>row.id===archived),'Progresso fora da amostra não pode sumir');
    assert(!raw.includes('texto privado'));
    assert.deepEqual(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),legacyKey)),old,'Não sobrescreve a agenda anterior');
    await page.close();
  }
  console.log('QA AMOSTRA BROWSER PASS: desktop e celular, 52/22, sem checkout, sem acervo completo, sem perda do progresso legado');
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
