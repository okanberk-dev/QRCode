'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { useMenuCopy } from '../kit/useMenuCopy';
import { isTempId } from '../menu-merge';
import type { CategoryShape } from '../menu-types';

/**
 * Category jump chips (spec §7.7). `sticky-mobile`: the phone / tablet strip
 * under the topbar, led by the compact SaveIndicator ("● Canlı") and ending
 * in a pinned "Önizle". `toolbar`: row 2 of the desktop toolbar. The active
 * chip follows the scroll-spy and is kept in view inside the strip only.
 */
export function CategoryChips({
  variant, categories, activeId, onJump, onAddCategory, leading, onPreview,
}: {
  variant: 'sticky-mobile' | 'toolbar';
  categories: CategoryShape[];
  activeId: string | null;
  onJump: (id: string) => void;
  onAddCategory?: () => void;
  leading?: ReactNode;
  onPreview?: () => void;
}) {
  const copy = useMenuCopy();
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !activeId) return;
    const chip = strip.querySelector<HTMLElement>(`[data-chip="${CSS.escape(activeId)}"]`);
    if (!chip) return;
    const left = chip.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - 16) });
    }
  }, [activeId]);

  const chips = (
    <div ref={stripRef} className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
      {categories.map((c) => {
        const active = c.id === activeId;
        const count = c.items.filter((i) => !isTempId(i.id)).length;
        return (
          <button
            key={c.id}
            type="button"
            data-chip={c.id}
            onClick={() => onJump(c.id)}
            aria-current={active ? 'true' : undefined}
            aria-label={[copy.fmt.categoryChipLabel(c.name, count), c.isVisible ? null : copy.category.hidden].filter(Boolean).join(', ')}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
              active ? 'border-[#D9EE7A] bg-[#EAF9B8] text-[#0A0A0A]' : 'border-[#E5E5E5] bg-white text-[#525252] hover:text-[#0A0A0A]'
            }`}
          >
            {!c.isVisible && <EyeOff size={12} strokeWidth={2} aria-hidden="true" />}
            <span className="max-w-[160px] truncate font-body">{c.name}</span>
            <span className="text-[12px] tabular-nums text-[#737373]">{count}</span>
          </button>
        );
      })}
      {onAddCategory && (
        <button
          type="button"
          onClick={onAddCategory}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-dashed border-[#D4D4D4] px-3 text-[13px] font-medium text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
        >
          <Plus size={13} strokeWidth={2.25} aria-hidden="true" />
          {copy.outline.addCategoryChip}
        </button>
      )}
    </div>
  );

  if (variant === 'toolbar') return chips;

  return (
    <div className="sticky top-[61px] z-20 -mx-4 border-b border-[#EDEDED] bg-[#FAFAFA]/95 px-4 backdrop-blur sm:-mx-7 sm:px-7 lg:hidden">
      <div className="flex h-[52px] items-center gap-2">
        {leading && <div className="shrink-0 border-r border-[#EDEDED] pr-2">{leading}</div>}
        {chips}
        {onPreview && (
          <button type="button" onClick={onPreview} className="bz-btn-ghost min-h-[44px] shrink-0 px-3">
            <Eye size={14} strokeWidth={2} aria-hidden="true" />
            <span className="hidden min-[400px]:inline">{copy.outline.previewChip}</span>
          </button>
        )}
      </div>
    </div>
  );
}
