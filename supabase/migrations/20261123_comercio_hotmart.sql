-- MÉTODO PMDF — comércio digital / Hotmart — 2026-11-23
-- Execute no SQL Editor do projeto Supabase após backup.
-- Nenhum produto fica à venda antes da ativação explícita no banco.
begin;

create table if not exists public.pmdf_store_products (
  slug text primary key check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null,
  description text not null,
  kind text not null check (kind in ('download','subscription')),
  price_cents integer not null check (price_cents > 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pmdf_store_gateways (
  product_slug text primary key references public.pmdf_store_products(slug),
  hotmart_product_id text not null unique,
  checkout_url text not null check (checkout_url ~ '^https://pay[.]hotmart[.]com/'),
  created_at timestamptz not null default now()
);
create table if not exists public.pmdf_store_checkout_intents (
  sck varchar(30) primary key check (sck ~ '^[a-f0-9]{24}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.pmdf_store_products(slug),
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  transaction_id text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index if not exists pmdf_store_intents_user_idx on public.pmdf_store_checkout_intents(user_id,created_at desc);
create table if not exists public.pmdf_store_orders (
  transaction_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.pmdf_store_products(slug),
  state text not null check (state in ('approved','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pmdf_store_orders_user_idx on public.pmdf_store_orders(user_id,product_slug);
create table if not exists public.pmdf_store_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.pmdf_store_products(slug),
  active boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id,product_slug)
);
create table if not exists public.pmdf_store_webhook_events (
  event_id text primary key,
  transaction_id text,
  product_slug text,
  state text not null,
  result text not null,
  created_at timestamptz not null default now()
);
-- Loja pública: somente catálogo ativo, e somente campos de exibição.
alter table public.pmdf_store_products enable row level security;
alter table public.pmdf_store_gateways enable row level security;
alter table public.pmdf_store_checkout_intents enable row level security;
alter table public.pmdf_store_orders enable row level security;
alter table public.pmdf_store_entitlements enable row level security;
alter table public.pmdf_store_webhook_events enable row level security;
drop policy if exists pmdf_store_products_public on public.pmdf_store_products;
create policy pmdf_store_products_public on public.pmdf_store_products for select to anon,authenticated using (status = 'active');
drop policy if exists pmdf_store_intents_own on public.pmdf_store_checkout_intents;
create policy pmdf_store_intents_own on public.pmdf_store_checkout_intents for select to authenticated using (auth.uid() = user_id);
drop policy if exists pmdf_store_orders_own on public.pmdf_store_orders;
create policy pmdf_store_orders_own on public.pmdf_store_orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists pmdf_store_entitlements_own on public.pmdf_store_entitlements;
create policy pmdf_store_entitlements_own on public.pmdf_store_entitlements for select to authenticated using (auth.uid() = user_id);
revoke all on public.pmdf_store_products, public.pmdf_store_gateways, public.pmdf_store_checkout_intents,
  public.pmdf_store_orders, public.pmdf_store_entitlements, public.pmdf_store_webhook_events from public, anon, authenticated;
grant select(slug,title,description,kind,price_cents,status) on public.pmdf_store_products to anon,authenticated;
grant select(sck,user_id,product_slug,status,created_at,expires_at) on public.pmdf_store_checkout_intents to authenticated;
grant select(transaction_id,product_slug,state,expires_at,created_at) on public.pmdf_store_orders to authenticated;
grant select(product_slug,active,expires_at,updated_at) on public.pmdf_store_entitlements to authenticated;

-- A publicação é deliberadamente desligada até cadastrar links reais e produtos aprovados.
insert into public.pmdf_store_products(slug,title,description,kind,price_cents,status) values
('questoes-comentadas','Banco de Questões Comentadas','Questões autorais e comentários organizados por disciplina.','download',2990,'draft'),
('apostilas-tematicas','Apostilas Temáticas','Teoria integrada a exercícios e explicações.','download',4990,'draft'),
('premium-mensal','Método PMDF Premium','Ferramentas avançadas da plataforma, após lançamento.','subscription',1990,'draft')
on conflict(slug) do nothing;

-- Somente o servidor (service_role) poderá aplicar notificações confirmadas.
create or replace function public.pmdf_store_reconcile_hotmart(
  p_event_id text,
  p_transaction_id text,
  p_hotmart_product_id text,
  p_sck text,
  p_state text,
  p_expires_at timestamptz default null
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_product text;
  v_kind text;
  v_user uuid;
  v_state text;
  v_inserted integer;
  v_order_state text;
  v_expires timestamptz;
  v_has_approved boolean;
  v_max_expiry timestamptz;
begin
  if p_event_id is null or length(p_event_id) not between 4 and 150
    or p_transaction_id is null or p_transaction_id !~ '^[a-zA-Z0-9-]{4,100}$'
    or p_sck is null or p_sck !~ '^[a-f0-9]{24}$'
    or p_state not in ('approved','revoked')
    then return 'invalid'; end if;
  select g.product_slug,p.kind into v_product,v_kind
    from public.pmdf_store_gateways g
    join public.pmdf_store_products p on p.slug=g.product_slug
    where g.hotmart_product_id=p_hotmart_product_id
      and p.status='active';
  if v_product is null then return 'unknown_product'; end if;
  insert into public.pmdf_store_webhook_events(event_id,transaction_id,product_slug,state,result)
    values(p_event_id,p_transaction_id,v_product,p_state,'received')
    on conflict(event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then return 'duplicate'; end if;
  select user_id into v_user from public.pmdf_store_checkout_intents
    where sck=p_sck and product_slug=v_product and expires_at>now();
  if v_user is null then
    update public.pmdf_store_webhook_events set result='unmatched_intent' where event_id=p_event_id;
    return 'unmatched_intent';
  end if;
  -- Não conceder acesso recorrente sem data de expiração confiável.
  if p_state='approved' and v_kind='subscription' and
     (p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '400 days') then
    update public.pmdf_store_webhook_events set result='missing_billing_expiry' where event_id=p_event_id;
    return 'missing_billing_expiry';
  end if;
  v_state:=p_state;
  insert into public.pmdf_store_orders(transaction_id,user_id,product_slug,state,expires_at)
    values(p_transaction_id,v_user,v_product,v_state,case when v_kind='subscription' then p_expires_at else null end)
    on conflict(transaction_id) do update set
      state=case when public.pmdf_store_orders.state='revoked' then 'revoked' else excluded.state end,
      expires_at=case when public.pmdf_store_orders.state='revoked' then public.pmdf_store_orders.expires_at else excluded.expires_at end,
      updated_at=now();
  select state into v_order_state from public.pmdf_store_orders where transaction_id=p_transaction_id;
  update public.pmdf_store_checkout_intents
    set status=case when v_order_state='approved' then 'approved' else 'revoked' end,
        transaction_id=p_transaction_id
    where sck=p_sck and (transaction_id is null or transaction_id=p_transaction_id);
  select exists(
    select 1 from public.pmdf_store_orders o
    where o.user_id=v_user and o.product_slug=v_product and o.state='approved'
      and (v_kind='download' or o.expires_at>now())
  ) into v_has_approved;
  if v_has_approved and v_kind='subscription' then
    select max(expires_at) into v_max_expiry from public.pmdf_store_orders
      where user_id=v_user and product_slug=v_product and state='approved' and expires_at>now();
  end if;
  insert into public.pmdf_store_entitlements(user_id,product_slug,active,expires_at)
    values(v_user,v_product,v_has_approved,case when v_kind='subscription' then v_max_expiry else null end)
    on conflict(user_id,product_slug) do update set
      active=excluded.active,expires_at=excluded.expires_at,updated_at=now();
  update public.pmdf_store_webhook_events set result='processed' where event_id=p_event_id;
  return 'processed';
end $$;
revoke all on function public.pmdf_store_reconcile_hotmart(text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.pmdf_store_reconcile_hotmart(text,text,text,text,text,timestamptz) to service_role;

commit;
-- Ações administrativas APÓS aprovação do produto na Hotmart:
-- insert into public.pmdf_store_gateways(product_slug,hotmart_product_id,checkout_url)
-- values ('questoes-comentadas','ID_NUMERICO_REAL','https://pay.hotmart.com/URL_REAL');
-- update public.pmdf_store_products set status='active',updated_at=now()
-- where slug='questoes-comentadas';
-- Não habilite premium-mensal até validar ciclo de renovação e expiração com eventos reais.
