import {installAuthMock, MOCK_SUPABASE, syntheticCatalog, keyFor} from './helpers/auth-mock.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'test-artifacts');
const original = syntheticCatalog;
const KEY = keyFor('flashcards:standalone:v1');
const CATALOG_KEY = keyFor('flashcards:anki:v1');
await mkdir(artifacts, {recursive: true});
let playwright;
try { playwright = await import('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/index.mjs')));
}

let server;
const target = process.env.PMDF_TEST_URL || 'http://127.0.0.1:8766/';
if (!process.env.PMDF_TEST_URL) {
  const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8'};
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, target).pathname);
      const filename = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
      if (!filename.startsWith(root) || !(await stat(filename)).isFile()) throw Error('Not found');
      res.writeHead(200, {'Content-Type': types[path.extname(filename)] || 'application/octet-stream'});
      res.end(await readFile(filename));
    } catch {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(8766, '127.0.0.1', resolve); });
}

const executablePath = process.env.PMDF_CHROMIUM_PATH || undefined;
const normalize = value => String(value).replace(/\s+/g, ' ').trim();
const sorted = values => [...new Set(values)].sort();
async function ready(page) {
  await page.waitForFunction(() => document.getElementById('anki-cfo-disciplina')?.options.length > 1 &&
    !document.getElementById('anki-cfo-disciplina').disabled);
}
async function size(page) { return Number((await page.locator('#deck-count').innerText()).replace(/\D/g, '')); }
async function state(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), CATALOG_KEY); }
async function options(page, selector) {
  return page.locator(selector + ' option').evaluateAll(items => items.map(item => item.value).filter(Boolean));
}
async function exportJson(page) {
  await page.selectOption('#export-format', 'json');
  const pending = page.waitForEvent('download');
  await page.click('#export-cards');
  const result = await pending;
  assert.equal(await result.failure(), null);
  return JSON.parse(await readFile(await result.path(), 'utf8'));
}
async function start(page, mode = 'all', batch = '25') {
  await page.selectOption('#anki-mode', mode);
  await page.selectOption('#anki-batch-size', batch);
  await page.click('#start-review');
  await page.locator('#reveal-answer').waitFor({state: 'visible'});
}
async function assertFront(page, card) {
  const statement = card.front.split(/JULGUE\s+CERTO\s+OU\s+ERRADO\s*\n/i).at(-1);
  assert(normalize(await page.locator('#anki-panel').innerText()).includes(normalize(statement)),
    'A assertiva original deve ser apresentada sem geração ou reescrita: ' + card.id);
}
async function assertBack(page, card) {
  const comment = card.back.replace(/^(?:✅\s*CERTO|❌\s*ERRADO|CERTO|ERRADO)\s*(?:[—–:\-]\s*)?/u, '');
  assert(normalize(await page.locator('#anki-panel').innerText()).includes(normalize(comment)),
    'O comentário original deve ser apresentado integralmente: ' + card.id);
}

