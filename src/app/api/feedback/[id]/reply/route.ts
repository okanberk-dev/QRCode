import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { sendMail } from '@/lib/email';
import { isValidEmail } from '@/lib/validations';

export const dynamic = 'force-dynamic';

async function requireFeedbackAccess(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      rating: true,
      email: true,
      name: true,
      comment: true,
      restaurant: { select: { name: true, notificationEmail: true } },
    },
  });
  if (!feedback) return { error: 'not_found' as const, status: 404 };

  if (actor.role !== 'superadmin') {
    if (!feedback.restaurantId) return { error: 'forbidden' as const, status: 403 };
    const ok = await canAccessRestaurant(actor, feedback.restaurantId);
    if (!ok) return { error: 'forbidden' as const, status: 403 };
  }

  return { actor, feedback };
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReplyEmail(opts: {
  restaurantName: string;
  customerName: string | null;
  originalComment: string | null;
  replyBody: string;
  locale: 'tr' | 'en';
}): { subject: string; html: string; text: string } {
  const { restaurantName, customerName, originalComment, replyBody, locale } = opts;
  const firstName = customerName?.split(' ')[0] ?? null;
  const greeting = firstName
    ? locale === 'tr' ? `Merhaba ${firstName},` : `Hi ${firstName},`
    : locale === 'tr' ? 'Merhaba,' : 'Hi,';

  const intro =
    locale === 'tr'
      ? `${restaurantName} olarak geri bildiriminizi aldık ve bizim için çok değerli. İşletmemiz adına yanıtımızı aşağıda paylaşıyoruz:`
      : `Thank you for your feedback at ${restaurantName}. On behalf of our team, please find our reply below:`;
  const outro =
    locale === 'tr'
      ? 'Bu mesajı yanıtlayarak bize ulaşmaya devam edebilirsiniz. İyi günler dileriz.'
      : 'Feel free to reply to this email if you would like to stay in touch. Best regards,';
  const signature = locale === 'tr' ? `— ${restaurantName}` : `— ${restaurantName}`;
  const subject =
    locale === 'tr'
      ? `${restaurantName} — geri bildiriminize yanıt`
      : `${restaurantName} — a reply to your feedback`;

  const commentBlock = originalComment
    ? locale === 'tr'
      ? `\n\nSizin yorumunuz:\n"${originalComment}"`
      : `\n\nYour feedback:\n"${originalComment}"`
    : '';

  const text = [
    greeting,
    '',
    intro,
    '',
    replyBody,
    '',
    outro,
    signature,
    commentBlock,
  ].join('\n').trim();

  const commentHtml = originalComment
    ? `<div style="margin-top:24px;padding:16px;border-left:3px solid #EDEDED;background:#FAFAFA;font-size:13px;color:#525252;">
      <p style="margin:0 0 6px 0;font-weight:600;color:#0A0A0A;">${locale === 'tr' ? 'Sizin yorumunuz' : 'Your feedback'}</p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(originalComment)}</p>
    </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0A0A0A;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;">
    <tr>
      <td style="background:#ffffff;border-radius:14px;padding:28px 24px;">
        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#737373;">${escapeHtml(restaurantName)}</p>
        <h1 style="margin:0 0 18px 0;font-size:20px;font-weight:600;color:#0A0A0A;">${escapeHtml(greeting)}</h1>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#525252;">${escapeHtml(intro)}</p>
        <div style="padding:14px 16px;background:#EAF9B8;border-radius:10px;font-size:14px;line-height:1.6;color:#0A0A0A;white-space:pre-wrap;">${escapeHtml(replyBody)}</div>
        <p style="margin:22px 0 0 0;font-size:13px;line-height:1.6;color:#737373;">${escapeHtml(outro)}</p>
        <p style="margin:6px 0 0 0;font-size:13px;color:#0A0A0A;font-weight:500;">${escapeHtml(signature)}</p>
        ${commentHtml}
      </td>
    </tr>
    <tr>
      <td style="padding-top:12px;text-align:center;font-size:11px;color:#9CA3AF;">
        ${escapeHtml(locale === 'tr' ? 'Bu e-posta Buaze üzerinden iletilmiştir.' : 'Sent via Buaze.')}
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { body?: string; channel?: string; sendEmail?: boolean; locale?: 'tr' | 'en' } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return NextResponse.json({ error: 'empty_body' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'body_too_long' }, { status: 413 });

  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';
  const requestedEmail = body.channel === 'email' || body.sendEmail === true;
  const customerEmail = access.feedback.email;

  // Decide delivery. 4-5★ redirects don't capture email in most flows, so
  // the reply is internal-only unless an email is actually on file.
  let channel: 'internal' | 'email' = 'internal';
  let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
  let emailReason: string | null = null;

  if (requestedEmail) {
    if (!customerEmail || !isValidEmail(customerEmail)) {
      emailReason = 'no_customer_email';
    } else {
      channel = 'email';
    }
  }

  const reply = await prisma.feedbackReply.create({
    data: {
      feedbackId: id,
      authorUserId: access.actor.id,
      body: text.slice(0, 2000),
      channel,
      status: channel === 'email' ? 'pending' : 'sent',
    },
  });

  if (channel === 'email' && customerEmail) {
    const mail = formatReplyEmail({
      restaurantName: access.feedback.restaurant?.name ?? 'Buaze',
      customerName: access.feedback.name,
      originalComment: access.feedback.comment,
      replyBody: text,
      locale,
    });

    try {
      const ok = await sendMail({
        to: customerEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: access.feedback.restaurant?.notificationEmail ?? undefined,
      });
      if (ok) {
        emailStatus = 'sent';
        await prisma.feedbackReply.update({
          where: { id: reply.id },
          data: { status: 'sent' },
        });
      } else {
        emailStatus = 'failed';
        emailReason = 'resend_failed';
        await prisma.feedbackReply.update({
          where: { id: reply.id },
          data: { status: 'failed' },
        });
      }
    } catch (err) {
      emailStatus = 'failed';
      emailReason = 'exception';
      console.error('[feedback/reply] email send failed', err);
      await prisma.feedbackReply.update({
        where: { id: reply.id },
        data: { status: 'failed' },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    reply: {
      id: reply.id,
      body: reply.body,
      channel,
      status: emailStatus === 'sent' ? 'sent' : channel === 'internal' ? 'sent' : 'failed',
      createdAt: reply.createdAt.toISOString(),
    },
    email: {
      status: emailStatus,
      reason: emailReason,
      requested: requestedEmail,
      hasCustomerEmail: Boolean(customerEmail),
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireFeedbackAccess(req, id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const replies = await prisma.feedbackReply.findMany({
    where: { feedbackId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    feedbackId: id,
    replies: replies.map((r) => ({
      id: r.id,
      body: r.body,
      channel: r.channel,
      status: r.status,
      authorUserId: r.authorUserId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
