import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const history = await prisma.qrGeneration.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        qrUrl: true,
        tableNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error('QR history fetch error:', error);
    return NextResponse.json({ error: 'QR geçmişi alınamadı' }, { status: 500 });
  }
}
