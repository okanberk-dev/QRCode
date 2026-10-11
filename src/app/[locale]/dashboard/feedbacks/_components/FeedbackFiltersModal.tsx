'use client';

import { Flag, Mail, QrCode, RotateCcw } from 'lucide-react';
import { Modal, PlatformChip, PulseSelect } from '@/components/ui';
import {
  dateFilterOptions,
  ratingFilterOptions,
} from '@/components/dashboard/feedbacks/InboxToolbar';
import type { Locale } from '@/lib/translations';
import type { HasReplyFilter, PlatformFilter } from './types';
import { INBOX_PLATFORM_FILTER_IDS, platformIconId, platformLabel } from './utils';

interface FeedbackFiltersModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  /**
   * md+ "Diğer filtreler": the toolbar already shows date / rating / platform
   * selects, so the modal only carries the reply-state + flagged toggles.
   */
  compact?: boolean;

  daysFilter: string;
  setDaysFilter: (v: string) => void;

  filterRating: string;
  setFilterRating: (v: string) => void;

  platformFilter: PlatformFilter;
  setPlatformFilter: (v: PlatformFilter) => void;

  hasReplyFilter: HasReplyFilter;
  setHasReplyFilter: (v: HasReplyFilter) => void;

  flaggedOnly: boolean;
  setFlaggedOnly: (v: boolean) => void;

  hasActiveFilter: boolean;
  onResetFilters: () => void;
}

export function FeedbackFiltersModal({
  open,
  onClose,
  locale,
  compact = false,
  daysFilter,
  setDaysFilter,
  filterRating,
  setFilterRating,
  platformFilter,
  setPlatformFilter,
  hasReplyFilter,
  setHasReplyFilter,
  flaggedOnly,
  setFlaggedOnly,
  hasActiveFilter,
  onResetFilters,
}: FeedbackFiltersModalProps) {
  const isTr = locale === 'tr';
  if (!open) return null;

  return (
    <Modal
      title={compact ? (isTr ? 'Diğer filtreler' : 'More filters') : isTr ? 'Filtreler' : 'Filters'}
      onClose={onClose}
      size={460}
      footer={
        <>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                onResetFilters();
              }}
              className="bz-btn-ghost"
            >
              <RotateCcw size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Temizle' : 'Clear'}
            </button>
          )}
          <button type="button" onClick={onClose} className="bz-btn-primary">
            {isTr ? 'Uygula' : 'Apply'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {!compact && (
          <>
            {/* Date + Rating */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span id="feedback-filter-date-label" className="text-[12px] font-semibold text-[#525252]">
                  {isTr ? 'Tarih' : 'Date'}
                </span>
                <PulseSelect
                  value={daysFilter}
                  onChange={setDaysFilter}
                  aria-labelledby="feedback-filter-date-label"
                  className="w-full"
                  options={dateFilterOptions(isTr)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span id="feedback-filter-rating-label" className="text-[12px] font-semibold text-[#525252]">
                  {isTr ? 'Puan' : 'Rating'}
                </span>
                <PulseSelect
                  value={filterRating}
                  onChange={setFilterRating}
                  aria-labelledby="feedback-filter-rating-label"
                  className="w-full"
                  options={ratingFilterOptions(isTr)}
                />
              </div>
            </div>

            {/* Platform — chip grid with storage ids (incl. Buaze QR, trendyol_go). */}
            <div className="space-y-1.5">
              <span className="block text-[12px] font-semibold text-[#525252]">Platform</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlatformFilter('all')}
                  className={`${platformFilter === 'all' ? 'bz-btn-primary' : 'bz-btn'} bz-btn-sm`}
                  aria-pressed={platformFilter === 'all'}
                >
                  {isTr ? 'Tümü' : 'All'}
                </button>
                {INBOX_PLATFORM_FILTER_IDS.map((pid) => {
                  const isActive = platformFilter === pid;
                  const iconId = platformIconId(pid);
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setPlatformFilter(isActive ? 'all' : (pid as PlatformFilter))}
                      className={`${isActive ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm`}
                      aria-pressed={isActive}
                    >
                      {iconId ? (
                        <span aria-hidden="true" className="inline-flex">
                          <PlatformChip id={iconId} size={14} />
                        </span>
                      ) : (
                        <QrCode size={13} strokeWidth={2} aria-hidden="true" />
                      )}
                      <span>{platformLabel(pid, isTr)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* State — yanıt + işaret toggle'ları */}
        <div className="space-y-1.5">
          <span className="block text-[12px] font-semibold text-[#525252]">{isTr ? 'Durum' : 'State'}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setHasReplyFilter(hasReplyFilter === 'pending' ? 'all' : 'pending')}
              className={`${hasReplyFilter === 'pending' ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm`}
              aria-pressed={hasReplyFilter === 'pending'}
            >
              <Mail size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Yanıtı olmayanlar' : 'Without a reply'}
            </button>
            <button
              type="button"
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`${flaggedOnly ? 'bz-btn-danger' : 'bz-btn'} bz-btn-sm`}
              aria-pressed={flaggedOnly}
            >
              <Flag size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Yalnız işaretliler' : 'Flagged only'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default FeedbackFiltersModal;
