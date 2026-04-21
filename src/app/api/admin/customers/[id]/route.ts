import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin: any = await getAdminFromRequest(req);
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

    const data: any = {};
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

    if (normalizedRestaurantIds) {
      const existingRestaurants = await prisma.restaurant.findMany({
        where: { id: { in: normalizedRestaurantIds } },
        select: { id: true },
      });

      if (existingRestaurants.length !== normalizedRestaurantIds.length) {
        return NextResponse.json({ error: 'Seçilen işletmelerden biri bulunamadı.' }, { status: 400 });
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('[ADMIN_CUSTOMER_PUT]', error);
    return NextResponse.json({ error: 'Müşteri güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin: any = await getAdminFromRequest(req);
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
