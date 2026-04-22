'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Star, Calendar, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import FeedbackTable from '@/components/admin/FeedbackTable';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

function FeedbacksContent({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const t = getTranslations(locale);
  const searchParams = useSearchParams();
  
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState(searchParams.get('rating') || 'all');
  const [daysFilter, setDaysFilter] = useState(searchParams.get('days') || 'all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        days: daysFilter,
      });
      if (filterRating === 'positive') query.append('rating', '4'); // Note: API might need to be adjusted for 'positive' or I handle it here
      else if (filterRating !== 'all') query.append('rating', filterRating);

      // If rating is positive, the API currently only takes ONE number. 
      // I'll adjust the API or fetch and filter if needed.
      // But let's assume I'll update the API to handle ratingFilter='positive' 
      // or just fetch all and filter in the short term.
      // Actually, I'll update the API in the next step to support ratingFilter='positive' (4 & 5).
      if (filterRating === 'positive') {
        query.delete('rating');
        query.append('rating', 'positive');
      }

      const res = await fetch(`/api/feedback?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.data);
        setTotalPages(data.meta.totalPages);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [page, filterRating, daysFilter]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] font-sans selection:bg-[#F4B400]/30 p-4 sm:p-6 md:p-10 lg:p-14">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-6">
            <Link 
              href={`/${locale}/dashboard`}
              className="inline-flex items-center gap-2 text-xs font-black text-[#2A3444] hover:text-[#1A2332] transition-all uppercase tracking-widest group"
            >
              <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#1A2332] flex items-center justify-center shadow-md group-hover:translate-y-0.5 group-hover:shadow-none transition-all">
                <ArrowLeft size={16} strokeWidth={2} />
              </div>
              {locale === 'tr' ? 'Dashboard\'a Dön' : 'Back to Dashboard'}
            </Link>
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-[40px] md:text-[56px] font-black text-[#1A2332] leading-[1.1] tracking-tighter uppercase italic break-words">
                {t.feedbacks_title}
              </h1>
              <p className="text-[15px] sm:text-[17px] text-[#2A3444] font-bold max-w-md italic">
                {t.feedbacks_subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border-2 border-[#1A2332] shadow-md sm:shadow-md w-full sm:w-auto">
            <div className="flex items-center gap-2 px-2 sm:px-4 border-b-2 sm:border-b-0 sm:border-r-2 border-[#F8F6F1] pb-3 sm:pb-0 w-full sm:w-auto">
              <Filter size={18} className="text-[#6B7280]" />
              <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Filtrele</span>
            </div>
            
            <select
              value={daysFilter}
              onChange={(e) => { setDaysFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-[#F4B400] transition-colors"
            >
              <option value="all">{t.feedbacks_filter_all}</option>
              <option value="1">{t.feedbacks_filter_today}</option>
              <option value="7">Son 7 Gün</option>
              <option value="30">Son 30 Gün</option>
            </select>

            <div className="hidden sm:block h-6 w-[2px] bg-[#F8F6F1]" />

            <select
              value={filterRating}
              onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-[#F4B400] transition-colors"
            >
              <option value="all">Puan: Hepsi</option>
              <option value="positive">{t.feedbacks_filter_positive}</option>
              <option value="5">5 Yıldız</option>
              <option value="4">4 Yıldız</option>
              <option value="3">3 Yıldız</option>
              <option value="2">2 Yıldız</option>
              <option value="1">1 Yıldız</option>
            </select>
          </div>
        </div>

        {/* Feedback List */}
        <div className="relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 sm:py-40 bg-white rounded-[24px] sm:rounded-[40px] border-2 border-[#1A2332] shadow-md sm:shadow-md">
              <Loader2 className="animate-spin text-[#1A2332] w-12 h-12 mb-4" strokeWidth={2} />
              <span className="text-xs font-black text-[#6B7280] uppercase tracking-[0.3em]">Yükleniyor...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-40 bg-white rounded-[24px] sm:rounded-[40px] border-2 border-dashed border-[#E8ECF2] text-center italic p-4">
              <Calendar size={64} className="text-[#E8ECF2] mb-6 scale-75 sm:scale-100" />
              <h3 className="text-xl sm:text-2xl font-black text-[#1A2332] mb-2 uppercase">{t.feedbacks_empty}</h3>
              <p className="text-sm sm:text-base text-[#2A3444] font-bold">Seçili kriterlere uygun değerlendirme bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-10">
              <FeedbackTable feedbacks={feedbacks} locale={locale} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-14 h-14 rounded-2xl border-2 border-[#1A2332] bg-white text-[#1A2332] flex items-center justify-center shadow-sm hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-none disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight className="rotate-180" size={24} strokeWidth={2} />
                  </button>
                  
                  <div className="px-8 h-14 rounded-2xl bg-[#1A2332] text-white flex items-center justify-center font-black text-sm tracking-widest border-2 border-[#1A2332] shadow-sm">
                    {page} <span className="opacity-30 mx-2">/</span> {totalPages}
                  </div>
                  
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-14 h-14 rounded-2xl border-2 border-[#1A2332] bg-white text-[#1A2332] flex items-center justify-center shadow-sm hover:translate-y-[-2px] active:translate-y-[4px] active:shadow-none disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight size={24} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Decorative corner element */}
        <div className="fixed bottom-10 right-10 pointer-events-none opacity-10 hidden xl:block">
          <Star size={200} className="text-[#1A2332]" fill="currentColor" />
        </div>
      </div>
    </div>
  );
}

export default async function FeedbacksPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F6F1]">
        <Loader2 className="animate-spin text-[#1A2332] w-12 h-12 mb-4" strokeWidth={2} />
        <span className="text-xs font-black text-[#6B7280] uppercase tracking-[0.3em]">Yükleniyor...</span>
      </div>
    }>
      <FeedbacksContent params={resolvedParams} />
    </Suspense>
  );
}
