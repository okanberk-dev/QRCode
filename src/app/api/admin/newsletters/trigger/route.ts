import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { runMonthlyNewsletter } from '@/app/api/cron/monthly-newsletter/route';

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
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

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
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ADMIN_NEWSLETTER_TRIGGER]', err);
    return NextResponse.json(
      { error: 'send_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
