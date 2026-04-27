'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Download, Loader2, TrendingUp, Calendar, BarChart3, ArrowRight, SlidersHorizontal, Layers, QrCode, ListChecks, AlertTriangle, Search, ArrowUpDown } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';
import WordCloud from '@/components/admin/WordCloud';
import AspectBreakdown from '@/components/admin/AspectBreakdown';
import GoogleConversionPanel from '@/components/admin/GoogleConversionPanel';
import PlatformDistribution from '@/components/admin/PlatformDistribution';
import AdminOverviewWidgets from '@/components/admin/AdminOverviewWidgets';

// Recharts components must be dynamic for SSR compatibility
const TrendsChart = dynamic(() => import('@/components/admin/TrendsChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-[#FFFFFF] animate-pulse rounded-2xl" /> });
const DayDistributionChart = dynamic(() => import('@/components/admin/DayDistributionChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-[#FFFFFF] animate-pulse rounded-2xl" /> });
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

type DaysFilter = '1' | '7' | '30' | 'month' | 'all';

export default function AdminDashboard() {
  const { t, locale } = useAdminTranslation();
  const [stats, setStats] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRating, setFilterRating] = useState('all');
  const [daysFilter, setDaysFilter] = useState<DaysFilter>('7');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterKvkk, setFilterKvkk] = useState('all');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const feedbackTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/restaurants').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/me').then(res => res.ok ? res.json() : null)
    ])
    .then(([restData, profileData]) => {
      setRestaurants(Array.isArray(restData.data) ? restData.data : (Array.isArray(restData) ? restData : []));
      setUserProfile(profileData);

      if (profileData && (profileData.role === 'manager' || profileData.role === 'restaurant_owner') && profileData.restaurantId) {
        setSelectedRestaurant(profileData.restaurantId);
      }
    })
    .catch(() => setRestaurants([]));
  }, []);

  // Fetch branches when restaurant scope changes
  useEffect(() => {
    const q = new URLSearchParams();
    if (selectedRestaurant !== 'all') q.append('restaurantId', selectedRestaurant);
    fetch(`/api/feedback/branches?${q.toString()}`)
      .then(res => res.ok ? res.json() : { branches: [] })
      .then(data => setBranches(Array.isArray(data.branches) ? data.branches : []))
      .catch(() => setBranches([]));
    setSelectedBranch('all');
  }, [selectedRestaurant]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const buildFilterParams = (includeSort = true) => {
    const params = new URLSearchParams();
    params.append('days', daysFilter);
    if (selectedRestaurant !== 'all') params.append('restaurantId', selectedRestaurant);
    if (filterRating !== 'all') params.append('rating', filterRating);
    if (filterPlatform !== 'all') params.append('platform', filterPlatform);
    if (filterKvkk !== 'all') params.append('kvkk', filterKvkk);
    if (selectedBranch !== 'all') params.append('branch', selectedBranch);
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (includeSort) params.append('sortOrder', sortOrder);
    return params;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsQuery = new URLSearchParams({ days: daysFilter });
      if (selectedRestaurant !== 'all') statsQuery.append('restaurantId', selectedRestaurant);
      if (selectedBranch !== 'all') statsQuery.append('branch', selectedBranch);

      const statsRes = await fetch(`/api/feedback/stats?${statsQuery.toString()}`);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else if (statsRes.status === 401) {
        window.location.href = '/admin';
      }

      const query = buildFilterParams();
      query.set('page', page.toString());
      query.set('limit', '10');

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
  }, [page, filterRating, daysFilter, selectedRestaurant, filterPlatform, filterKvkk, selectedBranch, debouncedSearch, sortOrder]);

  const handleExport = () => {
    const params = buildFilterParams();
    window.open(`/api/feedback/export?${params.toString()}`, '_blank');
  };

  const scrollToFeedback = () => {
    feedbackTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShowAll = () => {
    setFilterRating('all');
    setPage(1);
    scrollToFeedback();
  };

  const handleShowLow = () => {
    setFilterRating('low');
    setPage(1);
    scrollToFeedback();
  };

  const isSuperAdmin = !userProfile || userProfile.role === 'superadmin';
  const displayName = userProfile?.name || userProfile?.username || userProfile?.email?.split('@')[0] || 'Admin';
  const satisfactionRate = stats && stats.totalCount > 0
    ? Math.round(((stats.googleRedirectsCount || 0) / stats.totalCount) * 100)
    : null;

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 sm:space-y-10 pb-32">

      {/* ─── Welcome Banner ─── */}
      <div className="bg-[#0A0A0A] text-white rounded-2xl sm:rounded-2xl border border-white/10 p-4 sm:p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-3 sm:space-y-4 min-w-0">
          <div className="inline-flex items-center gap-2 bg-[#C6F24E]/10 text-[#C6F24E] px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:pulse-eyebrow">
            ✦ CANLI PANEL
          </div>
          <h1 className="text-xl sm:text-4xl font-semibold text-white tracking-tight leading-tight break-words">
            {t('welcome')}, {displayName} 👋
          </h1>
          <p className="text-white/85 text-sm sm:text-[17px] font-medium max-w-md">Gerçek zamanlı verilerle işletmenizin nabzını tutun.</p>
        </div>

        {/* Satisfaction Rate Badge */}
        {satisfactionRate !== null && (
          <div className="bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 md:px-10 py-4 sm:py-6 md:py-8 text-center flex-shrink-0 relative z-10 shadow-lg border border-[#EDEDED] self-stretch md:self-auto">
            <div className="flex items-center gap-2 justify-center mb-1.5 sm:mb-2">
              <TrendingUp size={20} className="text-[#C6F24E]" strokeWidth={2} />
              <span className="text-[10px] sm:text-[11px] pulse-eyebrow text-[#737373]">{t('satisfaction')}</span>
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0A0A0A] tracking-tighter">{satisfactionRate}%</p>
            <p className="text-[9px] sm:text-[10px] text-[#1A1A1A] mt-1.5 sm:mt-2 font-semibold uppercase tracking-wider">POZİTİF / TOPLAM</p>
          </div>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
        <label className="flex items-center gap-2 w-full md:w-auto md:flex-1 md:max-w-[220px]">
          <Calendar size={16} strokeWidth={2} className="text-[#6B7280] shrink-0" />
          <select
            value={daysFilter}
            onChange={(e) => { setDaysFilter(e.target.value as DaysFilter); setPage(1); }}
            className="w-full px-4 py-3 text-[11px] sm:text-xs rounded-xl border border-[#EDEDED] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:border-transparent bg-white font-semibold transition-all text-[#1A1A1A] cursor-pointer"
          >
            <option value="1">BUGÜN</option>
            <option value="7">SON 7 GÜN</option>
            <option value="30">SON 30 GÜN</option>
            <option value="month">BU AY</option>
            <option value="all">TÜM ZAMANLAR</option>
          </select>
        </label>

        {isSuperAdmin && (
          <select
            value={selectedRestaurant}
            onChange={(e) => { setSelectedRestaurant(e.target.value); setPage(1); }}
            className="w-full md:w-auto md:flex-1 md:max-w-[240px] px-4 py-3 text-[11px] sm:text-xs rounded-xl border border-[#EDEDED] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:border-transparent bg-white font-semibold transition-all text-[#1A1A1A] cursor-pointer"
          >
            <option value="all">TÜM İŞLETMELER</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
            ))}
          </select>
        )}

        <select
          value={selectedBranch}
          onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
          className="w-full md:w-auto md:flex-1 md:max-w-[220px] px-4 py-3 text-[11px] sm:text-xs rounded-xl border border-[#EDEDED] focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:border-transparent bg-white font-semibold transition-all text-[#1A1A1A] cursor-pointer"
        >
          <option value="all">TÜM ŞUBELER</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b.toUpperCase()}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          className="w-full md:w-auto md:ml-auto flex items-center justify-center gap-2 bg-white text-[#1A1A1A] border border-[#EDEDED] hover:bg-[#FFFFFF] px-5 py-3 rounded-xl text-[11px] sm:text-xs font-semibold transition-all active:scale-95"
        >
          <Download size={16} strokeWidth={2} />
          DIŞA AKTAR
        </button>
      </div>

      {/* ─── Main Stats ─── */}
      <div className="w-full">
        {stats && <StatsCards stats={stats} />}
      </div>

      {/* ─── Recently joined + Needs attention (1:1 design AdminDashboard right-rail) ─── */}
      {isSuperAdmin && (
        <AdminOverviewWidgets locale={locale as 'tr' | 'en'} />
      )}

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/admin/qr"
          className="flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-[#1A1A1A] active:scale-95 transition-all"
        >
          <QrCode size={16} strokeWidth={2} />
          <span>QR Oluştur</span>
        </Link>
        <button
          onClick={handleShowAll}
          className="flex items-center justify-center gap-2 bg-white text-[#1A1A1A] border border-[#EDEDED] px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-[#FFFFFF] active:scale-95 transition-all"
        >
          <ListChecks size={16} strokeWidth={2} />
          <span>Tüm Yorumlar</span>
        </button>
        <button
          onClick={handleShowLow}
          className="flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all"
        >
          <AlertTriangle size={16} strokeWidth={2} />
          <span>Düşük Puanlılar</span>
        </button>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-white text-[#1A1A1A] border border-[#EDEDED] px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-[#FFFFFF] active:scale-95 transition-all"
        >
          <Download size={16} strokeWidth={2} />
          <span>CSV İndir</span>
        </button>
      </div>

      {/* ─── Aspect Breakdown: Food / Service / Atmosphere ─── */}
      {stats?.aspects && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">Kategori Analizi</h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#1A1A1A] mt-0.5">
                Yemek, servis ve atmosfer puanlarınızı karşılaştırın.
              </p>
            </div>
          </div>
          <AspectBreakdown aspects={stats.aspects} locale={locale as 'tr' | 'en'} />
        </div>
      )}

      {/* ─── Google Review Conversion ─── */}
      {stats?.googleConversion && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">
                {locale === 'en' ? 'Google Review Conversion' : 'Google Yorum Dönüşümü'}
              </h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#1A1A1A] mt-0.5">
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

      {/* ─── Platform Distribution ─── */}
      {stats?.platformDistribution && stats.platformDistribution.length > 0 && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Layers size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">
                {locale === 'en' ? 'Platform Distribution' : 'Platform Dağılımı'}
              </h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#1A1A1A] mt-0.5">
                {locale === 'en'
                  ? 'See which platforms your reviews come from.'
                  : 'Yorumlarınızın hangi platformlardan geldiğini görün.'}
              </p>
            </div>
          </div>
          <PlatformDistribution data={stats.platformDistribution} locale={locale as 'tr' | 'en'} />
        </div>
      )}

      {/* ─── Advanced Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] overflow-hidden min-h-[260px] sm:min-h-[350px] md:min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-9 h-9 sm:w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">Trend Analizi</h3>
          </div>
          {stats && <TrendsChart data={stats.trends} />}
        </div>
        <div className="lg:col-span-1 bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] overflow-hidden min-h-[260px] sm:min-h-[350px] md:min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-9 h-9 sm:w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 size={20} strokeWidth={2} />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">Günlük Dağılım</h3>
          </div>
          {stats && <DayDistributionChart data={stats.dayDistribution} />}
        </div>
      </div>

      {/* ─── Details Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column: WordCloud + Breakdown */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
           <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF9B8] text-[#A8D62E] flex items-center justify-center">
                 <Calendar size={20} strokeWidth={2} />
               </div>
               <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">Puan Dağılımı</h3>
             </div>
             {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
           </div>

           <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-[#EDEDED] shadow-sm">
             <div className="flex items-center gap-3 mb-6 sm:mb-8">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                 <TrendingUp size={20} strokeWidth={2} />
               </div>
               <h3 className="text-lg sm:text-xl font-semibold text-[#0A0A0A]">Anahtar Kelimeler</h3>
             </div>
             {stats && <WordCloud words={stats.wordCloud} />}
           </div>
        </div>

        {/* Right column: Feedback Table */}
        <div ref={feedbackTableRef} className="lg:col-span-2 space-y-4 sm:space-y-6 scroll-mt-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[#EDEDED] space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-[#0A0A0A] tracking-tight">İşletme Günlüğü</h3>
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder={locale === 'en' ? 'Search comment or name...' : 'Yorum veya isim ara...'}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#EDEDED] bg-white font-medium text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#C6F24E] focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterPlatform}
                onChange={(e) => { setFilterPlatform(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 text-[11px] rounded-xl border border-[#EDEDED] bg-white font-bold tracking-widest text-[#1A1A1A] outline-none hover:bg-[#FFFFFF] focus:ring-2 focus:ring-[#EDEDED] transition-all cursor-pointer"
              >
                <option value="all">TÜM PLATFORMLAR</option>
                <option value="google">GOOGLE</option>
                <option value="yemeksepeti">YEMEKSEPETİ</option>
                <option value="getir">GETİR</option>
                <option value="trendyol_go">TRENDYOL GO</option>
              </select>
              <select
                value={filterKvkk}
                onChange={(e) => { setFilterKvkk(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 text-[11px] rounded-xl border border-[#EDEDED] bg-white font-bold tracking-widest text-[#1A1A1A] outline-none hover:bg-[#FFFFFF] focus:ring-2 focus:ring-[#EDEDED] transition-all cursor-pointer"
              >
                <option value="all">KVKK: TÜMÜ</option>
                <option value="true">SADECE ONAYLI</option>
                <option value="false">ONAYLANMAMIŞ</option>
              </select>
              <select
                value={filterRating}
                onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 text-[11px] rounded-xl border border-[#EDEDED] bg-white font-bold tracking-widest text-[#1A1A1A] outline-none hover:bg-[#FFFFFF] focus:ring-2 focus:ring-[#EDEDED] transition-all cursor-pointer"
              >
                <option value="all">{locale === 'tr' ? 'TÜM PUANLAR' : 'ALL RATINGS'}</option>
                <option value="low">{locale === 'tr' ? 'SADECE DÜŞÜK (1-3)' : 'LOW (1-3)'}</option>
                <option value="5">5 {locale === 'tr' ? 'YILDIZ' : 'STARS'}</option>
                <option value="4">4 {locale === 'tr' ? 'YILDIZ' : 'STARS'}</option>
                <option value="3">3 {locale === 'tr' ? 'YILDIZ' : 'STARS'}</option>
                <option value="2">2 {locale === 'tr' ? 'YILDIZ' : 'STARS'}</option>
                <option value="1">1 {locale === 'tr' ? 'YILDIZ' : 'STARS'}</option>
              </select>
              <label className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-[140px]">
                <ArrowUpDown size={12} className="text-[#6B7280] shrink-0" strokeWidth={2} />
                <select
                  value={sortOrder}
                  onChange={(e) => { setSortOrder(e.target.value as 'asc' | 'desc'); setPage(1); }}
                  className="w-full px-3 py-2 text-[11px] rounded-xl border border-[#EDEDED] bg-white font-bold tracking-widest text-[#1A1A1A] outline-none hover:bg-[#FFFFFF] focus:ring-2 focus:ring-[#EDEDED] transition-all cursor-pointer"
                >
                  <option value="desc">EN YENİ</option>
                  <option value="asc">EN ESKİ</option>
                </select>
              </label>
            </div>
          </div>

          <div className={`transition-all duration-300 ${loading ? 'opacity-30 pointer-events-none scale-[0.98]' : ''}`}>
            <FeedbackTable feedbacks={feedbacks} locale={locale} />
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Önceki sayfa"
                className="inline-flex items-center justify-center h-11 w-11 rounded-2xl border border-[#EDEDED] bg-white text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFFFFF] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/25 transition-all"
              >
                <ArrowRight size={20} className="rotate-180" strokeWidth={2} />
              </button>
              <span className="px-6 py-3 bg-[#0A0A0A] text-white rounded-2xl font-bold text-sm tracking-widest">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Sonraki sayfa"
                className="inline-flex items-center justify-center h-11 w-11 rounded-2xl border border-[#EDEDED] bg-white text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFFFFF] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/25 transition-all"
              >
                <ArrowRight size={20} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
