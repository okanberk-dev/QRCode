/** Small helpers shared by the /api/customer routes (CLAUDE.md §61). */
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { CustomerAccountError } from '@/lib/customer-account';

export async function limited(key: string, max: number, windowMs: number): Promise<NextResponse | null> {
  const r = await rateLimit(key, max, windowMs);
  if (r.allowed) return null;
  return NextResponse.json(
    { error: 'rate_limit', code: 'RATE_LIMIT' },
    { status: 429, headers: { 'Retry-After': String(r.retryAfterSeconds) } },
  );
}

export function fail(code: string, status = 400): NextResponse {
  return NextResponse.json({ error: code, code }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function accountErrorResponse(err: unknown): NextResponse {
  if (err instanceof CustomerAccountError) return fail(err.code, err.status);
  console.error('[customer] unexpected error', { error: err instanceof Error ? err.name : 'unknown' });
  return fail('INTERNAL', 500);
}

export function parseLocale(v: unknown): 'tr' | 'en' {
  return v === 'en' ? 'en' : 'tr';
}
