'use client';

import { memo, useCallback, useRef, type CSSProperties, type MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown, ArrowUp, CheckSquare, Copy, Eye, EyeOff, FolderInput, GripVertical, ImagePlus, Loader2, MoreHorizontal,
  PencilLine, RotateCcw, Trash2, X,
} from 'lucide-react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { APCheckbox, Badge, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import type { PendingCreate, RowFeedback } from '../data/useMenuActions';
import { BADGE_LABELS } from '../menu-constants';
import { isTempId } from '../menu-merge';
import { rowBadge } from '../menu-status';
import { MENU_TOUCH, afterMenuCloses } from '../menu-ui';
import { ROW_ARIA_KEYS, ariaKeysFor } from '../menu-keys';
import type { MenuBadge } from '@/lib/validations';
import { isImageFile } from '../data/usePhotoUpload';
import { useStudio } from '../studio/studio-context';
import { InlinePrice } from './InlinePrice';
import { InlineText } from './InlineText';
import { RowPhoto, openRowPhotoPicker } from './RowPhoto';
import { StatusCell } from './StatusCell';
import {
  CELL_CHECK, CELL_CHECK_HOVER, CELL_EYE, CELL_GRIP, CELL_LINE2, CELL_LINE2_SEL, CELL_MENU, CELL_MENU_SEL, CELL_NAME,
  CELL_NAME_SEL, CELL_PHOTO, CELL_PHOTO_SEL, CELL_PRICE, CELL_STATUS, FROM_MEDIUM, ONLY_FULL, ONLY_MEDIUM, ROW_BASE,
  ROW_FULL, ROW_MEDIUM, ROW_NARROW, ROW_NARROW_SELECTING,
} from './row-layout';

/**
 * One item in the outline (spec §7.7). Three container-query tiers from
 * `row-layout.ts`; the same cells move between them. Click map:
 *  - name: inline rename (fine pointer) / open the item (touch);
 *  - description line, row background: open the item;
 *  - photo: pick a file (empty) / open the item at its photo;
 *  - price: inline price; switch / Göster / eye: availability.
 * Pending quick-adds (`tmp_…`) are dimmed; a failed one offers Tekrar dene / Sil.
 *
 * Organise (chunk 3): a drag grip (fine pointers, hover; touch: "Sırala" mode,
 * where ⋯ becomes the grip and line 2 holds ↑ / ↓), and selection — a
 * checkbox column, a row click toggles, Shift+click selects the range; inline
 * edits are off meanwhile, the availability switch stays usable.
 */
