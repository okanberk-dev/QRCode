import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import Link from 'next/link';
import { Building2, QrCode, Star, AlertTriangle, ArrowRight, LogOut } from 'lucide-react';

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
        },
      },
    },
  });

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Calculate trial days remaining
  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialExpiring = user.plan === 'trial' && trialDaysLeft <= 3;

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#111827]">
              <span className="text-[#FDBF1D] font-black text-lg leading-none">B</span>
            </div>
            <span className="text-xl font-black tracking-tight text-[#111827]">Buaze</span>
          </Link>

          <div className="flex items-center gap-4">
            {user.plan === 'trial' && (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black ${isTrialExpiring ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                <AlertTriangle size={12} />
                {t.dash_trial_banner}: {trialDaysLeft} {t.dash_trial_days}
              </div>
            )}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                id="dashboard-logout-btn"
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut size={16} />
                <span className="hidden sm:block">{t.dash_logout}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#111827]">
            {t.dash_welcome}{user.name ? `, ${user.name}` : ''}! 👋
          </h1>
          <p className="text-gray-500 font-bold">
            {locale === 'tr' ? 'Restoranlarınızı buradan yönetebilirsiniz.' : 'Manage your restaurants from here.'}
          </p>
        </div>

        {/* Trial Banner (Mobile) */}
        {user.plan === 'trial' && (
          <div className={`sm:hidden p-4 rounded-2xl flex items-center justify-between gap-4 ${isTrialExpiring ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={isTrialExpiring ? 'text-red-500' : 'text-yellow-600'} />
              <span className={`text-sm font-black ${isTrialExpiring ? 'text-red-700' : 'text-yellow-700'}`}>
                {t.dash_trial_banner}: {trialDaysLeft} {t.dash_trial_days}
              </span>
            </div>
            <Link href={`/${locale}/pricing`} className="text-xs font-black text-white bg-[#FDBF1D] px-3 py-2 rounded-lg whitespace-nowrap">
              {t.dash_upgrade}
            </Link>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: locale === 'tr' ? 'Restoranlar' : 'Restaurants', val: user.restaurants.length, icon: <Building2 size={20} />, color: 'text-blue-600 bg-blue-50' },
            { label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews', val: user.restaurants.reduce((a, r) => a + r._count.feedbacks, 0), icon: <Star size={20} />, color: 'text-yellow-600 bg-yellow-50' },
            { label: locale === 'tr' ? 'QR Aktif' : 'Active QR', val: user.restaurants.filter(r => r.isActive).length, icon: <QrCode size={20} />, color: 'text-green-600 bg-green-50' },
            { label: locale === 'tr' ? 'Plan' : 'Plan', val: user.plan === 'trial' ? (locale === 'tr' ? 'Deneme' : 'Trial') : user.plan, icon: <AlertTriangle size={20} />, color: 'text-purple-600 bg-purple-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-black text-[#111827]">{stat.val}</div>
              <div className="text-xs font-bold text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Restaurants */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-[#111827]">{t.dash_restaurants}</h2>
            <Link
              href="/admin/restaurants"
              className="flex items-center gap-2 text-sm font-black text-[#FDBF1D] hover:text-[#EAB308] transition-colors"
            >
              {t.dash_add_restaurant} <ArrowRight size={16} />
            </Link>
          </div>

          {user.restaurants.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                <Building2 size={32} className="text-gray-300" />
              </div>
              <p className="font-black text-gray-400">{t.dash_no_restaurant}</p>
              <Link
                href="/admin/restaurants"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#111827] text-white font-black rounded-xl hover:bg-black transition-all"
              >
                {t.dash_add_restaurant} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.restaurants.map(restaurant => (
                <div key={restaurant.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-black text-[#111827]">{restaurant.name}</h3>
                      <p className="text-xs font-bold text-gray-400">/{restaurant.slug}</p>
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded-full ${restaurant.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {restaurant.isActive ? (locale === 'tr' ? 'Aktif' : 'Active') : (locale === 'tr' ? 'Pasif' : 'Inactive')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-4">
                    <Star size={12} className="text-[#FDBF1D]" />
                    {restaurant._count.feedbacks} {locale === 'tr' ? 'yorum' : 'reviews'}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/restaurants/${restaurant.id}`}
                      className="flex-1 text-center py-2 text-xs font-black bg-[#111827] text-white rounded-lg hover:bg-black transition-all"
                    >
                      {t.dash_manage}
                    </Link>
                    <Link
                      href={`/admin/qr?restaurantId=${restaurant.id}`}
                      className="flex-1 text-center py-2 text-xs font-black bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
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
          <div className="bg-[#111827] text-white rounded-3xl p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black mb-2">
                {locale === 'tr' ? 'Deneme süreniz dolmadan plan seçin' : 'Choose a plan before your trial ends'}
              </h3>
              <p className="text-gray-400 font-bold">
                {locale === 'tr'
                  ? `${trialDaysLeft} gününüz kaldı. Kesintisiz erişim için planınızı yükseltin.`
                  : `${trialDaysLeft} days remaining. Upgrade for uninterrupted access.`}
              </p>
            </div>
            <Link
              href={`/${locale}/pricing`}
              className="whitespace-nowrap flex items-center gap-2 px-8 py-4 bg-[#FDBF1D] text-[#111827] font-black rounded-xl hover:bg-[#EAB308] transition-all shadow-xl shadow-yellow-500/20"
            >
              {t.dash_upgrade} <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
