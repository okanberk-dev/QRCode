import {
  AlertTriangle, ArrowDown, ArrowUp, Edit2, Eye, EyeOff, GripVertical, Image as ImageIcon, ShieldAlert, Trash2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { formatPrice } from '@/lib/format';
import type { MenuBadge } from '@/lib/validations';
import type { Locale } from '@/lib/translations';
import { BADGE_LABELS, BADGE_TINTS } from './menu-constants';

export function SortableItemRow({
  item, isFirst, isLast, isTr, locale, copy,
  onMoveUp, onMoveDown, onToggleAvailable, onToggleOutOfStock, onEdit, onDelete,
}: {
  item: MenuItemView;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  isTr: boolean;
  locale: Locale;
  copy: Record<string, string>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleAvailable: () => void;
  onToggleOutOfStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const dimmed = !item.isAvailable || item.isOutOfStock;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAFAFA] sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4 ${
        isDragging ? 'z-10 rounded-xl bg-white shadow-lg ring-1 ring-[#EDEDED]' : ''
      }`}
    >
      <div className="flex items-center gap-3 sm:contents">
        <button
          {...attributes}
          {...listeners}
          aria-label={copy.dragToReorder}
          className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[#A3A3A3] transition-all hover:bg-[#EDEDED] hover:text-[#525252] sm:opacity-0 sm:group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={16} strokeWidth={2} />
        </button>
        <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F5] ring-1 ring-[#EDEDED] transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
          {item.imageUrl ? (
             
            <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#A3A3A3]">
              <ImageIcon size={20} strokeWidth={1.75} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`truncate text-[14px] font-medium ${dimmed ? 'text-[#737373]' : 'text-[#0A0A0A]'}`}>
              {item.name}
            </p>
            {!item.isAvailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EDEDED] px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                <EyeOff size={10} strokeWidth={2.25} />
                {copy.hidden}
              </span>
            )}
            {item.isOutOfStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-medium text-[#991B1B] ring-1 ring-[#FECACA]">
                <AlertTriangle size={10} strokeWidth={2.25} />
                {copy.outOfStock}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={`text-[15px] font-medium tabular-nums tracking-tight ${dimmed ? 'text-[#737373]' : 'text-[#0A0A0A]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatPrice(item.priceCents, item.currency, isTr ? 'tr-TR' : 'en-US')}
            </span>
            {item.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.badges.slice(0, 3).map((b) => {
                  const tint = BADGE_TINTS[b as MenuBadge];
                  return (
                    <span
                      key={b}
                      style={
                        tint
                          ? {
                              backgroundColor: tint.bg,
                              color: tint.fg,
                              boxShadow: tint.border ? `inset 0 0 0 1px ${tint.border}` : undefined,
                            }
                          : undefined
                      }
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      {BADGE_LABELS[b as MenuBadge]?.[locale] || b}
                    </span>
                  );
                })}
                {item.badges.length > 3 && (
                  <span className="inline-flex items-center rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                    +{item.badges.length - 3}
                  </span>
                )}
              </div>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-medium text-[#92400E]"
                title={isTr ? `${item.allergens.length} alerjen işaretli` : `${item.allergens.length} allergens flagged`}
              >
                <ShieldAlert size={9} strokeWidth={2.25} />
                {item.allergens.length}
              </span>
            )}
          </div>
        </div>
      </div>
      <div // §38.238 — `md:opacity-0 md:group-hover:opacity-100` hides this 6-button
                    // cluster (Up/Down/Hide/Out-of-stock/Edit/DELETE) on every device
                    // ≥768px. Touch devices have no :hover, so on iPad the buttons stayed
                    // invisible forever while remaining fully hit-testable — a tap near the
                    // right edge of a row silently deleted an item. Gate the hover-reveal on
                    // an actual hover-capable pointer.
                    className="flex shrink-0 flex-wrap items-center justify-end gap-0.5 border-t border-[#F5F5F5] pt-2 transition-opacity sm:border-t-0 sm:pt-0 md:[@media(hover:hover)]:opacity-0 md:[@media(hover:hover)]:group-hover:opacity-100">
        <button onClick={onMoveUp} disabled={isFirst} className="bz-btn-icon disabled:opacity-30 disabled:hover:bg-transparent" aria-label={isTr ? 'Yukarı taşı' : 'Move up'}>
          <ArrowUp size={16} strokeWidth={2} />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="bz-btn-icon disabled:opacity-30 disabled:hover:bg-transparent" aria-label={isTr ? 'Aşağı taşı' : 'Move down'}>
          <ArrowDown size={16} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleAvailable}
          className={`bz-btn-icon ${item.isAvailable ? '' : 'text-[#D97706]'}`}
          title={copy.toggleVisible}
          aria-label={copy.toggleVisible}
        >
          {item.isAvailable ? <Eye size={16} strokeWidth={2} /> : <EyeOff size={16} strokeWidth={2} />}
        </button>
        <button
          onClick={onToggleOutOfStock}
          className={`bz-btn-icon ${item.isOutOfStock ? 'text-[#DC2626]' : ''}`}
          title={copy.toggleOutOfStock}
          aria-label={copy.toggleOutOfStock}
        >
          <AlertTriangle size={16} strokeWidth={2} />
        </button>
        <button onClick={onEdit} className="bz-btn-icon" aria-label={copy.editItem || 'Edit'}>
          <Edit2 size={16} strokeWidth={2} />
        </button>
        <button onClick={onDelete} className="bz-btn-icon text-[#DC2626] hover:bg-[#FEF2F2]" aria-label={copy.delete}>
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}
