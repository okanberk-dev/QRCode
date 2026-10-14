import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CategoryShape } from './menu-types';

export function SortableCategoryRow({
  category, isActive, isFirst, isLast, isTr, copy,
  onSelect, onMoveUp, onMoveDown, onToggleVisible, onEdit, onDelete,
}: {
  category: CategoryShape;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  isTr: boolean;
  copy: Record<string, string>;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1 px-3 py-2.5 text-sm transition-colors ${
        isActive ? 'bg-[#EAF9B8]/40' : 'hover:bg-[#FAFAFA]'
      } ${isDragging ? 'z-10 rounded-xl bg-white shadow-lg ring-1 ring-[#EDEDED]' : ''}`}
    >
      {isActive && (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#C6F24E]" aria-hidden />
      )}
      <button
        {...attributes}
        {...listeners}
        aria-label={copy.dragToReorder}
        className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[#A3A3A3] opacity-0 transition-all hover:bg-[#EDEDED] hover:text-[#525252] group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={14} strokeWidth={2} />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[14px] ${isActive ? 'font-medium text-[#0A0A0A]' : 'text-[#0A0A0A]'}`}>
            {category.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
            <span>{category.items.length} {isTr ? 'ürün' : 'items'}</span>
            {!category.isVisible && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-[#EDEDED]" aria-hidden />
                <span className="inline-flex items-center gap-1 text-[#92400E]">
                  <EyeOff size={10} strokeWidth={2.25} />
                  {copy.hidden}
                </span>
              </>
            )}
          </p>
        </div>
      </button>
      <div // §38.238 — same hover-only trap as the item rows above.
                  className="flex shrink-0 items-center gap-0.5 transition-opacity md:[@media(hover:hover)]:opacity-0 md:[@media(hover:hover)]:group-hover:opacity-100">
        <button onClick={onMoveUp} disabled={isFirst} className="bz-btn-icon disabled:opacity-30 disabled:hover:bg-transparent" title={isTr ? 'Yukarı taşı' : 'Move up'} aria-label={isTr ? 'Yukarı taşı' : 'Move up'}>
          <ArrowUp size={14} strokeWidth={2} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="bz-btn-icon disabled:opacity-30 disabled:hover:bg-transparent" title={isTr ? 'Aşağı taşı' : 'Move down'} aria-label={isTr ? 'Aşağı taşı' : 'Move down'}>
          <ArrowDown size={14} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleVisible}
          className={`bz-btn-icon ${category.isVisible ? '' : 'text-[#D97706]'}`}
          title={copy.toggleVisible}
          aria-label={copy.toggleVisible}
        >
          {category.isVisible ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
        </button>
        <button onClick={onEdit} className="bz-btn-icon" title={copy.editCategory} aria-label={copy.editCategory}>
          <Edit2 size={14} strokeWidth={2} />
        </button>
        <button onClick={onDelete} className="bz-btn-icon text-[#DC2626] hover:bg-[#FEF2F2]" title={copy.delete} aria-label={copy.delete}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}
