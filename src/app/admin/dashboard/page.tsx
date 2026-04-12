'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, TrendingUp } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';
import WordCloud from '@/components/admin/WordCloud';

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
      <div className="bg-[#111827] rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[#FDBF1D] text-xs font-bold uppercase tracking-widest mb-1">
            {userProfile?.role === 'superadmin' ? 'Superadmin' : userProfile?.role === 'restaurant_owner' ? 'SaaS Müşterisi' : 'Restoran Yetkilisi'}
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Hoş geldiniz, {displayName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Müşteri değerlendirmelerinizi ve analizlerinizi inceleyin.</p>
        </div>

        {/* Satisfaction Rate Badge */}
        {satisfactionRate !== null && (
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center flex-shrink-0">
            <div className="flex items-center gap-2 justify-center">
              <TrendingUp size={16} className="text-[#FDBF1D]" />
              <span className="text-xs text-gray-400 font-medium">Memnuniyet Oranı</span>
            </div>
            <p className="text-3xl font-black text-white mt-1">{satisfactionRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">4-5 yıldız / toplam</p>
          </div>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <DateTabs />

        <div className="flex items-center gap-3 flex-wrap">
          {isSuperAdmin && (
            <select
              value={selectedRestaurant}
              onChange={(e) => { setSelectedRestaurant(e.target.value); setPage(1); }}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white font-medium shadow-sm transition-all"
            >
              <option value="all">Tüm Restoranlar</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#111827] text-white hover:bg-[#1f2937] px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            <Download size={15} />
            <span className="hidden sm:inline">CSV İndir</span>
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="mb-6">
        {stats && <StatsCards stats={stats} />}
      </div>

      {/* ─── Charts + Table ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 space-y-6">
          {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
          {stats && <WordCloud words={stats.wordCloud} />}
        </div>

        <div className="lg:col-span-2 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-[#111827]">Son Değerlendirmeler</h3>
            <select
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#111827] bg-gray-50 font-medium transition-all"
            >
              <option value="all">Tümü</option>
              <option value="low">Düşük (1-3)</option>
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
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-40 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Önceki
              </button>
              <span className="px-5 py-2 text-sm bg-gray-100 rounded-xl border border-gray-200 font-bold text-[#111827] flex items-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-40 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
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
