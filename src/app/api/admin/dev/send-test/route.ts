import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { isPreviewTemplate, SEEDS, type PreviewTemplate } from '@/app/api/dev/email-preview/seeds';
import { renderTemplate } from '@/app/api/dev/email-preview/route';

export const dynamic = 'force-dynamic';

/**
 * Admin "Test mail at" endpoint. Sends a Pulse template, rendered with seed
 * (or compose-time override) data, to the calling admin's own email address.
 * Originally dev-only but enabled in production so operators can verify
 * mail content after editing. Safety: superadmin only, rate-limited
 * 10/5min, can only target the calling admin's own DB email — no way to
 * spam arbitrary recipients via this endpoint.
 */
export async function POST(req: NextRequest) {

  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  // Rate limit per admin: 10 test mails / 5 min. Resend free tier is 10
  // mails/sec; this stops a misclick or a stuck "Test mail" button from
  // exhausting the daily quota.
  const adminId = admin.id ?? admin.userId ?? 'unknown';
  const limit = rateLimit(`mail-test:${adminId}`, 10, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

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

  // Wrap the rest in try/catch so any unhandled exception (Prisma down,
  // missing table, render fn throw) returns a structured JSON 500
  // instead of Next.js's default empty-body 500. Client always
  // `await res.json()`s so an empty body crashed with the opaque
  // "Unexpected end of JSON input" — operator couldn't tell what broke.
  try {
    // Look up the admin's email — `getAdminFromRequest` returns the JWT
    // payload which doesn't always include the latest email field.
    const adminRow = await prisma.adminUser.findUnique({
      where: { id: admin.id ?? admin.userId },
      select: { email: true, username: true },
    });
    const recipient = adminRow?.email || (admin.email as string | undefined);
    if (!recipient) {
      return NextResponse.json({ error: 'no_admin_email' }, { status: 400 });
    }

    // For newsletter, fold in compose-time overrides so admins can dry-run
    // the exact campaign body before scheduling/sending.
    const search = new URLSearchParams();
    if (template === 'newsletter') {
      if (typeof body.customTitle === 'string') search.set('title', body.customTitle);
      if (typeof body.customIntro === 'string') search.set('intro', body.customIntro);
      if (Array.isArray(body.postIds)) search.set('postIds', body.postIds.join(','));
    }
    // form-confirmation has 4 variants — admin's active editor tab tells
    // us which one to render. Defaults to 'contact' if missing.
    if (template === 'form-confirmation' && typeof body.variant === 'string') {
      search.set('variant', body.variant);
    }

    const rendered = await renderTemplate(template as PreviewTemplate, locale, search);
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
  } catch (err) {
    // Real error stays in Vercel logs; client gets a sanitised summary
    // (no stack trace leak) plus a discriminator the UI can switch on.
    console.error('[send-test] unhandled error:', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      {
        error: 'server_error',
        detail: message,
        hint: 'Vercel Function Logs → /api/admin/dev/send-test → tam stack trace',
      },
      { status: 500 },
    );
  }
}
