/**
 * Connection address the app actually uses (CLAUDE.md §14.1).
 *
 * Production runs in Frankfurt while the Supabase database is in us-east-1,
 * so every database round trip costs ~95 ms. Supabase's transaction pooler
 * (port 6543 + `pgbouncer=true`) makes Prisma spend about five round trips
 * per query (~470 ms measured); the session pooler (port 5432) lets Prisma
 * cache prepared statements, one round trip per query (~95 ms measured).
 *
 * The stored `DATABASE_URL` is left as it is; this derives the session
 * address from it. `DATABASE_POOL_MODE=transaction` turns the rewrite off
 * (instant revert without touching the secret). Only Supabase pooler
 * addresses on port 6543 are rewritten. Connections are capped at 5 so the
 * old and new containers together stay under the session pool during a
 * deploy.
 */
export const SESSION_POOL_CONNECTION_LIMIT = 5;

export function resolveDatabaseUrl(raw: string | undefined, mode: string | undefined): string | undefined {
  if (!raw || (mode ?? '').trim().toLowerCase() === 'transaction') return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (!/^postgres(?:ql)?:$/.test(url.protocol)) return raw;
  if (!url.hostname.endsWith('.pooler.supabase.com') || url.port !== '6543') return raw;
  url.port = '5432';
  url.searchParams.delete('pgbouncer');
  const limit = Number(url.searchParams.get('connection_limit'));
  if (!Number.isFinite(limit) || limit <= 0 || limit > SESSION_POOL_CONNECTION_LIMIT) {
    url.searchParams.set('connection_limit', String(SESSION_POOL_CONNECTION_LIMIT));
  }
  return url.toString();
}

/**
 * `next build` pre-renders pages in several worker processes, each with its
 * own Prisma pool; through the session pooler they exceed its 15-client cap
 * (EMAXCONNSESSION, failed deploy 2026-11-24). The build therefore keeps the
 * transaction pooler; only the single long-lived server process switches.
 */
export function effectiveDatabaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  if (env.NEXT_PHASE === 'phase-production-build' || env.IS_NEXT_WORKER === 'true') return env.DATABASE_URL;
  return resolveDatabaseUrl(env.DATABASE_URL, env.DATABASE_POOL_MODE);
}
