// Denetim Merkezi — yeni denetim (3 adımlı sihirbaz, oluştur modu).
//
// Sunucu: oturum + işletme kapsamı + (varsa) `?from=` hazır şablon kaynağı +
// kategori listesi + yazma yetkisi + ilk adımda önerilecek hazır şablonlar.
// Ekip üyesi sorgusu YOK (kişi atama kalktı). Salt-okunur üyeler denetim
// oluşturamaz → listeye yönlendirilir.

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { listCatalogForOwner } from '@/lib/audits/queries';
import type { AuditScoringMode, AuditSector } from '@/lib/audits/types';
import AuditBuilderClient from '@/components/audits/AuditBuilderClient';
import type { BuilderForkSource, BuilderStarterTemplate } from '@/components/audits/builder-state';
import { requireOwnerAuditContext } from '@/components/audits/owner-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Yeni Denetim' : 'New Audit',
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; restaurantId?: string; restaurant?: string }>;
}

export default async function NewAuditPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;

  const ctx = await requireOwnerAuditContext(locale, `/${locale}/dashboard/audits/new`);
  if (!ctx.canWrite) redirect(`/${locale}/dashboard/audits`);

  // Ekip üyeleri dahil kapsam (API katmanının çözdüğü kapsamın aynısı).
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: ctx.scopedIds }, isActive: true },
    select: { id: true, name: true, category: true },
    orderBy: { createdAt: 'asc' },
  });
  if (restaurants.length === 0) redirect(`/${locale}/dashboard/restaurants?empty=1`);

  // Sunucu localStorage'ı okuyamaz → etkin işletme yalnız URL'den (yoksa ilk işletme);
  // istemci kabuktaki seçime kendisi uyar.
  const activeId =
    resolveActiveRestaurantId({
      restaurants,
      queryRestaurantId: sp.restaurantId ?? sp.restaurant,
      storedRestaurantId: null,
    }) ?? restaurants[0].id;

  // Ardışık okumalar: Supabase pooler `connection_limit=1` (CLAUDE.md §40.1).
  const categories = await prisma.auditCategory.findMany({
    orderBy: [{ sector: 'asc' }, { order: 'asc' }, { labelTr: 'asc' }],
    select: { id: true, slug: true, labelTr: true, labelEn: true, sector: true },
  });

  const forkRow = sp.from
    ? await prisma.auditTemplate.findFirst({
        where: { id: sp.from, restaurantId: null, isPublished: true, isActive: true },
        select: {
          title: true,
          description: true,
          sector: true,
          scoringMode: true,
          passingScore: true,
          categoryId: true,
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
      })
    : null;

  const fork: BuilderForkSource | null = forkRow
    ? {
        title: forkRow.title,
        description: forkRow.description,
        sector: forkRow.sector as AuditSector,
        scoringMode: forkRow.scoringMode as AuditScoringMode,
        passingScore: forkRow.passingScore,
        categoryId: forkRow.categoryId,
        locale: forkRow.locale === 'en' ? 'en' : 'tr',
        questions: forkRow.questions,
      }
    : null;

  // İlk adımdaki "Hazır şablonla başla" önerileri (yalnız sıfırdan oluştururken).
  // Süzme (sektör / dil) istemcide: kabuktan işletme değişince yeniden istek yok.
  let starterTemplates: BuilderStarterTemplate[] = [];
  if (!forkRow) {
    const { data } = await listCatalogForOwner();
    starterTemplates = data.map((row) => ({
      id: row.id,
      title: row.title,
      sector: row.sector,
      kind: row.kind,
      locale: row.locale === 'en' ? 'en' : 'tr',
      itemCount: row._count.questions,
    }));
  }

  return (
    <AuditBuilderClient
      // `?from=` değişince (ilk adımda şablon seçildi) sihirbaz baştan kurulur.
      key={forkRow ? `from-${sp.from}` : 'blank'}
      mode="create"
      locale={locale}
      restaurants={restaurants}
      hydratedRestaurantId={activeId}
      categories={categories}
      fork={fork}
      forkMissing={Boolean(sp.from) && !forkRow}
      starterTemplates={starterTemplates}
    />
  );
}
