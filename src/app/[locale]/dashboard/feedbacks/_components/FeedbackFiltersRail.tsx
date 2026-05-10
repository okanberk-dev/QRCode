'use client';

import { Plug, QrCode, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type { ActiveTab, PlatformFilter } from './types';
import WeekStatsCard from '@/components/dashboard/feedbacks/WeekStatsCard';

// §38.59 — Yorumlar 3-col layout filter rail. Tasarım kaynağı:
// .design-owner-2026/page-reviews.jsx + kullanıcı ekran görüntüsü
// (Pulse System Overview · 01 · Yorumlar Inbox).
//
// Sidebar ile bitişik visual hiyerarşi: rail aynı bg (#FFFFFF) + sidebar
// border ile sade ayrım. Aktif item siyah zemin + sol kenar 3px lime stripe.
// Status item'larında dot indicator (active siyah-fill, danger red, ghost n300).
//
// Removed (§38.59): "FİLTRE / Yorum keşfi" başlık + search input + GELİŞMİŞ
// section'ı uzun (kullanıcı kararı, tasarımda yok).

interface FeedbackFiltersRailProps {
  locale: Locale;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (v: ActiveTab) => void;
  counts: {
    all: number;
    low: number;
    high: number;
    redirected: number;
    unreplied: number;
    today: number;
    aiReady: number;
    unread?: number;
    replied?: number;
    pending?: number;
  };
  hasActiveFilter: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  platformFilter?: PlatformFilter;
  setPlatformFilter?: (v: PlatformFilter) => void;
  weekStats?: {
    avgRating: number;
    delta: number | null;
    totalCount: number;
  };
}

// Tasarım a/page-reviews.jsx PLATFORM section: 6 platform pill, her biri
// icon + label. "Buaze QR" platform = null UI runtime label.
const PLATFORM_PILLS: {
  id: PlatformFilter;
  tr: string;
  en: string;
  /** Lucide icon adı veya 'g' (Google logo placeholder) */
  iconKind: 'plug' | 'qr' | 'g';
}[] = [
  { id: 'all', tr: 'Tüm platformlar', en: 'All platforms', iconKind: 'plug' },
  { id: 'google', tr: 'Google', en: 'Google', iconKind: 'g' },
  { id: 'buaze_qr', tr: 'Buaze QR', en: 'Buaze QR', iconKind: 'qr' },
  { id: 'yemeksepeti', tr: 'Yemeksepeti', en: 'Yemeksepeti', iconKind: 'plug' },
  { id: 'getir', tr: 'Getir', en: 'Getir', iconKind: 'plug' },
  { id: 'trendyol', tr: 'Trendyol GO', en: 'Trendyol GO', iconKind: 'plug' },
];

export function FeedbackFiltersRail({
  locale,
  searchTerm: _searchTerm,
  setSearchTerm: _setSearchTerm,
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
  // searchTerm/setSearchTerm props intact (caller chain bozulmasın) ama
  // rail UI'da search input render edilmiyor (§38.59 — kullanıcı kararı).
  void _searchTerm;
  void _setSearchTerm;

  // §38.56 — Tasarım a/page-reviews.jsx 5-tab birebir parity:
  // Tümü / Okunmamış / Düşük puan / Yanıtlandı / Beklemede.
  // Mobile chip (FeedbackList.tsx) ile unified state.
  const tabs: { k: ActiveTab; l: string; c: number; tone?: 'danger' }[] = [
    { k: 'all', l: isTr ? 'Tümü' : 'All', c: counts.all },
    { k: 'unread', l: isTr ? 'Okunmamış' : 'Unread', c: counts.unread ?? 0 },
    { k: 'low', l: isTr ? 'Düşük puan' : 'Low rating', c: counts.low, tone: 'danger' },
    { k: 'replied', l: isTr ? 'Yanıtlandı' : 'Replied', c: counts.replied ?? 0 },
    { k: 'pending', l: isTr ? 'Beklemede' : 'Pending', c: counts.pending ?? 0 },
  ];

  return (
    <aside className="hidden xl:flex xl:min-h-0 xl:flex-col xl:border-r xl:border-[#EDEDED] xl:bg-white xl:overflow-y-auto">
      {/* §38.62 — Tasarım `.design-owner-2026/page-reviews.jsx` parity:
          padding 20px 16px (py-5 px-4) + gap 22px (~space-y-[22px]).
          Önceki `p-4 space-y-5` (16px / 20px) küçük drift'ti. */}
      <div className="px-4 py-5 space-y-[22px]">
        {/* DURUM section — 5 tab tasarım birebir.
            Aktif item: bg-[#0A0A0A] text-white + sol kenar 3px lime stripe
            (::before pseudo via inline `before:` Tailwind). */}
        <div className="space-y-1">
          <div className="pulse-eyebrow text-[#A3A3A3] px-1.5 mb-2">
            {isTr ? 'DURUM' : 'STATE'}
          </div>
          {tabs.map((tab) => {
            const active = activeTab === tab.k;
            return (
              <button
                key={tab.k}
                type="button"
                onClick={() => setActiveTab(tab.k)}
                className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium bz-motion-spring ${
                  active
                    ? 'bg-[#0A0A0A] text-white before:absolute before:left-[-3px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#C6F24E] before:rounded-r-sm'
                    : 'text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                }`}
                aria-pressed={active}
              >
                {/* Status dot — active siyah-on-white, danger red, normal n300 */}
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    background: active
                      ? '#FFFFFF'
                      : tab.tone === 'danger'
                        ? '#DC2626'
                        : '#D4D4D4',
                  }}
                />
                <span className="flex-1 truncate text-left">{tab.l}</span>
                <span
                  className={`shrink-0 tabular-nums text-[11px] rounded-full px-2 py-0.5 ${
                    active ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
                  }`}
                >
                  {tab.c}
                </span>
              </button>
            );
          })}
        </div>

        {/* PLATFORM section — 6 quick-pick pill (icon + label). */}
        {platformFilter !== undefined && setPlatformFilter && (
          <div className="space-y-1 pt-1 border-t border-[#EDEDED]">
            <div className="pulse-eyebrow text-[#A3A3A3] px-1.5 mb-2 mt-3">
              {isTr ? 'PLATFORM' : 'PLATFORM'}
            </div>
            {PLATFORM_PILLS.map((p) => {
              const active = platformFilter === p.id;
              const Icon = p.iconKind === 'qr' ? QrCode : Plug;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatformFilter(p.id)}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium bz-motion-spring ${
                    active
                      ? 'bg-[#0A0A0A] text-white before:absolute before:left-[-3px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#C6F24E] before:rounded-r-sm'
                      : 'text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                  }`}
                  aria-pressed={active}
                >
                  {p.iconKind === 'g' ? (
                    <span
                      aria-hidden
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        active ? 'bg-white text-[#0A0A0A]' : 'bg-[#F5F5F5] text-[#525252]'
                      }`}
                    >
                      G
                    </span>
                  ) : (
                    <Icon size={13} strokeWidth={2} className="shrink-0" />
                  )}
                  <span className="flex-1 truncate text-left">{isTr ? p.tr : p.en}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* GELİŞMİŞ — sade compact buton (Filtre modal trigger + reset). */}
        <div className="pt-1 border-t border-[#EDEDED] space-y-1.5">
          <button
            type="button"
            onClick={onOpenFilters}
            className={`relative w-full justify-between ${hasActiveFilter ? 'bz-btn-primary' : 'bz-btn'}`}
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
              className="bz-btn-ghost inline-flex w-full items-center justify-center gap-1.5 text-[12px]"
            >
              <RotateCcw size={12} strokeWidth={2.2} />
              {isTr ? 'Temizle' : 'Reset'}
            </button>
          )}
        </div>

        {/* BU HAFTA stat card (tasarım line 83-92) */}
        {weekStats && (
          <div className="pt-1 border-t border-[#EDEDED]">
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
