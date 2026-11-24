import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'test-artifacts');
await mkdir(artifacts, {recursive: true});
let playwright;
try { playwright = await import('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/index.mjs')));
}

let server;
const target = process.env.PMDF_TEST_URL || 'http://127.0.0.1:8765/';
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
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(8765, '127.0.0.1', resolve);
  });
}

const executablePath = process.env.PMDF_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
let browser;
const fixture = 'O protocolo é registro sequencial das solicitações recebidas pela instituição.\n\n' +
  'A organização é conjunto de pessoas que trabalham em objetivos comuns.\n\n' +
  'A autoridade administrativa deverá motivar a decisão em 15 dias, salvo impedimento devidamente justificado.';
async function waitForCards(page) {
  await page.waitForFunction(() => {
    const count = Number(document.getElementById('deck-count')?.textContent?.replace(/\D/g, ''));
    return count > 0 && !document.getElementById('generate-cards')?.disabled;
  });
}
async function deckSize(page) {
  return Number((await page.locator('#deck-count').innerText()).replace(/\D/g, ''));
}
async function download(page, format) {
  await page.selectOption('#export-format', format);
  const pending = page.waitForEvent('download');
  await page.click('#export-cards');
  const result = await pending;
  assert.equal(await result.failure(), null);
  const content = await readFile(await result.path(), 'utf8');
  assert(content.length > 20, 'Exportação vazia');
  return {content, name: result.suggestedFilename()};
}
async function reviewAll(page) {
  await page.selectOption('#anki-mode', 'all');
  await page.selectOption('#anki-batch-size', '25');
  await page.click('#start-review');
  await page.locator('#reveal-answer').waitFor({state: 'visible'});
}

