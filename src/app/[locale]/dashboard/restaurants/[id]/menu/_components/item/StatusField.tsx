'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Check, EyeOff } from 'lucide-react';
import type { ItemStatus } from '../menu-status';
import { useMenuCopy } from '../kit/useMenuCopy';

const ORDER: ItemStatus[] = ['available', 'soldOut', 'hidden'];

/**
 * The only 3-state availability control (G2): Satışta / Tükendi / Gizli, as a
 * radio group with arrow-key roving. Mapped to flags by `statusPatch`.
 */
export function StatusField({
  value, onChange, disabled, categoryVisible, onShowCategory,
}: {
  value: ItemStatus;
  onChange: (next: ItemStatus) => void;
  disabled?: boolean;
  categoryVisible: boolean;
  onShowCategory?: () => void;
}) {
  const copy = useMenuCopy();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const meta: Record<ItemStatus, { title: string; hint: string; dot: string }> = {
    available: { title: copy.item.available, hint: copy.item.availableHint, dot: 'bg-[#16A34A]' },
    soldOut: { title: copy.item.soldOut, hint: copy.item.soldOutHint, dot: 'bg-[#D97706]' },
    hidden: { title: copy.item.hidden, hint: copy.item.hiddenHint, dot: 'bg-[#A3A3A3]' },
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + ORDER.length) % ORDER.length;
    onChange(ORDER[next]);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <p id="item-status-legend" className="mb-1.5 text-[12px] font-medium text-pn-ink">
        {copy.item.statusLegend}
      </p>
      <div role="radiogroup" aria-labelledby="item-status-legend" className="grid gap-2 @min-[420px]:grid-cols-3">
        {ORDER.map((status, index) => {
          const on = value === status;
          return (
            <button
              key={status}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(status)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`relative flex min-h-[56px] flex-col items-start rounded-[20px] border bg-white px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:opacity-60 ${
                on ? 'border-pn-accent shadow-[0_0_0_1px_#5D3EBC]' : 'border-pn-line-strong hover:border-[#A3A3A3]'
              }`}
            >
              <span className="flex items-center gap-1.5 text-[14px] font-medium text-pn-ink">
                <span className={`h-2 w-2 rounded-full ${meta[status].dot}`} aria-hidden="true" />
                {meta[status].title}
              </span>
              <span className="mt-0.5 text-[12px] leading-snug text-[#737373]">{meta[status].hint}</span>
              {on && <Check size={14} strokeWidth={2.5} className="absolute right-2.5 top-2.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {!categoryVisible && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#525252]">
          <EyeOff size={12} strokeWidth={2} aria-hidden="true" />
          {copy.item.categoryHiddenNote}
          {onShowCategory && (
            <button type="button" onClick={onShowCategory} className="font-medium text-pn-ink underline underline-offset-2">
              {copy.item.showCategory}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
