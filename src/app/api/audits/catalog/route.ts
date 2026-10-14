// CLAUDE.md §42 — Global audit template catalog (owner browse).
//
// Yayınlanan (restaurantId=null + isPublished=true + isActive=true) şablonları
// listeler. Auth gerekir ama scope-free: login olmuş herkes (owner/manager/
// admin) okuyabilir. Filter: sektör + kategori.
//
// Spec §6.2 — her şablonda `kind` ('checklist' | 'quiz') ve ilk 30 maddenin
// { type, prompt, isRequired, sortOrder } özeti döner (önizleme için ayrı bir
// endpoint yok; ~25 şablonluk katalog bununla hydrate edilir). `correctAnswer`
// ve `options` ASLA dönmez — sahip kataloğa bakarken doğru cevapları görmez.
// Aynı sorgu liste sayfasının server hydration'ında kullanılır (`queries.ts`).

import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { AUDIT_SECTORS } from '@/lib/audits/types';
import { CATALOG_ROUTE_TAKE, listCatalogForOwner } from '@/lib/audits/queries';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get('sector');
  const categoryId = searchParams.get('categoryId');

  const { data, categories } = await listCatalogForOwner({
    sector: sector && (AUDIT_SECTORS as readonly string[]).includes(sector) ? sector : null,
    categoryId: categoryId || null,
    take: CATALOG_ROUTE_TAKE,
  });

  return NextResponse.json(
    { data, categories },
    // Katalog sık değişmez ve kullanıcıya özgü değildir ama auth gerektirir →
    // `private` (CLAUDE.md §40.6 owner-scoped okuma paterni).
    { headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=900' } },
  );
}
