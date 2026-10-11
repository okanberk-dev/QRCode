'use client';

import { Inbox, Loader2, RotateCcw } from 'lucide-react';
import { AlertBanner, APCheckbox, EmptyState, ErrorState } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { DegradedMeta, FeedbackRow } from './types';
import { AdminFeedbackListItem } from './AdminFeedbackListItem';

interface AdminFeedbackListProps {
  isTr: boolean;
  loading: boolean;
  filtered: FeedbackRow[];
  /** Row highlighted as the one in the detail pane (null on the mobile list). */
  activeId: string | null;
  pulsedId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;

  hasActiveFilter: boolean;
  onResetFilters: () => void;

  onSelect: (id: string) => void;
  degraded: DegradedMeta | null;

  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** "Daha fazla" fetch failed — inline note under the button. */
  loadMoreError: boolean;
  /** First-page fetch failed — show a real error + retry, not "no reviews". */
  listError: boolean;
  onRetryList: () => void;
}

/** Skeleton row — same anatomy as AdminFeedbackListItem (checkbox · badge · text). */
export function AdminFeedbackListSkeletonRow() {
  return (
    <div className="flex items-start border-b border-[#F5F5F5]" aria-hidden="true">
      <div className="flex w-11 shrink-0 justify-center pl-1 pt-[26px]">
        <SkBox className="h-4 w-4 rounded" />
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-3 py-3.5 pl-1 pr-4 sm:pr-5">
        <SkBox className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="flex items-center justify-between gap-3">
            <SkBox className="h-4 w-32" />
            <SkBox className="h-3 w-12" />
          </div>
          <SkBox className="h-3 w-full" />
          <SkBox className="h-3 w-2/3" />
          <SkBox className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Select-all row placeholder (same height as the real sticky row). */
export function AdminFeedbackSelectAllSkeleton() {
  return (
    <div className="flex h-[41px] items-center gap-2 border-b border-[#F5F5F5] px-4" aria-hidden="true">
      <SkBox className="h-4 w-4 rounded" />
      <SkBox className="h-3 w-20" />
    </div>
  );
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
  hasActiveFilter,
  onResetFilters,
  onSelect,
  degraded,
  hasMore,
  listError,
  onRetryList,
  loadingMore,
  onLoadMore,
  loadMoreError,
}: AdminFeedbackListProps) {
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someSelected = !allSelected && filtered.some((r) => selectedIds.has(r.id));

  return (
    <div
      id="feedback-list"
      className="flex min-h-0 flex-col"
      role="region"
      aria-label={isTr ? 'Yorum listesi' : 'Review list'}
      aria-busy={loading || undefined}
    >
      {degraded && (
        <div className="px-4 pt-3 sm:px-5">
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

      {loading ? (
        <div>
          <span className="sr-only" role="status">
            {isTr ? 'Yorumlar yükleniyor…' : 'Loading reviews…'}
          </span>
          <AdminFeedbackSelectAllSkeleton />
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminFeedbackListSkeletonRow key={i} />
          ))}
        </div>
      ) : listError ? (
        <div className="p-4">
          <ErrorState
            title={isTr ? 'Yorumlar yüklenemedi' : 'Could not load reviews'}
            body={
              isTr
                ? 'Liste sunucudan alınamadı. Bu, yorum olmadığı anlamına gelmez.'
                : 'The list could not be fetched. It does not mean there are no reviews.'
            }
            onRetry={onRetryList}
            retryLabel={isTr ? 'Tekrar dene' : 'Try again'}
          />
        </div>
      ) : (
        <>
          {/* Bulk select-all — sticky at the top of the list column (APCheckbox,
              indeterminate when part of the window is selected). Sticky at the
              top of the list pane on lg; on mobile the sticky toolbar already
              sits there, so the row scrolls with the list. */}
          {filtered.length > 0 && (
            <div className="z-10 flex h-[41px] lg:sticky lg:top-0 items-center border-b border-[#F5F5F5] bg-white px-4 text-[12px] text-[#525252]">
              <APCheckbox
                size="sm"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onToggleSelectAll}
                ariaLabel={isTr ? 'Listedeki tüm yorumları seç' : 'Select every review in the list'}
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

          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Inbox size={22} strokeWidth={1.5} />}
                title={isTr ? 'Yorum yok' : 'No reviews'}
                body={
                  hasMore
                    ? isTr
                      ? 'Bu sayfada eşleşme yok. Aşağıdan daha fazla yorum yükleyip tekrar dene.'
                      : 'No match on this page. Load more reviews below and try again.'
                    : hasActiveFilter
                      ? isTr
                        ? 'Filtreleri değiştirip tekrar dene.'
                        : 'Try adjusting filters.'
                      : isTr
                        ? 'Yeni yorumlar geldikçe burada görünecek.'
                        : 'New reviews will show up here as they arrive.'
                }
                action={
                  hasActiveFilter ? (
                    <button type="button" onClick={onResetFilters} className="bz-btn bz-btn-sm">
                      <RotateCcw size={12} strokeWidth={2.2} aria-hidden="true" />
                      {isTr ? 'Filtreleri temizle' : 'Clear filters'}
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul aria-label={isTr ? 'Yorumlar' : 'Reviews'}>
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
            </ul>
          )}

          {/* "Daha fazla göster" — the API paginates (25 per page). Selection
              survives load-more (CLAUDE.md §11.21). */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 border-t border-[#F5F5F5] px-3 py-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="bz-btn-ghost bz-btn-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={12} className="animate-spin" strokeWidth={2.2} aria-hidden="true" />
                    <span>{isTr ? 'Yükleniyor…' : 'Loading…'}</span>
                  </>
                ) : (
                  <span>{isTr ? 'Daha fazla göster' : 'Show more'}</span>
                )}
              </button>
              {loadMoreError && (
                <p role="alert" className="text-[12px] text-[#991B1B]">
                  {isTr
                    ? 'Sonraki sayfa yüklenemedi. Tekrar dene.'
                    : 'Could not load the next page. Try again.'}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminFeedbackList;
