'use client';

import { MENU_FILTERS, type MenuFilter } from '../menu-filter';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * Single-select filter chips with whole-menu counts (spec §7.6). Chips with no
 * items are left out (the active one stays); the row disappears when nothing
 * is left to filter.
 */
export function FilterChips({
  value, onChange, counts, className = '',
}: {
  value: MenuFilter;
  onChange: (f: MenuFilter) => void;
  counts: Record<Exclude<MenuFilter, 'all'>, number>;
  className?: string;
}) {
  const copy = useMenuCopy();
  const shown = MENU_FILTERS.filter((f) => counts[f] > 0 || f === value);
  if (shown.length === 0 && value === 'all') return null;
  const chip = (active: boolean) =>
    `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
      active ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#E5E5E5] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
    }`;
  return (
    <div role="group" aria-label={copy.outline.filtersLabel} className={`no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto ${className}`}>
      <button type="button" aria-pressed={value === 'all'} onClick={() => onChange('all')} className={chip(value === 'all')}>
        {copy.outline.filters.all}
      </button>
      {shown.map((f) => (
        <button key={f} type="button" aria-pressed={value === f} onClick={() => onChange(value === f ? 'all' : f)} className={chip(value === f)}>
          {copy.outline.filters[f]}
          <span className="text-[12px] tabular-nums opacity-70">{counts[f]}</span>
        </button>
      ))}
    </div>
  );
}
