'use client';

import { useMenuCopy } from '../kit/useMenuCopy';
import type { MenuFilter } from '../menu-filter';

/**
 * Line above the outline while searching / filtering (spec §7.6): how many
 * rows match, "Temizle", and for "Tükendi" one-tap "Hepsini satışa aç".
 * Selection and reorder-mode parts arrive in chunk 3.
 */
export function ContextBar({
  query, filter, total, onClear, onRestockAll, canEdit, soldOutIds,
}: {
  query: string;
  filter: MenuFilter;
  total: number;
  onClear: () => void;
  onRestockAll: (ids: string[]) => void;
  canEdit: boolean;
  soldOutIds: string[];
}) {
  const copy = useMenuCopy();
  const filtering = filter !== 'all';
  if (!query.trim() && !filtering) return null;
  const summary = filtering ? copy.fmt.filterSummary(copy.outline.filters[filter], total) : copy.fmt.resultsCount(total);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[13px]">
      <p role="status" className="font-medium text-[#0A0A0A]">
        {summary}
      </p>
      <button type="button" onClick={onClear} className="min-h-11 font-semibold text-[#525252] underline underline-offset-2 hover:text-[#0A0A0A] pointer-fine:min-h-8">
        {copy.context.clear}
      </button>
      {filter === 'soldOut' && canEdit && soldOutIds.length > 0 && (
        <button type="button" onClick={() => onRestockAll(soldOutIds)} className="bz-btn bz-btn-sm">
          {copy.context.restockAll}
        </button>
      )}
      {(filter === 'noPhoto' || filter === 'noDescription') && <p className="text-[12.5px] text-[#737373]">{copy.context.completionHint}</p>}
    </div>
  );
}
