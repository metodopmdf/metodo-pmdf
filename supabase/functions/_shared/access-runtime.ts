import { ALLOWED_ORIGINS, allowedOrigin } from './access-domain.mjs';

function envKey(jsonName: string, legacyName: string): string {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (typeof keys?.default === 'string') return keys.default;
      const first = Object.values(keys || {}).find(value => typeof value === 'string');
      if (typeof first === 'string') return first;
    } catch { /* Older hosted environments use the legacy variable below. */ }
  }
  return Deno.env.get(legacyName) || '';
}

export const projectUrl = (Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PUBLIC_URL') || '').replace(/\/$/, '');
const serviceKey = envKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const publicKey = envKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const origins = (Deno.env.get('PMDF_ALLOWED_ORIGINS') || ALLOWED_ORIGINS.join(','))
  .split(',').map(value => value.trim()).filter(value => /^https:\/\/[^/?#]+$/.test(value));

export function configured(requirePublicKey = true): boolean {
  return Boolean(projectUrl && serviceKey && (!requirePublicKey || publicKey));
}
export function acceptsOrigin(origin: string): boolean { return allowedOrigin(origin, origins); }

export function headers(origin = ''): Headers {
  const result = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin, Authorization',
  });
  if (origin && acceptsOrigin(origin)) {
    result.set('Access-Control-Allow-Origin', origin);
    result.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    result.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
  }
  return result;
}

export function json(status: number, data: unknown, origin = ''): Response {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) });
}

export async function rpc(name: string, body: unknown): Promise<any> {
  const adminHeaders: Record<string, string> = { apikey: serviceKey, 'Content-Type': 'application/json' };
  if (!serviceKey.startsWith('sb_secret_')) adminHeaders.Authorization = 'Bearer ' + serviceKey;
  const response = await fetch(projectUrl + '/rest/v1/rpc/' + name, {
    method: 'POST', headers: adminHeaders, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
  });
  // Do not print database response bodies: they can include customer information.
  if (!response.ok) throw new Error('database_unavailable');
  return response.json();
}

export async function validatedUser(token: string): Promise<any | null> {
  const response = await fetch(projectUrl + '/auth/v1/user', {
    headers: { apikey: publicKey, Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('auth_unavailable');
  return response.json();
}
