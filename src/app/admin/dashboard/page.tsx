'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import StatsCards from '@/components/admin/StatsCards';
import FeedbackTable from '@/components/admin/FeedbackTable';
import RatingChart from '@/components/admin/RatingChart';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRating, setFilterRating] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/feedback/stats');
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else if (statsRes.status === 401) {
        window.location.href = '/admin';
      }

      // Fetch feedbacks with optional filter
      const query = new URLSearchParams({ page: page.toString(), limit: '10' });
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
  }, [page, filterRating]);

  const handleExport = () => {
    window.open('/api/feedback/export', '_blank');
  };

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-red-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kontrol Paneli</h1>
          <p className="text-gray-500 text-sm">Müşteri değerlendirmelerini ve analizlerini inceleyin.</p>
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Download size={16} />
          CSV Olarak İndir
        </button>
      </div>

      {stats && <StatsCards stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          {stats && <RatingChart distribution={stats.distribution} totalCount={stats.totalCount} />}
        </div>
        
        <div className="lg:col-span-2 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800">Son Değerlendirmeler</h3>
            <select 
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-100 bg-gray-50"
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
