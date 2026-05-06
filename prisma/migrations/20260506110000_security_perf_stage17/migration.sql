-- Stage 17 §38.87 — Security + performance fix bundle.
--
-- Üç düzeltme tek migration'da:
-- 1) Customer_* 4 tablo RLS enable + restrictive policy (Supabase advisor
--    ERROR: rls_disabled_in_public). Buaze Prisma `postgres` rolü ile
--    bağlanıyor (BYPASSRLS=true), policy authenticated/anon erişimi engeller.
-- 2) feedback realtime policy auth_rls_initplan optimization (Supabase
--    advisor WARN: current_setting() per-row re-eval). `(select ...)`
--    paterni Postgres'e bunu tek seferlik plan'lattırır — büyük ölçekte
--    perf gain.
-- 3) restaurants.user_id FK için covering index (Supabase advisor INFO:
--    unindexed_foreign_keys). getScopedRestaurantIds her dashboard
--    request'inde bu FK üzerinden filter ediyor — sequential scan yerine
--    index seek.
--
-- Hepsi idempotent: IF NOT EXISTS / DROP IF EXISTS ile rerun güvenli.

-- ----------------------------------------------------------------------
-- 1) Customer_* 4 tablo RLS enable
-- ----------------------------------------------------------------------
-- Buaze Prisma `postgres` rolü BYPASSRLS=true taşıdığı için tüm CRUD
-- query'leri etkilenmez. RLS sadece anon/authenticated client'lardan
-- gelen istekleri engeller (mevcut Buaze flow'unda bu rollerden
-- erişim YOK — gelecek API güvencesi).

alter table public.customer_archives enable row level security;
alter table public.customer_segment_overrides enable row level security;
alter table public.customer_email_campaigns enable row level security;
alter table public.customer_email_logs enable row level security;

-- Restrictive policy: anon ve authenticated rolleri için tam deny.
-- Buaze backend Prisma `postgres` rolü ile yazıyor (BYPASSRLS), o yüzden
-- bu tabloları kullanan API endpoint'leri etkilenmez.
-- DROP IF EXISTS ile rerun güvenliği.

drop policy if exists "buaze_deny_anon_customer_archives" on public.customer_archives;
create policy "buaze_deny_anon_customer_archives"
  on public.customer_archives
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "buaze_deny_anon_customer_segment_overrides" on public.customer_segment_overrides;
create policy "buaze_deny_anon_customer_segment_overrides"
  on public.customer_segment_overrides
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "buaze_deny_anon_customer_email_campaigns" on public.customer_email_campaigns;
create policy "buaze_deny_anon_customer_email_campaigns"
  on public.customer_email_campaigns
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "buaze_deny_anon_customer_email_logs" on public.customer_email_logs;
create policy "buaze_deny_anon_customer_email_logs"
  on public.customer_email_logs
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ----------------------------------------------------------------------
-- 2) feedback realtime policy — auth_rls_initplan optimization
-- ----------------------------------------------------------------------
-- Stage 16 §38.86'da yazdığımız policy current_setting() çağrısını her
-- satır için yeniden değerlendiriyordu (Postgres init plan optimization
-- yapamıyordu). `(select current_setting(...))` paterni ile sarmak
-- Postgres'in çağrıyı tek seferlik plan'lattırmasını sağlar.
--
-- Mantık aynı, sadece SQL form değişti. RLS güvenlik garanti aynı.

drop policy if exists "buaze_realtime_owner_can_subscribe_feedback"
  on public.feedback;

create policy "buaze_realtime_owner_can_subscribe_feedback"
  on public.feedback
  for select
  to authenticated
  using (
    restaurant_id is not null
    and restaurant_id::text in (
      select jsonb_array_elements_text(
        coalesce(
          (select current_setting('request.jwt.claims', true))::jsonb -> 'restaurant_ids',
          '[]'::jsonb
        )
      )
    )
  );

-- ----------------------------------------------------------------------
-- 3) restaurants.user_id covering index
-- ----------------------------------------------------------------------
-- Prisma schema'ya `@@index([userId])` eklendi; bu migration index'i
-- production DB'ye uygular. CONCURRENTLY kullanmıyoruz çünkü Prisma
-- migrate deploy transaction içinde çalışıyor — tablo küçük (low row
-- count owner panel scale, CLAUDE.md §19.4.4 "10-50 restaurants").

create index if not exists "restaurants_user_id_idx"
  on public.restaurants ("user_id");
