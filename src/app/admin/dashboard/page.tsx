'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Download, Loader2, TrendingUp, Calendar, BarChart3, ArrowRight, SlidersHorizontal } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';
import WordCloud from '@/components/admin/WordCloud';
import AspectBreakdown from '@/components/admin/AspectBreakdown';
import GoogleConversionPanel from '@/components/admin/GoogleConversionPanel';

// Recharts components must be dynamic for SSR compatibility
const TrendsChart = dynamic(() => import('@/components/admin/TrendsChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-2xl" /> });
const DayDistributionChart = dynamic(() => import('@/components/admin/DayDistributionChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-2xl" /> });
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

export default function AdminDashboard() {
  const { t, locale } = useAdminTranslation();
  const [stats, setStats] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRating, setFilterRating] = useState('all');
  const [daysFilter, setDaysFilter] = useState('7');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/restaurants').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/me').then(res => res.ok ? res.json() : null)
    ])
    .then(([restData, profileData]) => {
      setRestaurants(Array.isArray(restData) ? restData : []);
      setUserProfile(profileData);

      if (profileData && (profileData.role === 'manager' || profileData.role === 'restaurant_owner') && profileData.restaurantId) {
        setSelectedRestaurant(profileData.restaurantId);
      }
    })
    .catch(() => setRestaurants([]));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsQuery = new URLSearchParams({ days: daysFilter });
      if (selectedRestaurant !== 'all') statsQuery.append('restaurantId', selectedRestaurant);

      const statsRes = await fetch(`/api/feedback/stats?${statsQuery.toString()}`);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else if (statsRes.status === 401) {
        window.location.href = '/admin';
      }

      const query = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        days: daysFilter
      });
      if (filterRating !== 'all') query.append('rating', filterRating);
      if (selectedRestaurant !== 'all') query.append('restaurantId', selectedRestaurant);

      const feedRes = await fetch(`/api/feedback?${query.toString()}`);
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setFeedbacks(feedData.data);
        setTotalPages(feedData.meta.totalPages);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page, filterRating, daysFilter, selectedRestaurant]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedRestaurant !== 'all') params.append('restaurantId', selectedRestaurant);
    window.open(`/api/feedback/export?${params.toString()}`, '_blank');
  };

  const isSuperAdmin = !userProfile || userProfile.role === 'superadmin';
  const displayName = userProfile?.name || userProfile?.username || userProfile?.email?.split('@')[0] || 'Admin';
  const satisfactionRate = stats && stats.totalCount > 0
    ? Math.round(((stats.googleRedirectsCount || 0) / stats.totalCount) * 100)
    : null;

  const DateTabs = () => (
    <div className="flex bg-gray-100 p-1 rounded-xl self-start">
      {[
        { label: 'Bugün', val: '1' },
        { label: '7 Gün', val: '7' },
        { label: '30 Gün', val: '30' },
        { label: 'Tümü', val: 'all' }
      ].map((tab) => (
        <button
          key={tab.val}
          onClick={() => { setDaysFilter(tab.val); setPage(1); }}
          className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            daysFilter === tab.val
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 sm:space-y-10 pb-32">

      {/* ─── Welcome Banner ─── */}
      <div className="bg-[#111827] rounded-[24px] sm:rounded-[32px] border border-gray-800 p-4 sm:p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-3 sm:space-y-4 min-w-0">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em]">
            ✦ CANLI PANEL
          </div>
          <h1 className="text-xl sm:text-4xl font-black text-white tracking-tight leading-tight break-words">
            {t('welcome')}, {displayName} 👋
          </h1>
          <p className="text-[#ada89f] text-sm sm:text-[17px] font-bold max-w-md">Gerçek zamanlı verilerle işletmenizin nabzını tutun.</p>
        </div>

        {/* Satisfaction Rate Badge */}
        {satisfactionRate !== null && (
          <div className="bg-white rounded-[20px] sm:rounded-[24px] px-4 sm:px-6 md:px-10 py-4 sm:py-6 md:py-8 text-center flex-shrink-0 relative z-10 shadow-lg border border-gray-100 self-stretch md:self-auto">
            <div className="flex items-center gap-2 justify-center mb-1.5 sm:mb-2">
              <TrendingUp size={20} className="text-[#ea580c]" strokeWidth={3} />
              <span className="text-[10px] sm:text-[11px] text-[#ada89f] font-black uppercase tracking-widest">{t('satisfaction')}</span>
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl font-black text-[#111827] tracking-tighter">{satisfactionRate}%</p>
            <p className="text-[9px] sm:text-[10px] text-[#6b6760] mt-1.5 sm:mt-2 font-black uppercase tracking-wider">POZİTİF / TOPLAM</p>
          </div>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 lg:pb-0 no-scrollbar">
          {[
            { label: 'BUGÜN', val: '1' },
            { label: '7 GÜN', val: '7' },
            { label: '30 GÜN', val: '30' },
            { label: 'TÜMÜ', val: 'all' }
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => { setDaysFilter(tab.val); setPage(1); }}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all uppercase tracking-widest whitespace-nowrap ${
                daysFilter === tab.val
                ? 'bg-[#111827] text-white shadow-md'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {isSuperAdmin && (
            <select
              value={selectedRestaurant}
              onChange={(e) => { setSelectedRestaurant(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 text-[10px] sm:text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:border-transparent bg-white font-bold uppercase tracking-widest shadow-sm transition-all text-gray-700 cursor-pointer"
            >
              <option value="all">TÜM RESTORANLAR</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95"
          >
            <Download size={18} strokeWidth={3} />
            DIŞA AKTAR
          </button>
        </div>
      </div>

      {/* ─── Main Stats ─── */}
      <div className="w-full">
        {stats && <StatsCards stats={stats} />}
      </div>

      {/* ─── Aspect Breakdown: Food / Service / Atmosphere ─── */}
      {stats?.aspects && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal size={20} strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">Kategori Analizi</h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#6b6760] mt-0.5">
                Yemek, servis ve atmosfer puanlarınızı karşılaştırın.
              </p>
            </div>
          </div>
          <AspectBreakdown aspects={stats.aspects} locale={locale as 'tr' | 'en'} />
        </div>
      )}

      {/* ─── Google Review Conversion ─── */}
      {stats?.googleConversion && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">
                {locale === 'en' ? 'Google Review Conversion' : 'Google Yorum Dönüşümü'}
              </h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#6b6760] mt-0.5">
                {locale === 'en'
                  ? 'How many happy customers actually reach Google to leave a review.'
                  : 'Memnun müşterilerin kaçı Google\'a yorum bırakmaya yönlendiriliyor.'}
              </p>
            </div>
          </div>
          <GoogleConversionPanel
            data={stats.googleConversion}
            locale={locale as 'tr' | 'en'}
            hideLeaderboard={selectedRestaurant !== 'all'}
          />
        </div>
      )}

      {/* ─── Advanced Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden min-h-[260px] sm:min-h-[350px] md:min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-9 h-9 sm:w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={20} strokeWidth={3} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">Trend Analizi</h3>
          </div>
          {stats && <TrendsChart data={stats.trends} />}
        </div>
        <div className="lg:col-span-1 bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden min-h-[260px] sm:min-h-[350px] md:min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-9 h-9 sm:w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 size={20} strokeWidth={3} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">Günlük Dağılım</h3>
          </div>
          {stats && <DayDistributionChart data={stats.dayDistribution} />}
        </div>
      </div>

      {/* ─── Details Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column: WordCloud + Breakdown */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
           <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                 <Calendar size={20} strokeWidth={3} />
               </div>
               <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">Puan Dağılımı</h3>
             </div>
             {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
           </div>

           <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                 <TrendingUp size={20} strokeWidth={3} />
               </div>
               <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">Anahtar Kelimeler</h3>
             </div>
             {stats && <WordCloud words={stats.wordCloud} />}
           </div>
        </div>

        {/* Right column: Feedback Table */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">İşletme Günlüğü</h3>
            <select
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="w-full sm:w-auto px-4 py-2 text-xs rounded-xl border border-gray-200 bg-white font-bold tracking-widest text-gray-600 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all cursor-pointer"
            >
              <option value="all">TÜM KAYITLAR</option>
              <option value="low">SADECE DÜŞÜK (1-3)</option>
              <option value="5">5 YILDIZ</option>
              <option value="4">4 YILDIZ</option>
              <option value="3">3 YILDIZ</option>
              <option value="2">2 YILDIZ</option>
              <option value="1">1 YILDIZ</option>
            </select>
          </div>

          <div className={`transition-all duration-300 ${loading ? 'opacity-30 pointer-events-none scale-[0.98]' : ''}`}>
            <FeedbackTable feedbacks={feedbacks} locale={locale} />
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-3 rounded-2xl border border-gray-200 bg-white text-gray-700 disabled:opacity-30 shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[0px]"
              >
                <ArrowRight size={20} className="rotate-180" strokeWidth={2.5} />
              </button>
              <span className="px-6 py-3 bg-[#111827] text-white rounded-2xl font-bold text-sm shadow-md tracking-widest">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-3 rounded-2xl border border-gray-200 bg-white text-gray-700 disabled:opacity-30 shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[0px]"
              >
                <ArrowRight size={20} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
