-- Confirm Email was enabled and verified in the dashboard before this cutoff.
-- Earlier auto-confirmed users must not claim purchases by email alone.
alter table pmdf_private.access_config
  add column if not exists email_confirmation_required_since timestamptz
  not null default timestamptz '2026-11-25T19:39:17Z'
  check (isfinite(email_confirmation_required_since));

-- An administrator may record independent evidence of mailbox ownership later.
-- The application can only read these records; no exception is created here.
create table if not exists pmdf_private.access_identity_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_email text not null check (
    verified_email = lower(btrim(verified_email))
    and length(verified_email) <= 254
    and verified_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  verified_at timestamptz not null check (isfinite(verified_at)),
  evidence_reference text not null check (length(btrim(evidence_reference)) between 10 and 500),
  revoked_at timestamptz check (isfinite(revoked_at)),
  created_at timestamptz not null default now()
);
alter table pmdf_private.access_identity_verifications enable row level security;
revoke all on pmdf_private.access_identity_verifications from public, anon, authenticated, service_role;
grant select on pmdf_private.access_identity_verifications to service_role;

-- Remove the obsolete three-argument entrypoint. Missing Auth timestamps must
-- fail closed instead of bypassing the new verification barrier.
drop function if exists public.pmdf_access_read(uuid,text,text);

create or replace function public.pmdf_access_read(
  p_user_id uuid,
  p_verified_email text,
  p_action text,
  p_auth_created_at timestamptz,
  p_auth_email_confirmed_at timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_verified_email, '')));
  v_config pmdf_private.access_config%rowtype;
  v_expiry timestamptz;
  v_grant_expiry timestamptz;
  v_payload jsonb;
  v_reason text;
  v_status jsonb;
  v_identity_proven boolean;
begin
  if p_user_id is null or p_action is null or p_action not in ('status', 'catalog')
    or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  then raise exception 'invalid access request' using errcode = '22023'; end if;

  select * into v_config from pmdf_private.access_config where singleton;
  -- Timestamps are obtained by the Edge Function from Auth /user, never from
  -- the browser request, user_metadata, JWT iat or last_sign_in_at.
  v_identity_proven :=
    p_auth_created_at is not null and isfinite(p_auth_created_at)
    and p_auth_email_confirmed_at is not null and isfinite(p_auth_email_confirmed_at)
    and p_auth_created_at >= v_config.email_confirmation_required_since
    and p_auth_email_confirmed_at >= p_auth_created_at
    and p_auth_email_confirmed_at >= v_config.email_confirmation_required_since
    and p_auth_email_confirmed_at <= now() + interval '5 minutes';
  if not coalesce(v_identity_proven, false) then
    select exists(
      select 1 from pmdf_private.access_identity_verifications
      where user_id = p_user_id and verified_email = v_email and revoked_at is null
        and verified_at >= v_config.email_confirmation_required_since
        and verified_at <= now()
    ) into v_identity_proven;
  end if;
  if not v_identity_proven then
    return jsonb_build_object('active', false, 'expires_at', null,
      'server_time', now(), 'reason', 'email_reverification_required');
  end if;

  select payload into v_payload from pmdf_private.access_catalog where singleton;
  if not coalesce(v_config.enabled, false) or v_payload is null
    or jsonb_array_length(v_payload->'cards') <> v_config.expected_cards
  then return jsonb_build_object('active', false, 'expires_at', null, 'server_time', now(), 'reason', 'not_ready'); end if;

  -- No ownership change occurs before the identity barrier above succeeds.
  update pmdf_private.access_purchases set user_id = p_user_id, updated_at = now()
  where user_id is null and buyer_email = v_email;

  select max(expires_at) into v_expiry from pmdf_private.access_purchases
  where user_id = p_user_id and hotmart_product_id = v_config.hotmart_product_id
    and state = 'approved' and expires_at > now();
  select max(expires_at) into v_grant_expiry from pmdf_private.access_grants
  where user_id = p_user_id and expires_at > now();
  v_expiry := greatest(v_expiry, v_grant_expiry);
  if v_expiry is not null then
    if p_action = 'catalog' then return v_payload; end if;
    return jsonb_build_object('active', true, 'expires_at', v_expiry, 'server_time', now(), 'reason', 'active');
  end if;

  if exists(select 1 from pmdf_private.access_purchases
    where user_id = p_user_id and hotmart_product_id = v_config.hotmart_product_id and state = 'approved')
  then
    v_reason := 'expired';
    select max(expires_at) into v_expiry from pmdf_private.access_purchases
      where user_id = p_user_id and hotmart_product_id = v_config.hotmart_product_id and state = 'approved';
  elsif exists(select 1 from pmdf_private.access_purchases
    where user_id = p_user_id and hotmart_product_id = v_config.hotmart_product_id and state = 'revoked')
  then v_reason := 'revoked';
  else v_reason := 'no_purchase'; end if;
  v_status := jsonb_build_object('active', false, 'expires_at', v_expiry, 'server_time', now(), 'reason', v_reason);
  return v_status;
end;
$$;

revoke all on function public.pmdf_access_read(uuid,text,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.pmdf_access_read(uuid,text,text,timestamptz,timestamptz) to service_role;
comment on table pmdf_private.access_identity_verifications is 'Administrator-recorded proof of exact email ownership for legacy Auth users; no purchase or content entitlement is granted by this table.';
