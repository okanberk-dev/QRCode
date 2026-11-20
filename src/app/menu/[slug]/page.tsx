import { cache } from 'react';
import { notFound } from 'next/navigation';
import { jsonLdString } from '@/lib/seo/json-ld';
import type { Metadata, Viewport } from 'next';
import { ROOT_VIEWPORT } from '@/lib/root-metadata';
import { readMenuDesign, resolveMenuDesign } from '@/lib/menu-design';
import { prisma } from '@/lib/prisma';
import PublicMenuView, { type MenuCategoryView, type RestaurantView } from '@/components/menu/PublicMenuView';
import { MENU_THEMES, type MenuTheme } from '@/lib/validations';
import { SITE_URL } from '@/lib/site';
import { isIndexableMenu } from '@/lib/seo/indexable-menu';
import {
  contentVersion,
  itemImageVersion,
  jsonLdImageUrl,
  menuImagePath,
  publicImageSrc,
} from '@/lib/menu-image-url';

// Stage 27 §38.103 Fix M2 — ISR cache window. Public menü yüksek-trafik
// QR akışı; force-dynamic + revalidate=0 her scan'de DB hit + render
// blokluyordu. 1 saat fresh CDN edge cache + owner save endpoint'lerinde
// `revalidatePath('/menu/${slug}')` instant invalidation ile stale window
// minimal. Owner save sonrası 1-2sn (CDN propagation) içinde public
// menü güncel; rush hour'da Vercel concurrent function limit baskısı
// %85+ azalır, mobile 4G LCP ~200-400ms iyileşir.
export const revalidate = 3600;

const ITEM_SELECT = {
  id: true, name: true, description: true, priceCents: true, currency: true, imageUrl: true,
  badges: true, allergens: true, isAvailable: true, isOutOfStock: true, sortOrder: true, updatedAt: true,
} as const;

