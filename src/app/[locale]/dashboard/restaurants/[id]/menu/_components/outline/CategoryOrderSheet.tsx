'use client';

import { useCallback, useMemo, useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Check, EyeOff, GripVertical } from 'lucide-react';
import { Sheet } from '../kit/Sheet';
import { isTempId } from '../menu-merge';
import type { CategoryShape } from '../menu-types';
import { useDndAccessibility, useIsSmUp, useMenuDndSensors } from '../menu-ui';
import { useStudio } from '../studio/studio-context';

/**
 * "Kategorileri sırala" (spec §7.7): every category in a 56 px row with a
 * grip and ↑ / ↓. Each change is saved at once; the sheet says so with its
 * own "Geri al" (toasts sit behind the modal layer). "Bitti" closes.
 */
export function CategoryOrderSheet({ categories, onClose }: { categories: CategoryShape[]; onClose: () => void }) {
  const { copy, isTr, actions, toaster } = useStudio();
  const smUp = useIsSmUp();
  const sensors = useMenuDndSensors();
  const [notice, setNotice] = useState<'saved' | 'undone' | null>(null);
  const ids = useMemo(() => categories.map((c) => c.id), [categories]);
  const names = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const nameOf = useCallback((id: string) => copy.dnd.container(names.get(id) ?? ''), [copy, names]);
  const accessibility = useDndAccessibility(isTr, nameOf, copy.dnd.instructions);

  const save = async (next: string[]) => {
    const r = await actions.reorderCategories(next);
    if (r.ok) setNotice('saved');
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    void save(arrayMove(ids, from, to));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  };

  return (
    <Sheet
      open
      onRequestClose={onClose}
      side={smUp ? 'right' : 'bottom'}
      widthClass="sm:max-w-[440px]"
      title={copy.header.sortCategories}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="bz-btn-primary min-h-[44px] sm:min-h-[36px]">
            {copy.context.done}
          </button>
        </div>
      }
    >
      {notice && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-[14px] bg-pn-accent-soft px-3 py-2 text-[13px] text-pn-ink">
          <Check size={14} strokeWidth={2.25} className="shrink-0 text-[#4D5C00]" aria-hidden="true" />
          <span className="flex-1">{notice === 'saved' ? copy.toast.orderSaved : copy.toast.undone}</span>
          {notice === 'saved' && (
            <button
              type="button"
              onClick={async () => {
                await toaster.undoLatest();
                setNotice('undone');
              }}
              className="min-h-11 font-medium underline underline-offset-2 pointer-fine:min-h-8"
            >
              {copy.toast.undo}
            </button>
          )}
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={accessibility} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="divide-y divide-pn-line rounded-[20px] border border-pn-line">
            {categories.map((c, i) => (
              <OrderRow key={c.id} category={c} index={i} total={categories.length} onMove={move} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </Sheet>
  );
}

function OrderRow({
  category, index, total, onMove,
}: {
  category: CategoryShape;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  const { copy } = useStudio();
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: category.id });
  const count = category.items.filter((i) => !isTempId(i.id)).length;
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform), transition } : undefined}
      className={`flex min-h-[56px] items-center gap-2 bg-white px-2 ${isDragging ? 'relative z-10 bz-elev-3' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={copy.item.dragAria(category.name)}
        className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-[10px] text-[#737373] hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent active:cursor-grabbing"
      >
        <GripVertical size={15} strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-body text-[14.5px] font-medium text-pn-ink">
          {!category.isVisible && <EyeOff size={12} strokeWidth={2} className="shrink-0 text-[#737373]" aria-label={copy.category.hidden} />}
          <span className="truncate">{category.name}</span>
        </p>
        <p className="text-[12px] text-[#737373]">{copy.fmt.itemCount(count)}</p>
      </div>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label={`${copy.category.moveUp}: ${category.name}`}
        className="bz-btn-icon h-11 w-11 shrink-0 disabled:opacity-30"
      >
        <ArrowUp size={16} strokeWidth={2} />
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label={`${copy.category.moveDown}: ${category.name}`}
        className="bz-btn-icon h-11 w-11 shrink-0 disabled:opacity-30"
      >
        <ArrowDown size={16} strokeWidth={2} />
      </button>
    </li>
  );
}
