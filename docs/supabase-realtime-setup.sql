-- Stage 16 §38.86 — Supabase Realtime + RLS setup for ActivityFeed push.
--
-- Run this file in the Supabase SQL Editor (Project → SQL Editor → New
-- query) ONCE per environment. Idempotent: every statement is guarded by
-- `IF NOT EXISTS` / `DROP POLICY IF EXISTS` so rerunning is safe.
--
-- Threat model:
--   * Browser holds an anon Supabase URL + anon key + a short-lived JWT
--     minted by /api/realtime/token (CLAUDE.md §38.86). Anon URL/key are
--     safe to expose; the JWT is the actual capability.
--   * The minted JWT carries `sub` (user id), `role: 'authenticated'`,
--     and a custom `restaurant_ids` array claim — restricted to the
--     restaurants the calling Buaze actor can access (CLAUDE.md §4 IDOR
--     via getScopedRestaurantIds).
--   * Without RLS, anyone with the anon key could call
--     `supabase.channel(...).filter(...)` and subscribe to feedback for
--     ANY restaurant. RLS makes the JWT claim the actual security
--     boundary.
--
-- Policy strategy: claim-array membership (no subquery — fast at scale).
-- Comparing `restaurant_id::text` against `jsonb_array_elements_text` of
-- the JWT claim. JWT lifetime is 1h, so a restaurant added to an owner's
-- account propagates within 1h (and the next reload mints a fresh
-- token).

-- ----------------------------------------------------------------------
-- 1) Enable Row Level Security on the table the Realtime client subscribes
-- to. ActivityFeed v1 (this stage) only consumes feedbacks INSERT.
-- feedback_replies is descoped (no restaurant_id column — needs a
-- denormalization or extra fetch; tracked in CLAUDE.md §38.86 backlog).
-- ----------------------------------------------------------------------
alter table public.feedbacks enable row level security;

-- ----------------------------------------------------------------------
-- 2) Drop any earlier iteration of this policy so re-runs converge.
-- ----------------------------------------------------------------------
drop policy if exists "buaze_realtime_owner_can_subscribe_feedbacks"
  on public.feedbacks;

-- ----------------------------------------------------------------------
-- 3) Recreate the SELECT policy. Note: Supabase Realtime postgres_changes
-- evaluates SELECT (not "REALTIME") policies — same as PostgREST. Keep
-- this scoped to authenticated role only; anon clients cannot satisfy
-- the membership predicate.
-- ----------------------------------------------------------------------
create policy "buaze_realtime_owner_can_subscribe_feedbacks"
  on public.feedbacks
  for select
  to authenticated
  using (
    restaurant_id is not null
    and restaurant_id::text in (
      select jsonb_array_elements_text(
        coalesce(
          (current_setting('request.jwt.claims', true)::jsonb -> 'restaurant_ids'),
          '[]'::jsonb
        )
      )
    )
  );

-- ----------------------------------------------------------------------
-- 4) Add the table to the supabase_realtime publication. Supabase
-- Dashboard → Database → Replication exposes a UI for this, but the SQL
-- form is reproducible. The IF NOT EXISTS guard avoids errors on
-- subsequent runs.
-- ----------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'feedbacks'
  ) then
    alter publication supabase_realtime add table public.feedbacks;
  end if;
end
$$;

-- ----------------------------------------------------------------------
-- Smoke test (manual): from the Supabase SQL Editor, run with the JWT
-- of a Buaze owner pasted via `set local "request.jwt.claims" to '...';`
-- and confirm `select count(*) from public.feedbacks` returns rows
-- only for that owner's restaurants.
-- ----------------------------------------------------------------------
