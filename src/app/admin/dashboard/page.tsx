'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Download, Loader2, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';
import WordCloud from '@/components/admin/WordCloud';

// Recharts components must be dynamic for SSR compatibility
const TrendsChart = dynamic(() => import('@/components/admin/TrendsChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-2xl" /> });
const DayDistributionChart = dynamic(() => import('@/components/admin/DayDistributionChart'), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-50 animate-pulse rounded-2xl" /> });

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

export default function AdminDashboard() {
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
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-10">

      {/* ─── Welcome Banner ─── */}
      <div className="bg-[#111827] rounded-[40px] border-[4px] border-[#1f1e1d] p-8 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden shadow-[15px_18px_0_0_#FDBF1D]">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#FDBF1D] text-[#111827] border-2 border-[#1f1e1d] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_0_#1f1e1d]">
            ✦ CANLI PANEL
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-loose">
            Hoş geldin, {displayName} 👋
          </h1>
          <p className="text-[#ada89f] text-[17px] font-bold max-w-md">Gerçek zamanlı verilerle işletmenizin nabzını tutun.</p>
        </div>

        {/* Satisfaction Rate Badge */}
        {satisfactionRate !== null && (
          <div className="bg-white rounded-[32px] border-[3px] border-[#1f1e1d] px-10 py-8 text-center flex-shrink-0 relative z-10 shadow-[8px_10px_0_0_#1f1e1d]">
            <div className="flex items-center gap-2 justify-center mb-2">
              <TrendingUp size={20} className="text-[#ea580c]" strokeWidth={3} />
              <span className="text-[11px] text-[#ada89f] font-black uppercase tracking-widest">Memnuniyet Oranı</span>
            </div>
            <p className="text-5xl font-black text-[#111827] tracking-tighter">{satisfactionRate}%</p>
            <p className="text-[10px] text-[#6b6760] mt-2 font-black uppercase tracking-wider">POZİTİF / TOPLAM</p>
          </div>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[10px_12px_0_0_#1f1e1d]">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {[
            { label: 'BUGÜN', val: '1' },
            { label: '7 GÜN', val: '7' },
            { label: '30 GÜN', val: '30' },
            { label: 'TÜMÜ', val: 'all' }
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => { setDaysFilter(tab.val); setPage(1); }}
              className={`px-6 py-3 text-xs font-black rounded-xl transition-all border-2 uppercase tracking-widest whitespace-nowrap ${
                daysFilter === tab.val
                ? 'bg-[#1f1e1d] text-white border-[#1f1e1d] shadow-[0_4px_0_0_#000] translate-y-[-1px]'
                : 'bg-white text-[#6b6760] border-[#e8e4de] hover:border-[#1f1e1d]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {isSuperAdmin && (
            <select
              value={selectedRestaurant}
              onChange={(e) => { setSelectedRestaurant(e.target.value); setPage(1); }}
              className="px-6 py-3.5 text-xs rounded-xl border-2 border-[#1f1e1d] focus:outline-none bg-[#FCFBF7] font-black uppercase tracking-widest shadow-[0_4px_0_0_#1f1e1d] transition-all text-[#1f1e1d] cursor-pointer"
            >
              <option value="all">TÜM RESTORANLAR</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white text-[#1f1e1d] border-2 border-[#1f1e1d] hover:bg-[#FCFBF7] px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_4px_0_0_#1f1e1d] active:translate-y-[4px] active:shadow-none"
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

      {/* ─── Advanced Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border-2 border-[#1f1e1d] flex items-center justify-center">
              <TrendingUp size={20} strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-[#1f1e1d]">Trend Analizi</h3>
          </div>
          {stats && <TrendsChart data={stats.trends} />}
        </div>
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border-2 border-[#1f1e1d] flex items-center justify-center">
              <BarChart3 size={20} strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-[#1f1e1d]">Günlük Dağılım</h3>
          </div>
          {stats && <DayDistributionChart data={stats.dayDistribution} />}
        </div>
      </div>

      {/* ─── Details Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left column: WordCloud + Breakdown */}
        <div className="lg:col-span-1 space-y-10">
           <div className="bg-white p-8 rounded-[40px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#FDBF1D]">
             <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 rounded-xl bg-yellow-50 text-[#ea580c] border-2 border-[#1f1e1d] flex items-center justify-center">
                 <Calendar size={20} strokeWidth={3} />
               </div>
               <h3 className="text-xl font-black text-[#1f1e1d]">Puan Dağılımı</h3>
             </div>
             {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
           </div>
           
           <div className="bg-white p-8 rounded-[40px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#10b981]">
             <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 rounded-xl bg-green-50 text-[#10b981] border-2 border-[#1f1e1d] flex items-center justify-center">
                 <TrendingUp size={20} strokeWidth={3} />
               </div>
               <h3 className="text-xl font-black text-[#1f1e1d]">Anahtar Kelimeler</h3>
             </div>
             {stats && <WordCloud words={stats.wordCloud} />}
           </div>
        </div>

        {/* Right column: Feedback Table */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[10px_12px_0_0_#1f1e1d]">
            <h3 className="text-xl font-black text-[#1f1e1d] uppercase tracking-tighter">İşletme Günlüğü</h3>
            <select
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="px-6 py-3 text-xs rounded-xl border-2 border-transparent bg-[#FCFBF7] font-black uppercase tracking-widest text-[#1f1e1d] outline-none group hover:border-[#1f1e1d] transition-all"
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
            <FeedbackTable feedbacks={feedbacks} />
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-4 rounded-2xl border-2 border-[#1f1e1d] bg-white text-[#1f1e1d] disabled:opacity-30 disabled:translate-y-0 shadow-[0_4px_0_0_#1f1e1d] hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-none transition-all"
              >
                <ArrowRight size={20} className="rotate-180" strokeWidth={3} />
              </button>
              <span className="px-8 py-4 bg-[#1f1e1d] text-white rounded-2xl font-black text-sm border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#000] tracking-widest">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-4 rounded-2xl border-2 border-[#1f1e1d] bg-white text-[#1f1e1d] disabled:opacity-30 disabled:translate-y-0 shadow-[0_4px_0_0_#1f1e1d] hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-none transition-all"
              >
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
