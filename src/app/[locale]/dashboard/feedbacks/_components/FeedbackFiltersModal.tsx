'use client';

import { Flag, Mail, RotateCcw } from 'lucide-react';
import { Modal, PlatformChip, PLATFORMS } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type { HasReplyFilter, PlatformFilter } from './types';
import { PLATFORM_OPTIONS } from './utils';

interface FeedbackFiltersModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;

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
      title={isTr ? 'Filtreler' : 'Filters'}
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
              className="bz-btn-ghost inline-flex items-center gap-1.5"
            >
              <RotateCcw size={12} strokeWidth={2.2} />
              {isTr ? 'Temizle' : 'Reset'}
            </button>
          )}
          <button type="button" onClick={onClose} className="bz-btn-primary">
            {isTr ? 'Uygula' : 'Apply'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Date + Rating */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="pulse-eyebrow text-[#737373]">{isTr ? 'TARİH' : 'DATE'}</span>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              aria-label={isTr ? 'Tarih aralığı' : 'Date range'}
              className="bz-input cursor-pointer"
            >
              <option value="all">{isTr ? 'Tüm zamanlar' : 'All time'}</option>
              <option value="1">{isTr ? 'Bugün' : 'Today'}</option>
              <option value="7">{isTr ? 'Son 7 gün' : 'Last 7 days'}</option>
              <option value="30">{isTr ? 'Son 30 gün' : 'Last 30 days'}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="pulse-eyebrow text-[#737373]">{isTr ? 'PUAN' : 'RATING'}</span>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              aria-label={isTr ? 'Puan filtresi' : 'Rating filter'}
              className="bz-input cursor-pointer"
            >
              <option value="all">{isTr ? 'Tüm puanlar' : 'All ratings'}</option>
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
              <option value="2">2 ★</option>
              <option value="1">1 ★</option>
            </select>
          </label>
        </div>

        {/* Platform — visual chip grid */}
        <div className="space-y-1.5">
          <span className="pulse-eyebrow text-[#737373]">{isTr ? 'PLATFORM' : 'PLATFORM'}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`${platformFilter === 'all' ? 'bz-btn-primary' : 'bz-btn'} bz-btn-sm`}
              aria-pressed={platformFilter === 'all'}
            >
              {isTr ? 'Tümü' : 'All'}
            </button>
            {PLATFORM_OPTIONS.map((pid) => {
              const isActive = platformFilter === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setPlatformFilter(isActive ? 'all' : pid)}
                  className={`${isActive ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm`}
                  aria-pressed={isActive}
                  title={PLATFORMS[pid].label}
                >
                  <PlatformChip id={pid} size={14} />
                  <span>{PLATFORMS[pid].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* State — yanıt + işaret toggle'ları */}
        <div className="space-y-1.5">
          <span className="pulse-eyebrow text-[#737373]">{isTr ? 'DURUM' : 'STATE'}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                setHasReplyFilter(hasReplyFilter === 'pending' ? 'all' : 'pending')
              }
              className={`${hasReplyFilter === 'pending' ? 'bz-btn-lime' : 'bz-btn'} bz-btn-sm`}
              aria-pressed={hasReplyFilter === 'pending'}
            >
              <Mail size={12} strokeWidth={2.2} />
              {isTr ? 'Yanıt bekleyen' : 'Pending reply'}
            </button>
            <button
              type="button"
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`${flaggedOnly ? 'bz-btn-danger' : 'bz-btn'} bz-btn-sm`}
              aria-pressed={flaggedOnly}
            >
              <Flag size={12} strokeWidth={2.2} />
              {isTr ? 'İşaretli' : 'Flagged'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default FeedbackFiltersModal;
