import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { loadAdminMemberDetail } from '@/lib/admin-member-detail';

// GET /api/admin/members/[id] — full detail for the member detail page.
// Returns user fields + counts (restaurants, feedback last 30d, invoices,
// team) + linked subscription summary (admin-readable).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Stage A2 §38.94 — RBAC: members:read.
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'members', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;

  // Shared with the server-rendered detail page (src/lib/admin-member-detail.ts).
  const detail = await loadAdminMemberDetail(id);
  if (!detail) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  return NextResponse.json(detail);
}

// PUT /api/admin/members/[id] — update plan, isActive, trialEndsAt
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Stage A2 §38.94 — RBAC: members:write.
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'members', 'write'))) {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });

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

    let deactivating = false;
    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
      // Keep deactivatedAt in sync — deactivate writes the timestamp,
      // reactivate clears it. Quick edit (PUT) and the dedicated
      // /reactivate endpoint converge on the same shape.
      data.deactivatedAt = isActive ? null : new Date();
      deactivating = !data.isActive;
    }

    if (trialEndsAt !== undefined) {
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }

    // Capture before-state for the audit payload so we can diff later if
    // ops needs to inspect a "who downgraded this owner?" chain.
    const before = await prisma.user.findUnique({
      where: { id },
      select: { plan: true, isActive: true, trialEndsAt: true, email: true },
    });

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

    // Force-logout the owner when the admin flips them to inactive.
    // Without this the owner's existing user_token cookie keeps working
    // until expiry — login flow rejects new logins via `isActive`, but
    // already-issued JWTs were treated as valid and let a deactivated
    // owner keep loading panel pages and posting to scoped APIs.
    if (deactivating) {
      try {
        await prisma.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch (err) {
        console.error('[MEMBERS PUT] session revoke failed:', (err as Error).message);
      }
    }

    // Audit log — POST + DELETE already log; PUT was the only mutation
    // that wasn't traceable. Best-effort.
    try {
      await prisma.adminAuditLog.create({
        data: {
          actorId: adminId,
          actorSource: 'admin',
          action: 'admin.members.update',
          targetId: id,
          payload: {
            before: before ? { plan: before.plan, isActive: before.isActive, trialEndsAt: before.trialEndsAt } : null,
            after: { plan: user.plan, isActive: user.isActive, trialEndsAt: user.trialEndsAt },
            email: before?.email ?? user.email,
            sessionsRevoked: deactivating,
          },
        },
      });
    } catch (err) {
      console.warn('[audit] members.update write failed (non-fatal)', (err as Error).message);
    }

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
  // Stage A2 §38.94 — RBAC: members:delete (destructive — soft delete).
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'members', 'delete'))) {
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

  // Force-logout the owner — same rationale as the PUT path. Best-effort,
  // outside the transaction: a session-revoke hiccup must not undo the
  // deactivation we already committed.
  try {
    await prisma.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    console.error('[MEMBERS DELETE] session revoke failed:', (err as Error).message);
  }

  return NextResponse.json({ ok: true });
}
