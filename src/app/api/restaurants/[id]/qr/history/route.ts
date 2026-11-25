import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { dedupeQrRows } from '@/lib/qr-signature';
import { withServerTiming } from '@/lib/server-timing';

async function handleGET(
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

    const history = await getFeedbackQrHistory(id);
    // Stage 87 §38.167 — restaurant-scoped QR generation history;
    // cache header private 30s/120sw (QR generation periyodik, panel
    // sayfası medium-frequency view). §38.100 paterni reuse.
    return NextResponse.json(dedupeQrRows(history), {
      status: 200,
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('QR history fetch error:', error);
    return NextResponse.json({ error: 'QR geçmişi alınamadı' }, { status: 500 });
  }
}

async function getFeedbackQrHistory(restaurantId: string) {
  try {
    return await prisma.qrGeneration.findMany({
      where: { restaurantId, type: 'feedback' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        restaurantId: true,
        qrUrl: true,
        tableNumber: true,
        platform: true,
        serviceType: true,
        type: true,
        // Stage 96 — colour fields (nullable). Owner panel uses these to
        // re-render the same QR with the original palette on lazy preview
        // + explicit download.
        darkColor: true,
        lightColor: true,
        // Wave A — owner-chosen print/share template id (nullable for
        // legacy rows + programmatic regeneration paths).
        templateId: true,
        createdAt: true,
      },
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== 'P2021' && code !== 'P2022') throw error;

    const legacyRows = await prisma.qrGeneration.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        restaurantId: true,
        qrUrl: true,
        tableNumber: true,
        platform: true,
        createdAt: true,
      },
    }).catch((fallbackError) => {
      if ((fallbackError as { code?: string })?.code === 'P2021') return [];
      throw fallbackError;
    });

    return legacyRows.map((row) => ({
      ...row,
      serviceType: null,
      type: 'feedback',
      darkColor: null,
      lightColor: null,
      templateId: null,
    }));
  }
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
