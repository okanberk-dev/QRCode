'use client';

import { Inbox, Loader2, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { AlertBanner, EmptyState, Skeleton, Tabs } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type { ActiveTab, DegradedMeta, FeedbackRow } from './types';
import { FeedbackListItem } from './FeedbackListItem';

interface FeedbackListProps {
  locale: Locale;
  loading: boolean;
  feedbacks: FeedbackRow[];
  filteredList: FeedbackRow[];
  activeId: string | null;
  pulsedId: string | null;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (v: ActiveTab) => void;
  counts: { all: number; low: number; high: number; redirected: number };
  hasActiveFilter: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  onSelect: (id: string) => void;
  degraded: DegradedMeta | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function FeedbackList({
  locale,
  loading,
  feedbacks: _feedbacks,
  filteredList,
  activeId,
  pulsedId,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  counts,
  hasActiveFilter,
  activeFilterCount,
  onOpenFilters,
  onResetFilters,
  onSelect,
  degraded,
  hasMore,
  loadingMore,
  onLoadMore,
}: FeedbackListProps) {
  const isTr = locale === 'tr';

  const tabs: { k: ActiveTab; l: string; c: number }[] = [
    { k: 'all', l: isTr ? 'Tümü' : 'All', c: counts.all },
    { k: 'low', l: isTr ? 'Düşük (1-3)' : 'Low (1-3)', c: counts.low },
    { k: 'high', l: isTr ? 'Yüksek (4-5)' : 'High (4-5)', c: counts.high },
    { k: 'redirected', l: isTr ? 'Yönlendirilen' : 'Redirected', c: counts.redirected },
  ];

  return (
    <div className="flex flex-col lg:h-full">
      {degraded && (
        <div className="px-3 pt-3">
          <AlertBanner kind="warn">
            {isTr
              ? degraded.joinFilters
                ? 'Filtreler (yanıt / işaret) şu an pasif — DB senkronizasyonu bekleniyor.'
                : `${degraded.joins ? 'Yanıt/işaret durumu' : 'Tag filtreleri'} şu an pasif — DB senkronizasyonu bekleniyor.`
              : degraded.joinFilters
                ? 'Filters (reply / flag) temporarily unavailable — DB sync pending.'
                : `${degraded.joins ? 'Reply/flag status' : 'Tag filters'} temporarily unavailable — DB sync pending.`}
          </AlertBanner>
        </div>
      )}

      {/* Sticky search + tabs + filter shortcut.
          xl:'de (≥1280px) parent grid'in <FeedbackFiltersRail> standalone rail'a
          taşıdığı için bu header xl: aralığında gizli — duplicate state kullanmasın.
          lg:1024-1279 ve mobil aralıkta header burada görünür (mevcut UX). */}
      <div className="border-b border-[#EDEDED] bg-white p-3 space-y-2.5 sticky top-0 z-10 xl:hidden">
        <div className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 focus-within:border-[#0A0A0A] transition-colors">
          <Search size={14} className="text-[#737373] shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isTr ? 'Yorum, müşteri ara…' : 'Search review, customer…'}
            aria-label={isTr ? 'Yorum ara' : 'Search reviews'}
            className="w-full bg-transparent text-[16px] sm:text-[13px] text-[#0A0A0A] placeholder:text-[#737373] outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <Tabs
              items={tabs.map((tab) => ({ id: tab.k, label: tab.l, count: tab.c }))}
              active={activeTab}
              onChange={(id) => setActiveTab(id as ActiveTab)}
              ariaLabel={isTr ? 'Yorum filtresi' : 'Review filter'}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onOpenFilters}
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                hasActiveFilter
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
              }`}
              aria-label={isTr ? 'Filtreler' : 'Filters'}
            >
              <SlidersHorizontal size={11} strokeWidth={2.2} />
              <span className="hidden sm:inline">{isTr ? 'Filtre' : 'Filter'}</span>
              {activeFilterCount > 0 && (
                <span
                  className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C6F24E] px-1 text-[9px] font-semibold text-[#0A0A0A]"
                  aria-label={`${activeFilterCount} ${isTr ? 'aktif filtre' : 'active filters'}`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={onResetFilters}
                className="bz-btn-icon"
                aria-label={isTr ? 'Filtreleri temizle' : 'Reset filters'}
                title={isTr ? 'Filtreleri temizle' : 'Reset filters'}
              >
                <RotateCcw size={12} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Inbox size={22} strokeWidth={1.5} />}
              title={isTr ? 'Yorum yok' : 'No reviews'}
              body={isTr ? 'Filtreleri değiştirip tekrar dene.' : 'Try adjusting filters.'}
            />
          </div>
        ) : (
          <>
            <ul>
              {filteredList.map((r) => (
                <FeedbackListItem
                  key={r.id}
                  feedback={r}
                  isActive={activeId === r.id}
                  isPulsed={pulsedId === r.id}
                  locale={locale}
                  onSelect={onSelect}
                />
              ))}
            </ul>
            {/* "Daha fazla göster" — backend zaten paginate ediyor; ilk 20
                yorum first paint için yüklenir, kullanıcı talep ettikçe +20.
                Filter aktifken (search/tab) buton yine görünür çünkü server
                filter'lı sayfayı döndürür. */}
            {hasMore && (
              <div className="flex items-center justify-center px-3 py-4 border-t border-[#F5F5F5]">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="bz-btn-ghost inline-flex items-center gap-2 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={12} className="animate-spin" strokeWidth={2.2} />
                      <span>{isTr ? 'Yükleniyor…' : 'Loading…'}</span>
                    </>
                  ) : (
                    <span>{isTr ? 'Daha fazla göster' : 'Show more'}</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FeedbackList;
