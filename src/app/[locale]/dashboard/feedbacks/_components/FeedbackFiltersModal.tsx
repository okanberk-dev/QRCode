'use client';

import { RotateCcw } from 'lucide-react';
import { Modal, PulseSelect, type PulseSelectOption } from '@/components/ui';
import {
  dateFilterOptions,
  platformFilterOptions,
  ratingFilterOptions,
} from '@/components/dashboard/feedbacks/InboxToolbar';
import type { Locale } from '@/lib/translations';
import type { HasReplyFilter, PlatformFilter } from './types';

/**
 * Mobile (< md) filter sheet. md+ shows the same filters inline in the
 * toolbar (selects + "Yanıtsızlar" / "Yalnız işaretliler" toggles, same
 * labels as here), so there is no md+ modal any more. Every control applies
 * immediately; the footer button only closes the sheet.
 */
interface FeedbackFiltersModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;

  daysFilter: string;
  setDaysFilter: (v: string) => void;

  filterRating: string;
  setFilterRating: (v: string) => void;
  /** Rating options (defaults to `ratingFilterOptions`). */
  ratingOptions?: PulseSelectOption[];

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
  daysFilter,
  setDaysFilter,
  filterRating,
  setFilterRating,
  ratingOptions,
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

  const fields = [
    {
      id: 'feedback-filter-date-label',
      label: isTr ? 'Tarih' : 'Date',
      value: daysFilter,
      onChange: setDaysFilter,
      options: dateFilterOptions(isTr),
    },
    {
      id: 'feedback-filter-rating-label',
      label: isTr ? 'Puan' : 'Rating',
      value: filterRating,
      onChange: setFilterRating,
      options: ratingOptions ?? ratingFilterOptions(isTr),
    },
    {
      id: 'feedback-filter-platform-label',
      label: 'Platform',
      value: String(platformFilter),
      onChange: (v: string) => setPlatformFilter(v as PlatformFilter),
      options: platformFilterOptions(isTr),
    },
  ];

  return (
    <Modal
      title={isTr ? 'Filtreler' : 'Filters'}
      onClose={onClose}
      size={460}
      footer={
        <>
          {hasActiveFilter && (
            <button type="button" onClick={onResetFilters} className="bz-btn-ghost">
              <RotateCcw size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Temizle' : 'Clear'}
            </button>
          )}
          <button type="button" onClick={onClose} className="bz-btn-primary">
            {isTr ? 'Bitti' : 'Done'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5">
            <span id={f.id} className="text-[12px] font-semibold text-[#525252]">
              {f.label}
            </span>
            <PulseSelect
              value={f.value}
              onChange={f.onChange}
              aria-labelledby={f.id}
              className="w-full"
              options={f.options}
            />
          </div>
        ))}

        {/* State — reply + flag toggles (server-side filters). */}
        <div className="space-y-1.5">
          <span className="block text-[12px] font-semibold text-[#525252]">
            {isTr ? 'Durum' : 'State'}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHasReplyFilter(hasReplyFilter === 'pending' ? 'all' : 'pending')}
              className={`${hasReplyFilter === 'pending' ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-[44px]`}
              aria-pressed={hasReplyFilter === 'pending'}
            >
              {isTr ? 'Yanıtsızlar' : 'Unreplied'}
            </button>
            <button
              type="button"
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`${flaggedOnly ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-[44px]`}
              aria-pressed={flaggedOnly}
            >
              {isTr ? 'Yalnız işaretliler' : 'Flagged only'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default FeedbackFiltersModal;
