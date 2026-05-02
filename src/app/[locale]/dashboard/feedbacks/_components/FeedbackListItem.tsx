'use client';

import { Badge } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type { FeedbackRow } from './types';
import { initials, timeAgo } from './utils';

interface FeedbackListItemProps {
  feedback: FeedbackRow;
  isActive: boolean;
  isPulsed: boolean;
  locale: Locale;
  onSelect: (id: string) => void;
}

export function FeedbackListItem({
  feedback: r,
  isActive,
  isPulsed,
  locale,
  onSelect,
}: FeedbackListItemProps) {
  const isTr = locale === 'tr';
  // Avatar tonu rating ile semantik ipucu — koyu/lime = pozitif, kırmızı = düşük puan.
  const avatarBg =
    r.rating === 5
      ? 'bg-[#0A0A0A] text-[#C6F24E]'
      : r.rating <= 2
        ? 'bg-[#FEE2E2] text-[#DC2626]'
        : 'bg-[#F5F5F5] text-[#0A0A0A]';

  return (
    <li data-feedback-id={r.id}>
      <button
        type="button"
        onClick={() => onSelect(r.id)}
        className={`flex w-full flex-col gap-1.5 border-b border-[#F5F5F5] px-4 py-3.5 text-left transition-colors ${
          isActive
            ? 'bg-[#EAF9B8] border-l-[3px] border-l-[#0A0A0A]'
            : 'hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent'
        } ${isPulsed ? 'animate-pulse ring-2 ring-[#C6F24E]' : ''}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-[10px] font-semibold ${avatarBg}`}
            >
              {initials(r.customerName)}
            </span>
            <span className="truncate text-[13px] font-semibold text-[#0A0A0A]">
              {r.customerName || (isTr ? 'Anonim' : 'Anonymous')}
            </span>
          </div>
          <span className="pulse-eyebrow text-[#737373] shrink-0">
            {timeAgo(r.createdAt, locale)}
          </span>
        </div>
        <p className="line-clamp-2 text-[12px] text-[#525252] leading-[1.4]">
          {r.comment || (isTr ? 'Yorum bırakılmadı.' : 'No comment.')}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="pulse-eyebrow rounded bg-[#0A0A0A] text-[#C6F24E] px-1.5 py-0.5"
            aria-label={`${r.rating} ${isTr ? 'yıldız' : 'stars'}`}
          >
            {'★'.repeat(r.rating)}
          </span>
          <span className="text-[10px] text-[#737373]">
            {(r.platform || 'buaze').toUpperCase()}
            {r.restaurant?.name ? ` · ${r.restaurant.name}` : ''}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {r.hasPendingAiDraft && !r.isReplied && r.rating <= 3 && (
              <span title={isTr ? 'Pulse AI taslağı hazır' : 'Pulse AI draft ready'}>
                <Badge kind="lime">
                  <span className="hidden sm:inline">PULSE AI</span>
                  <span className="sm:hidden" aria-hidden="true">AI</span>
                </Badge>
              </span>
            )}
            {r.isReplied && (
              <span title={isTr ? 'Yanıtlandı' : 'Replied'}>
                <Badge kind="ok">✓</Badge>
              </span>
            )}
            {r.rating <= 2 && !r.isReplied && !r.hasPendingAiDraft && (
              <span title={isTr ? 'Düşük puan' : 'Low rating'}>
                <Badge kind="danger">!</Badge>
              </span>
            )}
          </span>
        </div>
      </button>
    </li>
  );
}

export default FeedbackListItem;
