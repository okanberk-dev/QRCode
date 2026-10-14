import {
  ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Image as ImageIcon, MoreHorizontal, Pencil, ShieldAlert, Trash2,
  AlertTriangle, RotateCcw,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { APSwitch, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { formatPrice } from '@/lib/format';
import type { MenuBadge } from '@/lib/validations';
import type { Locale } from '@/lib/translations';
import { BADGE_LABELS, BADGE_TINTS } from './menu-constants';
import type { MenuCopy, MenuFmt } from './menu-copy';

/** Two tags are enough on a row; the rest are one "+n" away in the editor. */
const VISIBLE_BADGES = 2;

/**
 * One product in the list.
 *
 * - The whole name area is a real button that opens the editor — no hover
 *   needed to find "edit".
 * - The switch is the daily action and is named after what it does for the
 *   customer: ON = on sale, OFF = the menu shows "Sold out". "Hide from menu"
 *   is the seasonal action and lives in the "⋯" menu; a hidden item swaps the
 *   switch for a plain "Show on menu" button.
 * - Four tab stops: drag handle, name, switch, menu.
 */
export function MenuItemRow({
  item, index, total, isTr, locale, readOnly, copy, fmt,
  onEdit, onToggleSoldOut, onToggleHidden, onMove, onDelete,
}: {
  item: MenuItemView;
  index: number;
  total: number;
  isTr: boolean;
  locale: Locale;
  readOnly: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  onEdit: () => void;
  onToggleSoldOut: () => void;
  onToggleHidden: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const hidden = !item.isAvailable;
  const dimmed = hidden || item.isOutOfStock;
  const price = formatPrice(item.priceCents, item.currency, isTr ? 'tr-TR' : 'en-US');
  const allergenCount = item.allergens?.length ?? 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 px-1.5 py-2 transition-colors hover:bg-[#FAFAFA] sm:gap-2 sm:px-3 ${
        isDragging ? 'z-10 rounded-xl bg-white shadow-lg ring-1 ring-[#EDEDED]' : ''
      }`}
    >
      {readOnly ? (
        <span className="w-1 shrink-0 sm:w-2" aria-hidden />
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${copy.dragToReorder}: ${item.name}`}
          className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-[#EDEDED] hover:text-[#0A0A0A] active:cursor-grabbing sm:w-11"
        >
          <GripVertical size={16} strokeWidth={2} />
        </button>
      )}

      <button
        type="button"
        onClick={onEdit}
        disabled={readOnly}
        aria-label={fmt.itemRowLabel(item.name, price)}
        className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 text-left disabled:cursor-default sm:gap-3"
      >
        <span
          className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5] ring-1 ring-[#EDEDED] sm:h-14 sm:w-14 ${
            dimmed ? 'opacity-50' : ''
          }`}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#A3A3A3]">
              <ImageIcon size={18} strokeWidth={1.75} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14px] font-medium ${dimmed ? 'text-[#737373]' : 'text-[#0A0A0A]'}`}>
            {item.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`text-[14px] tabular-nums tracking-tight ${dimmed ? 'text-[#737373]' : 'text-[#0A0A0A]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {price}
            </span>
            {item.isOutOfStock && !hidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-medium text-[#991B1B] ring-1 ring-[#FECACA]">
                <AlertTriangle size={10} strokeWidth={2.25} />
                {copy.soldOut}
              </span>
            )}
            {hidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EDEDED] px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                <EyeOff size={10} strokeWidth={2.25} />
                {copy.hiddenOnMenu}
              </span>
            )}
            {item.badges.slice(0, VISIBLE_BADGES).map((b) => {
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
                  className="hidden items-center rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex"
                >
                  {BADGE_LABELS[b as MenuBadge]?.[locale] || b}
                </span>
              );
            })}
            {item.badges.length > VISIBLE_BADGES && (
              <span className="hidden items-center rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#525252] sm:inline-flex">
                +{item.badges.length - VISIBLE_BADGES}
              </span>
            )}
            {allergenCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-medium text-[#92400E]"
                title={isTr ? `${allergenCount} alerjen işaretli` : `${allergenCount} allergens flagged`}
              >
                <ShieldAlert size={9} strokeWidth={2.25} />
                {allergenCount}
              </span>
            )}
          </span>
        </span>
      </button>

      {hidden ? (
        <button
          type="button"
          onClick={onToggleHidden}
          disabled={readOnly}
          className="bz-btn-ghost shrink-0 px-3 text-[12px] disabled:opacity-50"
        >
          <Eye size={13} strokeWidth={2} />
          {copy.showItem}
        </button>
      ) : (
        // 44px-tall hit area around the 28px switch; a tap beside the switch
        // still counts.
        <div
          className="flex h-11 shrink-0 items-center px-1"
          onClick={(e) => {
            if (!readOnly && e.target === e.currentTarget) onToggleSoldOut();
          }}
        >
          <APSwitch
            checked={!item.isOutOfStock}
            onChange={onToggleSoldOut}
            disabled={readOnly}
            ariaLabel={fmt.switchLabel(item.name)}
          />
        </div>
      )}

      <PulseMenu
        trigger={
          <button
            type="button"
            disabled={readOnly}
            aria-label={fmt.itemActionsLabel(item.name)}
            className="bz-btn-icon h-11 w-11 shrink-0 disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9"
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        }
      >
        <PulseMenuItem icon={<Pencil size={14} strokeWidth={2} />} onSelect={onEdit}>
          {copy.rowEdit}
        </PulseMenuItem>
        {!hidden && (
          <PulseMenuItem
            icon={item.isOutOfStock ? <RotateCcw size={14} strokeWidth={2} /> : <AlertTriangle size={14} strokeWidth={2} />}
            onSelect={onToggleSoldOut}
          >
            {item.isOutOfStock ? copy.backInStock : copy.markSoldOut}
          </PulseMenuItem>
        )}
        <PulseMenuItem
          icon={hidden ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
          onSelect={onToggleHidden}
        >
          {hidden ? copy.showItem : copy.hideItem}
        </PulseMenuItem>
        <PulseMenuItem icon={<ArrowUp size={14} strokeWidth={2} />} disabled={index === 0} onSelect={() => onMove(-1)}>
          {copy.moveUp}
        </PulseMenuItem>
        <PulseMenuItem
          icon={<ArrowDown size={14} strokeWidth={2} />}
          disabled={index === total - 1}
          onSelect={() => onMove(1)}
        >
          {copy.moveDown}
        </PulseMenuItem>
        <PulseMenuDivider />
        <PulseMenuItem danger icon={<Trash2 size={14} strokeWidth={2} />} onSelect={onDelete}>
          {copy.delete}
        </PulseMenuItem>
      </PulseMenu>
    </li>
  );
}
