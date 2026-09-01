import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
import { isValidEmail, isStrongPassword } from '@/lib/validations';
import { PLAN_LABELS } from '@/lib/constants';
import { executeUserHardDelete } from '@/lib/user-hard-delete';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, email, plan, isActive, password, trialEndsAt, restaurantIds } = body;

    // §38.238 — this endpoint writes plan / password / e-mail / isActive
    // straight into Prisma. It previously validated none of them, so a
    // malformed e-mail, a one-character password or an arbitrary plan string
    // (which downstream quota lookups key on) all persisted silently.
    if (email !== undefined && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Geçersiz e-posta adresi.' }, { status: 400 });
    }
    if (plan !== undefined && !Object.prototype.hasOwnProperty.call(PLAN_LABELS, plan)) {
      return NextResponse.json({ error: 'Geçersiz paket.' }, { status: 400 });
    }
    if (password !== undefined && !isStrongPassword(password)) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter olmalı ve harf + rakam içermeli.' },
        { status: 400 },
      );
    }
    if (name !== undefined && (typeof name !== 'string' || name.length > 200)) {
      return NextResponse.json({ error: 'Geçersiz ad.' }, { status: 400 });
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Geçersiz durum.' }, { status: 400 });
    }

    // Check if updating email conflicts with another user
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email: email.toLowerCase().trim(), id: { not: id } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Bu e-posta adresi başka bir hesaba ait.' }, { status: 400 });
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email.toLowerCase().trim();
    if (plan !== undefined) data.plan = plan;
    if (isActive !== undefined) data.isActive = isActive;
    if (trialEndsAt !== undefined) {
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    } else if (plan && plan !== 'trial') {
      data.trialEndsAt = null;
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    }

    const normalizedRestaurantIds = Array.isArray(restaurantIds)
      ? restaurantIds.filter((restaurantId): restaurantId is string => typeof restaurantId === 'string' && restaurantId.trim().length > 0)
      : null;

    let reassignedFrom: { restaurantId: string; previousOwnerId: string }[] = [];

    if (normalizedRestaurantIds) {
      const existingRestaurants = await prisma.restaurant.findMany({
        where: { id: { in: normalizedRestaurantIds } },
        select: { id: true, userId: true },
      });

      if (existingRestaurants.length !== normalizedRestaurantIds.length) {
        return NextResponse.json({ error: 'Seçilen işletmelerden biri bulunamadı.' }, { status: 400 });
      }

      // Audit: surface restaurants currently owned by a different user.
      reassignedFrom = existingRestaurants
        .filter(r => r.userId && r.userId !== id)
        .map(r => ({ restaurantId: r.id, previousOwnerId: r.userId as string }));

      if (reassignedFrom.length > 0) {
        console.warn('[ADMIN_CUSTOMER_PUT] Restaurant reassignment', { admin: admin.id, newOwner: id, reassignedFrom });
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data,
        select: { id: true, email: true, name: true, plan: true, isActive: true }
      });

      if (normalizedRestaurantIds) {
        await tx.restaurant.updateMany({
          where: {
            userId: id,
            id: { notIn: normalizedRestaurantIds }
          },
          data: { userId: null }
        });

        if (normalizedRestaurantIds.length > 0) {
          await tx.restaurant.updateMany({
            where: { id: { in: normalizedRestaurantIds } },
            data: { userId: id }
          });
        }
      }

      // §38.238 — CLAUDE.md §37.2.A requires revoking live sessions whenever
      // a password is forced or an account is deactivated. This route did
      // neither, so an admin resetting a compromised customer's password (or
      // deactivating the account outright) left the attacker's existing
      // `user_token` cookie working until it expired on its own.
      if (password || isActive === false) {
        await tx.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updatedUser;
    });

    return NextResponse.json({ ...user, reassignedFrom });
  } catch (error) {
    console.error('[ADMIN_CUSTOMER_PUT]', error);
    return NextResponse.json({ error: 'Müşteri güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  // Only superadmins can delete customers
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // §38.238 — this used to be a bare `prisma.user.delete()`. Because
    // `restaurants.user_id` is ON DELETE SET NULL (not cascade), that deleted
    // the User row and nothing else: the customer's restaurants stayed live on
    // the public /r/[slug] surface with every Feedback row (name / e-mail /
    // phone / comment / IP) intact, and the OAuth refresh token, API keys and
    // team-member records were never touched. It also wrote no audit row and
    // did not anonymize invoices. Delegate to the shared helper, which does
    // all of it inside one transaction.
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }

    const stats = await executeUserHardDelete(target.id, target.email, {
      id: typeof admin.id === 'string' ? admin.id : null,
      source: 'admin',
      action: 'admin.customers.hard_delete',
    });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('[ADMIN_CUSTOMER_DELETE]', {
      customerId: id,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : '',
    });
    return NextResponse.json({ error: 'Müşteri silinemedi' }, { status: 500 });
  }
}
