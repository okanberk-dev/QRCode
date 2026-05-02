'use client';

import { Inbox, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { AlertBanner, EmptyState, Skeleton, Tabs } from '@/components/ui';
import type { AdminTab, CountsResp, DegradedMeta, FeedbackRow } from './types';
import { AdminFeedbackListItem } from './AdminFeedbackListItem';

interface AdminFeedbackListProps {
  isTr: boolean;
  loading: boolean;
  filtered: FeedbackRow[];
  activeId: string | null;
  pulsedId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;

  search: string;
  setSearch: (v: string) => void;

  tab: AdminTab;
  setTab: (v: AdminTab) => void;
  counts: CountsResp | null;

  hasActiveFilter: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onResetFilters: () => void;

  onSelect: (id: string) => void;
  degraded: DegradedMeta | null;
}

export function AdminFeedbackList({
  isTr,
  loading,
  filtered,
  activeId,
  pulsedId,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  search,
  setSearch,
  tab,
  setTab,
  counts,
  hasActiveFilter,
  activeFilterCount,
  onOpenFilters,
  onResetFilters,
  onSelect,
  degraded,
}: AdminFeedbackListProps) {
  const tabs: { id: AdminTab; label: string; count: number | undefined }[] = [
    { id: 'all', label: isTr ? 'Hepsi' : 'All', count: counts?.all },
    { id: 'new', label: isTr ? 'Yeni' : 'New', count: counts?.new },
    { id: 'attention', label: isTr ? 'Dikkat' : 'Attention', count: counts?.attention },
    { id: 'replied', label: isTr ? 'Yanıtlandı' : 'Replied', count: counts?.replied },
  ];

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someSelected =
    !allSelected && filtered.some((r) => selectedIds.has(r.id));

  return (
    <div className="flex flex-col lg:h-full">
      {degraded && (
        <div className="px-3 pt-3">
          <AlertBanner kind="warn">
            {isTr
              ? degraded.joinFilters
                ? 'Filtreler (yanıt / işaret / atama) şu an pasif — DB senkronizasyonu bekleniyor.'
                : `${degraded.joins ? 'Yanıt/atama/işaret durumu' : 'Tag filtreleri'} şu an pasif — DB senkronizasyonu bekleniyor.`
              : degraded.joinFilters
                ? 'Filters (reply / flag / assignment) temporarily unavailable — DB sync pending.'
                : `${degraded.joins ? 'Reply/assignment/flag status' : 'Tag filters'} temporarily unavailable — DB sync pending.`}
          </AlertBanner>
        </div>
      )}

      {/* Sticky search + tabs + filter shortcut */}
      <div className="border-b border-[#EDEDED] bg-white p-3 space-y-2.5 sticky top-0 z-10">
        <div className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 focus-within:border-[#0A0A0A] transition-colors">
          <Search size={14} className="text-[#737373] shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTr ? 'Müşteri veya yorum ara…' : 'Search customer or comment…'}
            aria-label={isTr ? 'Yorum ara' : 'Search reviews'}
            className="w-full bg-transparent text-[16px] sm:text-[13px] text-[#0A0A0A] placeholder:text-[#737373] outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <Tabs
              items={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
              active={tab}
              onChange={(id) => setTab(id as AdminTab)}
              ariaLabel={isTr ? 'Durum filtresi' : 'Status filter'}
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

        {/* Bulk select-all checkbox (sticky header in list) */}
        {filtered.length > 0 && (
          <label className="flex items-center gap-2 px-1 pt-0.5 text-[11px] text-[#737373] cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={(e) => onToggleSelectAll(e.target.checked)}
              aria-label={isTr ? 'Tümünü seç' : 'Select all'}
              className="h-3.5 w-3.5 accent-[#0A0A0A] cursor-pointer"
            />
            <span>
              {selectedIds.size > 0
                ? isTr
                  ? `${selectedIds.size} seçildi`
                  : `${selectedIds.size} selected`
                : isTr
                  ? 'Tümünü seç'
                  : 'Select all'}
            </span>
          </label>
        )}
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Inbox size={22} strokeWidth={1.5} />}
              title={isTr ? 'Henüz yorum yok' : 'No reviews yet'}
              body={isTr ? 'Filtreleri değiştirip tekrar dene.' : 'Try adjusting filters.'}
            />
          </div>
        ) : (
          filtered.map((r) => (
            <AdminFeedbackListItem
              key={r.id}
              feedback={r}
              isActive={activeId === r.id}
              isPulsed={pulsedId === r.id}
              isSelected={selectedIds.has(r.id)}
              isTr={isTr}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default AdminFeedbackList;
