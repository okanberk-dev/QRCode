import { EyeOff, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CategoryMenu } from './CategoryMenu';
import type { MenuCopy, MenuFmt } from './menu-copy';
import type { CategoryShape } from './menu-types';

/**
 * One row of the category column (desktop). The drag handle and the "⋯" are
 * always visible — nothing hides behind hover — and the whole name area selects
 * the category.
 */
export function SortableCategoryRow({
  category, index, total, isActive, readOnly, copy, fmt,
  onSelect, onRename, onToggleVisible, onMove, onDelete,
}: {
  category: CategoryShape;
  index: number;
  total: number;
  isActive: boolean;
  readOnly: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  onSelect: () => void;
  onRename: () => void;
  onToggleVisible: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-0.5 py-1.5 pl-1 pr-1.5 transition-colors ${
        isActive ? 'bg-[#EAF9B8]/40' : 'hover:bg-[#FAFAFA]'
      } ${isDragging ? 'z-10 rounded-xl bg-white shadow-lg ring-1 ring-[#EDEDED]' : ''}`}
    >
      {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#C6F24E]" aria-hidden />}
      {readOnly ? (
        <span className="w-2 shrink-0" aria-hidden />
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${copy.dragToReorder}: ${category.name}`}
          className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A] active:cursor-grabbing"
        >
          <GripVertical size={15} strokeWidth={2} />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
        className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center rounded-lg px-1.5 text-left"
      >
        <span className={`truncate text-[14px] ${isActive ? 'font-medium' : ''} text-[#0A0A0A]`}>{category.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
          <span>{fmt.itemCount(category.items.length)}</span>
          {!category.isVisible && (
            <span className="inline-flex items-center gap-1 text-[#92400E]">
              <EyeOff size={10} strokeWidth={2.25} />
              {copy.hiddenBadge}
            </span>
          )}
        </span>
      </button>
      <CategoryMenu
        category={category}
        index={index}
        total={total}
        horizontal={false}
        disabled={readOnly}
        copy={copy}
        fmt={fmt}
        onRename={onRename}
        onToggleVisible={onToggleVisible}
        onMove={onMove}
        onDelete={onDelete}
      />
    </li>
  );
}
