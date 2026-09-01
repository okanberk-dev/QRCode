import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteFeedback } from '@/lib/panel-access';
import { sendCustomerReplyEmail } from '@/lib/email';
import { isValidEmail } from '@/lib/validations';
import { moderateReplyContent } from '@/lib/content-safety';

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

  // Role-based write gate (TeamMember 'viewer' rolü read-only).
  // canAccessRestaurant zaten requireFeedbackAccess'te yapıldı; canWriteFeedback
  // role check'i ekler. superadmin / restaurant_owner / manager (admin) /
  // team_member (viewer dışı) izinli.
  if (access.feedback.restaurantId) {
    const canWrite = await canWriteFeedback(access.actor, access.feedback.restaurantId);
    if (!canWrite) {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }
  }

  let body: {
    body?: string;
    channel?: string;
    sendEmail?: boolean;
    locale?: 'tr' | 'en';
    source?: string;
    confirmResponsibility?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return NextResponse.json({ error: 'empty_body' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'body_too_long' }, { status: 413 });

  // Per-message responsibility acknowledgement — the sender confirms the
  // content is theirs and they carry sole liability for it. Required on
  // every send, not just once at signup: the UI resets the checkbox after
  // each reply and this is the server-side enforcement of that gate.
  if (body.confirmResponsibility !== true) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 });
  }

  // Legal-risk content gate — threats, harassment, hate speech. Runs before
  // any DB write or email dispatch; a blocked reply never reaches the
  // customer and never gets persisted. See src/lib/content-safety.ts.
  const safety = await moderateReplyContent(text);
  if (safety.blocked) {
    return NextResponse.json(
      { error: 'content_blocked', reason: safety.reason, categories: safety.categories },
      { status: 422 },
    );
  }

  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';
  const requestedEmail = body.channel === 'email' || body.sendEmail === true;
  const customerEmail = access.feedback.email;

  // `source` lets us tell apart manual replies from those approved off a
  // Pulse AI draft. Trial-ending mail surfaces this as the AI-reply count;
  // unknown values fall back to 'manual' so a misbehaving client can't poison
  // analytics.
  const ALLOWED_SOURCES = new Set(['manual', 'ai_copilot', 'template_fallback']);
  const replySource = ALLOWED_SOURCES.has(body.source ?? '') ? (body.source as string) : 'manual';

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
      source: replySource,
    },
  });

  // Pulse AI draft consumed — clean up so the inbox no longer surfaces a
  // pending-draft badge for this feedback. Defensive try/catch in case the
  // FeedbackAiDraft table hasn't been pushed (preview without `prisma db
  // push`); reply success must not depend on this.
  try {
    await prisma.feedbackAiDraft.deleteMany({ where: { feedbackId: id } });
  } catch (err) {
    console.error('[feedback/reply] draft cleanup failed (non-fatal):', err);
  }

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
