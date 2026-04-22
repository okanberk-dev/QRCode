import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import Link from 'next/link';
import { Building2, QrCode, Star, AlertTriangle, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';
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

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialExpiring = user.plan === 'trial' && trialDaysLeft <= 3;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-3 py-6 font-sans selection:bg-[#F4B400]/30 sm:px-6 sm:py-10 lg:py-12">
        {/* Welcome */}
        <div className="space-y-2 sm:space-y-3">
          <div className="inline-block px-3 py-1 bg-[#F4B400] text-[#1A2332] border-2 border-[#1A2332] rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1 shadow-md">
            {t.dash_welcome}
          </div>
          <h1 className="text-2xl sm:text-[42px] font-black text-[#1A2332] tracking-[-0.03em] leading-tight">
             {user.name ? `${user.name}` : 'İşletmeci'}! 👋
          </h1>
          <p className="text-sm sm:text-[17px] text-[#2A3444] font-bold max-w-[500px]">
            {locale === 'tr' ? 'Dijital itibarınızı ve müşteri geri bildirimlerini tek bir yerden yönetin.' : 'Manage your digital reputation and customer feedback in one place.'}
          </p>
        </div>

        {/* Trial Banner (Mobile) */}
        {user.plan === 'trial' && (
          <div className={`sm:hidden p-5 rounded-[20px] border-2 flex flex-col gap-3 shadow-md ${isTrialExpiring ? 'bg-red-50 border-red-600' : 'bg-yellow-50 border-[#F4B400]'}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className={isTrialExpiring ? 'text-red-600' : 'text-[#F4B400]'} strokeWidth={2} />
              <span className={`text-base font-black ${isTrialExpiring ? 'text-red-700' : 'text-[#F4B400]'}`}>
                {trialDaysLeft} {t.dash_trial_days} kaldı
              </span>
            </div>
            <Link href={`/${locale}/pricing`} className="w-full text-center py-3 bg-[#1A2332] text-white font-black rounded-xl border-2 border-[#1A2332] shadow-sm active:translate-y-[2px] active:shadow-none transition-all text-sm">
              {t.dash_upgrade}
            </Link>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews', val: totalReviews, icon: <Star size={20} />, shadow: '#F4B400', link: `/${locale}/dashboard/feedbacks` },
            { label: locale === 'tr' ? 'Bugün Gelen' : 'Today\'s Feedbacks', val: todayReviews, icon: <Calendar size={20} />, shadow: '#3b82f6', link: `/${locale}/dashboard/feedbacks?days=1` },
            { label: locale === 'tr' ? 'Pozitif Yorum' : 'Positive Reviews', val: positiveReviews, icon: <ShieldCheck size={20} />, shadow: '#10b981', link: `/${locale}/dashboard/feedbacks?rating=positive` },
            { label: locale === 'tr' ? 'QR Aktif' : 'Active QR', val: user.restaurants.filter(r => r.isActive).length, icon: <QrCode size={20} />, shadow: '#a855f7' },
          ].map(stat => (
            stat.link ? (
              <Link key={stat.label} href={stat.link} className="bg-white rounded-[20px] p-5 sm:p-7 border-2 border-[#1A2332] shadow-md group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1A2332] mb-3 sm:mb-5 bg-[#F8F6F1] group-hover:bg-[#F4B400] transition-colors`}>
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#1A2332] tracking-tighter tabular-nums">{stat.val}</div>
                <div className="text-[10px] sm:text-[12px] font-black text-[#6B7280] uppercase tracking-widest mt-1">{stat.label}</div>
              </Link>
            ) : (
              <div key={stat.label} className="bg-white rounded-[20px] p-5 sm:p-7 border-2 border-[#1A2332] shadow-md">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1A2332] mb-3 sm:mb-5 bg-[#F8F6F1]`}>
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#1A2332] tracking-tighter tabular-nums">{stat.val}</div>
                <div className="text-[10px] sm:text-[12px] font-black text-[#6B7280] uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            )
          ))}
        </div>

        <RestaurantAnalyticsPanel
          locale={locale}
          restaurants={user.restaurants.map((restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
          }))}
        />

        {/* Latest Feedbacks Brief Widget */}
        {latestFeedbacks.length > 0 && (
          <div className="bg-white rounded-[24px] border-2 border-[#1A2332] shadow-md overflow-hidden">
            <div className="bg-[#F8F6F1] border-b-2 border-[#1A2332] px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <Star className="text-[#F4B400]" size={18} strokeWidth={2} fill="currentColor" />
                <h3 className="text-base sm:text-lg font-black text-[#1A2332] uppercase tracking-tighter italic">{t.dash_latest_feedbacks}</h3>
              </div>
              <Link href={`/${locale}/dashboard/feedbacks`} className="text-[10px] font-black text-[#2A3444] hover:text-[#1A2332] uppercase tracking-widest flex items-center gap-1.5">
                {t.dash_see_all} <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
            <div className="divide-y-2 divide-[#F8F6F1]">
              {latestFeedbacks.map((fb) => (
                <div key={fb.id} className="p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex text-[#F4B400]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < fb.rating ? "currentColor" : "none"} strokeWidth={2} />
                        ))}
                      </div>
                      <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest">{fb.restaurant?.name}</span>
                    </div>
                    <p className="text-[13px] font-bold text-[#1A2332] line-clamp-1 italic">{fb.comment || (locale === 'tr' ? 'Yorum bırakılmadı.' : 'No comment provided.')}</p>
                  </div>
                  <div className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest whitespace-nowrap">
                    {new Date(fb.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurants */}
        <div className="space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-[#1A2332] tracking-tight">{t.dash_restaurants}</h2>
            <Link
              href={`/${locale}/dashboard/restaurants`}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#1A2332] text-white font-black rounded-xl border-2 border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:text-[#1A2332] active:translate-y-[2px] active:shadow-sm transition-all text-xs sm:text-sm uppercase tracking-wider"
            >
              {t.dash_add_restaurant} <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>

          {user.restaurants.length === 0 ? (
            <div className="bg-white rounded-[24px] border-2 border-dashed border-[#E8ECF2] p-12 sm:p-24 text-center space-y-4 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F8F6F1] rounded-2xl flex items-center justify-center mx-auto border-2 border-[#E8ECF2]">
                <Building2 size={40} className="text-[#6B7280]" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <p className="text-base sm:text-[18px] font-black text-[#1A2332]">{t.dash_no_restaurant}</p>
                <p className="text-xs sm:text-sm text-[#2A3444] font-bold">İlk restoranınızı ekleyerek itibarınızı yönetmeye başlayın.</p>
              </div>
              <Link
                href={`/${locale}/dashboard/restaurants`}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#F4B400] text-[#1A2332] font-black rounded-xl sm:rounded-2xl border-2 border-[#1A2332] shadow-sm hover:bg-[#F4B400] transition-all active:translate-y-[3px] active:shadow-none text-sm"
              >
                {t.dash_add_restaurant} <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {user.restaurants.map(restaurant => (
                <div key={restaurant.id} className="bg-white rounded-[20px] border-2 border-[#1A2332] shadow-md p-6 sm:p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group">
                  <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-[#1A2332] group-hover:text-[#F4B400] transition-colors truncate">{restaurant.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] sm:text-[13px] font-bold text-[#6B7280] truncate">/{restaurant.slug}</p>
                        <CopyUrlButton 
                          url={`${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/r/${restaurant.slug}`} 
                          className="h-7 w-7"
                        />
                      </div>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border-2 ${restaurant.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-[#6B7280] border-gray-200'}`}>
                      {restaurant.isActive ? (locale === 'tr' ? 'AKTİF' : 'ACTIVE') : (locale === 'tr' ? 'PASİF' : 'INACTIVE')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#2A3444] mb-6 sm:mb-8 py-2.5 border-y border-[#F8F6F1]">
                    <Star size={16} className="text-[#F4B400]" fill="currentColor" />
                    {restaurant._count.feedbacks} {locale === 'tr' ? 'yorum toplandı' : 'reviews collected'}
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <Link
                      href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
                      className="flex-1 text-center py-3 text-[12px] font-black bg-[#1A2332] text-white rounded-xl border-2 border-[#1A2332] shadow-sm hover:bg-[#1A2332] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider"
                    >
                      {t.dash_manage}
                    </Link>
                    <Link
                      href={`/${locale}/dashboard/qr?restaurant=${restaurant.id}`}
                      className="flex-1 text-center py-3 text-[12px] font-black bg-[#F4B400] text-[#1A2332] rounded-xl border-2 border-[#1A2332] shadow-sm hover:bg-[#F4B400] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider"
                    >
                      {t.dash_qr}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        {user.plan === 'trial' && (
          <div className="bg-[#1A2332] text-white rounded-[24px] border-2 border-[#1A2332] p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-10 shadow-md">
            <div className="space-y-3 sm:space-y-4 text-center sm:text-left">
              <h3 className="text-xl sm:text-[32px] font-black leading-tight tracking-[-0.03em]">
                {locale === 'tr' ? 'Kesintisiz İtibar Yönetimi' : 'Uninterrupted Reputation Mgmt'}
              </h3>
              <p className="text-sm sm:text-[17px] text-[#6B7280] font-bold max-w-[550px]">
                {locale === 'tr'
                  ? `Deneme sürenizin bitmesine ${trialDaysLeft} gün kaldı. Tüm özellikleri sınırsız kullanmak için şimdi yükseltin.`
                  : `Only ${trialDaysLeft} days left in your trial. Upgrade now for unlimited access to all features.`}
              </p>
            </div>
            <Link
              href={`/${locale}/pricing`}
              className="whitespace-nowrap flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-[#F4B400] text-[#1A2332] font-black text-base sm:text-lg rounded-xl sm:rounded-2xl border-2 border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              {t.dash_upgrade} <ArrowRight size={20} strokeWidth={2} />
            </Link>
          </div>
        )}
    </div>
  );
}
