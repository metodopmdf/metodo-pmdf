-- Método PMDF: quotas atômicas para a Edge Function Gemini.
-- Aplicar no SQL Editor do Supabase antes de ativar GEMINI_ENABLED.
begin;
create table if not exists public.pmdf_gemini_daily_usage (
  usage_day date not null,
  subject_id uuid not null,
  request_count integer not null default 0 check(request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (usage_day, subject_id)
);
alter table public.pmdf_gemini_daily_usage enable row level security;
revoke all on public.pmdf_gemini_daily_usage from public, anon, authenticated;
grant select, insert, update on public.pmdf_gemini_daily_usage to service_role;

create or replace function public.pmdf_consume_gemini_quota(
  p_user_id uuid,
  p_user_limit integer default 20,
  p_global_limit integer default 80
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  current_day date := (now() at time zone 'UTC')::date;
  global_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  user_count integer := 0;
  global_count integer := 0;
begin
  if p_user_id is null or p_user_id = global_id then
    raise exception 'Invalid Gemini quota user identifier';
  end if;
  if p_user_limit not between 1 and 200 or p_global_limit not between 1 and 1000 then
    raise exception 'Invalid Gemini quota limits';
  end if;

  -- Lock transacional global: garante que requisições simultâneas não
  -- ultrapassem cotas nem contabilizem de forma inconsistente.
  perform pg_advisory_xact_lock(942107, 202611);
  select request_count into user_count
    from public.pmdf_gemini_daily_usage
   where usage_day=current_day and subject_id=p_user_id;
  select request_count into global_count
    from public.pmdf_gemini_daily_usage
   where usage_day=current_day and subject_id=global_id;
  user_count := coalesce(user_count,0);
  global_count := coalesce(global_count,0);
  if user_count >= p_user_limit then
    return jsonb_build_object('allowed',false,'reason','USER_DAILY_LIMIT',
      'user_remaining',0,'global_remaining',greatest(0,p_global_limit-global_count));
  end if;
  if global_count >= p_global_limit then
    return jsonb_build_object('allowed',false,'reason','GLOBAL_DAILY_LIMIT',
      'user_remaining',greatest(0,p_user_limit-user_count),'global_remaining',0);
  end if;
  insert into public.pmdf_gemini_daily_usage as usage (usage_day,subject_id,request_count,updated_at)
    values(current_day,p_user_id,1,now())
    on conflict (usage_day,subject_id)
    do update set request_count=usage.request_count+1,updated_at=now();
  insert into public.pmdf_gemini_daily_usage as usage (usage_day,subject_id,request_count,updated_at)
    values(current_day,global_id,1,now())
    on conflict (usage_day,subject_id)
    do update set request_count=usage.request_count+1,updated_at=now();
  return jsonb_build_object('allowed',true,
    'user_remaining',p_user_limit-user_count-1,
    'global_remaining',p_global_limit-global_count-1);
end;
$$;
revoke all on function public.pmdf_consume_gemini_quota(uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.pmdf_consume_gemini_quota(uuid,integer,integer) to service_role;
commit;
