'use client';

import { Flag, Mail, RotateCcw, UserPlus } from 'lucide-react';
import { Modal, PlatformChip, PLATFORMS } from '@/components/ui';
import type { HasReplyFilter, PlatformFilter } from './types';
import { PLATFORM_OPTIONS } from './utils';

interface AdminFeedbackFiltersModalProps {
  open: boolean;
  onClose: () => void;
  isTr: boolean;

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
      title={isTr ? 'Filtreler' : 'Filters'}
      onClose={onClose}
      size={460}
      footer={
        <>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetFilters}
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
        {/* Platform — visual chip grid */}
        <div className="space-y-1.5">
          <span className="pulse-eyebrow text-[#737373]">{isTr ? 'PLATFORM' : 'PLATFORM'}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                platformFilter === 'all'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'border border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
              }`}
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                    isActive
                      ? 'bg-[#EAF9B8] ring-1 ring-[#A8D62E] text-[#0A0A0A]'
                      : 'border border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                  }`}
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

        {/* State — yanıt + işaret + bana atanan */}
        <div className="space-y-1.5">
          <span className="pulse-eyebrow text-[#737373]">{isTr ? 'DURUM' : 'STATE'}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                setHasReplyFilter(hasReplyFilter === 'pending' ? 'all' : 'pending')
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors ${
                hasReplyFilter === 'pending'
                  ? 'border-[#A8D62E] bg-[#EAF9B8] text-[#0A0A0A]'
                  : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
              }`}
              aria-pressed={hasReplyFilter === 'pending'}
            >
              <Mail size={12} strokeWidth={2.2} />
              {isTr ? 'Yanıt bekleyen' : 'Pending reply'}
            </button>
            <button
              type="button"
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors ${
                flaggedOnly
                  ? 'border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]'
                  : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
              }`}
              aria-pressed={flaggedOnly}
            >
              <Flag size={12} strokeWidth={2.2} />
              {isTr ? 'İşaretli' : 'Flagged'}
            </button>
            <button
              type="button"
              onClick={() => setAssignedToMe(!assignedToMe)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors ${
                assignedToMe
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
              }`}
              aria-pressed={assignedToMe}
            >
              <UserPlus size={12} strokeWidth={2.2} />
              {isTr ? 'Bana atanan' : 'Assigned to me'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default AdminFeedbackFiltersModal;
