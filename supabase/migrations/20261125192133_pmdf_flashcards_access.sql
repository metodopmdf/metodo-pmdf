-- Six-month, single-payment access. Catalogue and customer records are never
-- readable through the public Data API. This migration contains no catalogue
-- content, passwords, HOTTOK, user emails, or generated customer identifiers.
create schema if not exists pmdf_private;
revoke all on schema pmdf_private from public, anon, authenticated;
grant usage on schema pmdf_private to service_role;

create table if not exists pmdf_private.access_config (
  singleton boolean primary key default true check (singleton),
  hotmart_product_id text check (hotmart_product_id ~ '^[0-9]{1,30}$'),
  hottok_sha256 text check (hottok_sha256 ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default false,
  expected_cards integer not null default 2624 check (expected_cards > 0),
  created_at timestamptz not null default now()
);
insert into pmdf_private.access_config (singleton) values (true) on conflict do nothing;

create table if not exists pmdf_private.access_catalog (
  singleton boolean primary key default true check (singleton),
  payload jsonb not null check (
    payload->>'format' = 'PMDF-ANKI-IMPORT-v1'
    and jsonb_typeof(payload->'cards') = 'array'
  ),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);

create table if not exists pmdf_private.access_purchases (
  transaction_id text primary key check (transaction_id ~ '^[A-Za-z0-9_-]{4,150}$'),
  hotmart_product_id text not null,
  buyer_email text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  state text not null check (state in ('approved', 'revoked')),
  approved_at timestamptz,
  expires_at timestamptz,
  last_event_at timestamptz not null,
  revoked_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'approved' or (approved_at is not null and expires_at is not null and buyer_email <> '')),
  check (buyer_email = lower(btrim(buyer_email)))
);
create index if not exists access_purchases_claim_email_idx
  on pmdf_private.access_purchases(buyer_email) where user_id is null;
create index if not exists access_purchases_user_expiry_idx
  on pmdf_private.access_purchases(user_id, expires_at) where state = 'approved';
create index if not exists access_purchases_user_idx on pmdf_private.access_purchases(user_id);

create table if not exists pmdf_private.access_events (
  event_id text primary key check (event_id ~ '^[A-Za-z0-9_-]{4,150}$'),
  transaction_id text not null,
  event_type text not null,
  event_created_at timestamptz not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  received_at timestamptz not null default now()
);
create index if not exists access_events_transaction_idx on pmdf_private.access_events(transaction_id);

-- For a named owner or Hotmart reviewer only. No implicit admin bypass and no
-- fake purchase records. A real expiration and an explicit reason are mandatory.
create table if not exists pmdf_private.access_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  grant_type text not null check (grant_type in ('owner', 'review')),
  expires_at timestamptz not null,
  reason text not null check (length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default now()
);

alter table pmdf_private.access_config enable row level security;
alter table pmdf_private.access_catalog enable row level security;
alter table pmdf_private.access_purchases enable row level security;
alter table pmdf_private.access_events enable row level security;
alter table pmdf_private.access_grants enable row level security;
revoke all on all tables in schema pmdf_private from public, anon, authenticated;
grant select, insert, update on all tables in schema pmdf_private to service_role;

-- SECURITY INVOKER: only the server's service_role can call these RPCs. There
-- is no SECURITY DEFINER path by which a browser can nominate another user.
create or replace function public.pmdf_access_webhook_settings()
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object('hotmart_product_id', hotmart_product_id, 'hottok_sha256', hottok_sha256)
  from pmdf_private.access_config where singleton;
$$;

