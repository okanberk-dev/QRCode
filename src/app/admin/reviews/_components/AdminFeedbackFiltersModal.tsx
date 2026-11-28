'use client';

import { Flag, Mail, QrCode, RotateCcw, UserPlus } from 'lucide-react';
import { Modal, PlatformChip, PulseSelect } from '@/components/ui';
import {
  dateFilterOptions,
  ratingFilterOptions,
} from '@/components/dashboard/feedbacks/InboxToolbar';
import type { HasReplyFilter, PlatformFilter } from './types';
import { INBOX_PLATFORM_FILTER_IDS, platformIconId, platformLabel } from './utils';

interface AdminFeedbackFiltersModalProps {
  open: boolean;
  onClose: () => void;
  isTr: boolean;
  /**
   * md+ "Diğer filtreler": the toolbar already shows the date / rating /
   * platform selects, so the modal only carries the state toggles.
   */
  compact?: boolean;

  daysFilter: string;
  setDaysFilter: (v: string) => void;

  ratingFilter: string;
  setRatingFilter: (v: string) => void;

  platformFilter: PlatformFilter;
  setPlatformFilter: (v: PlatformFilter) => void;

  hasReplyFilter: HasReplyFilter;
  setHasReplyFilter: (v: HasReplyFilter) => void;

  flaggedOnly: boolean;
  setFlaggedOnly: (v: boolean) => void;

  assignedToMe: boolean;
  setAssignedToMe: (v: boolean) => void;

  hasActiveFilter: boolean;
  onResetFilters: () => void;
}

export function AdminFeedbackFiltersModal({
  open,
  onClose,
  isTr,
  compact = false,
  daysFilter,
  setDaysFilter,
  ratingFilter,
  setRatingFilter,
  platformFilter,
  setPlatformFilter,
  hasReplyFilter,
  setHasReplyFilter,
  flaggedOnly,
  setFlaggedOnly,
  assignedToMe,
  setAssignedToMe,
  hasActiveFilter,
  onResetFilters,
}: AdminFeedbackFiltersModalProps) {
  if (!open) return null;

  return (
    <Modal
      title={compact ? (isTr ? 'Diğer filtreler' : 'More filters') : isTr ? 'Yorumları filtrele' : 'Filter reviews'}
      description={isTr ? 'Seçtiklerin listeye anında uygulanır.' : 'Your choices apply to the list right away.'}
      onClose={onClose}
      size={460}
      footer={
        <>
          {hasActiveFilter && (
            <button type="button" onClick={onResetFilters} className="bz-btn-ghost">
              <RotateCcw size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Filtreleri temizle' : 'Clear filters'}
            </button>
          )}
          <button type="button" onClick={onClose} className="bz-btn-primary">
            {isTr ? 'Sonuçları göster' : 'Show results'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {!compact && (
          <>
            {/* Date + rating */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span id="admin-feedback-filter-date-label" className="text-[13px] font-medium text-[#737373]">
                  {isTr ? 'Tarih' : 'Date'}
                </span>
                <PulseSelect
                  value={daysFilter}
                  onChange={setDaysFilter}
                  aria-labelledby="admin-feedback-filter-date-label"
                  className="w-full"
                  options={dateFilterOptions(isTr)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span id="admin-feedback-filter-rating-label" className="text-[13px] font-medium text-[#737373]">
                  {isTr ? 'Puan' : 'Rating'}
                </span>
                <PulseSelect
                  value={ratingFilter}
                  onChange={setRatingFilter}
                  aria-labelledby="admin-feedback-filter-rating-label"
                  className="w-full"
                  options={ratingFilterOptions(isTr)}
                />
              </div>
            </div>

            {/* Platform — chip grid with storage ids (incl. Buaze QR, trendyol_go). */}
            <div className="space-y-1.5">
              <span className="block text-[13px] font-medium text-[#737373]">Platform</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlatformFilter('all')}
                  className={`${platformFilter === 'all' ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-11`}
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
                      className={`${isActive ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-11`}
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

        {/* State — reply / flag / assigned to me */}
        <div className="space-y-1.5">
          <span className="block text-[13px] font-medium text-[#737373]">{isTr ? 'Durum' : 'Status'}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setHasReplyFilter(hasReplyFilter === 'pending' ? 'all' : 'pending')}
              className={`${hasReplyFilter === 'pending' ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-11`}
              aria-pressed={hasReplyFilter === 'pending'}
            >
              <Mail size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Yanıtı olmayanlar' : 'Without a reply'}
            </button>
            <button
              type="button"
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`${flaggedOnly ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-11`}
              aria-pressed={flaggedOnly}
            >
              <Flag size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Yalnız işaretliler' : 'Flagged only'}
            </button>
            <button
              type="button"
              onClick={() => setAssignedToMe(!assignedToMe)}
              className={`${assignedToMe ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm max-sm:min-h-11`}
              aria-pressed={assignedToMe}
            >
              <UserPlus size={12} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? 'Bana atananlar' : 'Assigned to me'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default AdminFeedbackFiltersModal;
