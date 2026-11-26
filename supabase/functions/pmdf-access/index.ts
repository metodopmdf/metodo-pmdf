import { bearerToken, hasConfirmedAuthEmail, InputError, normalizeEmail, readLimitedText } from '../_shared/access-domain.mjs';
import { acceptsOrigin, configured, headers, json, rpc, validatedUser } from '../_shared/access-runtime.ts';

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') || '';
  if (!acceptsOrigin(origin)) return json(403, { error: 'origin_not_allowed' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);
  if (!configured()) return json(503, { error: 'not_ready' }, origin);
  const token = bearerToken(request.headers.get('authorization'));
  if (!token) return json(401, { error: 'authentication_required' }, origin);
  try {
    // Authenticated identity is obtained from Auth, never from request JSON or user_metadata.
    const user = await validatedUser(token);
    if (!user) return json(401, { error: 'invalid_session' }, origin);
    if (!hasConfirmedAuthEmail(user)) return json(403, { error: 'email_not_verified' }, origin);
    let payload;
    try { payload = JSON.parse(await readLimitedText(request, 1024)); }
    catch (error) {
      if (error instanceof InputError) throw error;
      throw new InputError('invalid_json');
    }
    if (!payload || !['status', 'catalog'].includes(payload.action)) throw new InputError('invalid_action');
    const result = await rpc('pmdf_access_read', {
      p_user_id: user.id, p_verified_email: normalizeEmail(user.email), p_action: payload.action,
      p_auth_created_at: typeof user.created_at === 'string' && Number.isFinite(Date.parse(user.created_at))
        ? new Date(user.created_at).toISOString() : null,
      p_auth_email_confirmed_at: new Date(user.email_confirmed_at).toISOString(),
    });
    if (result?.reason === 'email_reverification_required')
      return json(403, { error: 'email_reverification_required', ...result }, origin);
    if (payload.action === 'status') return json(200, result, origin);
    if (result?.format === 'PMDF-ANKI-IMPORT-v1' && Array.isArray(result.cards)) return json(200, result, origin);
    if (result?.reason === 'not_ready') return json(503, { error: 'not_ready', ...result }, origin);
    return json(403, { error: 'access_denied', ...result }, origin);
  } catch (error) {
    if (error instanceof InputError) return json(error.status, { error: error.code }, origin);
    console.error('pmdf-access: request unavailable');
    return json(503, { error: 'unavailable' }, origin);
  }
});
