import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, email, plan, isActive, password, trialEndsAt, restaurantIds } = body;

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
      data.passwordHash = await bcrypt.hash(password, 12);
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
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_CUSTOMER_DELETE]', error);
    return NextResponse.json({ error: 'Müşteri silinemedi' }, { status: 500 });
  }
}
