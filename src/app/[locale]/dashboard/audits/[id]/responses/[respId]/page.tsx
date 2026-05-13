// CLAUDE.md §42 Phase 4 — Owner audit response detail (manual re-score).

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AuditResponseDetailClient from '@/components/audits/AuditResponseDetailClient';
import type { AuditQuestionType, AuditScoringMode } from '@/lib/audits/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim yanıtı — Buaze' : 'Audit response — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string; respId: string }>;
}

export default async function AuditResponseDetailPage({ params }: PageProps) {
  const { locale: localeParam, id, respId } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token)
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/responses/${respId}`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/responses/${respId}`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/responses/${respId}`);
  }

  const response = await prisma.auditResponse.findFirst({
    where: {
      id: respId,
      templateId: id,
      restaurant: { userId: payload.userId },
    },
    select: {
      id: true,
      restaurantId: true,
      respondentName: true,
      respondentEmail: true,
      respondentPhone: true,
      score: true,
      passed: true,
      startedAt: true,
      completedAt: true,
      reviewedAt: true,
      reviewNote: true,
      template: {
        select: {
          id: true,
          title: true,
          scoringMode: true,
          passingScore: true,
        },
      },
    },
  });
  if (!response || !response.restaurantId) notFound();

  return (
    <AuditResponseDetailClient
      locale={locale}
      restaurantId={response.restaurantId}
      responseId={response.id}
      template={{
        id: response.template.id,
        title: response.template.title,
        scoringMode: response.template.scoringMode as AuditScoringMode,
        passingScore: response.template.passingScore,
      }}
    />
  );
}

// Re-export AuditQuestionType to satisfy "value used in unused import" warnings
// if any tooling complains; harmless re-export.
export type { AuditQuestionType };