export const ItemRow = memo(function ItemRow({
  item, categoryId, categoryVisible, feedback, pending, completion, index, count, dndEnabled, reorderMode,
  selecting, selected,
}: {
  item: MenuItemView;
  categoryId: string;
  categoryVisible: boolean;
  feedback?: RowFeedback;
  pending?: PendingCreate;
  completion: 'noPhoto' | 'noDescription' | null;
  /** Position among the category's saved items (for ↑ / ↓). */
  index: number;
  count: number;
  dndEnabled: boolean;
  reorderMode: boolean;
  selecting: boolean;
  selected: boolean;
}) {
  const {
    copy, isTr, readOnly, canEdit, finePointer, actions, openItem, registerNameCell, openNameCell,
    focusAfterRemoval, toggleSelect, startSelection, openMoveDialog, moveItemBy, categoryCount,
    openPriceCell, openItemId,
  } = useStudio();
  const shiftClick = useRef(false);
  const pickPhoto = useRef<((file: File) => void) | null>(null);
  const temp = isTempId(item.id);
  const editable = canEdit && !temp;
  const badge = rowBadge(item, { isVisible: categoryVisible });
  // The row whose item is open in the panel: lime edge + tint, so the panel and its row read as one.
  const open = !temp && openItemId === item.id;
  const lang = isTr ? 'tr' : 'en';
  const registerName = useCallback((open: () => void) => registerNameCell(item.id, open), [registerNameCell, item.id]);
  const sortable = useSortable({ id: item.id, disabled: !dndEnabled || temp });
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = sortable;
  const style: CSSProperties | undefined = transform
    ? { transform: CSS.Translate.toString(transform), transition }
    : undefined;
  const arranging = reorderMode && !finePointer && canEdit && !temp;
  const cells = selecting
    ? { photo: CELL_PHOTO_SEL, name: CELL_NAME_SEL, line2: CELL_LINE2_SEL, menu: CELL_MENU_SEL }
    : { photo: CELL_PHOTO, name: CELL_NAME, line2: CELL_LINE2, menu: CELL_MENU };

  const onRowClick = (e: MouseEvent<HTMLLIElement>) => {
    if (temp) return;
    const target = e.target as Element;
    if (selecting) {
      if (target.closest('a,input,textarea,select,label,[role=menu],[role=switch],[data-no-open],[data-row-control]')) return;
      toggleSelect(item.id, { range: e.shiftKey });
      return;
    }
    if (target.closest('button,a,input,textarea,select,label,[role=menu],[role=switch],[data-no-open]')) return;
    openItem(item.id);
  };
  const checkbox = (
    <div data-row-control="" onClickCapture={(e) => (shiftClick.current = e.shiftKey)}>
      <APCheckbox
        size="sm"
        checked={selected}
        disabled={temp}
        onChange={() => (selecting ? toggleSelect(item.id, { range: shiftClick.current }) : startSelection([item.id]))}
        ariaLabel={copy.item.selectAria(item.name)}
        className="min-h-11 min-w-11 items-center justify-center pointer-fine:min-h-8 pointer-fine:min-w-5"
      />
    </div>
  );
  const grip = (className: string) => (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      data-row-control=""
      aria-label={copy.item.dragAria(item.name)}
      className={`flex cursor-grab touch-none items-center justify-center rounded-[10px] text-[#A3A3A3] hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent active:cursor-grabbing ${className}`}
    >
      <GripVertical size={14} strokeWidth={2} />
    </button>
  );

  const remove = () => {
    focusAfterRemoval(item.id);
    void actions.deleteItem(item.id);
  };
  const duplicate = async () => {
    const r = await actions.duplicateItem(item.id);
    if (r.ok && r.copyId && finePointer) {
      const copyId = r.copyId;
      requestAnimationFrame(() => requestAnimationFrame(() => openNameCell(copyId)));
    }
  };

  const hiddenBadge =
    badge === 'categoryHidden' ? (
      <Badge kind="off" className="shrink-0">
        <EyeOff size={11} strokeWidth={2} aria-hidden="true" /> {copy.category.categoryHidden}
      </Badge>
    ) : badge === 'hidden' ? (
      <Badge kind="off" className="shrink-0">{copy.item.hidden}</Badge>
    ) : null;

  const nameClass =
    'font-body text-[14.5px] font-medium leading-5 text-pn-ink line-clamp-2 break-words pointer-coarse:text-[15px] pointer-coarse:font-medium pointer-fine:@min-[480px]/outline:line-clamp-1';
  const description = item.description?.trim();
  // Studio rows stay calm: one neutral badge and a count (the public menu keeps the tints).
  const shownBadges = item.badges as MenuBadge[];
  const allergenCount = item.allergens?.length ?? 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      id={`menu-row-li-${item.id}`}
      data-item-id={item.id}
      data-category-id={categoryId}
      data-dropzone=""
      aria-busy={pending?.status === 'saving' || undefined}
      onClick={onRowClick}
      // Shift+click selects a range of rows, not the text between them.
      onMouseDown={(e) => {
        if (selecting && e.shiftKey) e.preventDefault();
      }}
      onDragOver={(e) => {
        if (editable && e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!editable) return;
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        e.preventDefault();
        pickPhoto.current?.(file);
      }}
      onPaste={(e) => {
        if (!editable || (e.target as Element).closest('input,textarea')) return;
        const file = e.clipboardData.files?.[0];
        if (!isImageFile(file)) return;
        e.preventDefault();
        pickPhoto.current?.(file);
      }}
      aria-current={open ? 'true' : undefined}
      className={`group/row relative ${open ? 'bg-[#F6F3FD] shadow-[inset_3px_0_0_#111110]' : selected ? 'bg-[#F6F3FD]' : 'bg-white'} ${ROW_BASE} ${
        selecting ? ROW_NARROW_SELECTING : ROW_NARROW
      } ${ROW_MEDIUM} ${ROW_FULL} ${temp ? '' : `cursor-pointer ${selected || open ? '' : 'hover:bg-[#FCFCFC]'}`} ${
        pending?.status === 'saving' ? 'opacity-60' : ''
      } ${pending?.status === 'error' ? 'bg-[#FEF2F2]/60 shadow-[inset_2px_0_0_#DC2626]' : ''} ${
        isDragging ? 'z-10 opacity-40' : ''
      }`}
    >
      {selecting ? (
        <div className={CELL_CHECK}>{checkbox}</div>
      ) : (
        canEdit && !temp && finePointer && <div className={CELL_CHECK_HOVER}>{checkbox}</div>
      )}
      {!selecting && dndEnabled && finePointer && !temp && <div className={CELL_GRIP}>{grip('h-8 w-5')}</div>}

      <div className={cells.photo}>
        {temp ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-pn-line bg-pn-canvas pointer-fine:@min-[480px]/outline:h-10 pointer-fine:@min-[480px]/outline:w-10">
            {pending?.status === 'saving' && <Loader2 size={14} className="animate-spin text-[#737373]" aria-hidden="true" />}
          </span>
        ) : (
          <RowPhoto
            itemId={item.id}
            name={item.name}
            imageUrl={item.imageUrl}
            editable={editable}
            completion={completion === 'noPhoto'}
            onOpenAtPhoto={() => openItem(item.id, 'photo')}
            pickRef={pickPhoto}
          />
        )}
      </div>

      <div className={cells.name}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {temp ? (
            <span className={nameClass}>{item.name}</span>
          ) : selecting ? (
            <button
              type="button"
              id={`menu-row-${item.id}`}
              data-row-focus=""
              aria-keyshortcuts={ROW_ARIA_KEYS}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelect(item.id, { range: e.shiftKey });
              }}
              aria-pressed={selected}
              className="min-w-0 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
            >
              <span className={nameClass}>{item.name}</span>
            </button>
          ) : finePointer && editable ? (
            <InlineText
              value={item.name}
              label={copy.item.name}
              maxLength={120}
              editable
              displayId={`menu-row-${item.id}`}
              rowFocus
              displayClassName={nameClass}
              registerOpen={registerName}
              onCommit={(name) => void actions.renameItem(item.id, name)}
              // Spreadsheet flow (§8.1): Tab from the name opens this row's price.
              onTabNext={() => openPriceCell(item.id, 0)}
            />
          ) : (
            <button
              type="button"
              id={`menu-row-${item.id}`}
              data-row-focus=""
              aria-keyshortcuts={ROW_ARIA_KEYS}
              onClick={() => openItem(item.id)}
              aria-label={copy.item.openAria(item.name)}
              className="min-w-0 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
            >
              <span className={nameClass}>{item.name}</span>
            </button>
          )}
          {hiddenBadge}
          {badge === 'soldOut' && (
            <Badge kind="warn" className={`shrink-0 ${ONLY_MEDIUM}`}>
              {copy.item.soldOut}
            </Badge>
          )}
        </div>
        {!temp && (
          <div className={`mt-0.5 min-w-0 ${completion === 'noDescription' ? 'block' : FROM_MEDIUM}`}>
            <div className="flex min-w-0 items-center gap-2">
              {description ? (
                <button
                  type="button"
                  onClick={() => openItem(item.id, 'description')}
                  className="min-w-0 flex-1 truncate text-left text-[13px] text-[#737373] hover:text-pn-ink"
                >
                  {description}
                </button>
              ) : canEdit ? (
                <button
                  type="button"
                  onClick={() => openItem(item.id, 'description')}
                  className={`min-h-11 shrink-0 text-left text-[13px] pointer-fine:min-h-0 ${
                    completion === 'noDescription' ? 'font-medium text-pn-ink underline underline-offset-2' : 'text-[#A3A3A3] hover:text-[#525252]'
                  }`}
                >
                  + {copy.item.addDescription}
                </button>
              ) : null}
              {shownBadges.length > 0 && (
                <span className={`h-5 shrink-0 items-center gap-1 rounded-full bg-pn-canvas px-2 text-[12px] font-medium text-[#525252] ${ONLY_FULL}`}>
                  {BADGE_LABELS[shownBadges[0]]?.[lang] ?? shownBadges[0]}
                  {shownBadges.length > 1 && <span className="tabular-nums text-[#737373]">+{shownBadges.length - 1}</span>}
                </span>
              )}
              {allergenCount > 0 && (
                <span className={`shrink-0 text-[12px] text-[#737373] ${ONLY_FULL}`}>
                  {copy.fmt.allergenCount(allergenCount)}
                </span>
              )}
            </div>
          </div>
        )}
        {temp && pending?.status === 'error' && (
          <div className="mt-1 flex flex-wrap items-center gap-2" data-no-open="">
            <p role="alert" className="text-[12px] text-[#991B1B]">{pending.message}</p>
            <button type="button" onClick={() => actions.retryCreate(item.id)} className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8">
              <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
              {copy.outline.pendingRetry}
            </button>
            <button type="button" onClick={() => actions.discardCreate(item.id)} className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8">
              <X size={13} strokeWidth={2} aria-hidden="true" />
              {copy.outline.pendingDiscard}
            </button>
          </div>
        )}
      </div>

      <div className={cells.line2}>
        {arranging ? (
          <div className="flex items-center gap-2" data-row-control="">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => moveItemBy(item.id, -1)}
              aria-label={`${copy.item.moveUp}: ${item.name}`}
              className="bz-btn-icon h-11 w-11 disabled:opacity-30"
            >
              <ArrowUp size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={index >= count - 1}
              onClick={() => moveItemBy(item.id, 1)}
              aria-label={`${copy.item.moveDown}: ${item.name}`}
              className="bz-btn-icon h-11 w-11 disabled:opacity-30"
            >
              <ArrowDown size={16} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            <div className={CELL_PRICE}>
              <InlinePrice
                itemId={item.id}
                cents={item.priceCents}
                currency={item.currency}
                name={item.name}
                editable={editable && !selecting}
                errorMessage={feedback?.state === 'error' ? feedback.message : undefined}
              />
            </div>
            <div className={CELL_STATUS}>
              {temp ? (
                pending?.status === 'saving' ? <span className="text-[13px] text-[#737373]">{copy.outline.pendingSaving}</span> : null
              ) : (
                <StatusCell item={item} disabled={!canEdit} saving={feedback?.state === 'saving'} />
              )}
            </div>
          </>
        )}
      </div>

      <div className={CELL_EYE}>
        {!temp && item.isAvailable && (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => void actions.hideItem(item.id)}
            aria-label={copy.item.hideAria(item.name)}
            title={`${copy.item.hide} (H)`}
            className="bz-btn-icon h-8 w-8 text-[#737373] transition-opacity disabled:opacity-40 pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:focus-visible:opacity-100"
          >
            {/* An action, not a state: the open eye at rest (the hidden state shows EyeOff in its badge). */}
            <Eye size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className={cells.menu}>
        {arranging && dndEnabled ? (
          grip('h-11 w-8')
        ) : !temp && (
          <PulseMenu
            className={`min-w-[220px] ${MENU_TOUCH}`}
            trigger={
              <button
                type="button"
                aria-label={copy.item.actionsAria(item.name)}
                className="bz-btn-icon h-11 w-11 pointer-fine:h-8 pointer-fine:w-8"
              >
                <MoreHorizontal size={16} strokeWidth={2} />
              </button>
            }
          >
            {readOnly ? (
              <PulseMenuItem icon={<Eye size={13} strokeWidth={2} />} onSelect={() => afterMenuCloses(() => openItem(item.id))}>
                {copy.item.view}
              </PulseMenuItem>
            ) : (
              <>
                <PulseMenuItem
                  icon={<PencilLine size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'E' : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('open') : undefined}
                  onSelect={() => afterMenuCloses(() => openItem(item.id))}
                >
                  {copy.item.details}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<ImagePlus size={13} strokeWidth={2} />}
                  onSelect={() => afterMenuCloses(() => openRowPhotoPicker(item.id))}
                >
                  {item.imageUrl ? copy.item.changePhoto : copy.item.addPhoto}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<Copy size={13} strokeWidth={2} />}
                  trailing={finePointer ? (isMac() ? '⌘D' : 'Ctrl+D') : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('duplicate') : undefined}
                  onSelect={() => void duplicate()}
                >
                  {copy.item.duplicate}
                </PulseMenuItem>
                <PulseMenuDivider />
                <PulseMenuItem
                  icon={<ArrowUp size={13} strokeWidth={2} />}
                  trailing={finePointer ? (isMac() ? '⌥↑' : 'Alt+↑') : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('moveUp') : undefined}
                  disabled={index <= 0}
                  onSelect={() => moveItemBy(item.id, -1)}
                >
                  {copy.item.moveUp}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<ArrowDown size={13} strokeWidth={2} />}
                  trailing={finePointer ? (isMac() ? '⌥↓' : 'Alt+↓') : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('moveDown') : undefined}
                  disabled={index >= count - 1}
                  onSelect={() => moveItemBy(item.id, 1)}
                >
                  {copy.item.moveDown}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<FolderInput size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'M' : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('move') : undefined}
                  disabled={categoryCount < 2}
                  onSelect={() => afterMenuCloses(() => openMoveDialog([item.id]))}
                >
                  {copy.item.moveToCategory}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={item.isAvailable ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'H' : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('toggleHidden') : undefined}
                  onSelect={() => void (item.isAvailable ? actions.hideItem(item.id) : actions.showItem(item.id))}
                >
                  {item.isAvailable ? copy.item.hide : copy.item.show}
                </PulseMenuItem>
                <PulseMenuItem
                  icon={<CheckSquare size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'X' : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('select') : undefined}
                  onSelect={() => (selecting ? toggleSelect(item.id) : startSelection([item.id]))}
                >
                  {copy.item.select}
                </PulseMenuItem>
                <PulseMenuDivider />
                <PulseMenuItem
                  danger
                  icon={<Trash2 size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'Del' : undefined}
                  ariaKeyShortcuts={finePointer ? ariaKeysFor('delete') : undefined}
                  onSelect={remove}
                >
                  {copy.item.delete}
                </PulseMenuItem>
              </>
            )}
          </PulseMenu>
        )}
      </div>
    </li>
  );
});

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
