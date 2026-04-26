import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { sendCustomerReplyEmail } from '@/lib/email';
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
    try {
      const ok = await sendCustomerReplyEmail({
        to: customerEmail,
        customerName: access.feedback.name,
        restaurantName: access.feedback.restaurant?.name ?? 'Buaze',
        message: text,
        rating: access.feedback.rating,
        replyTo: access.feedback.restaurant?.notificationEmail ?? undefined,
        locale,
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
