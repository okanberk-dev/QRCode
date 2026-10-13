// Denetim Merkezi — liste / detay / sonuç sayfaları VE API rotaları için
// paylaşılan Prisma sorguları (spec §5.5). Tek source-of-truth:
//
//   • sayfa (server hydration, CLAUDE.md §40.10) ile rota aynı fonksiyonu
//     çağırır → ilk boyama ile sonraki client fetch AYNI şekli taşır
//   • birden çok okuma gereken her fonksiyon tek `prisma.$transaction([...])`
//     (Supabase pooler connection_limit=1, CLAUDE.md §40.1)
//   • her sorguda açık `select` (CLAUDE.md §14.1 — şema/DB drift'ine bağışıklık)
//   • dönen tarihler ISO string'tir → doğrudan client component prop'u veya
//     `NextResponse.json` olarak geçilebilir (Date serileştirme tuzağı yok)
//
// Bu modül `prisma` import eder; birim testlerde kullanılmaz (saf mantık
// kind / misses / results / score / submit-guards modüllerindedir).

import { prisma } from '@/lib/prisma';
import { deriveAuditKind, deriveAuditStatus, type AuditKind, type AuditStatus } from './kind';
import { rankMisses, summarizeMisses, type MissSummaryItem } from './misses';
import { isScorableByDefinition } from './score';
import {
  bucketScores,
  parseAuditRangeStart,
  passRate,
  type ScoreDistributionBucket,
} from './results';
import type {
  AuditAssigneeType,
  AuditAssignmentStatus,
  AuditQuestionType,
  AuditRecurrence,
  AuditScoringMode,
  AuditSector,
} from './types';

// ─── Ortak yardımcılar ──────────────────────────────────────────────────

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export interface AuditCategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
}

const CATEGORY_REF_SELECT = { id: true, slug: true, labelTr: true, labelEn: true } as const;

/** Liste sayfası / GET templates için varsayılan üst sınır. */
export const AUDIT_LIST_TAKE = 100;
/** Özet sorgusunun okuyacağı en fazla cevap satırı. */
export const MISS_SUMMARY_ROW_CAP = 20_000;

// ═══════════════════════════════════════════════════════════════════════
// Owner şablon listesi  (list page + GET …/templates)
// ═══════════════════════════════════════════════════════════════════════

export interface OwnerAuditTemplateRow {
  id: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
  isPublished: boolean;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryId: string | null;
  category: AuditCategoryRef | null;
  forkedFromId: string | null;
  /** Türetilmiş: 'checklist' | 'quiz' (UI: Kontrol listesi | Test). */
  kind: AuditKind;
  /** Türetilmiş: 'archived' | 'live' | 'paused' | 'draft'. */
  status: AuditStatus;
  /** En son tamamlanan yanıtın zamanı (ISO) veya null. */
  lastResponseAt: string | null;
  _count: { questions: number; assignments: number; responses: number };
}

/**
 * Bir işletmenin denetimleri (arşivlenenler dahil — UI `status`/`isActive`
 * ile böler). `kind`, `lastResponseAt`, `forkedFromId`, `status` eklenmiştir.
 */
