import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { effectiveDatabaseUrl } from '@/lib/database-url';

export const dynamic = 'force-dynamic';

let lastDbProbe = 0;

/**
 * `?db=1` times three `SELECT 1` round trips and reports the connection
 * shape (port + query parameter NAMES, never values or host) so panel
 * slowness can be traced to the DB link. At most one probe per second.
 */
async function dbProbe() {
  const now = Date.now();
  if (now - lastDbProbe < 1000) return { skipped: 'rate_limited' };
  lastDbProbe = now;
  const timings: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const t = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    timings.push(Math.round(performance.now() - t));
  }
  let port: string | null = null;
  let params: Record<string, string> = {};
  try {
    const u = new URL(effectiveDatabaseUrl() ?? '');
    port = u.port || null;
    const safe = new Set(['pgbouncer', 'connection_limit', 'pool_timeout', 'connect_timeout', 'sslmode']);
    params = Object.fromEntries([...u.searchParams.entries()].filter(([k]) => safe.has(k)));
  } catch {
    /* no URL */
  }
  return { selectOneMs: timings, port, params };
}

export async function GET(req: NextRequest) {
  const db = req.nextUrl.searchParams.get('db') === '1' ? await dbProbe().catch(() => ({ error: true })) : undefined;
  return NextResponse.json(
    {
      ok: true,
      ts: Date.now(),
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT)?.slice(0, 7) ?? null,
      ...(db ? { db } : {}),
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
}
