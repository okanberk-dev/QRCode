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
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">

      {/* ─── Welcome Banner ─── */}
      <div className="bg-[#111827] rounded-[32px] p-6 sm:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/20 border border-[#FDBF1D]/30 text-[#FDBF1D] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            ✦ Canlı Panel
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hoş geldin, {displayName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-medium max-w-md">Restoranınızın performansını ve müşteri geri bildirimlerini anlık olarak takip edin.</p>
        </div>

        {/* Satisfaction Rate Badge */}
        {satisfactionRate !== null && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl px-8 py-6 text-center flex-shrink-0 relative z-10">
            <div className="flex items-center gap-2 justify-center mb-1">
              <TrendingUp size={16} className="text-[#FDBF1D]" />
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Memnuniyet Oranı</span>
            </div>
            <p className="text-4xl font-black text-white">{satisfactionRate}%</p>
            <p className="text-[10px] text-gray-500 mt-1 font-bold">4-5 YILDIZ / TOPLAM</p>
          </div>
        )}
        
        {/* Animated Decoration */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#FDBF1D]/5 blur-[100px] rounded-full pointer-events-none" />
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <DateTabs />

        <div className="flex items-center gap-3 flex-wrap">
          {isSuperAdmin && (
            <select
              value={selectedRestaurant}
              onChange={(e) => { setSelectedRestaurant(e.target.value); setPage(1); }}
              className="px-5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white font-bold shadow-sm transition-all text-gray-600"
            >
              <option value="all">Tüm Restoranlar</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white text-[#111827] border border-gray-200 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <Download size={16} />
            Dışa Aktar
          </button>
        </div>
      </div>

      {/* ─── Main Stats ─── */}
      <div className="mb-8">
        {stats && <StatsCards stats={stats} />}
      </div>

      {/* ─── Advanced Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          {stats && <TrendsChart data={stats.trends} />}
        </div>
        <div className="lg:col-span-1">
          {stats && <DayDistributionChart data={stats.dayDistribution} />}
        </div>
      </div>

      {/* ─── Details Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left column: WordCloud + Breakdown */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-2 mb-6">
               <Calendar size={18} className="text-gray-400" />
               <h3 className="font-bold text-[#111827]">Puan Dağılımı</h3>
             </div>
             {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
               <BarChart3 size={18} className="text-gray-400" />
               <h3 className="font-bold text-[#111827]">Kelime Analizi</h3>
             </div>
             {stats && <WordCloud words={stats.wordCloud} />}
           </div>
        </div>

        {/* Right column: Feedback Table */}
        <div className="lg:col-span-2 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-[#111827]">Geri Bildirim Kayıtları</h3>
            <select
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none bg-gray-50 font-bold transition-all"
            >
              <option value="all">Filtrele: Tümü</option>
              <option value="low">Sadece Düşük (1-3)</option>
              <option value="5">5 Yıldız</option>
              <option value="4">4 Yıldız</option>
              <option value="3">3 Yıldız</option>
              <option value="2">2 Yıldız</option>
              <option value="1">1 Yıldız</option>
            </select>
          </div>

          <div className={`transition-opacity duration-200 ${loading ? 'opacity-30 pointer-events-none' : ''}`}>
            <FeedbackTable feedbacks={feedbacks} />
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 disabled:opacity-40 bg-white text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                Önceki
              </button>
              <span className="px-6 py-2.5 text-xs bg-[#111827] text-white rounded-xl border border-[#111827] font-black flex items-center shadow-lg">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-5 py-2.5 rounded-xl border border-gray-200 disabled:opacity-40 bg-white text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
