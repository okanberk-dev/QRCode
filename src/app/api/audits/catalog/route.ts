// CLAUDE.md §42 — Global audit template catalog (owner browse).
//
// Yayınlanan (restaurantId=null + isPublished=true + isActive=true) şablonları
// listeler. Auth gerekir ama scope-free: login olmuş herkes (owner/manager/
// admin) okuyabilir. Filter: sektör + kategori.
//
// `select` minimum — soru detaylarını burada vermez. Owner kataloğa bakıp
// fork ettiğinde tam içerik fork endpoint'inden gelir (server-side kopya).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { AUDIT_SECTORS } from '@/lib/audits/types';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get('sector');
  const categoryId = searchParams.get('categoryId');

  const where: Record<string, unknown> = {
    restaurantId: null,
    isPublished: true,
    isActive: true,
  };
  if (sector && (AUDIT_SECTORS as readonly string[]).includes(sector)) {
    where.sector = sector;
  }
  if (categoryId) where.categoryId = categoryId;

  const templates = await prisma.auditTemplate.findMany({
    where,
    orderBy: [{ sector: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      categoryId: true,
      category: { select: { id: true, slug: true, labelTr: true, labelEn: true } },
      publishedAt: true,
      _count: { select: { questions: true } },
    },
    take: 200,
  });

  // Kategorileri ayrıca dön (filter chip için). Cheap query — küçük tablo.
  const categories = await prisma.auditCategory.findMany({
    orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
    select: { id: true, slug: true, labelTr: true, labelEn: true, sector: true, iconKey: true },
  });

  return NextResponse.json({ data: templates, categories });
}
