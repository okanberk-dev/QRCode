import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members/[id] — full detail for the member detail page.
// Returns user fields + counts (restaurants, feedback last 30d, invoices,
// team) + linked subscription summary (admin-readable).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      trialEndsAt: true,
      isActive: true,
      deactivatedAt: true,
      lastInvitedAt: true,
      lastTrialReminderAt: true,
      locale: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { restaurants: true } },
    },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  // Feedback count last 30d across owned restaurants.
  const restaurantIds = (
    await prisma.restaurant.findMany({ where: { userId: id }, select: { id: true } })
  ).map((r) => r.id);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [feedbackCount30d, invoiceCount, teamCount, subscription] = await Promise.all([
    restaurantIds.length === 0
      ? 0
      : prisma.feedback.count({
          where: { restaurantId: { in: restaurantIds }, createdAt: { gte: since } },
        }),
    prisma.billingInvoice.count({ where: { userId: id } }),
    prisma.teamMember.count({ where: { ownerId: id } }),
    prisma.billingSubscription.findUnique({
      where: { userId: id },
      select: {
        plan: true,
        status: true,
        renewsAt: true,
        amount: true,
        currency: true,
        billingCycle: true,
      },
    }),
  ]);

  return NextResponse.json({
    user,
    counts: {
      restaurants: user._count.restaurants,
      feedbackLast30d: feedbackCount30d,
      invoices: invoiceCount,
      teamMembers: teamCount,
    },
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          renewsAt: subscription.renewsAt?.toISOString() ?? null,
          amount: subscription.amount ? Number(subscription.amount) : null,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
        }
      : null,
  });
}

// PUT /api/admin/members/[id] — update plan, isActive, trialEndsAt
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { plan, isActive, trialEndsAt } = body;

    const validPlans = ['trial', 'monthly', 'yearly', 'free'];
    const data: Prisma.UserUpdateInput = {};

    if (plan !== undefined) {
      if (!validPlans.includes(plan)) {
        return NextResponse.json({ error: 'Geçersiz plan değeri' }, { status: 400 });
      }
      data.plan = plan;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
      // Keep deactivatedAt in sync — deactivate writes the timestamp,
      // reactivate clears it. Quick edit (PUT) and the dedicated
      // /reactivate endpoint converge on the same shape.
      data.deactivatedAt = isActive ? null : new Date();
    }

    if (trialEndsAt !== undefined) {
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        isActive: true,
        deactivatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('[MEMBERS PUT]', error);
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 });
  }
}

// DELETE /api/admin/members/[id] — soft delete (deactivate). User stays in DB
// (restaurants, invoices, audit trail preserved); login is blocked by the
// existing isActive guard. Reversible via /reactivate.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true, email: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  if (!user.isActive) {
    return NextResponse.json({ ok: true, alreadyDeactivated: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.members.deactivate',
        targetId: id,
        payload: { email: user.email },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
