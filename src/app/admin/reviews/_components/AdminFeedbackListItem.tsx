'use client';

import { redirectBadgeLabel } from '@/lib/feedback-metrics';
import { QrCode } from 'lucide-react';
import { PlatformChip } from '@/components/ui';
import { RatingBadge } from '@/components/dashboard/feedbacks/RatingBadge';
import { FeedbackStatusChips } from '@/components/dashboard/feedbacks/FeedbackStatusChips';
import type { FeedbackRow } from './types';
import { formatDateTime, platformIconId, platformLabel, timeAgoLabel } from './utils';

interface AdminFeedbackListItemProps {
  feedback: FeedbackRow;
  /** Highlighted as the review shown in the detail pane (desktop / opened). */
  isActive: boolean;
  isPulsed: boolean;
  isSelected: boolean;
  isTr: boolean;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
}

/**
 * Admin review row — same anatomy as the owner row (rating badge · name + age
 * · two-line comment · platform / business / status chips) with a bulk-select
 * checkbox column first. The business name is always shown: the admin inbox
 * spans every business.
 */
export function AdminFeedbackListItem({
  feedback: r,
  isActive,
  isPulsed,
  isSelected,
  isTr,
  onSelect,
  onToggleSelect,
}: AdminFeedbackListItemProps) {
  // Owner read state (Feedback.isRead); old rows without it count as unread.
  const isUnread = r.isRead === false || r.isRead === undefined;
  const customerLabel = r.customerName || (isTr ? 'İsimsiz' : 'Unnamed');
  const iconId = platformIconId(r.platform);
  const pLabel = platformLabel(r.platform, isTr);
  // High-rated reviews need no reply (the detail says so) — no state then.
  const stateLabel = r.isReplied
    ? isTr
      ? 'yanıtlandı'
      : 'replied'
    : r.rating >= 4
      ? null
      : isTr
        ? 'yanıt bekliyor'
        : 'awaiting reply';
  // Concise accessible name (owner pattern): who, rating, where, state.
  const accessibleName = [customerLabel, `${r.rating}/5`, r.restaurant?.name, stateLabel]
    .filter(Boolean)
    .join(', ');

  return (
    <li
      data-feedback-id={r.id}
      className={`flex w-full items-stretch border-b border-pn-line transition-colors ${
        isActive
          ? 'bg-pn-accent-soft/60 shadow-[inset_3px_0_0_#0A0A0A]'
          : isSelected
            ? 'bg-pn-accent-soft/30'
            : 'hover:bg-pn-canvas'
      } ${isPulsed ? 'animate-pulse ring-2 ring-inset ring-pn-accent' : ''}`}
    >
      {/* Checkbox column — the whole column is the hit area (≥44px tall). */}
      <label
        className="flex w-11 shrink-0 cursor-pointer justify-center pl-1 pt-[26px]"
        title={isTr ? 'Toplu seç' : 'Bulk select'}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(r.id, e.target.checked)}
          aria-label={isTr ? `${customerLabel} yorumunu seç` : `Select ${customerLabel}'s review`}
          className="h-4 w-4 cursor-pointer accent-pn-ink"
        />
      </label>
      <button
        id={`feedback-option-${r.id}`}
        type="button"
        onClick={() => onSelect(r.id)}
        aria-current={isActive ? 'true' : undefined}
        aria-label={accessibleName}
        className="group flex min-w-0 flex-1 items-start gap-3 py-3.5 pl-1 pr-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pn-accent sm:pr-5"
      >
        <RatingBadge rating={r.rating} isTr={isTr} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {isUnread && (
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 self-center rounded-full bg-[#2563EB]"
                title={isTr ? 'İşletme henüz okumadı' : 'Not yet read by the business'}
              />
            )}
            <span
              className={`truncate text-[14px] text-pn-ink ${isUnread ? 'font-medium' : 'font-medium'}`}
            >
              {customerLabel}
            </span>
            <time
              dateTime={r.createdAt}
              title={formatDateTime(r.createdAt, isTr)}
              className="ml-auto shrink-0 text-[12px] tabular-nums text-[#737373]"
            >
              {timeAgoLabel(r.createdAt, isTr)}
            </time>
          </div>
          <p className="mt-1 line-clamp-2 break-words text-[13px] leading-[1.5] text-[#525252]">
            {r.redirected ? (
              <span className="inline-flex items-center rounded-full bg-pn-accent-soft px-2 py-0.5 text-[12px] font-medium text-pn-accent">
                {redirectBadgeLabel(r.platform, isTr)}
              </span>
            ) : (
              r.comment || <span className="text-[#737373]">{isTr ? 'Metin yok' : 'No text'}</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-[#737373]">
            <span className="inline-flex items-center gap-1.5">
              {iconId ? (
                <span aria-hidden="true" className="inline-flex">
                  <PlatformChip id={iconId} size={14} />
                </span>
              ) : (
                <QrCode size={13} strokeWidth={2} aria-hidden="true" />
              )}
              {pLabel}
            </span>
            {r.restaurant?.name && (
              <>
                <span aria-hidden="true" className="text-[#D4D4D4]">
                  ·
                </span>
                <span className="max-w-[160px] truncate">{r.restaurant.name}</span>
              </>
            )}
            <FeedbackStatusChips feedback={r} isTr={isTr} max={2} showAssigned className="ml-auto" />
          </div>
        </div>
      </button>
    </li>
  );
}

export default AdminFeedbackListItem;
