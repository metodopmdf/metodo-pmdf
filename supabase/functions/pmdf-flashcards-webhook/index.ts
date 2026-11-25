import { constantTimeEqual, InputError, parseHotmartPurchase, readLimitedText, sha256 } from '../_shared/access-domain.mjs';
import { configured, json, rpc } from '../_shared/access-runtime.ts';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!configured(false)) return json(503, { error: 'not_ready' });
  const token = request.headers.get('x-hotmart-hottok') || '';
  if (!token || token.length > 4096) return json(401, { error: 'invalid_token' });
  try {
    const settings = await rpc('pmdf_access_webhook_settings', {});
    const environmentToken = Deno.env.get('HOTMART_HOTTOK') || '';
    const expectedDigest = environmentToken ? await sha256(environmentToken) : settings?.hottok_sha256;
    if (!settings?.hotmart_product_id || !/^[a-f0-9]{64}$/.test(expectedDigest || ''))
      return json(503, { error: 'not_ready' });
    if (!constantTimeEqual(await sha256(token), expectedDigest)) return json(401, { error: 'invalid_token' });
    const raw = await readLimitedText(request, 65_536);
    let payload;
    try { payload = JSON.parse(raw); } catch { throw new InputError('invalid_json'); }
    const event = parseHotmartPurchase(payload, settings.hotmart_product_id);
    if ('ignored' in event) return json(200, { result: event.ignored });
    const result = await rpc('pmdf_access_ingest_hotmart', {
      p_event_id: event.event_id,
      p_transaction_id: event.transaction_id,
      p_product_id: event.product_id,
      p_buyer_email: event.buyer_email,
      p_state: event.state,
      p_event_type: event.event_type,
      p_event_created_at: event.event_created_at,
      p_approved_at: event.approved_at,
      p_payload_sha256: await sha256(raw),
    });
    if (['invalid', 'event_conflict', 'transaction_identity_mismatch'].includes(result)) return json(400, { result });
    return json(200, { result });
  } catch (error) {
    if (error instanceof InputError) return json(error.status, { error: error.code });
    // A non-2xx response makes Hotmart retry delivery; no success acknowledgement on DB failure.
    console.error('pmdf-flashcards-webhook: retryable failure');
    return json(503, { error: 'reconciliation_unavailable' });
  }
});
