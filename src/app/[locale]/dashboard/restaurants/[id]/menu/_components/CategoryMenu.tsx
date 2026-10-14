import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import type { MenuCopy, MenuFmt } from './menu-copy';
import type { CategoryShape } from './menu-types';

/**
 * The "⋯" menu of one category: rename, show / hide on the menu, move, delete.
 * Used on every row of the category column and in the item panel header (the
 * only place the active category's actions live on a phone).
 *
 * `horizontal` swaps "up / down" for "left / right" — the phone chip strip
 * runs sideways.
 */
export function CategoryMenu({
  category, index, total, horizontal, disabled, copy, fmt,
  onRename, onToggleVisible, onMove, onDelete, align = 'end', className = '',
}: {
  category: CategoryShape;
  index: number;
  total: number;
  horizontal: boolean;
  disabled: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  onRename: () => void;
  onToggleVisible: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  return (
    <PulseMenu
      align={align}
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-label={fmt.categoryActionsLabel(category.name)}
          className={`bz-btn-icon h-11 w-11 shrink-0 disabled:opacity-40 disabled:hover:bg-transparent lg:h-9 lg:w-9 ${className}`}
        >
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      }
    >
      <PulseMenuItem icon={<Pencil size={14} strokeWidth={2} />} onSelect={onRename}>
        {copy.rename}
      </PulseMenuItem>
      <PulseMenuItem
        icon={category.isVisible ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
        onSelect={onToggleVisible}
      >
        {category.isVisible ? copy.hideFromMenu : copy.showOnMenu}
      </PulseMenuItem>
      <PulseMenuItem
        icon={horizontal ? <ArrowLeft size={14} strokeWidth={2} /> : <ArrowUp size={14} strokeWidth={2} />}
        disabled={index === 0}
        onSelect={() => onMove(-1)}
      >
        {horizontal ? copy.moveLeft : copy.moveUp}
      </PulseMenuItem>
      <PulseMenuItem
        icon={horizontal ? <ArrowRight size={14} strokeWidth={2} /> : <ArrowDown size={14} strokeWidth={2} />}
        disabled={index === total - 1}
        onSelect={() => onMove(1)}
      >
        {horizontal ? copy.moveRight : copy.moveDown}
      </PulseMenuItem>
      <PulseMenuDivider />
      <PulseMenuItem danger icon={<Trash2 size={14} strokeWidth={2} />} onSelect={onDelete}>
        {copy.delete}
      </PulseMenuItem>
    </PulseMenu>
  );
}
