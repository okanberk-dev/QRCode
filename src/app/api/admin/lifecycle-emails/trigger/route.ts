import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';
import { runLifecycleEmails } from '@/lib/lifecycle-email-rules';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Admin manuel lifecycle email trigger (CLAUDE.md §21.37 + §23.7 Phase 11.31).
//
// Cron schedule'dan bağımsız, superadmin'in elle çalıştırabilmesi için.
// `runLifecycleEmails()` shared helper'ı (CLAUDE.md §21.13) doğrudan çağırır
// — self-fetch antipattern yok. Cron'la aynı idempotency kuralları uygular
// (LifecycleEmailLog kontrol).
//
// Rate limit: 5/dk/admin — yanlışlıkla spam tıklama / production'da test
// abuse'u önler.

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const rl = await rateLimit(`lifecycle-trigger:${admin.id}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla manuel tetik. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const summary = await runLifecycleEmails();
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trigger başarısız';
    console.error('[admin lifecycle-emails trigger] failed', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
