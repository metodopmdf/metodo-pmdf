import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
export const syntheticCatalog = require('../fixtures/catalog.cjs');
export const MOCK_SUPABASE = 'https://wskuhkvgipqwykbnuspk.supabase.co';
export const USER_A = '11111111-2222-4333-8444-555555555555';
export const USER_B = '22222222-3333-4444-8555-666666666666';
export const keyFor = (suffix, id = USER_A) => 'pmdf:member:' + id + ':' + suffix;
export function userFor(id = USER_A, verified = true) {
  return {id, aud: 'authenticated', role: 'authenticated', email: id === USER_A ? 'aluno@example.test' : 'outro@example.test',
    email_confirmed_at: verified ? '2026-01-01T00:00:00.000Z' : null,
    app_metadata: {provider: 'email', providers: ['email']}, user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z', identities: [], is_anonymous: false};
}
export function sessionFor(user = userFor()) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify({sub: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', exp,
      session_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'})).toString('base64url'), 'synthetic-signature'].join('.');
  return {access_token: token, refresh_token: 'synthetic-refresh-' + user.id, token_type: 'bearer', expires_in: 3600, expires_at: exp, user};
}
export async function installAuthMock(context, options = {}) {
  const model = {user: userFor(options.userId), active: options.active !== false, reason: options.reason || 'active',
    catalog: options.catalog || syntheticCatalog, statusCalls: 0, catalogCalls: 0, recoveryCalls: 0, signupCalls: 0, passwordUpdates: 0,
    offline: false, delayCatalog: 0, emailReverificationRequired: options.legacyReverification === true,
    remainingMs: options.remainingMs || 86400000, calls: []};
  if (options.verified === false) model.user.email_confirmed_at = null;
  if (options.signedIn !== false) {
    const session = sessionFor(model.user);
    await context.addInitScript(value => {
      if (localStorage.getItem('qa:auth-initialized')) return;
      localStorage.setItem('qa:auth-initialized', '1');
      localStorage.setItem('pmdf:auth:v1', JSON.stringify(value));
    }, session);
  }
  await context.route(MOCK_SUPABASE + '/**', async route => {
    const request = route.request(), url = new URL(request.url());
    model.calls.push({path: url.pathname, method: request.method()});
    const headers = {'access-control-allow-origin': '*', 'content-type': 'application/json', 'cache-control': 'no-store'};
    const respond = (status, body) => route.fulfill({status, headers, body: JSON.stringify(body)});
    if (request.method() === 'OPTIONS') return respond(200, {});
    if (model.offline) return route.abort('failed');
    if (url.pathname === '/auth/v1/user' && request.method() === 'GET') return respond(200, model.user);
    if (url.pathname === '/auth/v1/user' && request.method() === 'PUT') { model.passwordUpdates++; return respond(200, model.user); }
    if (url.pathname === '/auth/v1/token') {
      const data = request.postDataJSON();
      if (url.searchParams.get('grant_type') === 'password') {
        if (data.password === 'incorrect-password') return respond(400, {code: 'invalid_credentials', msg: 'Invalid login credentials'});
        model.user = userFor(data.email === 'outro@example.test' ? USER_B : USER_A, options.verified !== false);
      }
      return respond(200, sessionFor(model.user));
    }
    if (url.pathname === '/auth/v1/logout') return respond(200, {});
    if (url.pathname === '/auth/v1/recover') { model.recoveryCalls++; return respond(200, {}); }
    if (url.pathname === '/auth/v1/signup') { model.signupCalls++; return respond(200, {...model.user, email_confirmed_at: null}); }
    if (url.pathname === '/functions/v1/pmdf-access') {
      const action = request.postDataJSON()?.action;
      if (!request.headers().authorization?.startsWith('Bearer ')) return respond(401, {error: 'authentication_required'});
      if (!model.user.email_confirmed_at) return respond(403, {error: 'email_not_verified'});
      if (model.emailReverificationRequired) return respond(403, {error: 'email_reverification_required',
        active: false, reason: 'email_reverification_required', expires_at: null, server_time: new Date().toISOString()});
      if (action === 'status') {
        model.statusCalls++;
        return respond(200, {active: model.active, reason: model.reason,
          server_time: new Date().toISOString(), expires_at: model.active ? new Date(Date.now() + model.remainingMs).toISOString() : null});
      }
      if (action === 'catalog') {
        model.catalogCalls++;
        if (model.delayCatalog) await new Promise(resolve => setTimeout(resolve, model.delayCatalog));
        if (!model.active) return respond(403, {error: 'access_denied', reason: model.reason});
        return respond(200, model.catalog);
      }
    }
    return respond(404, {error: 'unexpected_test_request'});
  });
  return model;
}
