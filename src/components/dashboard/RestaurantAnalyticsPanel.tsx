'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, Calendar, Layers, Loader2, SlidersHorizontal, TrendingUp } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import RatingChart from '@/components/admin/RatingChart';
import AspectBreakdown from '@/components/admin/AspectBreakdown';
import GoogleConversionPanel from '@/components/admin/GoogleConversionPanel';
import PlatformDistribution from '@/components/admin/PlatformDistribution';

const TrendsChart = dynamic(() => import('@/components/admin/TrendsChart'), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full animate-pulse rounded-3xl bg-[#F8F6F1]" />,
});

const DayDistributionChart = dynamic(() => import('@/components/admin/DayDistributionChart'), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full animate-pulse rounded-3xl bg-[#F8F6F1]" />,
});

interface RestaurantOption {
  id: string;
  name: string;
}

interface StatsResponse {
  totalCount: number;
  todayCount: number;
  avgRating: string;
  lowRatingCount: number;
  googleRedirectsCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  trends: { date: string; count: number; avgRating: number }[];
  dayDistribution: { name: string; count: number }[];
  aspects?: {
    food: { avg: number | null; count: number };
    service: { avg: number | null; count: number };
    atmosphere: { avg: number | null; count: number };
  };
  googleConversion?: {
    totalResponses: number;
    highRatings: number;
    sentToGoogle: number;
    missedOpportunities: number;
    conversionRate: number | null;
    byRestaurant: Array<{
      id: string;
      name: string;
      hasGoogleLink: boolean;
      highRatings: number;
      sentToGoogle: number;
      conversionRate: number | null;
    }>;
  };
  platformDistribution?: Array<{
    platform: string;
    label: string;
    count: number;
    avgRating?: number | null;
  }>;
}

interface RestaurantAnalyticsPanelProps {
  locale: 'tr' | 'en';
  restaurants: RestaurantOption[];
}

export default function RestaurantAnalyticsPanel({ locale, restaurants }: RestaurantAnalyticsPanelProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState('30');
  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurants.length > 1 ? 'all' : (restaurants[0]?.id || 'all'));

  const copy = locale === 'tr'
    ? {
        title: 'İleri İstatistikler',
        subtitle: 'QR performansınızı ve puan dağılımınızı buradan takip edin.',
        all: 'Tüm İşletmeler',
        rating: 'Puan Dağılımı',
        trends: 'Trend Analizi',
        days: 'Günlük Dağılım',
        aspects: 'Kategori Analizi',
        aspectsSub: 'Yemek, servis ve atmosfer puanlarınızı karşılaştırın.',
        google: 'Google Yorum Dönüşümü',
        googleSub: 'Memnun müşterilerin kaçı Google\'a yorum bırakmaya yönlendiriliyor.',
        platforms: 'Platform Dağılımı',
        platformsSub: 'Yorumlarınızın Google, Yemeksepeti, Getir ve Trendyol GO arasındaki dağılımı.',
      }
    : {
        title: 'Advanced Analytics',
        subtitle: 'Track your QR performance and rating distribution here.',
        all: 'All Locations',
        rating: 'Rating Split',
        trends: 'Trend Analysis',
        days: 'Daily Activity',
        aspects: 'Aspect Breakdown',
        aspectsSub: 'Compare your food, service and atmosphere scores.',
        google: 'Google Review Conversion',
        googleSub: 'How many happy customers actually reach Google to leave a review.',
        platforms: 'Platform Distribution',
        platformsSub: 'How your reviews split across Google, Yemeksepeti, Getir and Trendyol GO.',
      };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ days: daysFilter });
        if (selectedRestaurant !== 'all') {
          query.append('restaurantId', selectedRestaurant);
        }

        const response = await fetch(`/api/feedback/stats?${query.toString()}`);
        if (!response.ok) {
          setStats(null);
          return;
        }

        setStats(await response.json());
      } catch (error) {
        console.error(error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [daysFilter, selectedRestaurant]);

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#1A2332] sm:text-2xl">{copy.title}</h2>
            <p className="mt-2 text-sm font-bold text-[#2A3444]">{copy.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-2xl bg-[#F8F6F1] p-1">
              {[
                { value: '7', label: '7G' },
                { value: '30', label: '30G' },
                { value: 'all', label: locale === 'tr' ? 'Tümü' : 'All' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setDaysFilter(tab.value)}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    daysFilter === tab.value ? 'bg-[#1A2332] text-white' : 'text-[#2A3444]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {restaurants.length > 1 && (
              <select
                value={selectedRestaurant}
                onChange={(event) => setSelectedRestaurant(event.target.value)}
                className="rounded-2xl border border-[#E8ECF2] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#1A2332] outline-none transition-all focus:ring-2 focus:ring-[#F4B400]"
              >
                <option value="all">{copy.all}</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-[#E8ECF2] bg-white shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[#1A2332]" />
        </div>
      ) : stats ? (
        <>
          <StatsCards stats={stats} />

          {stats.aspects && (
            <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3 sm:mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <SlidersHorizontal size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-[#1A2332]">{copy.aspects}</h3>
                  <p className="mt-0.5 text-xs font-bold text-[#2A3444]">{copy.aspectsSub}</p>
                </div>
              </div>
              <AspectBreakdown aspects={stats.aspects} locale={locale} />
            </div>
          )}

          {stats.googleConversion && (
            <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3 sm:mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <TrendingUp size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-[#1A2332]">{copy.google}</h3>
                  <p className="mt-0.5 text-xs font-bold text-[#2A3444]">{copy.googleSub}</p>
                </div>
              </div>
              <GoogleConversionPanel
                data={stats.googleConversion}
                locale={locale}
                hideLeaderboard={selectedRestaurant !== 'all'}
              />
            </div>
          )}

          {stats.platformDistribution && stats.platformDistribution.length > 0 && (
            <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3 sm:mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Layers size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-[#1A2332]">{copy.platforms}</h3>
                  <p className="mt-0.5 text-xs font-bold text-[#2A3444]">{copy.platformsSub}</p>
                </div>
              </div>
              <PlatformDistribution data={stats.platformDistribution} locale={locale} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <TrendingUp size={20} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-extrabold text-[#1A2332]">{copy.trends}</h3>
              </div>
              <TrendsChart data={stats.trends} />
            </div>

            <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF8D6] text-[#F4B400]">
                  <Calendar size={20} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-extrabold text-[#1A2332]">{copy.rating}</h3>
              </div>
              <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E8ECF2] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BarChart3 size={20} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-extrabold text-[#1A2332]">{copy.days}</h3>
            </div>
            <DayDistributionChart data={stats.dayDistribution} />
          </div>
        </>
      ) : (
        <div className="rounded-[28px] border border-dashed border-[#E8ECF2] bg-white px-5 py-16 text-center text-sm font-bold text-[#2A3444] shadow-sm">
          {locale === 'tr' ? 'Henüz analiz üretilecek veri bulunamadı.' : 'No analytics data yet.'}
        </div>
      )}
    </section>
  );
}
