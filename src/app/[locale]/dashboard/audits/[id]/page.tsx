// CLAUDE.md §42 Phase 2 — Owner audit detail page.

import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AuditDetailClient from '@/components/audits/AuditDetailClient';
import type {
  AuditQuestionType,
  AuditScoringMode,
  AuditSector,
} from '@/lib/audits/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim — Buaze' : 'Audit — Buaze',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

function resolveAppUrl(host: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return 'https://www.buaze.com';
}

export default async function AuditDetailPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/audits/${id}`);
  }

  // Şablon — owner'a ait restoranın bir şablonu olmalı.
  const template = await prisma.auditTemplate.findFirst({
    where: {
      id,
      restaurant: { userId: payload.userId },
    },
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
      forkedFromId: true,
      forkedFrom: { select: { isPublished: true, isActive: true } },
      category: { select: { id: true, labelTr: true, labelEn: true } },
      questions: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          type: true,
          prompt: true,
          options: true,
          weight: true,
          isRequired: true,
          sortOrder: true,
        },
      },
      _count: { select: { assignments: true, responses: true } },
    },
  });
  if (!template) notFound();

  const teamMembers = await prisma.teamMember.findMany({
    where: { ownerId: payload.userId, status: 'active' },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: { id: true, email: true, name: true, role: true },
  });

  const h = await headers();
  const appUrl = resolveAppUrl(h.get('x-forwarded-host') || h.get('host'));

  return (
    <AuditDetailClient
      locale={locale}
      template={{
        id: template.id,
        restaurantId: template.restaurantId ?? '',
        title: template.title,
        description: template.description,
        sector: template.sector as AuditSector,
        scoringMode: template.scoringMode as AuditScoringMode,
        passingScore: template.passingScore,
        locale: template.locale,
        isPublished: template.isPublished,
        isActive: template.isActive,
        forkedFromId: template.forkedFromId,
        forkedFrom: template.forkedFrom,
        category: template.category,
        questions: template.questions.map((q) => ({
          id: q.id,
          type: q.type as AuditQuestionType,
          prompt: q.prompt,
          options: q.options,
          weight: q.weight,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        })),
        _count: template._count,
      }}
      teamMembers={teamMembers}
      appUrl={appUrl}
    />
  );
}
