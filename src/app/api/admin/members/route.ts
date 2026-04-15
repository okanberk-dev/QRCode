import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members — list all registered restaurant owner users
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        isActive: true,
        createdAt: true,
        _count: { select: { restaurants: true } },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[MEMBERS GET]', error);
    return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 });
  }
}