try {
  browser = await playwright.chromium.launch({headless: true, executablePath, args: ['--no-sandbox']});
  const report = [];
  for (const device of [{name: 'desktop', width: 1440, height: 1000}, {name: 'mobile', width: 390, height: 844}]) {
    const context = await browser.newContext({viewport: {width: device.width, height: device.height}, acceptDownloads: true});
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (/^https?:$/.test(url.protocol) && url.origin !== new URL(target).origin) external.push(request.url());
    });
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(event.violatedDirective));
    });
    await page.goto(target, {waitUntil: 'networkidle'});
    await page.locator('#source-text').waitFor({state: 'visible'});
    await page.fill('#source-title', 'Regulamento fictício de teste');
    await page.fill('#source-text', fixture);
    await page.selectOption('#anki-card-style', 'questions');
    await page.click('#generate-cards');
    await waitForCards(page);
    const count = await deckSize(page);
    assert(count >= 2, 'As definições do texto devem gerar perguntas');
    await reviewAll(page);
    const firstQuestion = await page.locator('#anki-panel .anki-question').innerText();
    await page.screenshot({path: path.join(artifacts, device.name + '-front.png'), fullPage: true});
    await page.click('#reveal-answer');
    await page.locator("button[data-rating='good']").waitFor({state: 'visible'});
    assert((await page.locator('#anki-panel').innerText()).includes('Resposta') ||
      (await page.locator('#anki-panel').innerText()).includes('RESPOSTA'), 'Verso não exibido');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      device.name + ': conteúdo ultrapassa a largura da tela');
    await page.screenshot({path: path.join(artifacts, device.name + '-answer.png'), fullPage: true});
    const storageBefore = await page.evaluate(() => JSON.stringify(localStorage));
    await page.click("button[data-rating='good']");
    const storageAfter = await page.evaluate(() => JSON.stringify(localStorage));
    assert.notEqual(storageAfter, storageBefore, 'Avaliação precisa persistir o próximo agendamento');
    await page.click('#anki-nav-prev');
    assert(!(await page.locator("button[data-rating='good']").isVisible()), 'Voltar não deve permitir avaliar novamente o mesmo cartão');

    const json = await download(page, 'json');
    assert.match(json.name, /\.json$/);
    const backup = JSON.parse(json.content);
    assert.equal(backup.cards.length, count);
    const basic = await download(page, 'basic');
    assert.match(basic.content, /#notetype:Basic/);

    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await deckSize(page), count, 'O baralho deve sobreviver ao recarregamento');
    await page.selectOption('#anki-mode', 'due');
    await page.click('#start-review');
    await page.locator('#reveal-answer').waitFor({state: 'visible'});
    assert.notEqual(await page.locator('#anki-panel .anki-question').innerText(), firstQuestion,
      'Cartão avaliado como Bom não deve aparecer entre vencidos imediatamente');

    await page.fill('#source-text', fixture);
    await page.selectOption('#anki-card-style', 'cloze');
    await page.click('#generate-cards');
    await waitForCards(page);
    const cloze = await download(page, 'cloze');
    assert.match(cloze.content, /#notetype:Cloze/);
    assert.match(cloze.content, /\{\{c1::/);
    await reviewAll(page);
    assert.equal(await page.locator('#anki-panel .anki-blank-masked').count() > 0, true);
    await page.click('#reveal-answer');
    assert.equal(await page.locator('#anki-panel .anki-blank-revealed').count() > 0, true);

    // Importar texto e cancelar nova geração não pode apagar o baralho atual.
    await page.locator('#source-file').setInputFiles({name: 'texto-integral.txt', mimeType: 'text/plain', buffer: Buffer.from(fixture)});
    await page.waitForFunction(() => !document.getElementById('generate-cards').disabled &&
      document.getElementById('generation-status').textContent.includes('Material importado'));
    assert.equal(await page.locator('#source-text').inputValue(), fixture);
    const kept = await deckSize(page);
    const longText = Array.from({length: 1500}, (_, i) => 'Art. ' + (i + 1) + 'º O protocolo ' + i +
      ' é registro sequencial das solicitações recebidas pela instituição.').join('\n');
    await page.fill('#source-text', longText);
    await page.selectOption('#anki-card-style', 'questions');
    await page.click('#generate-cards');
    await page.locator('#stop-generation').waitFor({state: 'visible'});
    await page.click('#stop-generation');
    await page.waitForFunction(() => document.getElementById('generation-status').textContent.includes('cancelada'));
    assert.equal(await deckSize(page), kept, 'Cancelamento deve preservar o baralho anterior');

    // Textos de um backup nunca se tornam elementos executáveis no navegador.
    const hostile = '<img src=x onerror="window.__unsafe=true">';
    const hostileDeck = {format: 'PMDF-FLASHCARDS-v1', version: 1, title: 'Texto literal', cards: [{
      id: 'hostile-card', front: hostile + ' [lacuna]', back: hostile + ' seguro',
      cloze: 'Texto ' + hostile + ' {{c1::seguro}}.', source: hostile, reference: 'Trecho de teste', family: 'cloze'
    }]};
    await page.locator('#source-file').setInputFiles({name: 'literal.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostileDeck))});
    await page.waitForFunction(() => document.getElementById('deck-count')?.textContent?.replace(/\D/g, '') === '1');
    await reviewAll(page);
    assert.equal(await page.locator('#anki-panel img').count(), 0, 'HTML do cloze foi interpretado');
    await page.click('#reveal-answer');
    assert.equal(await page.locator('#anki-panel img').count(), 0, 'HTML do verso foi interpretado');
    assert.equal(await page.evaluate(() => Boolean(window.__unsafe)), false);
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], 'Violação da política de conteúdo');
    assert.deepEqual(errors, [], 'Erros JavaScript durante o fluxo');
    assert.deepEqual(external, [], 'O fluxo textual não deve depender de serviços externos');
    report.push({device: device.name, generated: count, persistence: true, exports: ['json', 'basic', 'cloze'], escaped: true});
    await context.close();
  }
  // A atualização deve recuperar somente a sessão local da conta identificada,
  // mantendo os cartões, a posição da revisão e os agendamentos anteriores.
  const legacyContext = await browser.newContext();
  const legacyPage = await legacyContext.newPage();
  const legacyErrors = [];
  legacyPage.on('pageerror', error => legacyErrors.push(error.message));
  await legacyPage.goto(target, {waitUntil: 'networkidle'});
  const legacyCards = [
    {id: 'legacy-first', front: 'Qual é a primeira etapa?', back: 'Preparar o material.', law: 'Material anterior'},
    {id: 'legacy-second', front: 'Qual é a segunda etapa?', back: 'Revisar os cartões.', law: 'Material anterior'}
  ];
  const futureReview = Date.now() + 7 * 86400000;
  const legacyPrefix = 'pmdf:account:11111111-1111-4111-8111-111111111111:';
  const oldSession = JSON.stringify({version: 4, tab: 'anki', anki: {
    cards: legacyCards, index: 1, back: true, ratings: {'0': 'good'}
  }});
  await legacyPage.evaluate(({cards, prefix, savedSession, due}) => {
    localStorage.setItem('pmdf:supabase:session:v1', JSON.stringify({user: {id: '11111111-1111-4111-8111-111111111111'}}));
    localStorage.setItem(prefix + 'pmdf:session:v4', savedSession);
    localStorage.setItem(prefix + 'fc:legacy-first', '2');
    localStorage.setItem(prefix + 'leitner:legacy-first', '3');
    localStorage.setItem(prefix + 'leitnerDue:legacy-first', String(due));
    localStorage.setItem('pmdf:account:22222222-2222-4222-8222-222222222222:pmdf:session:v4',
      JSON.stringify({version: 4, anki: {cards: [{...cards[0], id: 'other-account', front: 'Outro perfil'}]}}));
  }, {cards: legacyCards, prefix: legacyPrefix, savedSession: oldSession, due: futureReview});
  await legacyPage.reload({waitUntil: 'networkidle'});
  assert.equal(await deckSize(legacyPage), 2, 'Os cartões da sessão anterior devem ser recuperados');
  assert((await legacyPage.locator('#anki-panel').innerText()).includes('Revisar os cartões.'),
    'O verso e a posição da sessão antiga devem ser restaurados');
  const recovered = await legacyPage.evaluate(() => JSON.parse(localStorage.getItem('pmdf:flashcards:standalone:v1')));
  assert.deepEqual(recovered.cards.map(card => card.id), ['legacy-first', 'legacy-second']);
  assert.equal(recovered.schedule['legacy-first'].box, 3);
  assert.equal(recovered.schedule['legacy-first'].due, futureReview);
  assert.equal(recovered.session.index, 1);
  assert.equal(recovered.session.back, true);
  assert.equal(recovered.session.ratings['0'], 'good');
  assert.equal(await legacyPage.evaluate(key => localStorage.getItem(key), legacyPrefix + 'pmdf:session:v4'), oldSession,
    'A recuperação não deve alterar a sessão original');
  await legacyPage.selectOption('#anki-mode', 'due');
  await legacyPage.click('#start-review');
  assert.equal(await legacyPage.locator('#anki-panel .anki-question').innerText(), legacyCards[1].front,
    'O cartão agendado para o futuro não deve aparecer entre os vencidos');
  await legacyPage.reload({waitUntil: 'networkidle'});
  assert.equal(await deckSize(legacyPage), 2);
  assert.equal(await legacyPage.locator('#anki-panel .anki-question').innerText(), legacyCards[1].front,
    'A nova sessão salva deve ter prioridade sobre a sessão legada');
  assert.deepEqual(legacyErrors, []);
  await legacyContext.close();
  report.push({legacySession: true, schedule: true, accountIsolation: true});

  // Os leitores reais são exercitados com arquivos sintéticos: verifica também
  // carregamento da CDN, worker PDF e compatibilidade com a CSP da aplicação.
  const documentContext = await browser.newContext();
  const documentPage = await documentContext.newPage();
  documentPage.setDefaultTimeout(45000);
  const documentErrors = [];
  documentPage.on('pageerror', error => documentErrors.push(error.message));
  await documentPage.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(event.violatedDirective));
  });
  await documentPage.goto(target, {waitUntil: 'networkidle'});
  for (const extension of ['pdf', 'docx']) {
    await documentPage.locator('#source-file').setInputFiles(path.join(root, 'tests/fixtures/material.' + extension));
    await documentPage.waitForFunction(() => !document.getElementById('generate-cards').disabled &&
      /importado|não|erro|falh/i.test(document.getElementById('generation-status').textContent), null, {timeout: 45000});
    const text = await documentPage.locator('#source-text').inputValue();
    for (const sentence of ['A autoridade deverá responder em 15 dias.', 'O requerente poderá apresentar recurso em 5 dias.',
      'É vedado cobrar taxa adicional pelo procedimento.']) assert(text.includes(sentence), extension + ': texto incompleto ou leitor indisponível: ' +
        await documentPage.locator('#generation-status').innerText());
    await documentPage.selectOption('#anki-card-style', 'cloze');
    await documentPage.click('#generate-cards');
    await waitForCards(documentPage);
  }
  const previousSource = await documentPage.locator('#source-text').inputValue();
  const previousCount = await deckSize(documentPage);
  await documentPage.locator('#source-file').setInputFiles(path.join(root, 'tests/fixtures/empty.pdf'));
  await documentPage.waitForFunction(() => !document.getElementById('generate-cards').disabled &&
    document.getElementById('generation-status').dataset.error === 'true');
  assert.match(await documentPage.locator('#generation-status').innerText(), /sem texto extraível/);
  assert.equal(await documentPage.locator('#source-text').inputValue(), previousSource);
  assert.equal(await deckSize(documentPage), previousCount);
  assert.deepEqual(documentErrors, []);
  assert.deepEqual(await documentPage.evaluate(() => window.__cspViolations), []);
  await documentContext.close();
  report.push({documents: ['pdf', 'docx'], unreadablePdfPreservesMaterial: true});
  console.log('QA BROWSER PASS', JSON.stringify(report));
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
