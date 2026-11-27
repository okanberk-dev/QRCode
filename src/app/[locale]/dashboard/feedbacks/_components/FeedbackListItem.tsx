'use client';

import { redirectBadgeLabel } from '@/lib/feedback-metrics';
import { QrCode } from 'lucide-react';
import { PlatformChip } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { RatingBadge } from '@/components/dashboard/feedbacks/RatingBadge';
import { FeedbackStatusChips } from '@/components/dashboard/feedbacks/FeedbackStatusChips';
import type { FeedbackRow } from './types';
import { formatDateTime, platformIconId, platformLabel, timeAgoLabel } from './utils';

interface FeedbackListItemProps {
  feedback: FeedbackRow;
  isActive: boolean;
  isPulsed: boolean;
  locale: Locale;
  /** Show the business name — only when the owner is viewing all businesses. */
  showBusiness: boolean;
  onSelect: (id: string) => void;
}

/**
 * Review row (Fintora notification list): a 16px-radius row with a 40px
 * rating circle on the left, name + age, a two-line comment and platform /
 * business / status chips. Unread rows keep the grey fill and a small purple
 * dot; read rows are white; the open review is lavender.
 */
export function FeedbackListItem({
  feedback: r,
  isActive,
  isPulsed,
  locale,
  showBusiness,
  onSelect,
}: FeedbackListItemProps) {
  const isTr = locale === 'tr';
  // Stage 13 (§38.83) — eski feedback'lerde isRead undefined → okunmamış.
  const isUnread = r.isRead === false || r.isRead === undefined;
  const customerLabel = r.customerName || (isTr ? 'İsimsiz' : 'Unnamed');
  const stateLabel = r.isReplied
    ? isTr
      ? 'yanıtlandı'
      : 'replied'
    : r.isPending
      ? isTr
        ? 'beklemede'
        : 'pending'
      : isUnread
        ? isTr
          ? 'okunmamış'
          : 'unread'
        : isTr
          ? 'yanıt bekliyor'
          : 'awaiting reply';
  const iconId = platformIconId(r.platform);
  const pLabel = platformLabel(r.platform, isTr);

  return (
    <li data-feedback-id={r.id}>
      <button
        id={`feedback-option-${r.id}`}
        type="button"
        role="option"
        aria-selected={isActive}
        aria-label={`${customerLabel}, ${r.rating}/5, ${stateLabel}`}
        onClick={() => onSelect(r.id)}
        className={`group flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pn-accent ${
          isActive
            ? 'bg-pn-accent-soft'
            : isUnread
              ? 'bg-[#F6F6F6] hover:bg-[#EDEDED]'
              : 'bg-white hover:bg-[#F6F6F6]'
        } ${isPulsed ? 'animate-pulse ring-2 ring-inset ring-pn-accent' : ''}`}
      >
        <RatingBadge rating={r.rating} isTr={isTr} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[14px] font-medium text-pn-ink">{customerLabel}</span>
            <time
              dateTime={r.createdAt}
              title={formatDateTime(r.createdAt, locale)}
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[12px] tabular-nums text-[#9A9A9A]"
            >
              {isUnread && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-pn-accent"
                  title={isTr ? 'Okunmamış' : 'Unread'}
                />
              )}
              {timeAgoLabel(r.createdAt, locale)}
            </time>
          </div>
          <p className="mt-0.5 line-clamp-2 break-words text-[13px] leading-[1.5] text-[#737373]">
            {r.redirected ? (
              <span className="inline-flex items-center rounded-full bg-pn-accent-soft px-2 py-0.5 text-[12px] font-medium text-pn-accent">
                {redirectBadgeLabel(r.platform, isTr)}
              </span>
            ) : (
              r.comment || <span className="text-[#9A9A9A]">{isTr ? 'Metin yok' : 'No text'}</span>
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
            {showBusiness && r.restaurant?.name && (
              <>
                <span aria-hidden="true" className="text-[#D4D4D4]">
                  ·
                </span>
                <span className="max-w-[160px] truncate">{r.restaurant.name}</span>
              </>
            )}
            <FeedbackStatusChips feedback={r} isTr={isTr} max={2} className="ml-auto" />
          </div>
        </div>
      </button>
    </li>
  );
}

export default FeedbackListItem;
