import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import Link from 'next/link';
import { Building2, QrCode, ArrowRight, Star, Calendar, ShieldCheck, TrendingUp } from 'lucide-react';
import RestaurantAnalyticsPanel from '@/components/dashboard/RestaurantAnalyticsPanel';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Dashboard — Buaze' : 'Dashboard — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;

  if (!token) {
    redirect(`/${locale}/auth/login`);
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    redirect(`/${locale}/auth/login`);
  }

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: {
      restaurants: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { feedbacks: true } },
          feedbacks: {
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            },
            select: { id: true }
          }
        },
      },
    },
  });

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Calculate stats
  const totalReviews = user.restaurants.reduce((a, r) => a + r._count.feedbacks, 0);
  const todayReviews = user.restaurants.reduce((a, r) => a + r.feedbacks.length, 0);
  
  const positiveReviews = await prisma.feedback.count({
    where: {
      restaurantId: { in: user.restaurants.map(r => r.id) },
      rating: { gte: 4 }
    }
  });

  const latestFeedbacks = await prisma.feedback.findMany({
    where: {
      restaurantId: { in: user.restaurants.map(r => r.id) }
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      restaurant: { select: { name: true } }
    }
  });

  // Per-restaurant avg rating for "Konum performansı" widget
  const restaurantRatings = user.restaurants.length
    ? await prisma.feedback.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: user.restaurants.map((r) => r.id) } },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : [];
  const ratingByRestaurant = new Map(
    restaurantRatings.map((r) => [r.restaurantId, { avg: r._avg.rating ?? 0, count: r._count._all }]),
  );
  const locationPerf = user.restaurants
    .map((r) => {
      const stat = ratingByRestaurant.get(r.id);
      return { id: r.id, name: r.name, avg: stat?.avg ?? 0, count: stat?.count ?? 0 };
    })
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 5);

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTr = locale === 'tr';
  const displayName = user.name?.trim() || (isTr ? 'İşletmeci' : 'there');
  const activeQr = user.restaurants.filter((r) => r.isActive).length;

  type Kpi = { label: string; value: number; sub: string; icon: React.ReactNode; href?: string };
  const kpis: Kpi[] = [
    {
      label: isTr ? 'Toplam yorum' : 'Total reviews',
      value: totalReviews,
      sub: isTr ? 'Tüm işletmeler' : 'All locations',
      icon: <Star size={14} strokeWidth={2} />,
      href: `/${locale}/dashboard/feedbacks`,
    },
    {
      label: isTr ? 'Bugün' : 'Today',
      value: todayReviews,
      sub: isTr ? 'Son 24 saat' : 'Last 24 hours',
      icon: <Calendar size={14} strokeWidth={2} />,
      href: `/${locale}/dashboard/feedbacks?days=1`,
    },
    {
      label: isTr ? 'Pozitif yorum' : 'Positive reviews',
      value: positiveReviews,
      sub: isTr ? '4+ yıldız' : '4+ stars',
      icon: <ShieldCheck size={14} strokeWidth={2} />,
      href: `/${locale}/dashboard/feedbacks?rating=positive`,
    },
    {
      label: isTr ? 'Aktif QR' : 'Active QR',
      value: activeQr,
      sub: isTr ? `${user.restaurants.length} konum` : `${user.restaurants.length} locations`,
      icon: <QrCode size={14} strokeWidth={2} />,
    },
  ];

  return (
    <div
      className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 sm:px-8 lg:py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pulse-eyebrow text-[#737373]">
            {isTr ? 'ANA SAYFA / GENEL BAKIŞ' : 'HOME / OVERVIEW'}
          </p>
          <h1
            className="mt-2 text-[26px] sm:text-[34px] font-medium tracking-[-0.025em] leading-[1.05] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr
              ? `Merhaba ${displayName} — bugün nabız güçlü.`
              : `Hi ${displayName} — the pulse is strong today.`}
          </h1>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map((k) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="pulse-eyebrow text-[#737373]">{k.label}</span>
                <span className="w-7 h-7 rounded-lg bg-[#EAF9B8] text-[#0A0A0A] flex items-center justify-center">
                  {k.icon}
                </span>
              </div>
              <div
                className="mt-4 text-[30px] sm:text-[38px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A] tabular-nums"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {k.value}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#737373]">
                <TrendingUp size={11} strokeWidth={2} className="text-[#16A34A]" />
                <span>{k.sub}</span>
              </div>
            </>
          );
          return k.href ? (
            <Link
              key={k.label}
              href={k.href}
              className="block rounded-2xl border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#C6F24E]"
            >
              {inner}
            </Link>
          ) : (
            <div key={k.label} className="rounded-2xl border border-[#EDEDED] bg-white p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <RestaurantAnalyticsPanel
        locale={locale}
        restaurants={user.restaurants.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
        }))}
      />

      {/* Latest feedbacks + Location performance (AdminDashboard row design) */}
      {(latestFeedbacks.length > 0 || locationPerf.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          {latestFeedbacks.length > 0 && (
            <section className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="text-[18px] font-semibold tracking-[-0.015em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isTr ? 'Son yorumlar' : 'Latest reviews'}
                  </h2>
                  <p className="pulse-eyebrow text-[#737373] mt-1">
                    {isTr ? 'Son 3 · tüm işletmeler' : 'Last 3 · all locations'}
                  </p>
                </div>
                <Link
                  href={`/${locale}/dashboard/feedbacks`}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                >
                  {isTr ? 'Tümünü gör' : 'See all'}
                  <ArrowRight size={13} strokeWidth={2} />
                </Link>
              </div>

              <ul className="mt-5 divide-y divide-[#EDEDED]">
                {latestFeedbacks.map((fb) => {
                  const initials = (fb.restaurant?.name || 'B').charAt(0).toUpperCase();
                  const badgeBg = fb.rating >= 4 ? 'bg-[#C6F24E]' : fb.rating <= 2 ? 'bg-[#FEE2E2]' : 'bg-[#F5F5F5]';
                  const badgeFg = fb.rating <= 2 ? 'text-[#DC2626]' : 'text-[#0A0A0A]';
                  return (
                    <li key={fb.id} className="grid grid-cols-[36px_1fr_auto] items-start gap-3 py-4">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold ${badgeBg} ${badgeFg}`}
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#0A0A0A] truncate">
                            {fb.restaurant?.name ?? (isTr ? 'İşletme' : 'Location')}
                          </span>
                          <span className="text-[#C6F24E] text-[11px] tracking-wide">
                            {'★'.repeat(fb.rating)}
                            <span className="text-[#D4D4D4]">{'★'.repeat(5 - fb.rating)}</span>
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[13px] text-[#525252] leading-[1.55]">
                          {fb.comment || (isTr ? 'Yorum bırakılmadı.' : 'No comment.')}
                        </p>
                      </div>
                      <span className="pulse-eyebrow text-[#737373] whitespace-nowrap">
                        {new Date(fb.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Konum performansı — AdminDashboard right column */}
          {locationPerf.length > 0 && (
            <section className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7">
              <div>
                <h2
                  className="text-[18px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Konum performansı' : 'Location performance'}
                </h2>
                <p className="pulse-eyebrow text-[#737373] mt-1">
                  {isTr ? 'Bu ay · puana göre' : 'This month · by rating'}
                </p>
              </div>
              <ul className="mt-5 divide-y divide-[#EDEDED]">
                {locationPerf.map((loc) => (
                  <li key={loc.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/${locale}/dashboard/restaurants/${loc.id}`}
                        className="block truncate text-[13px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                      >
                        {loc.name}
                      </Link>
                      <div className="pulse-eyebrow text-[#737373] mt-0.5">
                        {loc.count} {isTr ? 'yorum' : 'reviews'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="text-[18px] font-semibold tabular-nums text-[#0A0A0A]"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {loc.avg > 0 ? loc.avg.toFixed(1) : '—'}
                      </span>
                      <span className="text-[#C6F24E] text-[13px]">★</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Restaurants */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2
            className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t.dash_restaurants}
          </h2>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="inline-flex items-center gap-1.5 bg-[#0A0A0A] text-white px-4 py-2.5 rounded-full text-[13px] font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            {t.dash_add_restaurant}
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>

        {user.restaurants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#EDEDED]">
              <Building2 size={22} className="text-[#737373]" />
            </div>
            <p
              className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {t.dash_no_restaurant}
            </p>
            <p className="mt-2 text-[14px] text-[#525252] leading-[1.55] max-w-[400px] mx-auto">
              {isTr
                ? 'İlk restoranınızı ekleyerek itibarınızı yönetmeye başlayın.'
                : 'Add your first restaurant to start managing your reputation.'}
            </p>
            <Link
              href={`/${locale}/dashboard/restaurants`}
              className="mt-5 inline-flex items-center gap-1.5 bg-[#C6F24E] text-[#0A0A0A] px-5 py-2.5 rounded-full text-[13px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.dash_add_restaurant}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user.restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="rounded-2xl border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#C6F24E]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {restaurant.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <p className="pulse-eyebrow text-[#737373] truncate">/{restaurant.slug}</p>
                      <CopyUrlButton
                        url={`${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/r/${restaurant.slug}`}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                  <span
                    className={`pulse-eyebrow shrink-0 rounded-full px-2 py-1 ${
                      restaurant.isActive
                        ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                        : 'bg-[#F5F5F5] text-[#737373]'
                    }`}
                  >
                    {restaurant.isActive ? (isTr ? 'AKTİF' : 'ACTIVE') : isTr ? 'PASİF' : 'INACTIVE'}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-y border-[#EDEDED] py-3">
                  <Star size={14} className="text-[#C6F24E]" fill="currentColor" />
                  <span className="text-[13px] text-[#525252]">
                    <span
                      className="font-semibold text-[#0A0A0A]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {restaurant._count.feedbacks}
                    </span>{' '}
                    {isTr ? 'yorum toplandı' : 'reviews collected'}
                  </span>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
                    className="flex-1 rounded-full bg-[#0A0A0A] px-4 py-2.5 text-center text-[12px] font-medium text-white hover:bg-[#1A1A1A] transition-colors"
                  >
                    {t.dash_manage}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/qr?restaurant=${restaurant.id}`}
                    className="flex-1 rounded-full border border-[#0A0A0A] px-4 py-2.5 text-center text-[12px] font-medium text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                  >
                    {t.dash_qr}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upgrade CTA */}
      {user.plan === 'trial' && (
        <section className="rounded-2xl bg-[#0A0A0A] p-8 sm:p-10 text-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[560px]">
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'GROWTH' : 'GROWTH'}
              </span>
              <h3
                className="mt-3 text-[24px] sm:text-[30px] font-medium tracking-[-0.02em] leading-[1.15]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'Kesintisiz itibar yönetimi.' : 'Uninterrupted reputation management.'}
              </h3>
              <p className="mt-3 text-[14px] text-white/70 leading-[1.6]">
                {isTr
                  ? `Deneme sürenizin bitmesine ${trialDaysLeft} gün kaldı. Tüm özellikleri sınırsız kullanmak için şimdi yükseltin.`
                  : `Only ${trialDaysLeft} days left in your trial. Upgrade now for unlimited access.`}
              </p>
            </div>
            <Link
              href={`/${locale}/pricing`}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-[#C6F24E] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.dash_upgrade}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
