import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { notifyOpsOfMailFailure } from '@/lib/email/ops-alert';

export const dynamic = 'force-dynamic';

/**
 * Phase 8 follow-up — production-safe smoke test for the ops alert
 * pipeline. Calls `notifyOpsOfMailFailure` directly with synthetic
 * params, so no Resend round-trip happens for the "primary" mail; only
 * the alert mail itself is dispatched. Lets ops verify
 * OPS_EMAIL / NOTIFICATION_EMAIL / SPF / DKIM / inbox routing without
 * touching `RESEND_API_KEY` or staging a fake low-rating feedback.
 *
 * Rate-limited 3 / hour / admin so a stuck button can't bomb ops.
 */
export async function POST(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const adminId = admin.id ?? admin.userId ?? 'unknown';
  const limit = rateLimit(`ops-alert-test:${adminId}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  await notifyOpsOfMailFailure({
    template: '__manual_test',
    recipient: admin.email ?? 'unknown@admin',
    reason: 'Manual smoke test triggered from /admin/mail-templates',
    metadata: {
      triggeredBy: admin.email ?? adminId,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    },
  });

  return NextResponse.json({
    ok: true,
    note: 'notifyOpsOfMailFailure dispatched. Check OPS_EMAIL / NOTIFICATION_EMAIL inbox. If nothing arrives within 60s, see app logs for "[ops-alert]" entries.',
  });
}