create or replace function public.pmdf_access_ingest_hotmart(
  p_event_id text,
  p_transaction_id text,
  p_product_id text,
  p_buyer_email text,
  p_state text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_approved_at timestamptz,
  p_payload_sha256 text
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_product text;
  v_email text := lower(btrim(coalesce(p_buyer_email, '')));
  v_existing pmdf_private.access_purchases%rowtype;
  v_approved timestamptz;
  v_expires timestamptz;
  v_inserted integer;
  v_old_hash text;
begin
  if p_event_id is null or p_event_id !~ '^[A-Za-z0-9_-]{4,150}$'
    or p_transaction_id is null or p_transaction_id !~ '^[A-Za-z0-9_-]{4,150}$'
    or p_state is null or p_state not in ('approved', 'revoked')
    or p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_event_type is null or p_event_type not in (
      'PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_REFUNDED',
      'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'PURCHASE_EXPIRED', 'PURCHASE_PROTEST')
    or p_event_created_at is null or not isfinite(p_event_created_at)
    or p_event_created_at < timestamptz '2020-01-01 00:00:00+00'
    or p_event_created_at > now() + interval '5 minutes'
    or length(v_email) > 254
  then return 'invalid'; end if;
  if p_state = 'approved' and (
    p_event_type not in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE')
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_approved_at is null or not isfinite(p_approved_at)
    or p_approved_at < timestamptz '2020-01-01 00:00:00+00'
    or p_approved_at > p_event_created_at + interval '5 minutes'
    or p_approved_at > now() + interval '5 minutes'
  ) then return 'invalid'; end if;

  select hotmart_product_id into v_product from pmdf_private.access_config where singleton;
  if v_product is null or v_product <> p_product_id then return 'other_product'; end if;

  -- Serializes all events for one transaction, including out-of-order delivery.
  perform pg_advisory_xact_lock(hashtextextended('pmdf-access:' || p_transaction_id, 0));
  select * into v_existing from pmdf_private.access_purchases where transaction_id = p_transaction_id;
  if found and (v_existing.hotmart_product_id <> p_product_id
    or (p_state = 'approved' and v_email <> '' and v_existing.buyer_email <> '' and v_existing.buyer_email <> v_email))
  then return 'transaction_identity_mismatch'; end if;

  insert into pmdf_private.access_events(event_id, transaction_id, event_type, event_created_at, payload_sha256)
  values(p_event_id, p_transaction_id, p_event_type, p_event_created_at, p_payload_sha256)
  on conflict(event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select payload_sha256 into v_old_hash from pmdf_private.access_events where event_id = p_event_id;
    return case when v_old_hash = p_payload_sha256 then 'duplicate' else 'event_conflict' end;
  end if;

  -- COMPLETE and re-delivery do not start a fresh term. Preserve the earliest
  -- authenticated approval date and add six calendar months, in UTC.
  v_approved := case
    when v_existing.approved_at is null then p_approved_at
    when p_approved_at is null then v_existing.approved_at
    else least(v_existing.approved_at, p_approved_at)
  end;
  v_expires := case when v_approved is not null then
    ((v_approved at time zone 'UTC') + interval '6 months') at time zone 'UTC'
    else null end;

  insert into pmdf_private.access_purchases as existing(
    transaction_id, hotmart_product_id, buyer_email, state, approved_at, expires_at, last_event_at, revoked_event)
  values(p_transaction_id, p_product_id, v_email, p_state, v_approved, v_expires, p_event_created_at,
    case when p_state = 'revoked' then p_event_type end)
  on conflict(transaction_id) do update set
    buyer_email = case when existing.buyer_email = '' then excluded.buyer_email else existing.buyer_email end,
    state = case when existing.state = 'revoked' or excluded.state = 'revoked' then 'revoked' else 'approved' end,
    approved_at = excluded.approved_at,
    expires_at = excluded.expires_at,
    last_event_at = greatest(existing.last_event_at, excluded.last_event_at),
    revoked_event = coalesce(existing.revoked_event, excluded.revoked_event),
    updated_at = now();
  return 'processed';
end;
$$;

create or replace function public.pmdf_access_read(p_user_id uuid, p_verified_email text, p_action text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_verified_email, '')));
  v_config pmdf_private.access_config%rowtype;
  v_expiry timestamptz;
  v_grant_expiry timestamptz;
  v_payload jsonb;
  v_reason text;
  v_status jsonb;
begin
  if p_user_id is null or p_action is null or p_action not in ('status', 'catalog')
    or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  then raise exception 'invalid access request' using errcode = '22023'; end if;

  select * into v_config from pmdf_private.access_config where singleton;
  select payload into v_payload from pmdf_private.access_catalog where singleton;
  if not coalesce(v_config.enabled, false) or v_payload is null
    or jsonb_array_length(v_payload->'cards') <> v_config.expected_cards
  then return jsonb_build_object('active', false, 'expires_at', null, 'server_time', now(), 'reason', 'not_ready'); end if;

  -- Called only after Auth verifies the bearer token and confirms the email.
  -- Binding is one-time; changing an account email does not transfer ownership.
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

revoke all on function public.pmdf_access_webhook_settings() from public, anon, authenticated;
revoke all on function public.pmdf_access_ingest_hotmart(text,text,text,text,text,text,timestamptz,timestamptz,text) from public, anon, authenticated;
revoke all on function public.pmdf_access_read(uuid,text,text) from public, anon, authenticated;
grant execute on function public.pmdf_access_webhook_settings() to service_role;
grant execute on function public.pmdf_access_ingest_hotmart(text,text,text,text,text,text,timestamptz,timestamptz,text) to service_role;
grant execute on function public.pmdf_access_read(uuid,text,text) to service_role;

comment on schema pmdf_private is 'Server-only purchase authorization and private PMDF flashcard catalogue.';
comment on table pmdf_private.access_config is 'Set verified product ID and HOTTOK SHA-256 through administration; enable only after catalogue and delivery tests.';
