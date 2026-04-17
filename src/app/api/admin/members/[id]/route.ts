import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

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
    const data: any = {};

    if (plan !== undefined) {
      if (!validPlans.includes(plan)) {
        return NextResponse.json({ error: 'Geçersiz plan değeri' }, { status: 400 });
      }
      data.plan = plan;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
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
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('[MEMBERS PUT]', error);
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 });
  }
}
