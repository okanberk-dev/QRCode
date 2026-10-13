// Denetim Merkezi — "Dikkat edilecek maddeler" özeti (spec §6.4).
//
//   GET /api/restaurants/[id]/audits/templates/[tplId]/summary?range=7d|30d|90d|all
//
// Her cevap GÜNCEL soru tanımına göre değerlendirilir (`misses.ts`); depolanmış
// `autoScore` KULLANILMAZ (eski satırlarda not/fotoğraf için 0 yazılı). Puanlanamayan
// sorular (not, fotoğraf, doğru cevabı olmayan evet/hayır) hiç okunmaz —
// fotoğraf `value`'ları (büyük data URL) böylece asla çekilmez. PII yok.
//
// Yanıt: { items: [{ questionId, prompt, type, answered, missed, missRate }],
//          total, truncated } — missRate azalan, missed > 0, en çok 20
//          (UI ilk 5'i gösterir); satır üst sınırına (20.000) takılırsa truncated.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { queryAuditMissSummary } from '@/lib/audits/queries';

type Params = { id: string; tplId: string };

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  // Şablon bu işletmeye ait mi? (başka işletmenin id'si 403, yabancı şablon 404)
  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: id },
    select: { id: true },
  });
  if (!tpl) return ApiErrors.notFound('Şablon bulunamadı');

  const range = new URL(req.url).searchParams.get('range');
  const summary = await queryAuditMissSummary({ templateId: tplId, restaurantId: id, range });

  return NextResponse.json(summary, {
    headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120' },
  });
}
