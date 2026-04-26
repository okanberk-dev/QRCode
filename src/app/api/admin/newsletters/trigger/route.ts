import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

/**
 * Manual newsletter trigger (superadmin only). Internally hits the
 * monthly-newsletter cron with the CRON_SECRET so the actual sending
 * logic stays in one place.
 */
export async function POST(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET_NOT_CONFIGURED' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;
  try {
    const res = await fetch(`${baseUrl}/api/cron/monthly-newsletter`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: 'cron_failed', detail: body }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ...body });
  } catch (e) {
    return NextResponse.json({ error: 'network_error', message: (e as Error).message }, { status: 502 });
  }
}