export async function listOwnerAuditTemplates(
  restaurantId: string,
  opts: { includeDrafts?: boolean; take?: number } = {},
): Promise<OwnerAuditTemplateRow[]> {
  const includeDrafts = opts.includeDrafts !== false;
  const rows = await prisma.auditTemplate.findMany({
    where: {
      restaurantId,
      ...(includeDrafts ? {} : { isPublished: true }),
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: opts.take ?? AUDIT_LIST_TAKE,
    select: {
      id: true,
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      isPublished: true,
      isActive: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      categoryId: true,
      category: { select: CATEGORY_REF_SELECT },
      forkedFromId: true,
      // kind türetimi için yalnız tipler (küçük).
      questions: { select: { type: true } },
      // Boş (null) completedAt'ler DESC sıralamada başa gelir → filtrele.
      responses: {
        where: { completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: { completedAt: true },
      },
      _count: { select: { questions: true, assignments: true, responses: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    sector: r.sector as AuditSector,
    scoringMode: r.scoringMode as AuditScoringMode,
    passingScore: r.passingScore,
    locale: r.locale,
    isPublished: r.isPublished,
    isActive: r.isActive,
    publishedAt: iso(r.publishedAt),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    categoryId: r.categoryId,
    category: r.category,
    forkedFromId: r.forkedFromId,
    kind: deriveAuditKind(r.questions.map((q) => q.type)),
    status: deriveAuditStatus({
      isActive: r.isActive,
      isPublished: r.isPublished,
      assignmentCount: r._count.assignments,
      responseCount: r._count.responses,
    }),
    lastResponseAt: iso(r.responses[0]?.completedAt ?? null),
    _count: r._count,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// Hazır şablon kataloğu  (list page "Hazır şablonlar" + GET /api/audits/catalog)
// ═══════════════════════════════════════════════════════════════════════

export interface CatalogQuestionPreview {
  type: AuditQuestionType;
  prompt: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface CatalogTemplateRow {
  id: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
  categoryId: string | null;
  category: AuditCategoryRef | null;
  publishedAt: string | null;
  kind: AuditKind;
  /** İlk 30 madde: yalnız tip + metin + zorunluluk. ASLA correctAnswer / options. */
  questions: CatalogQuestionPreview[];
  _count: { questions: number };
}

export interface CatalogCategoryRow {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector: string;
  iconKey: string | null;
}

export const CATALOG_PREVIEW_QUESTIONS = 30;
export const CATALOG_HYDRATION_TAKE = 100;
export const CATALOG_ROUTE_TAKE = 200;

/**
 * Owner'ın göreceği global katalog (restaurantId=null, yayında, aktif).
 * `kind` ilk 30 maddeden türetilir (katalog şablonları ≤ ~6 madde).
 */
export async function listCatalogForOwner(
  opts: { sector?: string | null; categoryId?: string | null; take?: number } = {},
): Promise<{ data: CatalogTemplateRow[]; categories: CatalogCategoryRow[] }> {
  const where: {
    restaurantId: null;
    isPublished: true;
    isActive: true;
    sector?: string;
    categoryId?: string;
  } = { restaurantId: null, isPublished: true, isActive: true };
  if (opts.sector) where.sector = opts.sector;
  if (opts.categoryId) where.categoryId = opts.categoryId;

  const [rows, categories] = await prisma.$transaction([
    prisma.auditTemplate.findMany({
      where,
      // Sektör anahtarına göre ABC sıralaması UI'da yeniden düzenlenir; burada
      // yalnızca deterministik sıra.
      orderBy: [{ sector: 'asc' }, { title: 'asc' }, { id: 'asc' }],
      take: opts.take ?? CATALOG_HYDRATION_TAKE,
      select: {
        id: true,
        title: true,
        description: true,
        sector: true,
        scoringMode: true,
        passingScore: true,
        locale: true,
        categoryId: true,
        category: { select: CATEGORY_REF_SELECT },
        publishedAt: true,
        questions: {
          orderBy: { sortOrder: 'asc' },
          take: CATALOG_PREVIEW_QUESTIONS,
          // correctAnswer ve options KASTEN YOK.
          select: { type: true, prompt: true, isRequired: true, sortOrder: true },
        },
        _count: { select: { questions: true } },
      },
    }),
    prisma.auditCategory.findMany({
      orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
      select: { id: true, slug: true, labelTr: true, labelEn: true, sector: true, iconKey: true },
    }),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      sector: r.sector as AuditSector,
      scoringMode: r.scoringMode as AuditScoringMode,
      passingScore: r.passingScore,
      locale: r.locale,
      categoryId: r.categoryId,
      category: r.category,
      publishedAt: iso(r.publishedAt),
      kind: deriveAuditKind(r.questions.map((q) => q.type)),
      questions: r.questions.map((q) => ({
        type: q.type as AuditQuestionType,
        prompt: q.prompt,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
      })),
      _count: r._count,
    })),
    categories,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Paylaşım linkleri (AuditAssignment)
// ═══════════════════════════════════════════════════════════════════════

export interface AuditAssignmentRow {
  id: string;
  templateId: string;
  template: { id: string; title: string };
  assigneeType: AuditAssigneeType;
  assigneeTeamMemberId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assigneePhone: string | null;
  dueAt: string | null;
  recurrence: AuditRecurrence;
  status: AuditAssignmentStatus;
  /** YALNIZ yazma yetkisi olanlara; salt-okunur üyeler token ALMAZ (alan hiç yok). */
  token?: string | null;
  tokenRevoked: boolean;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { responses: number };
}

export interface ListAssignmentsArgs {
  /** Tek işletme veya erişilebilir işletmeler (`{ in: [...] }` kapsamı). */
  restaurantId: string | readonly string[];
  templateId?: string | null;
  status?: string | null;
  assigneeType?: string | null;
  /** `canWriteRestaurant` sonucu. false → `token` seçilmez. */
  includeTokens: boolean;
  /** İptal edilmiş (soft revoke) linkleri de getir. Rota uyumluluğu için varsayılan true. */
  includeRevoked?: boolean;
  /** Varsayılan 'desc'. Detay sayfası ilk (varsayılan) linki bulmak için 'asc' kullanır. */
  order?: 'asc' | 'desc';
  take?: number;
}

/**
 * `auditAssignment.findMany` argümanları — hem tek başına (`listAuditAssignments`)
 * hem `getAuditDetail`'in `$transaction`'ı içinde kullanılır. `token` yalnız
 * `includeTokens` iken seçilir: salt-okunur üyeler token'ı ASLA almaz.
 */
export function buildAssignmentsFindManyArgs(args: ListAssignmentsArgs) {
  const where: Record<string, unknown> = {
    restaurantId: typeof args.restaurantId === 'string' ? args.restaurantId : { in: [...args.restaurantId] },
  };
  if (args.templateId) where.templateId = args.templateId;
  if (args.status) where.status = args.status;
  if (args.assigneeType) where.assigneeType = args.assigneeType;
  if (args.includeRevoked === false) {
    where.tokenRevoked = false;
    if (!args.status) where.status = { not: 'cancelled' };
  }

  return {
    where,
    orderBy: [{ createdAt: args.order === 'asc' ? ('asc' as const) : ('desc' as const) }],
    take: args.take ?? 500,
    select: {
      id: true,
      templateId: true,
      template: { select: { id: true, title: true } },
      assigneeType: true,
      assigneeTeamMemberId: true,
      assigneeName: true,
      assigneeEmail: true,
      assigneePhone: true,
      dueAt: true,
      recurrence: true,
      status: true,
      ...(args.includeTokens ? { token: true } : {}),
      tokenRevoked: true,
      internalNote: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { responses: true } },
    },
  };
}

type RawAssignmentRow = {
  id: string;
  templateId: string;
  template: { id: string; title: string };
  assigneeType: string;
  assigneeTeamMemberId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assigneePhone: string | null;
  dueAt: Date | null;
  recurrence: string;
  status: string;
  token?: string | null;
  tokenRevoked: boolean;
  internalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { responses: number };
};

export function mapAssignmentRows(
  rows: readonly RawAssignmentRow[],
  includeTokens: boolean,
): AuditAssignmentRow[] {
  return rows.map((r) => {
    const row: AuditAssignmentRow = {
      id: r.id,
      templateId: r.templateId,
      template: r.template,
      assigneeType: r.assigneeType as AuditAssigneeType,
      assigneeTeamMemberId: r.assigneeTeamMemberId,
      assigneeName: r.assigneeName,
      assigneeEmail: r.assigneeEmail,
      assigneePhone: r.assigneePhone,
      dueAt: iso(r.dueAt),
      recurrence: r.recurrence as AuditRecurrence,
      status: r.status as AuditAssignmentStatus,
      tokenRevoked: r.tokenRevoked,
      internalNote: r.internalNote,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      _count: r._count,
    };
    if (includeTokens) row.token = r.token ?? null;
    return row;
  });
}

export async function listAuditAssignments(args: ListAssignmentsArgs): Promise<AuditAssignmentRow[]> {
  const rows = await prisma.auditAssignment.findMany(buildAssignmentsFindManyArgs(args));
  return mapAssignmentRows(rows as unknown as RawAssignmentRow[], args.includeTokens);
}

// ═══════════════════════════════════════════════════════════════════════
// Denetim detayı  (detail page)
// ═══════════════════════════════════════════════════════════════════════

export interface AuditDetailQuestion {
  id: string;
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: unknown;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface AuditRecentResponse {
  id: string;
  respondentName: string | null;
  score: number | null;
  passed: boolean | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AuditDetail {
  template: {
    id: string;
    restaurantId: string;
    title: string;
    description: string | null;
    sector: AuditSector;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
    locale: string;
    isPublished: boolean;
    isActive: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    forkedFromId: string | null;
    forkedFrom: { isPublished: boolean; isActive: boolean } | null;
    category: AuditCategoryRef | null;
    kind: AuditKind;
    status: AuditStatus;
    /** correctAnswer YOK (görüntüleme); düzenleme için `getAuditForEdit`. */
    questions: AuditDetailQuestion[];
    _count: { assignments: number; responses: number };
  };
  /** Revoke edilmemiş linkler, `createdAt` artan → ilki "varsayılan link". Viewer için token YOK. */
  assignments: AuditAssignmentRow[];
  /** Son 5 tamamlanmış yanıt. */
  recentResponses: AuditRecentResponse[];
  lastResponseAt: string | null;
  /** Yanıt almış soru id'leri (kilit ikonu / sil engeli için). */
  answeredQuestionIds: string[];
}

/**
 * `restaurantIds`: çağıranın erişebildiği işletmeler (team üyeleri dahil:
 * `getScopedRestaurantIdsForUserPayload`). Şablon bunların dışındaysa `null`.
 * `includeTokens`: `canWrite` — salt-okunur üyeler link token'ı ALMAZ.
 */
export async function getAuditDetail(args: {
  templateId: string;
  restaurantIds: readonly string[];
  includeTokens: boolean;
}): Promise<AuditDetail | null> {
  const scope = { in: [...args.restaurantIds] };

  const [tpl, recent, answered, assignmentRows] = await prisma.$transaction([
    prisma.auditTemplate.findFirst({
      where: { id: args.templateId, restaurantId: scope },
      select: {
        id: true,
        restaurantId: true,
        title: true,
        description: true,
        sector: true,
        scoringMode: true,
        passingScore: true,
        locale: true,
        isPublished: true,
        isActive: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        forkedFromId: true,
        forkedFrom: { select: { isPublished: true, isActive: true } },
        category: { select: CATEGORY_REF_SELECT },
        questions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            type: true,
            prompt: true,
            helpText: true,
            options: true,
            weight: true,
            isRequired: true,
            sortOrder: true,
          },
        },
        _count: { select: { assignments: true, responses: true } },
      },
    }),
    prisma.auditResponse.findMany({
      where: {
        templateId: args.templateId,
        restaurantId: scope,
        completedAt: { not: null },
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        id: true,
        respondentName: true,
        score: true,
        passed: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.auditAnswer.groupBy({
      by: ['questionId'],
      where: { question: { templateId: args.templateId } },
    }),
    prisma.auditAssignment.findMany(
      buildAssignmentsFindManyArgs({
        restaurantId: args.restaurantIds,
        templateId: args.templateId,
        includeTokens: args.includeTokens,
        includeRevoked: false,
        order: 'asc',
        take: 100,
      }),
    ),
  ]);

  if (!tpl || !tpl.restaurantId) return null;

  const assignments = mapAssignmentRows(
    assignmentRows as unknown as RawAssignmentRow[],
    args.includeTokens,
  );

  return {
    template: {
      id: tpl.id,
      restaurantId: tpl.restaurantId,
      title: tpl.title,
      description: tpl.description,
      sector: tpl.sector as AuditSector,
      scoringMode: tpl.scoringMode as AuditScoringMode,
      passingScore: tpl.passingScore,
      locale: tpl.locale,
      isPublished: tpl.isPublished,
      isActive: tpl.isActive,
      publishedAt: iso(tpl.publishedAt),
      createdAt: tpl.createdAt.toISOString(),
      updatedAt: tpl.updatedAt.toISOString(),
      forkedFromId: tpl.forkedFromId,
      forkedFrom: tpl.forkedFrom,
      category: tpl.category,
      kind: deriveAuditKind(tpl.questions.map((q) => q.type)),
      status: deriveAuditStatus({
        isActive: tpl.isActive,
        isPublished: tpl.isPublished,
        assignmentCount: tpl._count.assignments,
        responseCount: tpl._count.responses,
      }),
      questions: tpl.questions.map((q) => ({
        id: q.id,
        type: q.type as AuditQuestionType,
        prompt: q.prompt,
        helpText: q.helpText,
        options: q.options,
        weight: q.weight,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
      })),
      _count: tpl._count,
    },
    assignments,
    recentResponses: recent.map((r) => ({
      id: r.id,
      respondentName: r.respondentName,
      score: r.score,
      passed: r.passed,
      completedAt: iso(r.completedAt),
      createdAt: r.createdAt.toISOString(),
    })),
    lastResponseAt: iso(recent[0]?.completedAt ?? null),
    answeredQuestionIds: answered.map((a) => a.questionId),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Düzenleme verisi  (edit page — builder'ın ihtiyacı olan her şey)
// ═══════════════════════════════════════════════════════════════════════

export interface AuditEditQuestion {
  id: string;
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: unknown;
  correctAnswer: unknown;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface AuditEditData {
  template: {
    id: string;
    restaurantId: string;
    title: string;
    description: string | null;
    sector: AuditSector;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
    locale: string;
    categoryId: string | null;
    isPublished: boolean;
    isActive: boolean;
    /** Builder bunu `expectedUpdatedAt` olarak geri gönderir (STALE_EDIT koruması). */
    updatedAt: string;
    forkedFromId: string | null;
    /** "Hazır şablona geri dön" için: kaynak hâlâ yayında + aktif mi. */
    forkSourcePublished: boolean;
    kind: AuditKind;
    status: AuditStatus;
    questions: AuditEditQuestion[];
    hasResponses: boolean;
    hasAssignments: boolean;
    _count: { assignments: number; responses: number };
  };
  /** Yanıt almış sorular → tip/seçenek/doğru cevap/ağırlık kilitli, silinemez. */
  answeredQuestionIds: string[];
  categories: Array<{ id: string; slug: string; labelTr: string; labelEn: string; sector: string }>;
}

export async function getAuditForEdit(args: {
  templateId: string;
  restaurantIds: readonly string[];
}): Promise<AuditEditData | null> {
  const [tpl, answered, categories] = await prisma.$transaction([
    prisma.auditTemplate.findFirst({
      where: { id: args.templateId, restaurantId: { in: [...args.restaurantIds] } },
      select: {
        id: true,
        restaurantId: true,
        title: true,
        description: true,
        sector: true,
        scoringMode: true,
        passingScore: true,
        locale: true,
        categoryId: true,
        isPublished: true,
        isActive: true,
        updatedAt: true,
        forkedFromId: true,
        forkedFrom: { select: { isPublished: true, isActive: true } },
        questions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
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
        _count: { select: { assignments: true, responses: true } },
      },
    }),
    prisma.auditAnswer.groupBy({
      by: ['questionId'],
      where: { question: { templateId: args.templateId } },
    }),
    prisma.auditCategory.findMany({
      orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
      select: { id: true, slug: true, labelTr: true, labelEn: true, sector: true },
    }),
  ]);

  if (!tpl || !tpl.restaurantId) return null;

  return {
    template: {
      id: tpl.id,
      restaurantId: tpl.restaurantId,
      title: tpl.title,
      description: tpl.description,
      sector: tpl.sector as AuditSector,
      scoringMode: tpl.scoringMode as AuditScoringMode,
      passingScore: tpl.passingScore,
      locale: tpl.locale,
      categoryId: tpl.categoryId,
      isPublished: tpl.isPublished,
      isActive: tpl.isActive,
      updatedAt: tpl.updatedAt.toISOString(),
      forkedFromId: tpl.forkedFromId,
      forkSourcePublished: !!(tpl.forkedFrom && tpl.forkedFrom.isPublished && tpl.forkedFrom.isActive),
      kind: deriveAuditKind(tpl.questions.map((q) => q.type)),
      status: deriveAuditStatus({
        isActive: tpl.isActive,
        isPublished: tpl.isPublished,
        assignmentCount: tpl._count.assignments,
        responseCount: tpl._count.responses,
      }),
      questions: tpl.questions.map((q) => ({
        id: q.id,
        type: q.type as AuditQuestionType,
        prompt: q.prompt,
        helpText: q.helpText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        weight: q.weight,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
      })),
      hasResponses: tpl._count.responses > 0,
      hasAssignments: tpl._count.assignments > 0,
      _count: tpl._count,
    },
    answeredQuestionIds: answered.map((a) => a.questionId),
    categories,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Sonuçlar: yanıt listesi (aggregate + sayfalama)  — spec §6.5
// ═══════════════════════════════════════════════════════════════════════

export interface AuditResponseListRow {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  teamMemberId: string | null;
  score: number | null;
  scorePercentage: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  assignmentId: string | null;
  createdAt: string;
}

export interface AuditResponsesPage {
  data: AuditResponseListRow[];
  summary: {
    /** Filtrelenmiş kümedeki TÜM yanıtlar (sayfadaki satırlar değil). */
    total: number;
    /** Bunlardan tamamlananlar (completedAt dolu). */
    completed: number;
    /** Tamamlananların ortalama puanı; hiç puan yoksa null. */
    averageScore: number | null;
    passedCount: number;
    /** `passed` değeri hesaplanmış (null olmayan) yanıt sayısı — geçme oranının paydası. */
    passedEvaluated: number;
    /** Geçme puanı yoksa / değerlendirilen yoksa null; 0-100 tam sayı. */
    passRate: number | null;
    passingScore: number | null;
  };
  distribution: ScoreDistributionBucket[];
  meta: { page: number; pageSize: number; hasMore: boolean };
}

export interface AuditResponsesFilter {
  restaurantId: string;
  templateId: string;
  /** '7d' | '30d' | '90d' | 'all'/null */
  range?: string | null;
  /** 'completed' | 'in_progress' | null=hepsi (uyumluluk; UI göndermez) */
  status?: string | null;
  /** 'true' | 'false' | null=hepsi */
  passed?: string | null;
  search?: string | null;
  teamMemberId?: string | null;
  page: number;
  pageSize: number;
}

export async function queryAuditResponses(
  template: { id: string; passingScore: number | null },
  f: AuditResponsesFilter,
): Promise<AuditResponsesPage> {
  const rangeStart = parseAuditRangeStart(f.range);
  const where: Record<string, unknown> = { templateId: f.templateId, restaurantId: f.restaurantId };
  if (rangeStart) where.createdAt = { gte: rangeStart };
  if (f.status === 'completed') where.completedAt = { not: null };
  else if (f.status === 'in_progress') where.completedAt = null;
  if (f.passed === 'true') where.passed = true;
  if (f.passed === 'false') where.passed = false;
  if (f.teamMemberId) where.teamMemberId = f.teamMemberId;
  const search = f.search?.trim();
  if (search) {
    where.OR = [
      { respondentName: { contains: search, mode: 'insensitive' } },
      { respondentEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  // `completedAt` filtresi zaten varsa onu koru; yoksa "tamamlanmış" şartını ekle.
  const completedWhere =
    where.completedAt === undefined ? { ...where, completedAt: { not: null } } : where;

  const skip = (f.page - 1) * f.pageSize;

  const [rows, total, completed, avg, passedCount, passedEvaluated, scoreGroups] =
    await prisma.$transaction([
      prisma.auditResponse.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: f.pageSize,
        select: {
          id: true,
          respondentName: true,
          respondentEmail: true,
          respondentPhone: true,
          teamMemberId: true,
          score: true,
          scorePercentage: true,
          passed: true,
          startedAt: true,
          completedAt: true,
          reviewedById: true,
          reviewedAt: true,
          assignmentId: true,
          createdAt: true,
        },
      }),
      prisma.auditResponse.count({ where }),
      prisma.auditResponse.count({ where: completedWhere }),
      prisma.auditResponse.aggregate({ where: completedWhere, _avg: { score: true } }),
      prisma.auditResponse.count({ where: { ...where, passed: true } }),
      prisma.auditResponse.count({ where: { ...where, passed: { not: null } } }),
      prisma.auditResponse.groupBy({
        by: ['score'],
        where: { ...completedWhere, score: { not: null } },
        _count: { _all: true },
      }),
    ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      respondentName: r.respondentName,
      respondentEmail: r.respondentEmail,
      respondentPhone: r.respondentPhone,
      teamMemberId: r.teamMemberId,
      score: r.score,
      scorePercentage: r.scorePercentage,
      passed: r.passed,
      startedAt: r.startedAt.toISOString(),
      completedAt: iso(r.completedAt),
      reviewedById: r.reviewedById,
      reviewedAt: iso(r.reviewedAt),
      assignmentId: r.assignmentId,
      createdAt: r.createdAt.toISOString(),
    })),
    summary: {
      total,
      completed,
      averageScore: avg._avg.score ?? null,
      passedCount,
      passedEvaluated,
      passRate: passRate(passedCount, passedEvaluated, template.passingScore),
      passingScore: template.passingScore,
    },
    distribution: bucketScores(scoreGroups),
    meta: { page: f.page, pageSize: f.pageSize, hasMore: skip + rows.length < total },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Sonuçlar: "Dikkat edilecek maddeler"  — spec §5.3 / §6.4
// ═══════════════════════════════════════════════════════════════════════

export interface AuditMissItem extends MissSummaryItem {
  prompt: string;
  type: AuditQuestionType;
}

export interface AuditMissSummary {
  /** missRate azalan, `missed > 0`, en çok 20 (UI ilk 5'i gösterir). */
  items: AuditMissItem[];
  /** Aralıktaki tamamlanmış yanıt sayısı. */
  total: number;
  /** Satır üst sınırına (20.000) takıldıysa true. */
  truncated: boolean;
}

export async function queryAuditMissSummary(args: {
  templateId: string;
  restaurantId: string;
  range?: string | null;
}): Promise<AuditMissSummary> {
  const rangeStart = parseAuditRangeStart(args.range);
  const responseWhere = {
    templateId: args.templateId,
    restaurantId: args.restaurantId,
    completedAt: rangeStart ? { not: null, gte: rangeStart } : { not: null },
  };

  const [questions, total] = await prisma.$transaction([
    prisma.auditQuestion.findMany({
      where: { templateId: args.templateId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, type: true, prompt: true, correctAnswer: true },
    }),
    prisma.auditResponse.count({ where: responseWhere }),
  ]);

  // Puanlanamayan sorular (not, fotoğraf, doğru cevapsız evet/hayır) hiç okunmaz —
  // fotoğraf `value`'ları (büyük data URL) böylece asla çekilmez.
  const scorable = questions.filter((q) =>
    isScorableByDefinition({ type: q.type as AuditQuestionType, correctAnswer: q.correctAnswer }),
  );
  if (scorable.length === 0 || total === 0) {
    return { items: [], total, truncated: false };
  }

  const rows = await prisma.auditAnswer.findMany({
    where: {
      questionId: { in: scorable.map((q) => q.id) },
      response: responseWhere,
    },
    orderBy: { createdAt: 'desc' },
    take: MISS_SUMMARY_ROW_CAP,
    select: { questionId: true, value: true },
  });

  const ranked = rankMisses(summarizeMisses(scorable, rows));
  const byId = new Map(scorable.map((q) => [q.id, q]));
  return {
    items: ranked.map((m) => {
      const q = byId.get(m.questionId)!;
      return { ...m, prompt: q.prompt, type: q.type as AuditQuestionType };
    }),
    total,
    truncated: rows.length >= MISS_SUMMARY_ROW_CAP,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Sonuçlar sayfası ilk veri  — yanıtlar + özet (server hydration)
// ═══════════════════════════════════════════════════════════════════════

export interface AuditResultsInitial {
  template: {
    id: string;
    restaurantId: string;
    title: string;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
    locale: string;
    isActive: boolean;
    isPublished: boolean;
    kind: AuditKind;
    status: AuditStatus;
  };
  /** `GET …/responses` ile BİREBİR aynı gövde. */
  responses: AuditResponsesPage;
  /** `GET …/summary` ile BİREBİR aynı gövde. */
  misses: AuditMissSummary;
  range: string;
}

export async function getAuditResultsInitial(args: {
  templateId: string;
  restaurantIds: readonly string[];
  range?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditResultsInitial | null> {
  const tpl = await prisma.auditTemplate.findFirst({
    where: { id: args.templateId, restaurantId: { in: [...args.restaurantIds] } },
    select: {
      id: true,
      restaurantId: true,
      title: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      isActive: true,
      isPublished: true,
      questions: { select: { type: true } },
      _count: { select: { assignments: true, responses: true } },
    },
  });
  if (!tpl || !tpl.restaurantId) return null;

  const range = args.range ?? '30d';
  const responses = await queryAuditResponses(tpl, {
    restaurantId: tpl.restaurantId,
    templateId: tpl.id,
    range,
    page: args.page ?? 1,
    pageSize: args.pageSize ?? 50,
  });
  const misses = await queryAuditMissSummary({
    templateId: tpl.id,
    restaurantId: tpl.restaurantId,
    range,
  });

  return {
    template: {
      id: tpl.id,
      restaurantId: tpl.restaurantId,
      title: tpl.title,
      scoringMode: tpl.scoringMode as AuditScoringMode,
      passingScore: tpl.passingScore,
      locale: tpl.locale,
      isActive: tpl.isActive,
      isPublished: tpl.isPublished,
      kind: deriveAuditKind(tpl.questions.map((q) => q.type)),
      status: deriveAuditStatus({
        isActive: tpl.isActive,
        isPublished: tpl.isPublished,
        assignmentCount: tpl._count.assignments,
        responseCount: tpl._count.responses,
      }),
    },
    responses,
    misses,
    range,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Yanıt detayı  (response detail page + GET …/responses/[respId])
// ═══════════════════════════════════════════════════════════════════════

export interface AuditResponseDetail {
  id: string;
  templateId: string;
  assignmentId: string | null;
  restaurantId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  teamMemberId: string | null;
  hasKvkkConsent: boolean;
  hasMarketingConsent: boolean;
  score: number | null;
  scorePercentage: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    title: string;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
    locale: string;
    kind: AuditKind;
    questions: Array<{
      id: string;
      type: AuditQuestionType;
      prompt: string;
      helpText: string | null;
      options: unknown;
      /** Owner yanıt incelemesi için görür. */
      correctAnswer: unknown;
      weight: number;
      isRequired: boolean;
      sortOrder: number;
    }>;
  };
  answers: Array<{
    id: string;
    questionId: string;
    value: unknown;
    /** Yeni satırlarda puanlanamayan sorular için null; eski satırlarda 0 olabilir. */
    autoScore: number | null;
    manualScore: number | null;
  }>;
}

export async function getAuditResponseDetail(args: {
  responseId: string;
  restaurantIds: readonly string[];
  templateId?: string | null;
}): Promise<AuditResponseDetail | null> {
  const row = await prisma.auditResponse.findFirst({
    where: {
      id: args.responseId,
      restaurantId: { in: [...args.restaurantIds] },
      ...(args.templateId ? { templateId: args.templateId } : {}),
    },
    select: {
      id: true,
      templateId: true,
      assignmentId: true,
      restaurantId: true,
      respondentName: true,
      respondentEmail: true,
      respondentPhone: true,
      teamMemberId: true,
      hasKvkkConsent: true,
      hasMarketingConsent: true,
      score: true,
      scorePercentage: true,
      passed: true,
      startedAt: true,
      completedAt: true,
      reviewedById: true,
      reviewedAt: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          title: true,
          scoringMode: true,
          passingScore: true,
          locale: true,
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
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
      },
      answers: {
        select: { id: true, questionId: true, value: true, autoScore: true, manualScore: true },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    templateId: row.templateId,
    assignmentId: row.assignmentId,
    restaurantId: row.restaurantId,
    respondentName: row.respondentName,
    respondentEmail: row.respondentEmail,
    respondentPhone: row.respondentPhone,
    teamMemberId: row.teamMemberId,
    hasKvkkConsent: row.hasKvkkConsent,
    hasMarketingConsent: row.hasMarketingConsent,
    score: row.score,
    scorePercentage: row.scorePercentage,
    passed: row.passed,
    startedAt: row.startedAt.toISOString(),
    completedAt: iso(row.completedAt),
    reviewedById: row.reviewedById,
    reviewedAt: iso(row.reviewedAt),
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    template: {
      id: row.template.id,
      title: row.template.title,
      scoringMode: row.template.scoringMode as AuditScoringMode,
      passingScore: row.template.passingScore,
      locale: row.template.locale,
      kind: deriveAuditKind(row.template.questions.map((q) => q.type)),
      questions: row.template.questions.map((q) => ({
        id: q.id,
        type: q.type as AuditQuestionType,
        prompt: q.prompt,
        helpText: q.helpText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        weight: q.weight,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
      })),
    },
    answers: row.answers,
  };
}
