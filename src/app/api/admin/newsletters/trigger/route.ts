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
 */
export async function POST(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  try {
    const result = await runMonthlyNewsletter();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ADMIN_NEWSLETTER_TRIGGER]', err);
    return NextResponse.json(
      { error: 'send_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
