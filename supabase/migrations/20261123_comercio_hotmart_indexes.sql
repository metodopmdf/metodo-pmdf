begin;

create index if not exists pmdf_store_checkout_intents_product_idx
  on public.pmdf_store_checkout_intents(product_slug);

create index if not exists pmdf_store_entitlements_product_idx
  on public.pmdf_store_entitlements(product_slug);

create index if not exists pmdf_store_orders_product_idx
  on public.pmdf_store_orders(product_slug);

commit;
