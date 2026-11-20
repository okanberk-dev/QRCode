'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, closestCorners, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SearchX } from 'lucide-react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { EmptyState } from '@/components/ui';
import type { PendingCreate, RowFeedback } from '../data/useMenuActions';
import { findContainer, moveAcross, resolveDrop, type DndItems } from '../menu-dnd';
import type { FilteredSection } from '../menu-filter';
import { isTempId } from '../menu-merge';
import { useDndAccessibility, useMenuDndSensors, usePrefersReducedMotion } from '../menu-ui';
import { useStudio } from '../studio/studio-context';
import { CategorySection } from './CategorySection';
import { DragPreviewRow } from './DragPreviewRow';
import { NewCategoryRow } from './NewCategoryRow';

/**
 * The whole menu as one continuous outline (spec §7.7): every category a
 * section, in customer order. Search / filter show matching rows only and
 * open collapsed sections; "+ Yeni kategori" is hidden meanwhile, in Servis
 * and while selecting.
 *
 * Drag and drop (§8.4): one DndContext around all sections. While a drag is
 * on, a working copy `categoryId → item ids` is moved by `onDragOver`
 * (`moveAcross`) so the gap opens in the section under the pointer; the drop
 * is resolved against the order before the drag (`resolveDrop`) into a
 * reorder inside one category or a move to another category at an index.
 * Sections are droppable as a whole, so an empty or collapsed section takes
 * the item at its end. Off while searching / filtering / selecting / in
 * Servis; touch needs "Sırala" mode.
 */
export const MenuOutline = memo(function MenuOutline({
  sections, filterActive, query, onClearSearch, collapsed, onToggleCollapse, completion, rows, pendingCreates,
  selection, reorderMode,
}: {
  sections: FilteredSection[];
  filterActive: boolean;
  query: string;
  onClearSearch: () => void;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  completion: 'noPhoto' | 'noDescription' | null;
  rows: Record<string, RowFeedback>;
  pendingCreates: Record<string, PendingCreate>;
  selection: Set<string> | null;
  reorderMode: boolean;
}) {
  const { copy, isTr, canEdit, mode, finePointer, actions } = useStudio();
  const reduced = usePrefersReducedMotion();
  const selecting = selection !== null;
  const dndEnabled = canEdit && mode === 'edit' && !filterActive && !selecting && (finePointer || reorderMode);

  const [working, setWorking] = useState<DndItems | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const workingRef = useRef<DndItems | null>(null);
  const originalRef = useRef<DndItems | null>(null);

  const baseItems = useMemo<DndItems>(
    () => Object.fromEntries(sections.map((s) => [s.category.id, s.items.map((i) => i.id)])),
    [sections],
  );
  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItemView>();
    for (const s of sections) for (const i of s.items) map.set(i.id, i);
    return map;
  }, [sections]);
  const categoryNames = useMemo(() => new Map(sections.map((s) => [s.category.id, s.category.name])), [sections]);

  const nameOf = useCallback((id: string) => itemsById.get(id)?.name ?? id, [itemsById]);
  const containerName = useCallback((cid: string) => copy.dnd.container(categoryNames.get(cid) ?? ''), [copy, categoryNames]);
  const accessibility = useDndAccessibility(isTr, nameOf, copy.dnd.instructions, containerName);
  const sensors = useMenuDndSensors();

  const setWork = (next: DndItems | null) => {
    workingRef.current = next;
    setWorking(next);
  };
  const reset = () => {
    setWork(null);
    originalRef.current = null;
    setActiveId(null);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    originalRef.current = baseItems;
    setWork(baseItems);
    setActiveId(String(active.id));
  };
  const onDragOver = ({ active, over }: DragOverEvent) => {
    const current = workingRef.current;
    if (!over || !current) return;
    const next = moveAcross(current, String(active.id), String(over.id));
    if (next !== current) setWork(next);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const original = originalRef.current;
    const current = workingRef.current;
    reset();
    if (!original || !current) return;
    const result = resolveDrop(original, current, String(active.id), over ? String(over.id) : null);
    if (result.kind === 'reorder') {
      void actions.reorderItems(result.categoryId, result.ids.filter((id) => !isTempId(id)));
    } else if (result.kind === 'move') {
      const stable = result.targetIds.filter((id) => !isTempId(id));
      void actions.moveItemToCategory(result.itemId, result.toCategoryId, stable.indexOf(result.itemId));
    }
  };

  if (!filterActive && sections.length === 0) {
    return canEdit ? <NewCategoryRow autoFocus /> : null;
  }

  const activeItem = activeId ? itemsById.get(activeId) : undefined;
  const overContainer = activeId && working ? findContainer(working, activeId) : null;

  return (
    <div>
      <h2 className="sr-only">{copy.outline.srTitle}</h2>
      {filterActive && sections.length === 0 ? (
        <EmptyState
          icon={<SearchX size={20} strokeWidth={2} />}
          title={query.trim() ? copy.fmt.noResults(query.trim()) : copy.fmt.filterSummary(copy.outline.filters.all, 0)}
          action={
            <button type="button" onClick={onClearSearch} className="bz-btn-ghost">
              {copy.outline.clearSearch}
            </button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          accessibility={accessibility}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={reset}
        >
          <div className="space-y-4">
            {sections.map(({ category, items }, position) => {
              const ids = working?.[category.id];
              const shown = ids ? ids.flatMap((id) => {
                const item = itemsById.get(id);
                return item ? [item] : [];
              }) : items;
              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  items={shown}
                  collapsed={!filterActive && collapsed.has(category.id)}
                  onToggleCollapse={onToggleCollapse}
                  filterActive={filterActive}
                  completion={completion}
                  rows={rows}
                  pendingCreates={pendingCreates}
                  selection={selection}
                  dndEnabled={dndEnabled}
                  reorderMode={reorderMode}
                  dropTarget={overContainer === category.id && originalRef.current?.[category.id]?.includes(activeId ?? '') === false}
                  index={filterActive ? -1 : position}
                  total={sections.length}
                />
              );
            })}
            {mode === 'edit' && !filterActive && !selecting && !reorderMode && <NewCategoryRow disabled={!canEdit} />}
          </div>
          <DragOverlay zIndex={45} dropAnimation={reduced ? null : undefined}>
            {activeItem ? <DragPreviewRow item={activeItem} locale={isTr ? 'tr' : 'en'} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
});
