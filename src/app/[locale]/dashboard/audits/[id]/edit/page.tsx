// CLAUDE.md §42 Phase 5 — Owner audit template edit page (Server Component).
//
// Fetches the template + categories on the server, computes lock flags
// (isPublished + hasResponses + forkSourcePublished), then hands off to
// AuditEditClient for the flat single-page form.

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AuditEditClient, {
  type AuditTemplateEditData,
} from '@/components/audits/AuditEditClient';
import type {
  AuditQuestionType,
  AuditScoringMode,
  AuditSector,
} from '@/lib/audits/types';
import type { AuditQuestionDraft } from '@/lib/audits/wizard-state';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Şablonu Düzenle — Buaze' : 'Edit Template — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AuditEditPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token)
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/edit`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/edit`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/edit`);
  }
  const userId = payload.userId;

  // Owner-scoped template lookup. Public-safe select; sahibi olmadığı
  // template'lere erişim 404'e düşer (CLAUDE.md §40.4 B).
  const tpl = await prisma.auditTemplate.findFirst({
    where: {
      id,
      restaurant: { userId },
    },
    select: {
      id: true,
      title: true,
      description: true,
      sector: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
      categoryId: true,
      isPublished: true,
      forkedFromId: true,
      forkedFrom: {
        select: { isPublished: true, isActive: true },
      },
      restaurant: { select: { id: true } },
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
      _count: { select: { responses: true, assignments: true } },
    },
  });

  if (!tpl || !tpl.restaurant) {
    notFound();
  }

  const categories = await prisma.auditCategory.findMany({
    orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
    select: { id: true, slug: true, labelTr: true, labelEn: true, sector: true },
  });

  // Cast through known unions — server schema strings, client uses literal types.
  const questions: AuditQuestionDraft[] = tpl.questions.map((q) => ({
    id: q.id,
    type: q.type as AuditQuestionType,
    prompt: q.prompt,
    helpText: q.helpText,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    correctAnswer:
      q.correctAnswer === null
        ? null
        : (q.correctAnswer as string | string[] | number),
    weight: q.weight,
    isRequired: q.isRequired,
    sortOrder: q.sortOrder,
  }));

  const data: AuditTemplateEditData = {
    id: tpl.id,
    title: tpl.title,
    description: tpl.description,
    sector: tpl.sector as AuditSector,
    scoringMode: tpl.scoringMode as AuditScoringMode,
    passingScore: tpl.passingScore,
    locale: tpl.locale === 'en' ? 'en' : 'tr',
    categoryId: tpl.categoryId,
    isPublished: tpl.isPublished,
    hasResponses: tpl._count.responses > 0,
    hasAssignments: tpl._count.assignments > 0,
    forkedFromId: tpl.forkedFromId,
    // Reset CTA için: kaynak yayında + aktif olmalı. Kaynak silinmiş /
    // unpublished ise reset endpoint zaten 410 döner ve UI'da CTA gizli.
    forkSourcePublished: !!(
      tpl.forkedFrom &&
      tpl.forkedFrom.isPublished &&
      tpl.forkedFrom.isActive
    ),
    questions,
  };

  return (
    <AuditEditClient
      locale={locale}
      restaurantId={tpl.restaurant.id}
      template={data}
      categories={categories}
    />
  );
}
