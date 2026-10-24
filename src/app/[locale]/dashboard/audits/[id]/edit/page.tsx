// Denetim Merkezi — denetimi düzenle (tek sayfa builder, düzenle modu).
//
// Kapsam, API'nin çözdüğü kapsamın aynısıdır (ekip üyeleri dahil): eski sayfa
// `restaurant: { userId }` ile arıyor, davetli üyeler 404 görüyordu (A6).
// Yazma yetkisi olmayanlar ve arşivlenmiş denetimler detay sayfasına döner.

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { getAuditForEdit } from '@/lib/audits/queries';
import AuditBuilderClient from '@/components/audits/AuditBuilderClient';
import type { BuilderEditSource } from '@/components/audits/builder-state';
import { requireOwnerAuditContext } from '@/components/audits/owner-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Denetimi Düzenle' : 'Edit Audit',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AuditEditPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';

  const ctx = await requireOwnerAuditContext(locale, `/${locale}/dashboard/audits/${id}/edit`);

  const data = await getAuditForEdit({ templateId: id, restaurantIds: ctx.scopedIds });
  if (!data) notFound();

  const { template } = data;
  // Salt-okunur üye ya da arşivlenmiş denetim: düzenlenecek bir şey yok.
  if (!ctx.canWrite || template.status === 'archived') {
    redirect(`/${locale}/dashboard/audits/${id}`);
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { id: template.restaurantId },
    select: { id: true, name: true, category: true },
  });
  if (!restaurant) notFound();

  const edit: BuilderEditSource = {
    id: template.id,
    restaurantId: template.restaurantId,
    title: template.title,
    description: template.description,
    sector: template.sector,
    scoringMode: template.scoringMode,
    passingScore: template.passingScore,
    locale: template.locale === 'en' ? 'en' : 'tr',
    categoryId: template.categoryId,
    isPublished: template.isPublished,
    updatedAt: template.updatedAt,
    hasResponses: template.hasResponses,
    questions: template.questions,
    answeredQuestionIds: data.answeredQuestionIds,
  };

  return (
    <AuditBuilderClient
      mode="edit"
      locale={locale}
      restaurants={[restaurant]}
      hydratedRestaurantId={restaurant.id}
      categories={data.categories}
      edit={edit}
    />
  );
}
