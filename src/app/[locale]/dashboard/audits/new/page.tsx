// CLAUDE.md §42 Phase 2 — Owner audit wizard new/fork page.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import AuditWizardClient from '@/components/audits/AuditWizardClient';
import type { AuditQuestionDraft } from '@/lib/audits/wizard-state';
import type { AuditQuestionType, AuditSector, AuditScoringMode } from '@/lib/audits/types';
import { makeQuestionId } from '@/components/audits/AuditQuestionEditor';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Yeni Denetim — Buaze' : 'New Audit — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; restaurantId?: string }>;
}

export default async function NewAuditPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/new`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/new`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/new`);
  }

  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds). `userId: payload.userId` hid every
  // restaurant from invited team members.
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scopedIds }, isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  if (restaurants.length === 0) {
    redirect(`/${locale}/dashboard/restaurants?empty=1`);
  }
  const activeId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId,
    storedRestaurantId: null,
  }) ?? restaurants[0].id;

  const [categories, teamMembers, forkRow] = await Promise.all([
    prisma.auditCategory.findMany({
      orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
      select: { id: true, slug: true, labelTr: true, labelEn: true, sector: true },
    }),
    prisma.teamMember.findMany({
      where: { ownerId: payload.userId, status: 'active' },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, email: true, name: true, role: true },
    }),
    sp.from
      ? prisma.auditTemplate.findFirst({
          where: { id: sp.from, restaurantId: null, isPublished: true, isActive: true },
          select: {
            title: true,
            description: true,
            sector: true,
            scoringMode: true,
            passingScore: true,
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
        })
      : null,
  ]);

  const forkSource = forkRow
    ? {
        title: forkRow.title,
        description: forkRow.description,
        sector: forkRow.sector as AuditSector,
        scoringMode: forkRow.scoringMode as AuditScoringMode,
        passingScore: forkRow.passingScore,
        categoryId: forkRow.categoryId,
        questions: forkRow.questions.map<AuditQuestionDraft>((q, i) => ({
          id: makeQuestionId(),
          type: q.type as AuditQuestionType,
          prompt: q.prompt,
          helpText: q.helpText ?? null,
          options: Array.isArray(q.options)
            ? (q.options as unknown[]).filter((x): x is string => typeof x === 'string')
            : null,
          correctAnswer: (q.correctAnswer ?? null) as AuditQuestionDraft['correctAnswer'],
          weight: q.weight,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder || (i + 1) * 10,
        })),
      }
    : null;

  return (
    <AuditWizardClient
      locale={locale}
      restaurants={restaurants}
      initialRestaurantId={activeId}
      categories={categories}
      teamMembers={teamMembers}
      forkSource={forkSource}
    />
  );
}
