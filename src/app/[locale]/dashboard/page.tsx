import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import Link from 'next/link';
import { Building2, QrCode, Star, AlertTriangle, ArrowRight, LogOut, User, ShieldCheck, Calendar } from 'lucide-react';

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

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

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
    <div className="min-h-screen bg-[#FCFBF7] font-sans selection:bg-[#FDBF1D]/30">
      {/* Header */}
      <header className="bg-white border-b-4 border-[#1f1e1d] sticky top-0 z-20 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#111827] border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] group-hover:translate-y-0.5 group-hover:shadow-[0_2px_0_0_#1f1e1d] transition-all">
              <span className="text-[#FDBF1D] font-black text-xl leading-none">B</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#111827]">Buaze</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            {user.plan === 'trial' && (
              <div className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black border-2 ${isTrialExpiring ? 'bg-red-50 text-red-600 border-red-600 shadow-[0_3px_0_0_#ef4444]' : 'bg-[#FDBF1D]/10 text-[#ea580c] border-[#ea580c] shadow-[0_3px_0_0_#ea580c]'}`}>
                <AlertTriangle size={14} strokeWidth={3} />
                {t.dash_trial_banner}: {trialDaysLeft} {t.dash_trial_days}
              </div>
            )}
            
            <div className="flex items-center gap-2 sm:gap-4 border-l-2 border-[#F7F4F0] pl-6">
              <Link
                href={`/${locale}/dashboard/profile`}
                className="flex items-center gap-2 text-[13px] font-black text-[#6b6760] hover:text-[#111827] transition-all px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-[#1f1e1d]/10 active:translate-y-1 group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FCFBF7] border-2 border-[#1f1e1d] flex items-center justify-center shadow-[2px_2px_0_0_#1f1e1d] group-hover:bg-[#FDBF1D] transition-all">
                  <User size={16} strokeWidth={3} />
                </div>
                <span className="hidden sm:block uppercase tracking-wider">{t.dash_profile}</span>
              </Link>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  id="dashboard-logout-btn"
                  className="flex items-center gap-2 text-[13px] font-black text-[#6b6760] hover:text-red-500 transition-all px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-red-500/10 active:translate-y-1"
                >
                  <LogOut size={18} strokeWidth={2.5} />
                  <span className="hidden sm:block uppercase tracking-wider">{t.dash_logout}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-10 sm:space-y-14">
        {/* Welcome */}
        <div className="space-y-3">
          <div className="inline-block px-4 py-1.5 bg-[#FDBF1D] text-[#1f1e1d] border-2 border-[#1f1e1d] rounded-full text-[11px] font-black uppercase tracking-widest mb-2 shadow-[2px_2px_0_0_#1f1e1d]">
            {t.dash_welcome}
          </div>
          <h1 className="text-[42px] font-black text-[#1f1e1d] tracking-[-0.03em] leading-tight">
             {user.name ? `${user.name}` : 'İşletmeci'}! 👋
          </h1>
          <p className="text-[17px] text-[#6b6760] font-bold max-w-[500px]">
            {locale === 'tr' ? 'Dijital itibarınızı ve müşteri geri bildirimlerini tek bir yerden yönetin.' : 'Manage your digital reputation and customer feedback in one place.'}
          </p>
        </div>

        {/* Trial Banner (Mobile) */}
        {user.plan === 'trial' && (
          <div className={`sm:hidden p-6 rounded-[24px] border-2 flex flex-col gap-4 shadow-[6px_8px_0_0_#1f1e1d] ${isTrialExpiring ? 'bg-red-50 border-red-600' : 'bg-yellow-50 border-[#FDBF1D]'}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className={isTrialExpiring ? 'text-red-600' : 'text-[#ea580c]'} strokeWidth={3} />
              <span className={`text-lg font-black ${isTrialExpiring ? 'text-red-700' : 'text-[#ea580c]'}`}>
                {trialDaysLeft} {t.dash_trial_days} kaldı
              </span>
            </div>
            <Link href={`/${locale}/pricing`} className="w-full text-center py-4 bg-[#1f1e1d] text-white font-black rounded-2xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#000] active:translate-y-[4px] active:shadow-none transition-all">
              {t.dash_upgrade}
            </Link>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews', val: totalReviews, icon: <Star size={24} />, shadow: '#FDBF1D', link: `/${locale}/dashboard/feedbacks` },
            { label: locale === 'tr' ? 'Bugün Gelen' : 'Today\'s Feedbacks', val: todayReviews, icon: <Calendar size={24} />, shadow: '#3b82f6', link: `/${locale}/dashboard/feedbacks?days=1` },
            { label: locale === 'tr' ? 'Pozitif Yorum' : 'Positive Reviews', val: positiveReviews, icon: <ShieldCheck size={24} />, shadow: '#10b981', link: `/${locale}/dashboard/feedbacks?rating=positive` },
            { label: locale === 'tr' ? 'QR Aktif' : 'Active QR', val: user.restaurants.filter(r => r.isActive).length, icon: <QrCode size={24} />, shadow: '#a855f7' },
          ].map(stat => (
            stat.link ? (
              <Link key={stat.label} href={stat.link} className="bg-white rounded-[24px] p-5 sm:p-7 border-2 border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-[#1f1e1d] mb-4 sm:mb-5 bg-[#FCFBF7] group-hover:bg-[#FDBF1D] transition-colors`}>
                  {stat.icon}
                </div>
                <div className="text-3xl font-black text-[#1f1e1d] tracking-tighter tabular-nums">{stat.val}</div>
                <div className="text-[12px] font-black text-[#ada89f] uppercase tracking-widest mt-1">{stat.label}</div>
              </Link>
            ) : (
              <div key={stat.label} className="bg-white rounded-[24px] p-5 sm:p-7 border-2 border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d]">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-[#1f1e1d] mb-4 sm:mb-5 bg-[#FCFBF7]`}>
                  {stat.icon}
                </div>
                <div className="text-3xl font-black text-[#1f1e1d] tracking-tighter tabular-nums">{stat.val}</div>
                <div className="text-[12px] font-black text-[#ada89f] uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            )
          ))}
        </div>

        {/* Latest Feedbacks Brief Widget */}
        {latestFeedbacks.length > 0 && (
          <div className="bg-white rounded-[32px] border-2 border-[#1f1e1d] shadow-[6px_8px_0_0_#FDBF1D] overflow-hidden">
            <div className="bg-[#FCFBF7] border-b-2 border-[#1f1e1d] px-6 sm:px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="text-[#ea580c]" size={20} strokeWidth={3} fill="currentColor" />
                <h3 className="text-lg font-black text-[#111827] uppercase tracking-tighter italic">Son Değerlendirmeler</h3>
              </div>
              <Link href={`/${locale}/dashboard/feedbacks`} className="text-[11px] font-black text-[#6b6760] hover:text-[#111827] uppercase tracking-widest flex items-center gap-2">
                HEPSİNİ GÖR <ArrowRight size={14} strokeWidth={3} />
              </Link>
            </div>
            <div className="divide-y-2 divide-[#F7F4F0]">
              {latestFeedbacks.map((fb) => (
                <div key={fb.id} className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex text-[#FDBF1D]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < fb.rating ? "currentColor" : "none"} strokeWidth={3} />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-[#ada89f] uppercase tracking-widest">{fb.restaurant.name}</span>
                    </div>
                    <p className="text-[14px] font-bold text-[#111827] line-clamp-1 italic">{fb.comment || (locale === 'tr' ? 'Yorum bırakılmadı.' : 'No comment provided.')}</p>
                  </div>
                  <div className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest whitespace-nowrap">
                    {new Date(fb.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurants */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#1f1e1d] tracking-tight">{t.dash_restaurants}</h2>
            <Link
              href="/admin/restaurants"
              className="flex items-center gap-2 px-6 py-3 bg-[#1f1e1d] text-white font-black rounded-xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#000] hover:bg-[#FDBF1D] hover:text-[#111827] active:translate-y-[2px] active:shadow-[0_2px_0_0_#000] transition-all text-sm uppercase tracking-wider"
            >
              {t.dash_add_restaurant} <ArrowRight size={18} strokeWidth={3} />
            </Link>
          </div>

          {user.restaurants.length === 0 ? (
            <div className="bg-white rounded-[24px] border-2 border-dashed border-[#e8e4de] p-24 text-center space-y-6">
              <div className="w-20 h-20 bg-[#F7F4F0] rounded-2xl flex items-center justify-center mx-auto border-2 border-[#e8e4de]">
                <Building2 size={40} className="text-[#ada89f]" />
              </div>
              <div className="space-y-2">
                <p className="text-[18px] font-black text-[#1f1e1d]">{t.dash_no_restaurant}</p>
                <p className="text-sm text-[#6b6760] font-bold">İlk restoranınızı ekleyerek itibarınızı yönetmeye başlayın.</p>
              </div>
              <Link
                href="/admin/restaurants"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#FDBF1D] text-[#111827] font-black rounded-2xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[4px] active:shadow-none"
              >
                {t.dash_add_restaurant} <ArrowRight size={20} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {user.restaurants.map(restaurant => (
                <div key={restaurant.id} className="bg-white rounded-[24px] border-2 border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black text-[#1f1e1d] group-hover:text-[#ea580c] transition-colors">{restaurant.name}</h3>
                      <p className="text-[13px] font-bold text-[#ada89f] mt-1">/{restaurant.slug}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 ${restaurant.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-[#ada89f] border-gray-200'}`}>
                      {restaurant.isActive ? (locale === 'tr' ? 'AKTİF' : 'ACTIVE') : (locale === 'tr' ? 'PASİF' : 'INACTIVE')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm font-black text-[#6b6760] mb-8 py-3 border-y border-[#F7F4F0]">
                    <Star size={18} className="text-[#FDBF1D]" fill="currentColor" />
                    {restaurant._count.feedbacks} {locale === 'tr' ? 'yorum toplandı' : 'reviews collected'}
                  </div>
                  <div className="flex gap-4">
                    <Link
                      href={`/admin/restaurants/${restaurant.id}`}
                      className="flex-1 text-center py-3.5 text-[13px] font-black bg-[#111827] text-white rounded-xl border-2 border-[#111827] shadow-[0_4px_0_0_#000] hover:bg-[#1f1e1d] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider"
                    >
                      {t.dash_manage}
                    </Link>
                    <Link
                      href={`/admin/qr?restaurantId=${restaurant.id}`}
                      className="flex-1 text-center py-3.5 text-[13px] font-black bg-[#FDBF1D] text-[#111827] rounded-xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider"
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
          <div className="bg-[#111827] text-white rounded-[24px] border-2 border-[#1f1e1d] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-10 shadow-[6px_8px_0_0_#FDBF1D]">
            <div className="space-y-4">
              <h3 className="text-[32px] font-black leading-tight tracking-[-0.03em]">
                {locale === 'tr' ? 'Kesintisiz İtibar Yönetimi' : 'Uninterrupted Reputation Mgmt'}
              </h3>
              <p className="text-[17px] text-[#ada89f] font-bold max-w-[550px]">
                {locale === 'tr'
                  ? `Deneme sürenizin bitmesine ${trialDaysLeft} gün kaldı. Tüm özellikleri sınırsız kullanmak için şimdi yükseltin.`
                  : `Only ${trialDaysLeft} days left in your trial. Upgrade now for unlimited access to all features.`}
              </p>
            </div>
            <Link
              href={`/${locale}/pricing`}
              className="whitespace-nowrap flex items-center gap-3 px-10 py-5 bg-[#FDBF1D] text-[#111827] font-black text-lg rounded-2xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              {t.dash_upgrade} <ArrowRight size={22} strokeWidth={3} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
