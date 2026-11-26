import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  allowedOrigin, bearerToken, constantTimeEqual, hasConfirmedAuthEmail, normalizeEmail,
  parseHotmartPurchase, readLimitedText, sha256,
} from '../supabase/functions/_shared/access-domain.mjs';

const now = Date.UTC(2026, 10, 25, 12);
function purchase(overrides = {}) {
  const base = {
    id: 'test-event-01', version: '2.0.0', creation_date: now,
    event: 'PURCHASE_APPROVED',
    data: {
      product: { id: 9071720 }, buyer: { email: ' Comprador@Example.COM ' },
      purchase: { transaction: 'HP90000000000001', status: 'APPROVED', approved_date: now - 1000 },
    },
  };
  return Object.assign(base, overrides);
}

test('Auth shape requires a finite confirmation timestamp and ignores editable metadata or last sign-in', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal(hasConfirmedAuthEmail({ id, email: 'a@example.com', user_metadata: { email_verified: true, paid: true } }), false);
  assert.equal(hasConfirmedAuthEmail({ id, email: 'a@example.com', last_sign_in_at: '2026-11-25T20:00:00Z' }), false);
  assert.equal(hasConfirmedAuthEmail({ id, email: 'a@example.com', email_confirmed_at: '2026-01-01', is_anonymous: true }), false);
  // A valid legacy timestamp is not independent proof; the SQL cutoff test must reject it.
  assert.equal(hasConfirmedAuthEmail({ id, email: 'a@example.com', email_confirmed_at: '2026-01-01', is_anonymous: false }), true);
  assert.equal(hasConfirmedAuthEmail({ id, email: 'a@example.com', email_confirmed_at: 'yes' }), false);
  assert.equal(hasConfirmedAuthEmail({ id, email: 'a@example.com', email_confirmed_at: new Date(now + 600000).toISOString() }, now), false);
  assert.equal(hasConfirmedAuthEmail({ id: 'not-user', email: 'a@example.com', email_confirmed_at: '2026-01-01' }), false);
  assert.equal(normalizeEmail('  A+b@Example.com '), 'a+b@example.com');
  assert.equal(normalizeEmail('a@example.com\nattacker'), '');
});

test('Bearer parsing and CORS do not accept injected or suffix origins', () => {
  assert.equal(bearerToken('Bearer header.payload.signature'), 'header.payload.signature');
  assert.equal(bearerToken('Bearer a\nX-other: b'), '');
  assert.equal(bearerToken('Basic secret'), '');
  assert.equal(allowedOrigin('https://metodopmdf.github.io'), true);
  assert.equal(allowedOrigin('https://metodopmdf.github.io.evil.example'), false);
  assert.equal(allowedOrigin('null'), false);
  assert.equal(allowedOrigin('https://novo.example', ['https://novo.example']), true);
});

test('secondary product ID is authoritative, including Order Bump', () => {
  const payload = purchase();
  payload.data.purchase.order_bump = { is_order_bump: true, parent_purchase_transaction: 'HPMAIN000001' };
  const result = parseHotmartPurchase(payload, '9071720', now);
  assert.equal(result.transaction_id, 'HP90000000000001');
  assert.equal(result.buyer_email, 'comprador@example.com');
  assert.equal(result.state, 'approved');
  payload.data.product.id = 9062601;
  assert.deepEqual(parseHotmartPurchase(payload, '9071720', now), { ignored: 'other_product' });
});

test('COMPLETE preserves the provider approval timestamp and requires a paid state', () => {
  const payload = purchase({ event: 'PURCHASE_COMPLETE' });
  payload.data.purchase.status = 'COMPLETE';
  assert.equal(parseHotmartPurchase(payload, '9071720', now).approved_at, new Date(now - 1000).toISOString());
  payload.data.purchase.status = 'WAITING_PAYMENT';
  assert.throws(() => parseHotmartPurchase(payload, '9071720', now), /inconsistent_purchase_status/);
  payload.data.purchase.status = 'APPROVED';
  delete payload.data.purchase.approved_date;
  assert.throws(() => parseHotmartPurchase(payload, '9071720', now), /invalid_approved_date/);
});

test('revocation may precede approval and may lack a buyer email', () => {
  const payload = purchase({ event: 'PURCHASE_REFUNDED' });
  payload.data.purchase.status = 'REFUNDED';
  delete payload.data.purchase.approved_date;
  delete payload.data.buyer;
  const result = parseHotmartPurchase(payload, '9071720', now);
  assert.equal(result.state, 'revoked');
  assert.equal(result.approved_at, null);
  assert.equal(result.buyer_email, '');
});

test('bad schema, unknown events, future dates and wrong timestamp units fail safely', () => {
  assert.throws(() => parseHotmartPurchase(purchase({ version: '1.0.0' }), '9071720', now), /unsupported_version/);
  assert.deepEqual(parseHotmartPurchase(purchase({ event: 'PURCHASE_BILLET_PRINTED' }), '9071720', now), { ignored: 'unsupported_event' });
  assert.throws(() => parseHotmartPurchase(purchase({ id: '../event' }), '9071720', now), /invalid_event_id/);
  assert.throws(() => parseHotmartPurchase(purchase({ creation_date: now + 600000 }), '9071720', now), /invalid_event_date/);
  const seconds = purchase(); seconds.data.purchase.approved_date = Math.floor(now / 1000);
  assert.throws(() => parseHotmartPurchase(seconds, '9071720', now), /invalid_approved_date/);
});

test('HOTTOK uses SHA-256 and a complete fixed-length digest comparison', async () => {
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(constantTimeEqual(await sha256('known-test-value'), await sha256('known-test-value')), true);
  assert.equal(constantTimeEqual(await sha256('known-test-value'), await sha256('other-test-value')), false);
  assert.equal(constantTimeEqual('ab', 'ab\u0000'), false);
});

test('streaming request limit counts bytes and cannot be bypassed by missing Content-Length', async () => {
  const request = new Request('https://example.test', { method: 'POST', body: 'á'.repeat(100) });
  await assert.rejects(readLimitedText(request, 150), error => error.status === 413);
  assert.equal(await readLimitedText(new Request('https://example.test', { method: 'POST', body: 'áabc' }), 5), 'áabc');
  const invalid = new Request('https://example.test', { method: 'POST', body: new Uint8Array([255, 255]) });
  await assert.rejects(readLimitedText(invalid, 5), /invalid_encoding/);
});
