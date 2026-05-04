'use client';

import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Eyebrow } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type { ActiveTab, PlatformFilter } from './types';
import WeekStatsCard from '@/components/dashboard/feedbacks/WeekStatsCard';

// Phase 5 — Pulse 2026 Feedbacks 3-col layout (CLAUDE.md §23.7 Phase 12.x).
// Tasarım kaynağı .design-pulse-2026/.../page-reviews.jsx 3-col grid:
// 300px filter rail | 1fr list | 360px detail.
//
// Bu component xl:'de (≥1280px) görünür filter rail. FeedbackList'in header'ı
// xl:hidden ile gizlenir; rail filter UI'sını state shared olarak render eder.
// lg: ve <lg: aralıklarında bu component render edilmez (parent zaten conditional).

interface FeedbackFiltersRailProps {
  locale: Locale;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (v: ActiveTab) => void;
  counts: { all: number; low: number; high: number; redirected: number };
  hasActiveFilter: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  // §38.33 — PLATFORM section + WeekStatsCard. Tasarım kaynağı:
  // .design-owner-2026/page-reviews.jsx line 22-29 (platform pills) + 83-92
  // (BU HAFTA stat card).
  platformFilter?: PlatformFilter;
  setPlatformFilter?: (v: PlatformFilter) => void;
  weekStats?: {
    avgRating: number;
    delta: number | null;
    totalCount: number;
  };
}

const PLATFORM_PILLS: { id: PlatformFilter; tr: string; en: string }[] = [
  { id: 'all', tr: 'Tüm platformlar', en: 'All platforms' },
  { id: 'google', tr: 'Google', en: 'Google' },
  { id: 'yemeksepeti', tr: 'Yemeksepeti', en: 'Yemeksepeti' },
  { id: 'getir', tr: 'Getir', en: 'Getir' },
  { id: 'trendyol', tr: 'Trendyol GO', en: 'Trendyol GO' },
];

export function FeedbackFiltersRail({
  locale,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  counts,
  hasActiveFilter,
  activeFilterCount,
  onOpenFilters,
  onResetFilters,
  platformFilter,
  setPlatformFilter,
  weekStats,
}: FeedbackFiltersRailProps) {
  const isTr = locale === 'tr';
  const tabs: { k: ActiveTab; l: string; c: number }[] = [
    { k: 'all', l: isTr ? 'Tümü' : 'All', c: counts.all },
    { k: 'low', l: isTr ? 'Düşük (1-3)' : 'Low (1-3)', c: counts.low },
    { k: 'high', l: isTr ? 'Yüksek (4-5)' : 'High (4-5)', c: counts.high },
    { k: 'redirected', l: isTr ? 'Yönlendirilen' : 'Redirected', c: counts.redirected },
  ];

  return (
    <aside className="hidden xl:flex xl:flex-col xl:border-r xl:border-[#EDEDED] xl:bg-white xl:overflow-y-auto">
      <div className="p-4 space-y-4">
        <div>
          <Eyebrow>{isTr ? 'FİLTRE' : 'FILTER'}</Eyebrow>
          <h2 className="bz-h-tight mt-1 text-[16px] text-[#0A0A0A]">
            {isTr ? 'Yorum keşfi' : 'Review explorer'}
          </h2>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 focus-within:border-[#0A0A0A] transition-colors">
          <Search size={14} className="text-[#737373] shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isTr ? 'Yorum, müşteri ara…' : 'Search review, customer…'}
            aria-label={isTr ? 'Yorum ara' : 'Search reviews'}
            className="w-full bg-transparent text-[13px] text-[#0A0A0A] placeholder:text-[#737373] outline-none"
          />
        </div>

        {/* Tabs as vertical list (rail style) */}
        <div className="space-y-1">
          <div className="pulse-eyebrow text-[#A3A3A3] px-1.5 mb-1">
            {isTr ? 'DURUM' : 'STATE'}
          </div>
          {tabs.map((tab) => {
            const active = activeTab === tab.k;
            return (
              <button
                key={tab.k}
                type="button"
                onClick={() => setActiveTab(tab.k)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                }`}
                aria-pressed={active}
              >
                <span className="truncate">{tab.l}</span>
                <span
                  className={`tabular-nums text-[11px] rounded-full px-2 py-0.5 ${
                    active ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
                  }`}
                >
                  {tab.c}
                </span>
              </button>
            );
          })}
        </div>

        {/* §38.33 — PLATFORM quick-pick (rail-level shortcut). Detaylı
            filter modal'da hâlâ tüm 9 platform mevcut; rail'da en yaygın 5
            tasarımdaki sıraya göre. */}
        {platformFilter !== undefined && setPlatformFilter && (
          <div className="space-y-1 pt-2 border-t border-[#EDEDED]">
            <div className="pulse-eyebrow text-[#A3A3A3] px-1.5 mb-1">
              {isTr ? 'PLATFORM' : 'PLATFORM'}
            </div>
            {PLATFORM_PILLS.map((p) => {
              const active = platformFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatformFilter(p.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                  }`}
                  aria-pressed={active}
                >
                  <span className="truncate">{isTr ? p.tr : p.en}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter shortcut + reset */}
        <div className="space-y-1.5 pt-2 border-t border-[#EDEDED]">
          <div className="pulse-eyebrow text-[#A3A3A3] px-1.5 mb-1">
            {isTr ? 'GELİŞMİŞ' : 'ADVANCED'}
          </div>
          <button
            type="button"
            onClick={onOpenFilters}
            className={`relative flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors ${
              hasActiveFilter
                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
            }`}
            aria-label={isTr ? 'Filtreler' : 'Filters'}
          >
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal size={12} strokeWidth={2.2} />
              {isTr ? 'Filtreler' : 'Filters'}
            </span>
            {activeFilterCount > 0 && (
              <span
                className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C6F24E] px-1 text-[9px] font-semibold text-[#0A0A0A]"
                aria-label={`${activeFilterCount} ${isTr ? 'aktif' : 'active'}`}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] w-full justify-center"
            >
              <RotateCcw size={12} strokeWidth={2.2} />
              {isTr ? 'Temizle' : 'Reset'}
            </button>
          )}
        </div>

        {/* §38.33 — BU HAFTA stat card (tasarım line 83-92) */}
        {weekStats && (
          <div className="pt-2 border-t border-[#EDEDED]">
            <WeekStatsCard
              avgRating={weekStats.avgRating}
              delta={weekStats.delta}
              totalCount={weekStats.totalCount}
              isTr={isTr}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

export default FeedbackFiltersRail;
