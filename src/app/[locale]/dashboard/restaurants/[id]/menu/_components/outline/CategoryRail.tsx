'use client';

import { useCallback, useMemo } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EyeOff, GripVertical, Plus } from 'lucide-react';
import { isTempId } from '../menu-merge';
import type { CategoryShape } from '../menu-types';
import { useDndAccessibility, useMenuDndSensors } from '../menu-ui';
import { useStudio } from '../studio/studio-context';

/**
 * Category rail (≥1600, spec §7.7): jump to a section, drag to reorder
 * categories, "+ Kategori ekle". Sticky under the one-row toolbar.
 */
export function CategoryRail({
  categories, activeId, onJump, onAddCategory, canReorder,
}: {
  categories: CategoryShape[];
  activeId: string | null;
  onJump: (id: string) => void;
  onAddCategory?: () => void;
  canReorder: boolean;
}) {
  const { copy, isTr, actions } = useStudio();
  const sensors = useMenuDndSensors();
  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const names = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const nameOf = useCallback((id: string) => copy.dnd.container(names.get(id) ?? ''), [copy, names]);
  const accessibility = useDndAccessibility(isTr, nameOf, copy.dnd.instructions);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    void actions.reorderCategories(arrayMove(ids, from, to));
  };

  return (
    <nav
      aria-labelledby="menu-rail-title"
      className="bz-card sticky top-[72px] hidden max-h-[calc(100dvh-174px)] self-start overflow-y-auto p-2 min-[1600px]:block"
    >
      <h2 id="menu-rail-title" className="px-2 pb-1.5 pt-1 text-[12px] font-medium text-[#737373]">
        <span className="font-body">{copy.outline.categoriesTitle}</span>
      </h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={accessibility} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul role="list" className="space-y-0.5">
            {categories.map((c) => (
              <RailRow key={c.id} category={c} active={c.id === activeId} onJump={onJump} draggable={canReorder} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {onAddCategory && (
        <button
          type="button"
          onClick={onAddCategory}
          className="mt-1.5 flex h-10 w-full items-center gap-2 rounded-[14px] px-2 text-[13px] font-medium text-[#525252] hover:bg-pn-canvas hover:text-pn-ink"
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
          {copy.toolbar.addCategory}
        </button>
      )}
    </nav>
  );
}

function RailRow({
  category, active, onJump, draggable,
}: {
  category: CategoryShape;
  active: boolean;
  onJump: (id: string) => void;
  draggable: boolean;
}) {
  const { copy } = useStudio();
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: !draggable,
  });
  const items = category.items.filter((i) => !isTempId(i.id));
  const soldOut = items.some((i) => i.isAvailable && i.isOutOfStock);
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform), transition } : undefined}
      className={`group/rail relative flex h-10 items-center gap-1 rounded-[14px] ${
        active ? 'bg-pn-accent-soft shadow-[inset_2px_0_0_#78FC90]' : 'hover:bg-pn-canvas'
      } ${isDragging ? 'z-10 bg-white bz-elev-3' : ''}`}
    >
      {draggable ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={copy.item.dragAria(category.name)}
          className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[#A3A3A3] opacity-0 hover:text-pn-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent group-hover/rail:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={13} strokeWidth={2} />
        </button>
      ) : (
        <span className="w-2 shrink-0" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => onJump(category.id)}
        aria-current={active ? 'true' : undefined}
        // The label replaces the content, so the state the icon / dot shows is part of it (never colour-only).
        aria-label={[
          copy.fmt.categoryChipLabel(category.name, items.length),
          !category.isVisible ? copy.category.hidden : soldOut ? copy.item.soldOut : null,
        ].filter(Boolean).join(', ')}
        className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-[14px] pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
      >
        <span className={`min-w-0 flex-1 truncate font-body text-[14px] text-pn-ink ${active ? 'font-medium' : 'font-medium'}`}>
          {category.name}
        </span>
        <span className="shrink-0 text-[12px] tabular-nums text-[#737373]">{items.length}</span>
        {!category.isVisible ? (
          <>
            <EyeOff size={12} strokeWidth={2} className="shrink-0 text-[#737373]" aria-hidden="true" />
            <span className="sr-only">{copy.category.hidden}</span>
          </>
        ) : soldOut ? (
          <>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" aria-hidden="true" />
            <span className="sr-only">{copy.item.soldOut}</span>
          </>
        ) : null}
      </button>
    </li>
  );
}
