// Denetim Merkezi — sonuçlar (spec §3.6). Sunucudan yüklenir (CLAUDE.md §40.10):
// yanıt listesinin ilk sayfası, gerçek toplamlar ve "dikkat edilecek maddeler"
// sayfa ile birlikte gelir; istemci ilk boyamada iskelet göstermez.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { getAuditResultsInitial } from '@/lib/audits/queries';
import { isScorableByDefinition } from '@/lib/audits/score';
import type { AuditQuestionType } from '@/lib/audits/types';
import AuditResultsClient from '@/components/audits/AuditResultsClient';
import { requireOwnerAuditContext, resolveAuditAppUrl } from '@/components/audits/owner-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetim sonuçları' : 'Audit results',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AuditResultsPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const ctx = await requireOwnerAuditContext(locale, `/${locale}/dashboard/audits/${id}/results`);

  // Kapsam: ekip üyeleri dahil (API'nin çözdüğü kapsamın aynısı).
  const initial = await getAuditResultsInitial({ templateId: id, restaurantIds: ctx.scopedIds });
  if (!initial) notFound();

  // Boş durum ayrımı ("hiç yanıt yok" ↔ "filtreye uyan yok") ve "Tüm maddeler tamam"
  // iddiasının doğruluğu (hiç puanlanabilir madde yoksa hiçbir şey denetlenmedi) için
  // iki küçük okuma — aynı anda (eskiden sıralı transaction), açık select.
  const [questionRows, responseCount] = await Promise.all([
    prisma.auditQuestion.findMany({
      where: { templateId: initial.template.id },
      select: { type: true, correctAnswer: true },
    }),
    prisma.auditResponse.count({
      where: { templateId: initial.template.id, restaurantId: initial.template.restaurantId },
    }),
  ]);
  const evaluableCount = questionRows.filter((q) =>
    isScorableByDefinition({ type: q.type as AuditQuestionType, correctAnswer: q.correctAnswer }),
  ).length;

  const appUrl = await resolveAuditAppUrl();

  return (
    <AuditResultsClient
      locale={locale}
      initial={initial}
      questionCount={questionRows.length}
      evaluableCount={evaluableCount}
      responseCountAllTime={responseCount}
      appUrl={appUrl}
      canWrite={ctx.canWrite}
    />
  );
}
