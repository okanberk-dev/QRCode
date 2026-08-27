import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { runMonthlyNewsletter } from '@/lib/monthly-newsletter';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// Same-region invocations of /api/cron/* via fetch were timing out at the
// Vercel gateway (cold start + 10s ceiling). We import and run the cron
// payload directly so admins get the real result + error message.
export const maxDuration = 60;

/**
 * Manual newsletter trigger (superadmin only). Calls the same logic the
 * monthly cron uses, but synchronously — no HTTP round-trip, no CRON_SECRET
 * forwarding. Admin auth alone gates this.
 *
 * Body (optional): `{ campaignId: string }` to send a specific campaign
 * instead of letting the cron's precedence rules pick. Admin compose UI
 * uses this when "Şimdi gönder" mode is selected.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  // A newsletter run is a GLOBAL side-effecting job that can take up to 250s.
  // Without a lock a double-click — or two admins clicking at once — started
  // two concurrent runs that could both pick up the same not-yet-marked
  // subscriber and mail them twice (§21.23: complaint rate is the metric that
  // gets a sending domain throttled). The window is longer than the maximum
  // run duration so runs are effectively serialised; a legitimate resume of an
  // incomplete run just waits for it.
  const lock = await rateLimit('newsletter-trigger:global', 1, 5 * 60 * 1000);
  if (!lock.allowed) {
    return NextResponse.json(
      {
        error: 'send_in_progress',
        message:
          'Bir bülten gönderimi son 5 dakika içinde tetiklendi. Tamamlanmasını bekleyin.',
        retryAfterSeconds: lock.retryAfterSeconds,
      },
      { status: 429, headers: { 'Retry-After': String(lock.retryAfterSeconds) } },
    );
  }

  let campaignId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.campaignId === 'string' && body.campaignId.length > 0) {
      campaignId = body.campaignId;
    }
  } catch {
    // body is optional — proceed without
  }

  try {
    const result = await runMonthlyNewsletter(campaignId ? { campaignId } : {});
    await writeAdminAuditLog({
      actorId: String(admin.id),
      actorSource: 'admin',
      action: 'admin.newsletters.trigger',
      targetId: campaignId ?? null,
      payload: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        complete: result.complete,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ADMIN_NEWSLETTER_TRIGGER]', err);
    return NextResponse.json(
      { error: 'send_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
