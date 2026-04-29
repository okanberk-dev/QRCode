import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members/[id]/restaurants — list of restaurants owned by this
// user, with feedback counts and brand metadata for the detail page tab.
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const restaurants = await prisma.restaurant.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      city: true,
      isActive: true,
      menuEnabled: true,
      menuPublished: true,
      primaryColor: true,
      createdAt: true,
      _count: { select: { feedbacks: true } },
    },
  });

  return NextResponse.json({
    data: restaurants.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      city: r.city,
      isActive: r.isActive,
      menuEnabled: r.menuEnabled,
      menuPublished: r.menuPublished,
      primaryColor: r.primaryColor,
      createdAt: r.createdAt.toISOString(),
      feedbackCount: r._count.feedbacks,
    })),
  });
}
