// CLAUDE.md §42 — Audit assignments (owner: list + create).
//
// UI'da "Paylaşım linki" (spec §3.3). Spec §6.9:
//   • GET: yazma yetkisi OLMAYAN (salt-okunur ekip üyesi) kullanıcılara `token`
//     alanı HİÇ dönmez — link token'ı bir yetkidir.
//   • POST: link oluşturma 30/dk/actor ile sınırlı. API varsayılan `recurrence`
//     'once' kalır (geriye dönük uyum); UI "Tek seferlik olsun" kapalıyken
//     açıkça 'daily' gönderir.

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors, getErrorCode, getErrorMessage } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import {
  AUDIT_ASSIGNEE_TYPES,
  AUDIT_ASSIGNMENT_STATUSES,
  AUDIT_RECURRENCES,
} from '@/lib/audits/types';
import { generateAuditAssignmentToken } from '@/lib/audits/token';
import { parseAuditDueAt } from '@/lib/audits/datetime';
import { listAuditAssignments } from '@/lib/audits/queries';
import { rateLimit } from '@/lib/rate-limit';

type Params = { id: string };

const Body = z
  .object({
    templateId: z.string().min(1),
    assigneeType: z.enum(AUDIT_ASSIGNEE_TYPES),
    assigneeTeamMemberId: z.string().min(1).nullable().optional(),
    assigneeName: z.string().max(200).nullable().optional(),
    assigneeEmail: z.string().email().nullable().optional().or(z.literal('')),
    assigneePhone: z.string().max(40).nullable().optional(),
    dueAt: z.string().nullable().optional(),
    recurrence: z.enum(AUDIT_RECURRENCES).default('once'),
    internalNote: z.string().max(2000).nullable().optional(),
  })
  .strict();

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get('templateId');
  const status = searchParams.get('status');
  const assigneeType = searchParams.get('assigneeType');

  // Token yalnız yazma yetkisi olanlara (salt-okunur üyeler link token'ı ALMAZ).
  const includeTokens = await canWriteRestaurant(actor, id);

  const rows = await listAuditAssignments({
    restaurantId: id,
    templateId: templateId || null,
    status:
      status && (AUDIT_ASSIGNMENT_STATUSES as readonly string[]).includes(status) ? status : null,
    assigneeType:
      assigneeType && (AUDIT_ASSIGNEE_TYPES as readonly string[]).includes(assigneeType)
        ? assigneeType
        : null,
    includeTokens,
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  // Privileged write — burst koruması (CLAUDE.md §40.4.C).
  const rl = await rateLimit(`audits:asg:${actor.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds || 60 },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds || 60) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Şablon bu restorana ait olmalı + yayında olmalı (Phase 1 superadmin global'leri
  // owner ataması için fork edilmiş restoran kopyalarıyla atanır; direct global'e
  // atama YOK — fork zorunlu).
  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: data.templateId, restaurantId: id, isPublished: true, isActive: true },
    select: { id: true },
  });
  if (!tpl) return ApiErrors.badRequest('Şablon bu restoran için yayında değil', 'INVALID_TEMPLATE');

  // team_member ise TeamMember satırının bu owner'a ait olduğunu doğrula
  if (data.assigneeType === 'team_member') {
    if (!data.assigneeTeamMemberId) {
      return ApiErrors.badRequest('Ekip üyesi seçilmedi', 'NO_TEAM_MEMBER');
    }
    // restoran sahibi user.id'yi bul
    const rest = await prisma.restaurant.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!rest?.userId) return ApiErrors.badRequest('Restoran sahibi belirsiz', 'NO_OWNER');
    const member = await prisma.teamMember.findFirst({
      where: { id: data.assigneeTeamMemberId, ownerId: rest.userId, status: 'active' },
      select: { id: true, locations: true },
    });
    if (!member) return ApiErrors.badRequest('Ekip üyesi bulunamadı', 'TEAM_MEMBER_NOT_FOUND');
    // Locations whitelist kontrolü (CLAUDE.md §37.2.B paterni)
    const allowedAll = !member.locations || (Array.isArray(member.locations) && member.locations.length === 0);
    const inLocations =
      Array.isArray(member.locations) && (member.locations as unknown[]).includes(id);
    if (!allowedAll && !inLocations) {
      return ApiErrors.forbidden('Ekip üyesinin bu restoran için yetkisi yok');
    }
  }

  if (data.assigneeType === 'candidate') {
    if (!data.assigneeEmail && !data.assigneePhone) {
      return ApiErrors.badRequest('Aday için en az e-posta veya telefon gerekli', 'NO_CONTACT');
    }
  }

  // dueAt guard — Invalid Date Prisma P2000 fırlatır (CLAUDE.md §42 helper).
  const dueAt = parseAuditDueAt(data.dueAt);
  if (!dueAt.ok) return ApiErrors.badRequest('Geçersiz tarih', 'INVALID_DUE_AT');

  try {
    // Phase 3: Tüm atama tiplerinde token üretilir (team_member dahil). Owner
    // hangi kanalla paylaşacağına karar verir; team_member için ekip içi
    // private link, candidate/link için public dağıtım. Token Read-only
    // erişim sağlar, KVKK consent submit zamanı yine zorunlu.
    const token = await generateAuditAssignmentToken();

    const created = await prisma.auditAssignment.create({
      data: {
        templateId: data.templateId,
        restaurantId: id,
        assigneeType: data.assigneeType,
        assigneeTeamMemberId: data.assigneeTeamMemberId ?? null,
        assigneeName: data.assigneeName ?? null,
        assigneeEmail: data.assigneeEmail || null,
        assigneePhone: data.assigneePhone ?? null,
        dueAt: dueAt.date,
        recurrence: data.recurrence,
        status: 'pending',
        token,
        internalNote: data.internalNote ?? null,
        createdBy: actor.source,
        createdById: actor.id,
      },
      select: {
        id: true,
        templateId: true,
        assigneeType: true,
        assigneeName: true,
        recurrence: true,
        status: true,
        token: true,
        dueAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    // CLAUDE.md §40.4 — try/catch + Sentry + Prisma code mapping
    const code = getErrorCode(err);
    console.error('[audit] assignments POST failed', { code, message: getErrorMessage(err) });
    Sentry.captureException(err, {
      tags: { route: 'restaurants/audits/assignments', method: 'POST', prismaCode: code },
      extra: { restaurantId: id, actorId: actor.id },
    });
    if (code === 'P2002') return ApiErrors.conflict('Çakışan kayıt mevcut', 'UNIQUE_VIOLATION');
    if (code === 'P2003') return ApiErrors.badRequest('İlişkili kayıt bulunamadı', 'FK_VIOLATION');
    if (code === 'P2025') return ApiErrors.notFound('Kayıt bulunamadı');
    return NextResponse.json(
      { error: 'Atama oluşturulamadı', code: code || 'INTERNAL_SERVER_ERROR' },
      { status: 500 },
    );
  }
}
