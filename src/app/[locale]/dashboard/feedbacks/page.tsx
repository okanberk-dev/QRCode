'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Calendar, Filter, ChevronRight } from 'lucide-react';
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
    <div
      className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-8 lg:py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-1.5 pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            <ArrowLeft size={12} strokeWidth={2} />
            {locale === 'tr' ? 'PANEL' : 'PANEL'}
          </Link>
          <h1
            className="mt-2 text-[26px] sm:text-[32px] font-medium text-[#0A0A0A] tracking-[-0.025em] leading-[1.05]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t.feedbacks_title}
          </h1>
          <p className="mt-2 max-w-[560px] text-[14px] text-[#525252] leading-[1.55]">
            {t.feedbacks_subtitle}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white border border-[#EDEDED] rounded-2xl p-3">
          <div className="flex items-center gap-1.5 px-2 pulse-eyebrow text-[#737373]">
            <Filter size={12} strokeWidth={2} />
            {locale === 'tr' ? 'FİLTRELE' : 'FILTER'}
          </div>
          <div className="hidden sm:block h-5 w-px bg-[#EDEDED]" />
          <select
            value={daysFilter}
            onChange={(e) => {
              setDaysFilter(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-[13px] font-medium text-[#0A0A0A] outline-none cursor-pointer px-2"
          >
            <option value="all">{t.feedbacks_filter_all}</option>
            <option value="1">{t.feedbacks_filter_today}</option>
            <option value="7">{locale === 'tr' ? 'Son 7 gün' : 'Last 7 days'}</option>
            <option value="30">{locale === 'tr' ? 'Son 30 gün' : 'Last 30 days'}</option>
          </select>
          <div className="hidden sm:block h-5 w-px bg-[#EDEDED]" />
          <select
            value={filterRating}
            onChange={(e) => {
              setFilterRating(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-[13px] font-medium text-[#0A0A0A] outline-none cursor-pointer px-2"
          >
            <option value="all">{locale === 'tr' ? 'Puan: hepsi' : 'Rating: all'}</option>
            <option value="positive">{t.feedbacks_filter_positive}</option>
            <option value="5">5 ★</option>
            <option value="4">4 ★</option>
            <option value="3">3 ★</option>
            <option value="2">2 ★</option>
            <option value="1">1 ★</option>
          </select>
        </div>
      </header>

      {/* Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-[#EDEDED] bg-white">
          <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8 mb-3" strokeWidth={2} />
          <span className="pulse-eyebrow text-[#737373]">
            {locale === 'tr' ? 'YÜKLENİYOR' : 'LOADING'}
          </span>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] text-center px-4">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#EDEDED]">
            <Calendar size={22} className="text-[#737373]" strokeWidth={2} />
          </div>
          <h3
            className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t.feedbacks_empty}
          </h3>
          <p className="mt-2 text-[14px] text-[#525252] max-w-[400px]">
            {locale === 'tr'
              ? 'Seçili kriterlere uygun değerlendirme bulunamadı.'
              : 'No reviews match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <FeedbackTable feedbacks={feedbacks} locale={locale} />

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-full border border-[#EDEDED] bg-white text-[#0A0A0A] flex items-center justify-center hover:border-[#0A0A0A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="previous"
              >
                <ChevronRight className="rotate-180" size={16} strokeWidth={2} />
              </button>

              <div
                className="px-5 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-[13px] font-medium tabular-nums"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {page} <span className="text-white/40 mx-2">/</span> {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-10 h-10 rounded-full border border-[#EDEDED] bg-white text-[#0A0A0A] flex items-center justify-center hover:border-[#0A0A0A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="next"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default async function FeedbacksPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = await params;
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
          <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8 mb-3" strokeWidth={2} />
          <span className="pulse-eyebrow text-[#737373]">
            {resolvedParams.locale === 'tr' ? 'YÜKLENİYOR' : 'LOADING'}
          </span>
        </div>
      }
    >
      <FeedbacksContent params={resolvedParams} />
    </Suspense>
  );
}
