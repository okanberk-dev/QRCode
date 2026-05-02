import { notFound } from 'next/navigation';
import { jsonLdString } from '@/lib/seo/json-ld';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PublicMenuView, { type MenuCategoryView, type RestaurantView } from '@/components/menu/PublicMenuView';
import { MENU_THEMES, type MenuTheme } from '@/lib/validations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadMenu(slug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      menuCategories: {
        where: { isVisible: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          items: {
            where: { deletedAt: null, isAvailable: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });
  if (!restaurant || !restaurant.isActive || !restaurant.menuEnabled || !restaurant.menuPublished) {
    return null;
  }
  return restaurant;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, category: true, address: true, isActive: true, menuEnabled: true, menuPublished: true },
  });
  if (!restaurant || !restaurant.isActive || !restaurant.menuEnabled || !restaurant.menuPublished) {
    return { title: 'Menü bulunamadı · Buaze', robots: { index: false } };
  }
  const title = `${restaurant.name} · Menü`;
  const description = [restaurant.category, restaurant.address].filter(Boolean).join(' — ') ||
    `${restaurant.name} işletmesinin dijital menüsü.`;
  const canonical = `https://buaze.com/menu/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function detectLocale(acceptLang?: string | null, qLang?: string | null): 'tr' | 'en' {
  const raw = (qLang || acceptLang || '').toLowerCase();
  if (raw.startsWith('en')) return 'en';
  return 'tr';
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang } = await searchParams;

  const data = await loadMenu(slug);
  if (!data) notFound();

  const locale = detectLocale(null, lang);

  const menuTheme: MenuTheme = (MENU_THEMES as readonly string[]).includes(data.menuTheme)
    ? (data.menuTheme as MenuTheme)
    : 'classic';

  const restaurant: RestaurantView = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category,
    address: data.address,
    phone: data.phone,
    workingHours: data.workingHours,
    primaryColor: data.primaryColor,
    menuTheme,
    menuAccentColor: data.menuAccentColor ?? null,
    menuLogoUrl: data.menuLogoUrl ?? null,
  };

  const categories: MenuCategoryView[] = data.menuCategories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    isVisible: c.isVisible,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      priceCents: i.priceCents,
      currency: i.currency,
      imageUrl: i.imageUrl,
      badges: i.badges,
      isAvailable: i.isAvailable,
      isOutOfStock: i.isOutOfStock,
      sortOrder: i.sortOrder,
    })),
  }));

  const canonical = `https://buaze.com/menu/${data.slug}`;
  const restaurantNode = {
    '@type': 'Restaurant',
    '@id': `${canonical}#restaurant`,
    name: data.name,
    url: canonical,
    image: data.menuLogoUrl || undefined,
    address: data.address
      ? { '@type': 'PostalAddress', streetAddress: data.address, addressCountry: 'TR' }
      : undefined,
    telephone: data.phone || undefined,
    servesCuisine: data.category || undefined,
    openingHours: data.workingHours || undefined,
    hasMenu: { '@id': `${canonical}#menu` },
  };
  const menuNode = {
    '@type': 'Menu',
    '@id': `${canonical}#menu`,
    name: `${data.name} — Menü`,
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    url: canonical,
    provider: { '@id': `${canonical}#restaurant` },
    hasMenuSection: categories.map((c) => ({
      '@type': 'MenuSection',
      name: c.name,
      description: c.description || undefined,
      hasMenuItem: c.items.map((i) => ({
        '@type': 'MenuItem',
        name: i.name,
        description: i.description || undefined,
        image: i.imageUrl || undefined,
        offers: {
          '@type': 'Offer',
          price: (i.priceCents / 100).toFixed(2),
          priceCurrency: i.currency,
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: (i.priceCents / 100).toFixed(2),
            priceCurrency: i.currency,
            valueAddedTaxIncluded: true,
          },
          availability: i.isOutOfStock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        },
      })),
    })),
  };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [restaurantNode, menuNode],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} />
    </>
  );
}
