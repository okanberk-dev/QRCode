import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/email';
import { isPreviewTemplate, SEEDS, type PreviewTemplate } from '@/app/api/dev/email-preview/seeds';
import { renderTemplate } from '@/app/api/dev/email-preview/route';

export const dynamic = 'force-dynamic';

/**
 * Admin "Test mail at" endpoint. Sends a Pulse template, rendered with seed
 * (or compose-time override) data, to the calling admin's own email address.
 * Strictly dev/staging — production gets 404 so we don't accidentally fire
 * test mails from the real sender domain.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }

  const template: unknown = body.template;
  if (!isPreviewTemplate(template)) {
    return NextResponse.json(
      { error: 'invalid_template', allowed: Object.keys(SEEDS) },
      { status: 400 },
    );
  }

  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';

  // Look up the admin's email — `getAdminFromRequest` returns the JWT payload
  // which doesn't always include the latest email field.
  const adminRow = await prisma.adminUser.findUnique({
    where: { id: admin.id ?? admin.userId },
    select: { email: true, username: true },
  });
  const recipient = adminRow?.email || (admin.email as string | undefined);
  if (!recipient) {
    return NextResponse.json({ error: 'no_admin_email' }, { status: 400 });
  }

  // For newsletter, fold in compose-time overrides so admins can dry-run the
  // exact campaign body before scheduling/sending.
  const search = new URLSearchParams();
  if (template === 'newsletter') {
    if (typeof body.customTitle === 'string') search.set('title', body.customTitle);
    if (typeof body.customIntro === 'string') search.set('intro', body.customIntro);
    if (Array.isArray(body.postIds)) search.set('postIds', body.postIds.join(','));
  }

  const rendered = await renderTemplate(template as PreviewTemplate, locale, search);
  // Subject prefix to make test mails obviously test in any inbox.
  const subject = `[TEST] ${rendered.subject}`;

  const ok = await sendMail({
    to: recipient,
    subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (!ok) {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to: recipient, template, locale });
}
