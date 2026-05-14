'use client';

import { Inbox, Loader2, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { AlertBanner, APCheckbox, EmptyState, Tabs } from '@/components/ui';
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

  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
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
  hasMore,
  loadingMore,
  onLoadMore,
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
              className={`relative ${hasActiveFilter ? 'bz-btn-primary' : 'bz-btn'} bz-btn-sm`}
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

        {/* Bulk select-all checkbox (sticky header in list).
            Stage 47 §38.128 — APCheckbox primitive entegre (manuel
            ref-based indeterminate pattern → primitive). Pulse §11
            lime fill + Indeterminate Minus icon (HANDOFF Toggles
            görsel referansı). */}
        {filtered.length > 0 && (
          <div className="flex items-center px-1 pt-0.5 text-[11px] text-[#737373]">
            <APCheckbox
              size="sm"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onToggleSelectAll}
              ariaLabel={isTr ? 'Tümünü seç' : 'Select all'}
              label={
                selectedIds.size > 0
                  ? isTr
                    ? `${selectedIds.size} seçildi`
                    : `${selectedIds.size} selected`
                  : isTr
                    ? 'Tümünü seç'
                    : 'Select all'
              }
            />
          </div>
        )}
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto">
        {loading ? null : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Inbox size={22} strokeWidth={1.5} />}
              title={isTr ? 'Henüz yorum yok' : 'No reviews yet'}
              body={isTr ? 'Filtreleri değiştirip tekrar dene.' : 'Try adjusting filters.'}
            />
          </div>
        ) : (
          <>
            {filtered.map((r) => (
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
            ))}
            {/* "Daha fazla göster" — backend zaten paginate ediyor; ilk 25
                yorum first paint için, kullanıcı talep ettikçe +25.
                Bulk selection load-more sonrası genişler ama mevcut
                selection state korunur (CLAUDE.md §11.21). */}
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

export default AdminFeedbackList;
