import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  try {
    const customers = await prisma.user.findMany({
      where: { role: 'restaurant_owner' },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        isActive: true,
        locale: true,
        createdAt: true,
        restaurants: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error('[ADMIN_CUSTOMERS_GET]', error);
    return NextResponse.json({ error: 'Müşteriler getirilemedi' }, { status: 500 });
  }
}
