'use client';

import { memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import type { PendingCreate, RowFeedback } from '../data/useMenuActions';
import { containerId } from '../menu-dnd';
import { isTempId } from '../menu-merge';
import type { CategoryShape } from '../menu-types';
import { useStudio } from '../studio/studio-context';
import { CategoryHeader } from './CategoryHeader';
import { ItemRow } from './ItemRow';
import { QuickAddRow } from './QuickAddRow';
import { ServiceRow } from './ServiceRow';

/**
 * One category of the continuous outline. Never uses `data-cat-id` or
 * `cat-*` ids: the preview's `PublicMenuView` looks those up on `document`.
 * The whole section is a drop target (`container:<id>`), so an item dragged
 * onto an empty or collapsed section lands at its end.
 */
export const CategorySection = memo(function CategorySection({
  category, items, collapsed, onToggleCollapse, filterActive, completion, rows, pendingCreates, selection,
  dndEnabled, reorderMode, dropTarget, index, total,
}: {
  category: CategoryShape;
  items: MenuItemView[];
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  filterActive: boolean;
  completion: 'noPhoto' | 'noDescription' | null;
  rows: Record<string, RowFeedback>;
  pendingCreates: Record<string, PendingCreate>;
  selection: Set<string> | null;
  dndEnabled: boolean;
  reorderMode: boolean;
  /** A dragged item from another section is over this one. */
  dropTarget: boolean;
  /** Position in the menu (-1 while filtering). */
  index: number;
  total: number;
}) {
  const { copy, canEdit, mode, openPasteSheet } = useStudio();
  const service = mode === 'service';
  const selecting = selection !== null;
  const bodyId = `menu-section-body-${category.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: containerId(category.id), disabled: !dndEnabled });
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const order = useMemo(() => category.items.filter((i) => !isTempId(i.id)).map((i) => i.id), [category.items]);
  const highlight = dndEnabled && (dropTarget || (isOver && items.length === 0));

  return (
    <section
      ref={setNodeRef}
      id={`menu-section-${category.id}`}
      aria-labelledby={`menu-section-title-${category.id}`}
      data-section-id={category.id}
      className={`bz-card scroll-mt-[124px] overflow-hidden p-0 lg:scroll-mt-[180px] min-[1400px]:scroll-mt-[124px] ${
        category.isVisible ? '' : 'border-l-[3px] border-l-[#D4D4D4]'
      } ${highlight ? 'outline-dashed outline-2 outline-offset-2 outline-[#C6F24E]' : ''}`}
    >
      <CategoryHeader
        category={category}
        collapsed={collapsed}
        onToggleCollapse={() => onToggleCollapse(category.id)}
        sectionBodyId={bodyId}
        index={index}
        total={total}
      />
      <div id={bodyId} hidden={collapsed}>
        {!collapsed && (
          <>
            {items.length > 0 ? (
              <SortableContext id={category.id} items={ids} strategy={verticalListSortingStrategy}>
                <ul role="list" className="divide-y divide-[#EDEDED]">
                  {items.map((item) =>
                    service ? (
                      <ServiceRow key={item.id} item={item} categoryVisible={category.isVisible} feedback={rows[item.id]} />
                    ) : (
                      <ItemRow
                        key={item.id}
                        item={item}
                        categoryId={category.id}
                        categoryVisible={category.isVisible}
                        feedback={rows[item.id]}
                        pending={pendingCreates[item.id]}
                        completion={completion}
                        index={order.indexOf(item.id)}
                        count={order.length}
                        dndEnabled={dndEnabled}
                        reorderMode={reorderMode}
                        selecting={selecting}
                        selected={selection?.has(item.id) ?? false}
                      />
                    ),
                  )}
                </ul>
              </SortableContext>
            ) : (
              <div className="min-h-[56px] px-4 py-4">
                <p className="text-[13px] font-medium text-[#0A0A0A]">{copy.outline.emptyCategory}</p>
                {canEdit && !service && (
                  <p className="mt-0.5 text-[12.5px] text-[#737373]">
                    {copy.outline.emptyCategoryBody}{' '}
                    <button
                      type="button"
                      onClick={() => openPasteSheet(category.id)}
                      className="min-h-11 font-semibold text-[#0A0A0A] underline underline-offset-2 pointer-fine:min-h-0"
                    >
                      {copy.category.pasteList}
                    </button>
                  </p>
                )}
              </div>
            )}
            {canEdit && !service && !filterActive && !selecting && !reorderMode && (
              <div className="border-t border-[#EDEDED]">
                <QuickAddRow categoryId={category.id} categoryName={category.name} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
});
