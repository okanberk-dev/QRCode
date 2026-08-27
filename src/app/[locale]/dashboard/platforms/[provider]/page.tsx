import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Plug } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { EmptyState, PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { getManageablePlatform, type PlatformEnabledField, type PlatformUrlField } from '@/lib/platform-management';
import PlatformProviderWizard, {
  type ProviderRestaurantInfo,
} from './_components/PlatformProviderWizard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; provider: string }>;
  searchParams?: Promise<{ restaurantId?: string; restaurant?: string }>;
}

type RestaurantProviderRow = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  googlePlaceId: string | null;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  redirectMinRating: number | null;
  reservationUrl: string | null;
  website: string | null;
  otherPlatformUrl: string | null;
  otherPlatformLabel: string | null;
  otherPlatformEnabled: boolean;
  // Stage 97 — opt-in WhatsApp channel for low-rating customers on the
  // public review surface (CLAUDE.md §19.1). Owner toggles via the
  // wizard mounted on this page when `platform.slug === 'whatsapp'`.
  whatsappReviewEnabled: boolean;
  whatsappReviewMessage: string | null;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

export default async function PlatformProviderPage({ params, searchParams }: PageProps) {
  const { locale: localeParam, provider } = await params;
  const query = await searchParams;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const platform = getManageablePlatform(provider);
  if (!platform) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  const next = `/${locale}/dashboard/platforms/${provider}`;
  if (!token) redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  }

  const restaurants = (await prisma.restaurant.findMany({
    where: { userId: payload.userId },
    select: {
      id: true,
      name: true,
      category: true,
      address: true,
      city: true,
      googlePlaceId: true,
      externalPlatformsEnabled: true,
      defaultRedirectPlatform: true,
      redirectMinRating: true,
      googleReviewUrl: true,
      yemekSepetiUrl: true,
      getirYemekUrl: true,
      trendyolYemekUrl: true,
      tripAdvisorUrl: true,
      airbnbUrl: true,
      bookingUrl: true,
      yandexUrl: true,
      yelpUrl: true,
      foursquareUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      whatsappUrl: true,
      reservationUrl: true,
      website: true,
      otherPlatformUrl: true,
      otherPlatformLabel: true,
      otherPlatformEnabled: true,
      googleEnabled: true,
      yemekSepetiEnabled: true,
      getirEnabled: true,
      trendyolEnabled: true,
      tripAdvisorEnabled: true,
      airbnbEnabled: true,
      bookingEnabled: true,
      yandexEnabled: true,
      yelpEnabled: true,
      foursquareEnabled: true,
      // Stage 97 — WhatsApp review opt-in (CLAUDE.md §19.1).
      whatsappReviewEnabled: true,
      whatsappReviewMessage: true,
    },
    orderBy: { createdAt: 'asc' },
  })) as RestaurantProviderRow[];

  const selectedRestaurantId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: query?.restaurantId ?? query?.restaurant,
    storedRestaurantId: null,
  });

  if (restaurants.length === 0 || !selectedRestaurantId) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-5 px-4 sm:px-7 py-6 lg:py-8">
        <PageHeader
          titleScale="compact"
          eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'PLATFORM LINKS'}
          title={platform.name}
          description={
            isTr
              ? 'Platform bağlantısını yönetmek için önce bir işletme ekleyin.'
              : 'Add a business first to manage this platform connection.'
          }
          actions={
            <Link href={`/${locale}/dashboard/platforms`} className="bz-btn">
              <ArrowLeft size={13} />
              {isTr ? 'Geri' : 'Back'}
            </Link>
          }
        />
        <div className="bz-card p-10">
          <EmptyState
            icon={<Plug size={22} strokeWidth={1.5} />}
            title={isTr ? 'Henüz işletmen yok' : 'No business yet'}
            body={
              isTr
                ? 'İlk işletmeni ekledikten sonra platform bağlantılarını yönetebilirsin.'
                : 'Add your first business to start managing platform links.'
            }
            action={
              <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-primary">
                {isTr ? 'İşletme ekle' : 'Add business'}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        titleScale="compact"
        eyebrow={isTr ? 'PLATFORM SİHİRBAZI' : 'PLATFORM WIZARD'}
        title={platform.name}
        description={
          isTr
            ? 'Bağlantı, doğrulama ve varsayılan yönlendirme ayarlarını bu platform için yönetin.'
            : 'Manage connection, validation, and default redirect settings for this platform.'
        }
        actions={
          <Link
            href={`/${locale}/dashboard/platforms?restaurantId=${selectedRestaurantId}`}
            className="bz-btn"
          >
            <ArrowLeft size={13} />
            {isTr ? 'Platformlar' : 'Platforms'}
          </Link>
        }
      />
      <PlatformProviderWizard
        locale={locale}
        platform={platform}
        restaurants={restaurants.map<ProviderRestaurantInfo>((restaurant) => ({ ...restaurant }))}
        selectedRestaurantId={selectedRestaurantId}
      />
    </div>
  );
}
