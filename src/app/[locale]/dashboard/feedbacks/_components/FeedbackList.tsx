'use client';

import { Inbox, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { AlertBanner, EmptyState, ErrorState } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { Locale } from '@/lib/translations';
import type { ActiveTab, DegradedMeta, FeedbackRow } from './types';
import { FeedbackListItem } from './FeedbackListItem';

interface FeedbackListProps {
  locale: Locale;
  loading: boolean;
  filteredList: FeedbackRow[];
  activeId: string | null;
  pulsedId: string | null;
  activeTab: ActiveTab;
  setActiveTab: (v: ActiveTab) => void;
  /** Loaded rows with a pending Pulse AI draft (mobile "AI ready" banner). */
  aiReadyCount: number;
  hasActiveFilter: boolean;
  onResetFilters: () => void;
  /** Show the business name on each row (owner viewing all businesses). */
  showBusiness: boolean;
  onSelect: (id: string) => void;
  degraded: DegradedMeta | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** İlk sayfa fetch'i başarısız — "Yorum yok" yerine hata + retry göster. */
  listError: boolean;
  /** "Daha fazla" fetch'i başarısız — buton altında inline uyarı. */
  loadMoreError: boolean;
  onRetryList: () => void;
}

/** Skeleton row — same anatomy as FeedbackListItem (badge · name/time · comment). */
export function FeedbackListSkeletonRow() {
  return (
    <div className="flex items-start gap-3 rounded-[16px] bg-[#F6F6F6] p-3" aria-hidden="true">
      <SkBox className="h-10 w-10 shrink-0 rounded-full" />
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
  );
}

export function FeedbackList({
  locale,
  loading,
  filteredList,
  activeId,
  pulsedId,
  activeTab,
  setActiveTab,
  aiReadyCount,
  hasActiveFilter,
  onResetFilters,
  showBusiness,
  onSelect,
  degraded,
  hasMore,
  loadingMore,
  onLoadMore,
  listError,
  loadMoreError,
  onRetryList,
}: FeedbackListProps) {
  const isTr = locale === 'tr';

  const focusFeedbackOption = (id: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(`feedback-option-${id}`)?.focus();
    });
  };

  const selectByKeyboard = (targetIndex: number) => {
    if (filteredList.length === 0) return;
    const boundedIndex = Math.max(0, Math.min(filteredList.length - 1, targetIndex));
    const nextId = filteredList[boundedIndex]?.id;
    if (!nextId) return;
    onSelect(nextId);
    focusFeedbackOption(nextId);
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = activeId
      ? filteredList.findIndex((feedback) => feedback.id === activeId)
      : -1;
    if (event.key === 'Home') {
      selectByKeyboard(0);
      return;
    }
    if (event.key === 'End') {
      selectByKeyboard(filteredList.length - 1);
      return;
    }
    const nextIndex =
      currentIndex === -1
        ? event.key === 'ArrowUp'
          ? filteredList.length - 1
          : 0
        : currentIndex + (event.key === 'ArrowDown' ? 1 : -1);
    selectByKeyboard(nextIndex);
  };

  return (
    <div
      id="feedback-list"
      className="flex min-h-0 flex-col"
      role="region"
      aria-label={isTr ? 'Yorum listesi' : 'Review list'}
      aria-busy={loading || undefined}
    >
      {degraded && (
        <div className="pb-2">
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

      {loading ? (
        <div className="space-y-2">
          <span className="sr-only" role="status">
            {isTr ? 'Yorumlar yükleniyor…' : 'Loading reviews…'}
          </span>
          {Array.from({ length: 6 }).map((_, i) => (
            <FeedbackListSkeletonRow key={i} />
          ))}
        </div>
      ) : listError ? (
        <div className="p-2">
          <ErrorState
            title={isTr ? 'Yorumlar yüklenemedi' : 'Could not load reviews'}
            body={
              isTr
                ? 'Liste sunucudan alınamadı. Bu, yorumunuz olmadığı anlamına gelmez.'
                : 'The list could not be fetched. This does not mean you have no reviews.'
            }
            onRetry={onRetryList}
            retryLabel={isTr ? 'Tekrar dene' : 'Try again'}
          />
        </div>
      ) : (
        <>
          {filteredList.length === 0 ? (
            <div className="p-2">
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
                    <button type="button" onClick={onResetFilters} className="bz-btn bg-[#F6F6F6] hover:bg-[#EDEDED]">
                      <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                      {isTr ? 'Filtreleri temizle' : 'Clear filters'}
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul
              role="listbox"
              className="space-y-2"
              aria-label={isTr ? 'Yorumlar' : 'Reviews'}
              aria-activedescendant={activeId ? `feedback-option-${activeId}` : undefined}
              onKeyDown={handleListKeyDown}
            >
              {filteredList.map((r) => (
                <FeedbackListItem
                  key={r.id}
                  feedback={r}
                  isActive={activeId === r.id}
                  isPulsed={pulsedId === r.id}
                  locale={locale}
                  showBusiness={showBusiness}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}
          {/* "Daha fazla göster" — backend paginate eder; ilk 20 yorum first
              paint için yüklenir, kullanıcı talep ettikçe +20. */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 px-3 py-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="bz-btn bg-[#F6F6F6] hover:bg-[#EDEDED] disabled:cursor-not-allowed disabled:opacity-60"
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
              {loadMoreError && (
                <p role="alert" className="text-[12px] text-[#D92D20]">
                  {isTr
                    ? 'Sonraki sayfa yüklenemedi. Tekrar dene.'
                    : 'Could not load the next page. Try again.'}
                </p>
              )}
            </div>
          )}
        </>
      )}
      {/* §38.33 — Mobile sticky bottom AI banner: loaded rows with a ready
          Pulse AI draft. "Aç" switches to the legacy `ai_ready` tab. Placed
          after the rows so `sticky bottom` pins it above the bottom nav while
          the list scrolls. */}
      {!loading && aiReadyCount > 0 && activeTab !== 'ai_ready' && (
        <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 mb-1 mt-3 flex items-center gap-3 rounded-[20px] bg-pn-accent-soft p-2 pl-2.5 text-pn-ink lg:hidden">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent"
          >
            <Sparkles size={16} className="text-white" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-[13px] leading-[1.45]">
            <strong className="font-medium">{aiReadyCount}</strong>{' '}
            {isTr ? 'yoruma AI yanıt hazır' : 'reviews have AI replies ready'}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('ai_ready')}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-pn-accent px-5 text-[14px] font-medium text-white transition-colors hover:bg-pn-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 active:scale-[.97]"
          >
            {isTr ? 'Aç' : 'Open'}
          </button>
        </div>
      )}

    </div>
  );
}

export default FeedbackList;
