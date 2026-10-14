import type { ReactNode } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ClipboardList, Image as ImageIcon, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import type { Locale } from '@/lib/translations';
import { CategoryMenu } from './CategoryMenu';
import { MenuItemRow } from './MenuItemRow';
import type { MenuCopy, MenuFmt } from './menu-copy';
import type { CategoryShape } from './menu-types';
import { useDndAccessibility, useMenuDndSensors } from './menu-ui';

/**
 * The item panel: header (category name, counts, add / paste buttons, the
 * category's own "⋯") and the sortable list — or the "this category is empty"
 * state.
 */
export function ItemList({
  category, categoryIndex, categoryTotal, isTr, locale, readOnly, isDesktop, copy, fmt,
  headerExtra, onAddItem, onBulkAdd,
  onEditItem, onToggleSoldOut, onToggleHidden, onMoveItem, onDeleteItem, onReorderItems,
  onRenameCategory, onToggleCategoryVisible, onMoveCategory, onDeleteCategory,
}: {
  category: CategoryShape;
  categoryIndex: number;
  categoryTotal: number;
  isTr: boolean;
  locale: Locale;
  readOnly: boolean;
  isDesktop: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  /** Extra header control (the 1024–1399px "Preview" button). */
  headerExtra?: ReactNode;
  onAddItem: () => void;
  /** "Paste a list" — the button only exists when this is provided. */
  onBulkAdd?: () => void;
  onEditItem: (item: MenuItemView) => void;
  onToggleSoldOut: (item: MenuItemView) => void;
  onToggleHidden: (item: MenuItemView) => void;
  onMoveItem: (index: number, dir: -1 | 1) => void;
  onDeleteItem: (item: MenuItemView) => void;
  onReorderItems: (categoryId: string, next: MenuItemView[]) => void;
  onRenameCategory: () => void;
  onToggleCategoryVisible: () => void;
  onMoveCategory: (dir: -1 | 1) => void;
  onDeleteCategory: () => void;
}) {
  const sensors = useMenuDndSensors();
  const items = category.items;
  const a11y = useDndAccessibility(isTr, (id) => items.find((i) => i.id === id)?.name ?? '', copy.dragHint);
  const hiddenCount = items.filter((i) => !i.isAvailable).length;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((it) => it.id === active.id);
    const to = items.findIndex((it) => it.id === over.id);
    if (from === -1 || to === -1) return;
    onReorderItems(category.id, arrayMove(items, from, to));
  };

  const addButton = (
    <button type="button" onClick={onAddItem} className="bz-btn-primary h-11 flex-1 sm:h-auto sm:flex-none">
      <Plus size={14} strokeWidth={2.25} />
      {copy.addItem}
    </button>
  );
  const pasteButton = onBulkAdd ? (
    <button type="button" onClick={onBulkAdd} className="bz-btn-ghost h-11 flex-1 sm:h-auto sm:flex-none">
      <ClipboardList size={14} strokeWidth={2} />
      {copy.pasteList}
    </button>
  ) : null;

  return (
    <section
      id="menu-items-pane"
      aria-label={copy.items}
      className="scroll-mt-32 overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm"
    >
      <div className="border-b border-[#EDEDED] px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">{copy.itemsEyebrow}</p>
            <h2 className="mt-1 truncate text-[18px] font-medium tracking-[-0.015em] text-[#0A0A0A] sm:text-[20px]">
              {category.name}
            </h2>
            {category.description && (
              <p className="mt-1 line-clamp-1 text-[12px] text-[#737373]">{category.description}</p>
            )}
            <p className="mt-1 text-[11px] text-[#737373]">
              {fmt.itemCount(items.length)}
              {hiddenCount > 0 && ` · ${fmt.hiddenCount(hiddenCount)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerExtra}
            {!readOnly && (
              <div className="hidden items-center gap-2 sm:flex">
                {pasteButton}
                {addButton}
              </div>
            )}
            <CategoryMenu
              category={category}
              index={categoryIndex}
              total={categoryTotal}
              horizontal={!isDesktop}
              disabled={readOnly}
              copy={copy}
              fmt={fmt}
              onRename={onRenameCategory}
              onToggleVisible={onToggleCategoryVisible}
              onMove={onMoveCategory}
              onDelete={onDeleteCategory}
              className="border border-[#EDEDED]"
            />
          </div>
        </div>
        {!readOnly && items.length > 0 && (
          <div className="mt-3 flex gap-2 sm:hidden">
            {addButton}
            {pasteButton}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 sm:px-6">
          <EmptyState
            icon={<ImageIcon size={20} strokeWidth={1.75} />}
            title={fmt.emptyCategoryTitle(category.name)}
            body={copy.emptyCategoryBody}
            action={
              readOnly ? undefined : (
                <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  <button type="button" onClick={onAddItem} className="bz-btn-primary">
                    <Plus size={14} strokeWidth={2.25} />
                    {copy.addFirstItem}
                  </button>
                  {onBulkAdd && (
                    <button type="button" onClick={onBulkAdd} className="bz-btn-ghost">
                      <ClipboardList size={14} strokeWidth={2} />
                      {copy.pasteList}
                    </button>
                  )}
                </div>
              )
            }
          />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={a11y}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-[#F5F5F5]">
              {items.map((item, index) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  total={items.length}
                  isTr={isTr}
                  locale={locale}
                  readOnly={readOnly}
                  copy={copy}
                  fmt={fmt}
                  onEdit={() => onEditItem(item)}
                  onToggleSoldOut={() => onToggleSoldOut(item)}
                  onToggleHidden={() => onToggleHidden(item)}
                  onMove={(dir) => onMoveItem(index, dir)}
                  onDelete={() => onDeleteItem(item)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
