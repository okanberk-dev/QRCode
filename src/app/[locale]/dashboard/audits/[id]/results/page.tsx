// CLAUDE.md §42 Phase 4 — Owner audit results page.

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AuditResultsClient from '@/components/audits/AuditResultsClient';
import type { AuditScoringMode } from '@/lib/audits/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim sonuçları — Buaze' : 'Audit results — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AuditResultsPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token)
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/results`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/results`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}/results`);
  }

  const template = await prisma.auditTemplate.findFirst({
    where: { id, restaurant: { userId: payload.userId } },
    select: {
      id: true,
      restaurantId: true,
      title: true,
      scoringMode: true,
      passingScore: true,
      locale: true,
    },
  });
  if (!template) notFound();

  return (
    <AuditResultsClient
      locale={locale}
      template={{
        id: template.id,
        restaurantId: template.restaurantId ?? '',
        title: template.title,
        scoringMode: template.scoringMode as AuditScoringMode,
        passingScore: template.passingScore,
      }}
    />
  );
}
