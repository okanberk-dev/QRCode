import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { getErrorCode } from '@/lib/api-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const hasAccess = await canAccessRestaurant(actor, id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    try {
      const history = await prisma.qrGeneration.findMany({
        where: { restaurantId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          qrUrl: true,
          tableNumber: true,
          platform: true,
          createdAt: true,
        },
      });
      return NextResponse.json(history, { status: 200 });
    } catch (innerError: any) {
      // Only swallow the case where the table hasn't been migrated yet.
      if (innerError?.code === 'P2021') {
        return NextResponse.json([], { status: 200 });
      }
      throw innerError;
    }
  } catch (error) {
    console.error('QR history fetch error:', error);
    return NextResponse.json({ error: 'QR geçmişi alınamadı' }, { status: 500 });
  }
}
