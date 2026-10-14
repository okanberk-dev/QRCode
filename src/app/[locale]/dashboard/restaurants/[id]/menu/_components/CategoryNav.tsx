import { useEffect, useRef } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { EyeOff, Plus } from 'lucide-react';
import { SortableCategoryRow } from './SortableCategoryRow';
import type { MenuCopy, MenuFmt } from './menu-copy';
import type { CategoryShape } from './menu-types';
import { useDndAccessibility, useMenuDndSensors } from './menu-ui';

interface NavCommon {
  categories: CategoryShape[];
  activeId: string | null;
  readOnly: boolean;
  isTr: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

/**
 * Category column — desktop (≥1024px). Drag to reorder (mouse, touch,
 * keyboard); each row carries its own "⋯" menu.
 */
export function CategoryColumn({
  categories, activeId, readOnly, isTr, copy, fmt,
  onSelect, onAdd, onRename, onToggleVisible, onMove, onDelete, onReorder,
}: NavCommon & {
  onRename: (c: CategoryShape) => void;
  onToggleVisible: (c: CategoryShape) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onDelete: (c: CategoryShape) => void;
  onReorder: (next: CategoryShape[]) => void;
}) {
  const sensors = useMenuDndSensors();
  const a11y = useDndAccessibility(
    isTr,
    (id) => categories.find((c) => c.id === id)?.name ?? '',
    copy.dragHint,
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = categories.findIndex((c) => c.id === active.id);
    const to = categories.findIndex((c) => c.id === over.id);
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(categories, from, to));
  };

  return (
    <section
      aria-label={copy.categories}
      className="hidden overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm lg:block"
    >
      <div className="border-b border-[#EDEDED] px-5 py-4">
        <p className="pulse-eyebrow text-[#737373]">{copy.categories}</p>
        <p className="mt-0.5 text-[11px] text-[#737373]">{fmt.categoryCount(categories.length)}</p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={a11y}
      >
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-[#F5F5F5]">
            {categories.map((c, index) => (
              <SortableCategoryRow
                key={c.id}
                category={c}
                index={index}
                total={categories.length}
                isActive={c.id === activeId}
                readOnly={readOnly}
                copy={copy}
                fmt={fmt}
                onSelect={() => onSelect(c.id)}
                onRename={() => onRename(c)}
                onToggleVisible={() => onToggleVisible(c)}
                onMove={(dir) => onMove(index, dir)}
                onDelete={() => onDelete(c)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {!readOnly && (
        <div className="border-t border-[#F5F5F5] p-3">
          <button type="button" onClick={onAdd} className="bz-btn-ghost w-full">
            <Plus size={14} strokeWidth={2.25} />
            {copy.addCategory}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Category chips — phones and tablets (<1024px). One sticky, sideways-scrolling
 * strip right under the page header so categories never push the items down.
 */
export function CategoryChips({ categories, activeId, readOnly, copy, fmt, onSelect, onAdd }: NavCommon) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  // Keep the selected chip in view (after a tap, after "+", after a delete).
  useEffect(() => {
    if (!activeId) return;
    refs.current.get(activeId)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeId, categories.length]);

  return (
    // sticky top = the shell's mobile topbar height (same value the preview bar uses).
    <div className="sticky top-[61px] z-20 -mx-4 border-b border-[#EDEDED] bg-white/95 px-4 backdrop-blur sm:-mx-7 sm:px-7 lg:hidden">
      <div
        role="group"
        aria-label={copy.categoryGroupLabel}
        className="no-scrollbar flex gap-2 overflow-x-auto py-2.5"
      >
        {categories.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              ref={(el) => {
                if (el) refs.current.set(c.id, el);
                else refs.current.delete(c.id);
              }}
              onClick={() => onSelect(c.id)}
              aria-current={active ? 'true' : undefined}
              aria-label={fmt.categoryChipLabel(c.name, c.items.length)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-[#0A0A0A] text-white'
                  : c.isVisible
                    ? 'border border-[#EDEDED] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]'
                    : 'border border-dashed border-[#D4D4D4] bg-white text-[#525252] hover:border-[#0A0A0A]'
              }`}
            >
              {!c.isVisible && <EyeOff size={12} strokeWidth={2.25} aria-hidden />}
              <span>{c.name}</span>
              <span aria-hidden className={`text-[11px] ${active ? 'text-white/70' : 'text-[#737373]'}`}>
                {c.items.length}
              </span>
              {!c.isVisible && <span className="sr-only">{copy.hiddenBadge}</span>}
            </button>
          );
        })}
        {!readOnly && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#C6F24E] px-4 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
          >
            <Plus size={14} strokeWidth={2.25} />
            {copy.addCategory}
          </button>
        )}
      </div>
    </div>
  );
}
