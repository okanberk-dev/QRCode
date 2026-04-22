'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Download, Loader2, TrendingUp, Calendar, BarChart3, ArrowRight, SlidersHorizontal, Layers, QrCode, ListChecks, AlertTriangle, Search, ArrowUpDown, Star } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';
import WordCloud from '@/components/admin/WordCloud';
import AspectBreakdown from '@/components/admin/AspectBreakdown';
import GoogleConversionPanel from '@/components/admin/GoogleConversionPanel';
import PlatformDistribution from '@/components/admin/PlatformDistribution';

// Recharts components must be dynamic for SSR compatibility
const TrendsChart = dynamic(() => import('@/components/admin/TrendsChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-2xl" /> });
const DayDistributionChart = dynamic(() => import('@/components/admin/DayDistributionChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-2xl" /> });
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

type DaysFilter = '1' | '7' | '30' | 'month' | 'all';

const PLATFORM_MINI: Array<{ key: string; label: string; barClass: string; textClass: string; bgClass: string }> = [
  { key: 'google', label: 'Google', barClass: 'bg-[#4285F4]', textClass: 'text-[#4285F4]', bgClass: 'bg-blue-50' },
  { key: 'yemeksepeti', label: 'Yemeksepeti', barClass: 'bg-[#FA0050]', textClass: 'text-[#FA0050]', bgClass: 'bg-red-50' },
  { key: 'getir', label: 'Getir', barClass: 'bg-[#5D3EBC]', textClass: 'text-[#5D3EBC]', bgClass: 'bg-purple-50' },
  { key: 'trendyol_go', label: 'Trendyol GO', barClass: 'bg-[#F27A1A]', textClass: 'text-[#F27A1A]', bgClass: 'bg-orange-50' },
];

const SERVICE_TYPE_MINI: Array<{ key: string; label: string; textClass: string; bgClass: string }> = [
  { key: 'dine_in', label: 'Yerinde', textClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  { key: 'takeout', label: 'Paket Servis', textClass: 'text-orange-600', bgClass: 'bg-orange-50' },
  { key: 'delivery', label: 'Teslimat', textClass: 'text-purple-600', bgClass: 'bg-purple-50' },
];

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
      setRestaurants(Array.isArray(restData) ? restData : []);
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
  }, [page, filterRating, daysFilter, selectedRestaurant, filterPlatform, selectedBranch, debouncedSearch, sortOrder]);

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
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
        <label className="flex items-center gap-2 w-full md:w-auto md:flex-1 md:max-w-[220px]">
          <Calendar size={16} strokeWidth={2.5} className="text-gray-400 shrink-0" />
          <select
            value={daysFilter}
            onChange={(e) => { setDaysFilter(e.target.value as DaysFilter); setPage(1); }}
            className="w-full px-4 py-3 text-[11px] sm:text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:border-transparent bg-white font-bold uppercase tracking-widest shadow-sm transition-all text-gray-700 cursor-pointer"
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
            className="w-full md:w-auto md:flex-1 md:max-w-[240px] px-4 py-3 text-[11px] sm:text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:border-transparent bg-white font-bold uppercase tracking-widest shadow-sm transition-all text-gray-700 cursor-pointer"
          >
            <option value="all">TÜM RESTORANLAR</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
            ))}
          </select>
        )}

        <select
          value={selectedBranch}
          onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
          className="w-full md:w-auto md:flex-1 md:max-w-[220px] px-4 py-3 text-[11px] sm:text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:border-transparent bg-white font-bold uppercase tracking-widest shadow-sm transition-all text-gray-700 cursor-pointer"
        >
          <option value="all">TÜM ŞUBELER</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b.toUpperCase()}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          className="w-full md:w-auto md:ml-auto flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-5 py-3 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95"
        >
          <Download size={16} strokeWidth={3} />
          DIŞA AKTAR
        </button>
      </div>

      {/* ─── Main Stats ─── */}
      <div className="w-full">
        {stats && <StatsCards stats={stats} />}
      </div>

      {/* ─── Platform Mini Cards ─── */}
      {stats?.platformDistribution && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {PLATFORM_MINI.map((p) => {
            const found = stats.platformDistribution.find((x: any) => x.platform === p.key);
            const count = found?.count ?? 0;
            const avg = found?.avgRating;
            return (
              <div key={p.key} className="bg-white p-4 sm:p-5 rounded-[20px] border border-gray-100 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg ${p.bgClass} ${p.textClass} flex items-center justify-center text-[11px] font-black`}>
                    {p.label.charAt(0)}
                  </span>
                  <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${p.textClass} truncate`}>{p.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yorum</p>
                    <p className="text-xl sm:text-2xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">{count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ort.</p>
                    <p className="text-sm sm:text-base font-black text-[#1f1e1d] tabular-nums flex items-center gap-1">
                      {avg != null ? avg.toFixed(1) : '—'}
                      {avg != null && <Star size={12} fill="#FDBF1D" className="text-[#FDBF1D]" strokeWidth={0} />}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Service Type Mini Cards (Yerinde / Paket / Teslimat) ─── */}
      {stats?.serviceTypeDistribution && (
        <div className="space-y-2">
          <h3 className="text-[11px] sm:text-xs font-black text-[#ada89f] uppercase tracking-widest ml-1">Servis Türü Dağılımı</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {SERVICE_TYPE_MINI.map((s) => {
              const found = stats.serviceTypeDistribution.find((x: any) => x.serviceType === s.key);
              const count = found?.count ?? 0;
              const avg = found?.avgRating;
              return (
                <div key={s.key} className="bg-white p-4 sm:p-5 rounded-[20px] border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg ${s.bgClass} ${s.textClass} flex items-center justify-center text-[11px] font-black uppercase`}>
                      {s.label.charAt(0)}
                    </span>
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${s.textClass} truncate`}>{s.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yorum</p>
                      <p className="text-xl sm:text-2xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">{count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ort.</p>
                      <p className="text-sm sm:text-base font-black text-[#1f1e1d] tabular-nums flex items-center gap-1">
                        {avg != null ? avg.toFixed(1) : '—'}
                        {avg != null && <Star size={12} fill="#FDBF1D" className="text-[#FDBF1D]" strokeWidth={0} />}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/admin/qr"
          className="flex items-center justify-center gap-2 bg-[#111827] text-white px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-gray-800 active:scale-95 transition-all"
        >
          <QrCode size={16} strokeWidth={2.5} />
          <span>QR Oluştur</span>
        </Link>
        <button
          onClick={handleShowAll}
          className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <ListChecks size={16} strokeWidth={2.5} />
          <span>Tüm Yorumlar</span>
        </button>
        <button
          onClick={handleShowLow}
          className="flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-red-50 active:scale-95 transition-all"
        >
          <AlertTriangle size={16} strokeWidth={2.5} />
          <span>Düşük Puanlılar</span>
        </button>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-3 sm:py-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <Download size={16} strokeWidth={2.5} />
          <span>CSV İndir</span>
        </button>
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

      {/* ─── Platform Distribution ─── */}
      {stats?.platformDistribution && stats.platformDistribution.length > 0 && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Layers size={20} strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-[#1f1e1d]">
                {locale === 'en' ? 'Platform Distribution' : 'Platform Dağılımı'}
              </h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#6b6760] mt-0.5">
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
        <div ref={feedbackTableRef} className="lg:col-span-2 space-y-4 sm:space-y-6 scroll-mt-6">
          <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">İşletme Günlüğü</h3>
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder={locale === 'en' ? 'Search comment or name...' : 'Yorum veya isim ara...'}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterPlatform}
                onChange={(e) => { setFilterPlatform(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 text-[11px] rounded-xl border border-gray-200 bg-white font-bold tracking-widest text-gray-600 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all cursor-pointer"
              >
                <option value="all">TÜM PLATFORMLAR</option>
                <option value="google">GOOGLE</option>
                <option value="yemeksepeti">YEMEKSEPETİ</option>
                <option value="getir">GETİR</option>
                <option value="trendyol_go">TRENDYOL GO</option>
              </select>
              <select
                value={filterRating}
                onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 text-[11px] rounded-xl border border-gray-200 bg-white font-bold tracking-widest text-gray-600 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all cursor-pointer"
              >
                <option value="all">TÜM KAYITLAR</option>
                <option value="low">SADECE DÜŞÜK (1-3)</option>
                <option value="5">5 YILDIZ</option>
                <option value="4">4 YILDIZ</option>
                <option value="3">3 YILDIZ</option>
                <option value="2">2 YILDIZ</option>
                <option value="1">1 YILDIZ</option>
              </select>
              <label className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-[140px]">
                <ArrowUpDown size={12} className="text-gray-400 shrink-0" strokeWidth={2.5} />
                <select
                  value={sortOrder}
                  onChange={(e) => { setSortOrder(e.target.value as 'asc' | 'desc'); setPage(1); }}
                  className="w-full px-3 py-2 text-[11px] rounded-xl border border-gray-200 bg-white font-bold tracking-widest text-gray-600 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all cursor-pointer"
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
