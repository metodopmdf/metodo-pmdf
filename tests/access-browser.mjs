import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {installAuthMock, keyFor, USER_A, USER_B} from './helpers/auth-mock.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const artifacts = path.join(root, 'test-artifacts');
await mkdir(artifacts, {recursive: true});
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    if (relative !== 'index.html' && !relative.startsWith('assets/')) throw Error('Not found');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) throw Error('Not found');
    const content = await readFile(file);
    res.writeHead(200, {'content-type': ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css'})[path.extname(file)] || 'application/octet-stream'});
    res.end(content);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const target = 'http://127.0.0.1:' + server.address().port + '/';
const browser = await chromium.launch({headless:true, executablePath: process.env.PMDF_CHROMIUM_PATH || undefined, args:['--no-sandbox']});
const ready = async page => {
  try { await page.waitForFunction(() => document.getElementById('deck-count')?.textContent === '2624'); }
  catch (error) {
    console.error('Access readiness failure', await page.evaluate(() => ({
      access: document.getElementById('access-status')?.textContent,
      catalog: document.getElementById('status')?.textContent,
      count: document.getElementById('deck-count')?.textContent,
      active: window.PMDFAccess?.isActive()
    })));
    throw error;
  }
};
const assertLocked = async page => {
  assert.equal(await page.locator('#member-workspace').isVisible(), false);
  assert.equal(await page.locator('#access-gate').isVisible(), true);
  assert.equal(await page.locator('#anki-panel').textContent(), '');
};
async function login(page, email = 'aluno@example.test', password = 'senha-de-teste-segura') {
  await page.fill('#access-email', email);
  await page.fill('#access-password', password);
  await page.click('#access-submit');
}
const reports = [];
try {
  for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const context = await browser.newContext({viewport, acceptDownloads: true});
    const model = await installAuthMock(context, {signedIn:false});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(target);
    await page.locator('#access-status').filter({hasText:'Entre com o e-mail'}).waitFor();
    await assertLocked(page);
    assert.equal(model.catalogCalls, 0);
    assert.equal(await page.locator('#access-buy').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('#access-buy').getAttribute('href'), null);
    assert.equal((await page.request.get(target + 'assets/bancos/anki.json')).status(), 404);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path:path.join(artifacts, 'access-login-' + viewport.width + '.png'),fullPage:true});
    await login(page, 'aluno@example.test', 'incorrect-password');
    await page.locator('#access-status').filter({hasText:'Confira o e-mail e a senha'}).waitFor();
    assert.equal(model.catalogCalls, 0);
    await page.click('#access-show-recovery');
    await page.click('#access-submit');
    await page.locator('#access-status').filter({hasText:'Se houver uma conta'}).waitFor();
    assert.equal(model.recoveryCalls, 1);
    await page.click('#access-show-signup');
    await page.fill('#access-password', 'senha-de-teste-segura');
    await page.fill('#access-password-confirm', 'senha-de-teste-segura');
    await page.click('#access-submit');
    await page.locator('#access-status').filter({hasText:'e-mail de confirmação'}).waitFor();
    assert.equal(model.signupCalls, 1);
    await login(page);
    await ready(page);
    assert.equal(await page.locator('#member-workspace').isVisible(), true);
    assert(model.catalogCalls > 0);
    await page.selectOption('#anki-mode','all');
    await page.click('#start-review');
    await page.click('#reveal-answer');
    await page.click('[data-rating="good"]');
    const ownKey = keyFor('flashcards:anki:v1');
    const saved = await page.evaluate(key => localStorage.getItem(key), ownKey);
    assert(saved && Object.keys(JSON.parse(saved).schedule).length === 1);
    await page.screenshot({path:path.join(artifacts, 'access-member-' + viewport.width + '.png'),fullPage:true});
    await page.click('#access-signout');
    await page.locator('#access-auth-form').waitFor({state:'visible'});
    await assertLocked(page);
    assert.equal(await page.evaluate(() => PMDFAccess.isActive()),false);
    assert.equal(await page.evaluate(async () => {try {await PMDFAnkiCatalog.load(); return true;} catch (_) {return false;}}),false);
    await login(page,'outro@example.test');
    await ready(page);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), ownKey),saved,'Sair/trocar conta não apaga progresso do proprietário');
    const other = await page.evaluate(key => localStorage.getItem(key),keyFor('flashcards:anki:v1',USER_B));
    assert.equal(Object.keys(JSON.parse(other || '{"schedule":{}}').schedule).length,0,'A outra conta não herda avaliações');
    assert.equal(await page.locator('#access-identity').innerText(),'outro@example.test');
    assert.deepEqual(errors,[]);
    await context.close();
    reports.push({viewport:viewport.width,login:true,recovery:true,signup:true,logout:true,accountIsolation:true});
  }
  {
    const context = await browser.newContext();
    const model = await installAuthMock(context,{signedIn:false});
    const page = await context.newPage();
    await page.goto(target);
    await page.click('#access-show-recovery');
    await page.fill('#access-email','aluno@example.test');
    await page.click('#access-submit');
    await page.locator('#access-status').filter({hasText:'Se houver uma conta'}).waitFor();
    await page.goto(target + '?code=synthetic-recovery-code');
    await page.locator('#access-form-title').filter({hasText:'Crie sua nova senha'}).waitFor();
    assert.equal(model.catalogCalls,0,'Recuperação de senha não abre o acervo');
    await page.fill('#access-password','nova-senha-de-teste-segura');
    await page.fill('#access-password-confirm','nova-senha-de-teste-segura');
    await page.click('#access-submit');
    await page.locator('#access-status').filter({hasText:'Senha atualizada'}).waitFor();
    assert.equal(model.passwordUpdates,1);
    await assertLocked(page);
    await login(page,'aluno@example.test','nova-senha-de-teste-segura');
    await ready(page);
    await context.close();
    reports.push({passwordRecoveryCallback:true,passwordUpdate:true});
  }
  for (const reason of ['no_purchase','expired','revoked','not_ready']) {
    const context = await browser.newContext();
    const model = await installAuthMock(context,{active:false,reason});
    const page = await context.newPage();
    await page.goto(target);
    await page.locator('#access-check').waitFor({state:'visible'});
    await page.waitForFunction(() => document.getElementById('access-status').dataset.error === 'true');
    await assertLocked(page);
    assert.equal(model.catalogCalls,0);
    model.active = true; model.reason = 'active';
    await page.click('#access-check');
    await ready(page);
    await page.selectOption('#anki-mode','all');
    await page.click('#start-review');
    model.active = false; model.reason = 'revoked';
    await page.evaluate(() => PMDFAccess.check());
    await assertLocked(page);
    assert.equal(await page.locator('#deck-count').innerText(),'0');
    await context.close();
  }
  {
    const context = await browser.newContext();
    const model = await installAuthMock(context,{verified:false});
    const page = await context.newPage();
    await page.goto(target);
    await page.locator('#access-status').filter({hasText:'Confirme seu e-mail'}).waitFor();
    await assertLocked(page);
    assert.equal(model.catalogCalls,0);
    await context.close();
  }
  {
    const context = await browser.newContext();
    const model = await installAuthMock(context,{legacyReverification:true});
    const page = await context.newPage();
    await page.goto(target);
    await page.locator('#access-status').filter({hasText:'Sua conta foi criada antes da verificação obrigatória'}).waitFor();
    await assertLocked(page);
    assert.equal(model.catalogCalls,0,'Conta legada bloqueada não solicita catálogo');
    assert.equal(model.recoveryCalls,0,'O bloqueio não envia mensagens de recuperação');
    model.emailReverificationRequired = false;
    await page.click('#access-check');
    await ready(page);
    model.emailReverificationRequired = true;
    await page.evaluate(() => PMDFAccess.check());
    await assertLocked(page);
    assert.match(await page.locator('#access-status').textContent(),/Entre em contato com o suporte/);
    await context.close();
    reports.push({legacyEmailReverificationRequired:true});
  }
  {
    const context = await browser.newContext();
    await installAuthMock(context,{remainingMs:3000});
    const page = await context.newPage();
    await page.goto(target);
    await ready(page);
    await page.locator('#member-workspace').waitFor({state:'hidden',timeout:8000});
    await assertLocked(page);
    await context.close();
  }
  reports.push({noPurchase:true,expired:true,revoked:true,notReady:true,emailVerification:true,automaticExpiry:true,publicCatalogRemoved:true});
  console.log('QA ACCESS BROWSER PASS',JSON.stringify(reports));
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
