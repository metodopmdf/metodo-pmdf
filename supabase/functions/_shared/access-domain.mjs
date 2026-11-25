// Pure, shared validation. This module deliberately contains no credentials or catalogue.
export const PRODUCT_ID = '9071720';
export const ALLOWED_ORIGINS = Object.freeze(['https://metodopmdf.github.io']);
const APPROVAL_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const REVOCATION_EVENTS = new Set([
  'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED',
  'PURCHASE_EXPIRED', 'PURCHASE_PROTEST',
]);
const TERMINAL_STATUSES = new Set([
  'REFUNDED', 'CHARGEBACK', 'CANCELED', 'CANCELLED', 'EXPIRED', 'PROTESTED',
]);

export class InputError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function isVerifiedUser(user) {
  return Boolean(user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
    && !user.is_anonymous && user.email_confirmed_at && normalizeEmail(user.email));
}

export function bearerToken(header) {
  if (typeof header !== 'string' || header.length > 8192) return '';
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(header);
  return match?.[1] || '';
}

export function allowedOrigin(origin, origins = ALLOWED_ORIGINS) {
  return !origin || origins.includes(origin);
}

function requiredId(value, field) {
  const id = typeof value === 'string' ? value : '';
  if (!/^[A-Za-z0-9_-]{4,150}$/.test(id)) throw new InputError('invalid_' + field);
  return id;
}

function eventDate(value, field, now) {
  if (!Number.isSafeInteger(value) || value < Date.UTC(2020, 0, 1) || value > now + 300_000)
    throw new InputError('invalid_' + field);
  return new Date(value).toISOString();
}

export function parseHotmartPurchase(payload, expectedProduct = PRODUCT_ID, now = Date.now()) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new InputError('invalid_payload');
  if (payload.version !== '2.0.0') throw new InputError('unsupported_version');
  const productId = String(payload.data?.product?.id ?? '');
  if (productId !== String(expectedProduct)) return { ignored: 'other_product' };
  const event = payload.event;
  if (!APPROVAL_EVENTS.has(event) && !REVOCATION_EVENTS.has(event)) return { ignored: 'unsupported_event' };
  const purchase = payload.data?.purchase;
  if (!purchase || typeof purchase !== 'object') throw new InputError('invalid_purchase');
  const state = REVOCATION_EVENTS.has(event) || TERMINAL_STATUSES.has(purchase.status) ? 'revoked' : 'approved';
  if (state === 'approved' && !['APPROVED', 'COMPLETE'].includes(purchase.status))
    throw new InputError('inconsistent_purchase_status');
  const email = normalizeEmail(payload.data?.buyer?.email);
  if (state === 'approved' && !email) throw new InputError('invalid_buyer_email');
  const createdAt = eventDate(payload.creation_date, 'event_date', now);
  let approvedAt = null;
  if (state === 'approved' || purchase.approved_date != null) {
    approvedAt = eventDate(purchase.approved_date, 'approved_date', now);
    if (Date.parse(approvedAt) > payload.creation_date + 300_000) throw new InputError('inconsistent_approved_date');
  }
  return {
    event_id: requiredId(payload.id, 'event_id'),
    transaction_id: requiredId(purchase.transaction, 'transaction_id'),
    product_id: productId,
    buyer_email: email,
    event_type: event,
    state,
    event_created_at: createdAt,
    approved_at: approvedAt,
    // A parent order-bump transaction never authorizes this product.
  };
}

export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  let difference = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) difference |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  return difference === 0;
}

export async function readLimitedText(request, maxBytes) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new InputError('payload_too_large', 413);
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new InputError('payload_too_large', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(result); }
  catch { throw new InputError('invalid_encoding'); }
}
