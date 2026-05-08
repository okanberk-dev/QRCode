-- Stage 76 §38.156 — Security fix bundle.
--
-- 3 yeni admin tablosuna RLS + restrictive policy ekle (Supabase advisor
-- ERROR: rls_disabled_in_public). Stage 17 §38.87 paterni reuse —
-- idempotent (IF NOT EXISTS / DROP IF EXISTS), Buaze Prisma `postgres`
-- rolü BYPASSRLS=true taşıdığı için CRUD query'leri etkilenmez. RLS
-- sadece anon/authenticated rollerini engeller (mevcut Buaze flow'unda
-- bu rollerden bu tablolara erişim YOK — gelecek API güvencesi).
--
-- Etkilenen tablolar:
-- 1) admin_permissions — Stage A2 §38.94 RBAC (manager grant'ları)
-- 2) impersonation_sessions — Stage A4 §38.96 ("Owner gibi gör")
-- 3) admin_notifications — Stage 29 §38.105 (campaign moderation +
--    in-app feed)
--
-- Bu 3 tablo Stage 17 §38.87 customer_* paterninden sonra eklendi
-- (Stage 17 PR #501 vs Stage A2/A4/29 sonrasında migrations
-- 20260506140000 / 20260506150000 / 20260507180000) ama RLS enable
-- atlanmıştı. Bu migration drift'i kapatır.

-- ----------------------------------------------------------------------
-- 1) admin_permissions (Stage A2 §38.94 RBAC)
-- ----------------------------------------------------------------------
alter table public.admin_permissions enable row level security;

drop policy if exists "buaze_deny_anon_admin_permissions" on public.admin_permissions;
create policy "buaze_deny_anon_admin_permissions"
  on public.admin_permissions
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ----------------------------------------------------------------------
-- 2) impersonation_sessions (Stage A4 §38.96)
-- ----------------------------------------------------------------------
alter table public.impersonation_sessions enable row level security;

drop policy if exists "buaze_deny_anon_impersonation_sessions" on public.impersonation_sessions;
create policy "buaze_deny_anon_impersonation_sessions"
  on public.impersonation_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ----------------------------------------------------------------------
-- 3) admin_notifications (Stage 29 §38.105)
-- ----------------------------------------------------------------------
alter table public.admin_notifications enable row level security;

drop policy if exists "buaze_deny_anon_admin_notifications" on public.admin_notifications;
create policy "buaze_deny_anon_admin_notifications"
  on public.admin_notifications
  for all
  to anon, authenticated
  using (false)
  with check (false);
