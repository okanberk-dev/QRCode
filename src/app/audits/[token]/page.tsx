// CLAUDE.md §42 Phase 3 — Public audit response page.
//
// SSR: minimal validation (token shape + assignment exists + assignment
// active). Detayları client component'e bırak (GET endpoint zaten public).
// Render etmeden önce 404 short-circuit fingerprinting önler.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { detectLocaleFromAcceptLanguage } from '@/lib/translations';
import { headers } from 'next/headers';
import PublicAuditView from './PublicAuditView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  // Minimum metadata, robots:noindex — public link ama search engine'e
  // gitmemeli (KVKK + atama paylaşımı kullanıcıya özel).
  return {
    title: 'Denetim — Buaze',
    robots: { index: false, follow: false },
  };
}

export default async function PublicAuditPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 16) notFound();

  // Existence + active state guard (silent 404)
  const assignment = await prisma.auditAssignment.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      tokenRevoked: true,
      template: {
        select: {
          isPublished: true,
          isActive: true,
          locale: true,
          restaurant: { select: { isActive: true } },
        },
      },
    },
  });

  if (
    !assignment ||
    assignment.tokenRevoked ||
    assignment.status === 'cancelled' ||
    !assignment.template?.isActive ||
    !assignment.template.isPublished ||
    !assignment.template.restaurant?.isActive
  ) {
    notFound();
  }

  // Locale tercihi: önce şablon dili, sonra Accept-Language fallback.
  const h = await headers();
  const acceptLang = h.get('accept-language');
  const fallbackLocale = detectLocaleFromAcceptLanguage(acceptLang);
  const locale = assignment.template.locale === 'en' ? 'en' : assignment.template.locale === 'tr' ? 'tr' : fallbackLocale;

  return <PublicAuditView token={token} locale={locale} />;
}
