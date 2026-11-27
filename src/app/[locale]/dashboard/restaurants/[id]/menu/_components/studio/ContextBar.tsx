'use client';

import { useMenuCopy } from '../kit/useMenuCopy';
import type { MenuFilter } from '../menu-filter';

/**
 * Line above the outline (spec §7.6). Shows only when there is something to
 * say:
 * - search / filter: how many rows match, "Temizle", one-tap "Hepsini satışa
 *   aç" on Tükendi, the completion hint on Fotoğrafsız / Açıklamasız, and why
 *   dragging is off meanwhile;
 * - selection: "n seçili" (+ how many are outside the filter), "Tümünü seç
 *   (görünen m)", "Seçimi temizle";
 * - touch reorder mode: the hint and "Bitti".
 */
export function ContextBar({
  query, filter, total, onClear, onRestockAll, canEdit, soldOutIds, dragNote, selection, reorder,
}: {
  query: string;
  filter: MenuFilter;
  total: number;
  onClear: () => void;
  onRestockAll: (ids: string[]) => void;
  canEdit: boolean;
  soldOutIds: string[];
  /** Fine pointer, edit mode: say that drag is off while searching / filtering. */
  dragNote: boolean;
  selection: {
    count: number;
    outsideFilter: number;
    visible: number;
    allVisibleSelected: boolean;
    onSelectVisible: () => void;
    onClear: () => void;
  } | null;
  reorder: { onDone: () => void } | null;
}) {
  const copy = useMenuCopy();
  const filtering = filter !== 'all';
  const searching = query.trim() !== '' || filtering;
  if (!searching && !selection && !reorder) return null;
  const summary = filtering ? copy.fmt.filterSummary(copy.outline.filters[filter], total) : copy.fmt.resultsCount(total);
  const link =
    'min-h-11 font-medium text-[#525252] underline underline-offset-2 hover:text-pn-ink disabled:text-[#A3A3A3] disabled:no-underline pointer-fine:min-h-8';

  return (
    <div className="space-y-2 rounded-[20px] border border-pn-line bg-white px-3 py-2 text-[13px]">
      {selection && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p role="status" className="font-medium text-pn-ink">
            {copy.selection.count(selection.count)}
            {selection.outsideFilter > 0 && (
              <span className="font-normal text-[#737373]"> · {copy.selection.outsideFilter(selection.outsideFilter)}</span>
            )}
          </p>
          <button type="button" onClick={selection.onSelectVisible} disabled={selection.allVisibleSelected || selection.visible === 0} className={link}>
            {copy.selection.selectVisible(selection.visible)}
          </button>
          <button type="button" onClick={selection.onClear} className={link}>
            {copy.selection.clear}
          </button>
        </div>
      )}
      {reorder && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p role="status" className="text-[#525252]">{copy.context.reorderHint}</p>
          <button type="button" onClick={reorder.onDone} className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8">
            {copy.context.done}
          </button>
        </div>
      )}
      {searching && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p role="status" className="font-medium text-pn-ink">
            {summary}
          </p>
          <button type="button" onClick={onClear} className={link}>
            {copy.context.clear}
          </button>
          {filter === 'soldOut' && canEdit && soldOutIds.length > 0 && (
            <button type="button" onClick={() => onRestockAll(soldOutIds)} className="bz-btn bz-btn-sm">
              {copy.context.restockAll}
            </button>
          )}
          {(filter === 'noPhoto' || filter === 'noDescription') && <p className="text-[13px] text-[#737373]">{copy.context.completionHint}</p>}
          {dragNote && <p className="text-[13px] text-[#737373]">{copy.context.dragDisabledWhileFiltering}</p>}
        </div>
      )}
    </div>
  );
}
