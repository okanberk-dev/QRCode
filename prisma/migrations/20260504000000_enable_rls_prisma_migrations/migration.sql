-- Enable Row Level Security on _prisma_migrations.
-- Closes Supabase advisor finding `rls_disabled_in_public` for this
-- internal Prisma table. No policies are added on purpose: with RLS on
-- and zero policies, PostgREST (anon + authenticated roles) is fully
-- blocked. Prisma keeps working because the postgres role used via
-- DATABASE_URL/DIRECT_URL owns the table and bypasses RLS.
-- Idempotent: re-running this statement is a no-op.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
