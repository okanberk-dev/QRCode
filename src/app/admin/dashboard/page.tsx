'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Calendar } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';
import WordCloud from '@/components/admin/WordCloud';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRating, setFilterRating] = useState('all');
  const [daysFilter, setDaysFilter] = useState('7');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats with date filter
      const statsRes = await fetch(`/api/feedback/stats?days=${daysFilter}`);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else if (statsRes.status === 401) {
        window.location.href = '/admin';
      }

      // Fetch feedbacks with filters
      const query = new URLSearchParams({ 
        page: page.toString(), 
        limit: '10',
        days: daysFilter 
      });
      if (filterRating !== 'all') {
        query.append('rating', filterRating);
      }

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
  }, [page, filterRating, daysFilter]);

  const handleExport = () => {
    window.open('/api/feedback/export', '_blank');
  };

  const DateTabs = () => (
    <div className="flex bg-gray-100 p-1 rounded-xl mb-6 self-start">
      {[
        { label: 'Bugün', val: '1' },
        { label: '7 Gün', val: '7' },
        { label: '30 Gün', val: '30' },
        { label: 'Tümü', val: 'all' }
      ].map((tab) => (
        <button
          key={tab.val}
          onClick={() => { setDaysFilter(tab.val); setPage(1); }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
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
        <Loader2 className="animate-spin text-[#1a73e8] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kontrol Paneli</h1>
          <p className="text-gray-500 text-sm">Müşteri değerlendirmelerini ve analizlerini inceleyin.</p>
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-[#1a73e8] hover:text-[#1a73e8] px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
        >
          <Download size={16} />
          CSV Olarak İndir
        </button>
      </div>

      <div className="mt-8 flex flex-col">
        <DateTabs />
      </div>

      {stats && <StatsCards stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-8">
          {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
          {stats && <WordCloud words={stats.wordCloud} />}
        </div>
        
        <div className="lg:col-span-2 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800">Son Değerlendirmeler</h3>
            <select 
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e8f0fe] focus:border-[#1a73e8] bg-gray-50"
            >
              <option value="all">Tümü</option>
              <option value="low">Sadece Düşük (1-3)</option>
              <option value="5">5 Yıldız</option>
              <option value="4">4 Yıldız</option>
              <option value="3">3 Yıldız</option>
              <option value="2">2 Yıldız</option>
              <option value="1">1 Yıldız</option>
            </select>
          </div>

          <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
            <FeedbackTable feedbacks={feedbacks} />
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50 bg-white"
              >
                Önceki
              </button>
              <span className="px-4 py-1 text-sm bg-gray-50 rounded border border-gray-100 inline-flex items-center">
                Sayfa {page} / {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50 bg-white"
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