// Explicit select (CLAUDE.md §14.1): never `menuCoverUrl` — the ~0.5 MB cover
// blob is served by the image route; the page only needs its version.
async function loadMenu(slug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, category: true, address: true, phone: true, workingHours: true,
      primaryColor: true, isActive: true, menuEnabled: true, menuPublished: true,
      menuTheme: true, menuAccentColor: true, menuLogoUrl: true, menuDesign: true, menuCoverVersion: true,
      menuCategories: {
        where: { isVisible: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true, name: true, description: true, sortOrder: true, isVisible: true,
          items: {
            where: { deletedAt: null, isAvailable: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: ITEM_SELECT,
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

// Page + viewport share one query per request.
const getMenu = cache(loadMenu);

function resolvedFor(data: NonNullable<Awaited<ReturnType<typeof loadMenu>>>) {
  return resolveMenuDesign({
    menuTheme: data.menuTheme,
    menuAccentColor: data.menuAccentColor,
    primaryColor: data.primaryColor,
    menuDesign: data.menuDesign,
    hasCover: Boolean(data.menuCoverVersion),
  });
}

const HEX6 = /^#[0-9A-F]{6}$/;

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const data = await getMenu(slug);
  if (!data) return ROOT_VIEWPORT;
  const color = resolvedFor(data).themeColor;
  return HEX6.test(color) ? { ...ROOT_VIEWPORT, themeColor: color } : ROOT_VIEWPORT;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      category: true,
      address: true,
      isActive: true,
      menuEnabled: true,
      menuPublished: true,
      menuCoverVersion: true,
      _count: { select: { menuItems: { where: { deletedAt: null, isAvailable: true } } } },
    },
  });
  if (!restaurant || !restaurant.isActive || !restaurant.menuEnabled || !restaurant.menuPublished) {
    return { title: 'Menü bulunamadı', robots: { index: false } };
  }
  // Test/demo or near-empty menus stay reachable for their owner's QR codes
  // but out of Google's index (thin pages; also left out of sitemap.xml).
  const indexable = isIndexableMenu({ slug, name: restaurant.name, itemCount: restaurant._count.menuItems });
  const title = `${restaurant.name} · Menü`;
  const description = [restaurant.category, restaurant.address].filter(Boolean).join(' — ') ||
    `${restaurant.name} işletmesinin dijital menüsü.`;
  const canonical = `https://www.buaze.com/menu/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      ...(restaurant.menuCoverVersion
        ? { images: [{ url: `${SITE_URL}${menuImagePath(slug, 'cover', restaurant.menuCoverVersion)}`, width: 1600, height: 900 }] }
        : {}),
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
  searchParams: Promise<{ lang?: string; source?: string }>;
}) {
  const { slug } = await params;
  const { lang, source } = await searchParams;

  const data = await getMenu(slug);
  if (!data) notFound();

  const locale = detectLocale(null, lang);

  const menuTheme: MenuTheme = (MENU_THEMES as readonly string[]).includes(data.menuTheme)
    ? (data.menuTheme as MenuTheme)
    : 'classic';

  // Stored photos are base64 data URLs. Inlined they weighed ~2 MB for a menu
  // with three photos (the same bytes landed in the <img>, the RSC payload and
  // the JSON-LD), so the page links to the cached image route instead and the
  // data URLs never enter the HTML. The logo is versioned by content because
  // not every route that writes it bumps `menuUpdatedAt`.
  const logoVersion = data.menuLogoUrl ? contentVersion(data.menuLogoUrl) : '0';

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
    menuLogoUrl: publicImageSrc({
      slug: data.slug,
      itemIdOrLogo: 'logo',
      imageUrl: data.menuLogoUrl,
      version: logoVersion,
    }),
    menuDesign: readMenuDesign(data.menuDesign),
    menuCoverUrl: data.menuCoverVersion ? menuImagePath(data.slug, 'cover', data.menuCoverVersion) : null,
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
      imageUrl: publicImageSrc({
        slug: data.slug,
        itemIdOrLogo: i.id,
        imageUrl: i.imageUrl,
        version: itemImageVersion(i.updatedAt),
      }),
      badges: i.badges,
      // Allergen information is a safety feature: it must reach the guest.
      allergens: i.allergens,
      isAvailable: i.isAvailable,
      isOutOfStock: i.isOutOfStock,
      sortOrder: i.sortOrder,
    })),
  }));

  const canonical = `https://www.buaze.com/menu/${data.slug}`;
  const logoImage = jsonLdImageUrl({
    siteUrl: SITE_URL,
    slug: data.slug,
    itemIdOrLogo: 'logo',
    imageUrl: data.menuLogoUrl,
    version: logoVersion,
  });
  const coverImage = data.menuCoverVersion
    ? `${SITE_URL}${menuImagePath(data.slug, 'cover', data.menuCoverVersion)}`
    : undefined;
  const images = [logoImage, coverImage].filter((u): u is string => typeof u === 'string' && u.length > 0);
  const restaurantImage = images.length > 1 ? images : images[0];

  // Page canvas colour from enumerated surface constants only (validated hex).
  const design = resolvedFor(data);
  const canvasCss = HEX6.test(design.colors.bg)
    ? `html,body{background-color:${design.colors.bg};color-scheme:${design.scheme === 'dark' ? 'dark' : 'light'}}html{scroll-behavior:smooth}`
    : 'html{scroll-behavior:smooth}';

  const restaurantNode = {
    '@type': 'Restaurant',
    '@id': `${canonical}#restaurant`,
    name: data.name,
    url: canonical,
    image: restaurantImage,
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
    hasMenuSection: data.menuCategories.map((c) => ({
      '@type': 'MenuSection',
      name: c.name,
      description: c.description || undefined,
      hasMenuItem: c.items.map((i) => ({
        '@type': 'MenuItem',
        name: i.name,
        description: i.description || undefined,
        image: jsonLdImageUrl({
          siteUrl: SITE_URL,
          slug: data.slug,
          itemIdOrLogo: i.id,
          imageUrl: i.imageUrl,
          version: itemImageVersion(i.updatedAt),
        }),
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
      <style>{canvasCss}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} initialSplash={source === 'qr'} />
    </>
  );
}
