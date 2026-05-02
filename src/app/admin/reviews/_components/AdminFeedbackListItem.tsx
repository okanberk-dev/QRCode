'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { FeedbackRow } from './types';
import { initials, timeAgo } from './utils';

interface AdminFeedbackListItemProps {
  feedback: FeedbackRow;
  isActive: boolean;
  isPulsed: boolean;
  isSelected: boolean;
  isTr: boolean;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
}

export function AdminFeedbackListItem({
  feedback: r,
  isActive,
  isPulsed,
  isSelected,
  isTr,
  onSelect,
  onToggleSelect,
}: AdminFeedbackListItemProps) {
  return (
    <div
      className={`flex w-full items-start border-b border-[#F5F5F5] transition-colors ${
        isActive
          ? 'bg-[#EAF9B8]'
          : isSelected
            ? 'bg-[#EAF9B8]/40'
            : 'hover:bg-[#FAFAFA]'
      } ${pulsedRing(isPulsed)}`}
    >
      <label
        className="flex items-center justify-center px-3 py-3.5 cursor-pointer shrink-0"
        onClick={(e) => e.stopPropagation()}
        title={isTr ? 'Toplu seç' : 'Bulk select'}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(r.id, e.target.checked)}
          aria-label={isTr ? `${r.customerName ?? 'Yorum'} seç` : `Select ${r.customerName ?? 'review'}`}
          className="h-3.5 w-3.5 accent-[#0A0A0A] cursor-pointer"
        />
      </label>
      <button
        type="button"
        data-feedback-id={r.id}
        onClick={() => onSelect(r.id)}
        aria-current={isActive ? 'true' : undefined}
        className="flex flex-1 items-start gap-3 pr-3 py-3 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[11px] font-semibold text-white">
          {initials(r.customerName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-[#0A0A0A]">
              {r.customerName || (isTr ? 'Anonim' : 'Anonymous')}
            </p>
            <span className="shrink-0 text-[10px] text-[#737373]">
              {timeAgo(r.createdAt, isTr)}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-[#737373]">
            <Star size={11} className="fill-[#C6F24E] text-[#C6F24E]" />
            <span>{r.rating}.0</span>
            {r.restaurant?.name && <span className="truncate">· {r.restaurant.name}</span>}
            {r.isReplied && <Badge kind="ok">{isTr ? 'YANITLANDI' : 'REPLIED'}</Badge>}
            {r.isFlagged && <Badge kind="danger">{isTr ? 'DİKKAT' : 'FLAGGED'}</Badge>}
            {r.isAssigned && <Badge kind="ghost">{isTr ? 'ATANDI' : 'ASSIGNED'}</Badge>}
          </div>
          {r.comment && (
            <p className="mt-1 line-clamp-2 text-[12px] text-[#525252]">{r.comment}</p>
          )}
        </div>
      </button>
    </div>
  );
}

function pulsedRing(on: boolean) {
  return on ? 'animate-pulse ring-2 ring-[#C6F24E] ring-inset' : '';
}

export default AdminFeedbackListItem;
