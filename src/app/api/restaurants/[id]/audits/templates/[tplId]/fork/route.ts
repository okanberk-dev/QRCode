// CLAUDE.md §42 — Global şablonu owner restoranına fork et.
//
// Source: AuditTemplate where restaurantId=null AND isPublished=true.
// Output: yeni AuditTemplate where restaurantId=<owner restoran>,
// isPublished=false (taslak). Owner sonra düzenler veya yayınlar.
//
// Spec §6.1 — opsiyonel gövde (boş/eksik gövde = eski davranış):
//   { publish?: boolean, shareLink?: boolean }
//   • publish   : fork doğrudan yayında oluşur
//   • shareLink : (publish'i ima eder) AYNI transaction'da bir paylaşım linki
//                 (assigneeType 'link', recurrence 'daily', token) oluşturulur
//   Hazır şablon listesindeki "Kullan" tek tık: fork + yayın + link, yanıt
//   `201 { data: { id, title, token? } }`.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { generateAuditAssignmentToken } from '@/lib/audits/token';

type Params = { id: string; tplId: string };

const Body = z
  .object({
    publish: z.boolean().optional(),
    shareLink: z.boolean().optional(),
  })
  .strict();

type ParsedBody = z.infer<typeof Body>;

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id, tplId } = await ctx.params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const rl = await rateLimit(`audits:fork:${actor.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds || 60 },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds || 60) } },
    );
  }

  // Boş / eksik / `null` gövde = eski davranış (taslak fork). Yalnız `{}`-benzeri
  // nesneler Zod'dan geçer; dizi veya string gövde 400.
  const rawBody = await req.json().catch(() => ({}));
  const parsed = validateBody<ParsedBody>(Body, rawBody ?? {});
  if (!parsed.ok) return parsed.response;
  const wantsShareLink = parsed.data.shareLink === true;
  const wantsPublish = parsed.data.publish === true || wantsShareLink;

  const src = await prisma.auditTemplate.findFirst({
    where: { id: tplId, restaurantId: null, isPublished: true, isActive: true },
    select: {
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      categoryId: true,
      questions: {
        orderBy: { sortOrder: 'asc' },
        select: {
          type: true,
          prompt: true,
          helpText: true,
          options: true,
          correctAnswer: true,
          weight: true,
          isRequired: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!src) return ApiErrors.notFound('Yayınlanmış global şablon bulunamadı');

  // Yayın için en az 1 soru (boş bir kaynak yayınlanamaz).
  if (wantsPublish && src.questions.length === 0) {
    return ApiErrors.badRequest('Yayın için en az 1 soru gerekli', 'NO_QUESTIONS');
  }

  // Token transaction'dan ÖNCE üretilir (templates POST ile aynı örüntü):
  // üretim DB okur, interaktif transaction içinde pool'u bloklamasın.
  const token = wantsShareLink ? await generateAuditAssignmentToken() : null;

  const created = await prisma.$transaction(async (tx) => {
    const tpl = await tx.auditTemplate.create({
      data: {
        restaurantId: id,
        categoryId: src.categoryId,
        title: src.title,
        description: src.description,
        sector: src.sector,
        scoringMode: src.scoringMode,
        passingScore: src.passingScore,
        locale: src.locale,
        isPublished: wantsPublish,
        publishedAt: wantsPublish ? new Date() : null,
        isActive: true,
        createdBy: actor.source,
        createdById: actor.id,
        // CLAUDE.md §40.2 — kaynak template'i kaydet ki owner "Varsayılana
        // sıfırla" tıkladığında reset endpoint kaynağı resolve edebilsin.
        forkedFromId: tplId,
        questions: {
          create: src.questions.map((q) => ({
            type: q.type,
            prompt: q.prompt,
            helpText: q.helpText,
            options: q.options === null ? undefined : (q.options as unknown as object),
            correctAnswer:
              q.correctAnswer === null ? undefined : (q.correctAnswer as unknown as object),
            weight: q.weight,
            isRequired: q.isRequired,
            sortOrder: q.sortOrder,
          })),
        },
      },
      select: { id: true, title: true },
    });

    if (token) {
      await tx.auditAssignment.create({
        data: {
          templateId: tpl.id,
          restaurantId: id,
          assigneeType: 'link',
          recurrence: 'daily',
          status: 'pending',
          token,
          createdBy: actor.source,
          createdById: actor.id,
        },
        select: { id: true },
      });
    }

    return tpl;
  });

  return NextResponse.json(
    { data: { id: created.id, title: created.title, ...(token ? { token } : {}) } },
    { status: 201 },
  );
}