let browser;
try {
  browser = await playwright.chromium.launch({headless: true, executablePath, args: ['--no-sandbox']});
  const report = [];
  for (const device of [{name: 'desktop', width: 1440, height: 1000}, {name: 'mobile', width: 390, height: 844}]) {
    const context = await browser.newContext({viewport: {width: device.width, height: device.height}, acceptDownloads: true});
    await installAuthMock(context);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (/^https?:$/.test(url.protocol) && url.origin !== new URL(target).origin && url.origin !== MOCK_SUPABASE) external.push(request.url());
    });
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(event.violatedDirective));
    });
    await page.goto(target, {waitUntil: 'networkidle'});
    await ready(page);
    assert.equal(await size(page), 2624, 'Um navegador novo deve receber a base completa sem colar texto');
    assert.equal(await page.locator('#source-text').inputValue(), '');
    assert.equal(await page.locator('#custom-source').evaluate(element => element.open), false);
    assert.equal(await page.locator('#start-review').isEnabled(), true);
    assert.deepEqual(sorted(await options(page, '#anki-cfo-disciplina')), sorted(original.cards.map(card => card.disciplina)));
    assert((await options(page, '#anki-batch-size')).includes('200'), 'O lote original de 200 deve estar disponível');

    const discipline = original.cards[0].disciplina;
    const rows = original.cards.filter(card => card.disciplina === discipline);
    await page.selectOption('#anki-cfo-disciplina', discipline);
    assert.equal(await size(page), rows.length);
    assert.deepEqual(sorted(await options(page, '#anki-cfo-assunto')), sorted(rows.map(card => card.assunto)));
    const topic = rows[0].assunto;
    await page.selectOption('#anki-cfo-assunto', topic);
    assert.equal(await size(page), rows.filter(card => card.assunto === topic).length);
    await page.selectOption('#anki-cfo-assunto', '');
    await start(page);
    const initial = await state(page);
    assert.deepEqual(initial.session.ids, rows.slice(0, 25).map(card => card.id));
    assert.equal(Object.hasOwn(initial, 'cards'), false, 'O estado local não deve duplicar o banco completo');
    await assertFront(page, rows[0]);
    const exported = await exportJson(page);
    assert.equal(exported.cards.length, rows.length, 'Exportar deve incluir todos os cartões filtrados, além do lote atual');
    assert.deepEqual(exported.cards.map(card => [card.id, card.front, card.back]), rows.map(card => [card.id, card.front, card.back]));
    await page.click('#reveal-answer');
    await assertBack(page, rows[0]);
    await page.click('[data-rating="good"]');
    const graded = await state(page);
    assert(graded.schedule[rows[0].id].due > Date.now());
    assert.equal(graded.session.index, 1);
    await page.reload({waitUntil: 'networkidle'});
    await ready(page);
    assert.equal(await page.locator('#anki-cfo-disciplina').inputValue(), discipline);
    assert.equal(await size(page), rows.length);
    assert.equal((await state(page)).session.index, 1);
    await assertFront(page, rows[1]);
    await start(page, 'due');
    assert(!(await state(page)).session.ids.includes(rows[0].id), 'Um cartão com agenda futura não pode voltar aos vencidos');

    // Cada seleção deve continuar seu próprio lote ao alternar disciplinas.
    const alternate = original.cards.find(card => card.disciplina !== discipline).disciplina;
    const alternateRows = original.cards.filter(card => card.disciplina === alternate);
    await page.selectOption('#anki-cfo-disciplina', alternate);
    await start(page);
    assert.equal((await state(page)).session.ids[0], alternateRows[0].id);
    await page.selectOption('#anki-cfo-disciplina', discipline);
    await start(page);
    assert.equal((await state(page)).session.ids[0], rows[25].id, 'O cursor da disciplina anterior deve continuar no próximo lote');

    await page.click('#reset-anki-filters');
    assert.equal(await size(page), original.cards.length);
    assert.equal(await page.locator('#anki-mode').inputValue(), 'due');
    assert.equal(await page.locator('#anki-batch-size').inputValue(), '50');
    await start(page, 'all', '200');
    assert.equal((await state(page)).session.ids.length, 200);
    await page.screenshot({path: path.join(artifacts, 'catalog-' + device.name + '-front.png'), fullPage: true});
    await page.click('#reveal-answer');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      device.name + ': conteúdo do acervo ultrapassa a largura da tela');
    await page.screenshot({path: path.join(artifacts, 'catalog-' + device.name + '-answer.png'), fullPage: true});

    if (device.name === 'desktop') {
      const flagged = original.cards.find(card => card.flags.includes('imagem_do_original_nao_embutida'));
      assert(flagged, 'Deve existir um cartão com aviso de imagem ausente no acervo');
      const group = original.cards.filter(card => card.disciplina === flagged.disciplina && card.assunto === flagged.assunto);
      await page.selectOption('#anki-cfo-disciplina', flagged.disciplina);
      await page.selectOption('#anki-cfo-assunto', flagged.assunto);
      await start(page, 'all', 'all');
      for (let index = 0; index < group.findIndex(card => card.id === flagged.id); index++) await page.click('#anki-nav-next');
      await assertFront(page, flagged);
      await page.click('#reveal-answer');
      await page.locator('.anki-evidence-details > summary').click();
      assert.match(await page.locator('.anki-evidence-details').innerText(), /imagem referenciada/i,
        'O aviso de imagem ausente deve continuar visível no cartão original');
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], 'A base só deve usar o site e o serviço de acesso autorizado');
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
    report.push({device: device.name, readyWithoutInput: true, filters: true, originalContent: true,
      schedule: true, independentCursors: true, batch200: true, exportsAllFiltered: true});
    await context.close();
  }

  // A apresentação do acervo também deve escapar títulos, assertivas e versos.
  const escapedContext = await browser.newContext();
  const hostile = '<img src=x onerror="window.__unsafe=true">';
  const literal = {...original, cards: original.cards.map((card, index) => index ? card : {...card,
    front: hostile + '\nJULGUE CERTO OU ERRADO\n' + hostile + ' Texto literal.',
    back: 'CERTO — ' + hostile + ' Comentário literal.',
    flags: [...new Set([...card.flags, 'texto_incompleto_na_fonte'])]})};
  await installAuthMock(escapedContext, {catalog: literal});
  const escapedPage = await escapedContext.newPage();
  await escapedPage.goto(target, {waitUntil: 'networkidle'});
  await ready(escapedPage);
  await start(escapedPage);
  assert.equal(await escapedPage.locator('#anki-panel img').count(), 0);
  assert.match(await escapedPage.locator('#anki-panel').innerText(), /trecho incompleto/i);
  assert((await escapedPage.locator('#anki-panel').innerText()).includes(hostile));
  await escapedPage.click('#reveal-answer');
  assert.equal(await escapedPage.locator('#anki-panel img').count(), 0);
  assert((await escapedPage.locator('#anki-panel').innerText()).includes(hostile));
  assert.equal(await escapedPage.evaluate(() => Boolean(window.__unsafe)), false);
  await escapedContext.close();
  report.push({catalogContentEscaped: true});
  const progressContext = await browser.newContext();
  await installAuthMock(progressContext);
  const progressPage = await progressContext.newPage();
  const [first, second] = original.cards;
  const alternateKey = keyFor('flashcards:anki:v1', '22222222-3333-4444-8555-666666666666');
  await progressPage.addInitScript(({key, alternateKey,id}) => {
    if (localStorage.getItem('qa:progress-initialized')) return;
    localStorage.setItem('qa:progress-initialized','1');
    localStorage.setItem(key, JSON.stringify({version:1,schedule:{[id]:{box:4,due:1980000000000}}}));
    localStorage.setItem(alternateKey, JSON.stringify({version:1,schedule:{}}));
  }, {key:CATALOG_KEY,alternateKey,id:first.id});
  await progressPage.goto(target, {waitUntil:'networkidle'});
  await ready(progressPage);
  await progressPage.getByText('Trazer meu progresso Anki',{exact:true}).click();
  const input = progressPage.locator('#import-catalog-progress');
  const sendProgress = entries => input.setInputFiles({name:'progress.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({format:'PMDF-CATALOG-PROGRESS-v1',entries}))});
  await sendProgress([{id:first.id,box:1,due:100},{id:second.id,box:2,due:1980000000000},
    {id:'cfo-gst-9999999999999999',box:3,due:1980000000000}]);
  await progressPage.getByText('1 agendamento importado.',{exact:true}).waitFor();
  const rows = (await state(progressPage)).schedule;
  assert.deepEqual(rows,{[first.id]:{box:4,due:1980000000000},[second.id]:{box:2,due:1980000000000}});
  assert.deepEqual(await progressPage.evaluate(key=>JSON.parse(localStorage.getItem(key)).schedule,alternateKey),{});
  await sendProgress([{id:first.id,box:1,due:100,back:'texto proibido'}]);
  await progressPage.getByText(/registro de progresso inválido/).waitFor();
  assert.deepEqual((await state(progressPage)).schedule,rows);
  await progressPage.reload({waitUntil:'networkidle'}); await ready(progressPage);
  assert.deepEqual((await state(progressPage)).schedule,rows);
  await progressContext.close();
  report.push({progressOnly:true,unknownIgnored:true,accountLocal:true,existingPreserved:true});
  console.log('QA ANKI CATALOG BROWSER PASS', JSON.stringify(report));
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
