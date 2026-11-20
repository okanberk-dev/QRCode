'use client';

import { memo, useCallback, useRef, type MouseEvent } from 'react';
import { Copy, Eye, EyeOff, ImagePlus, Loader2, MoreHorizontal, PencilLine, RotateCcw, Trash2, X } from 'lucide-react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { Badge, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import type { PendingCreate, RowFeedback } from '../data/useMenuActions';
import { BADGE_LABELS, BADGE_TINTS } from '../menu-constants';
import { isTempId } from '../menu-merge';
import { rowBadge } from '../menu-status';
import { MENU_TOUCH, afterMenuCloses } from '../menu-ui';
import type { MenuBadge } from '@/lib/validations';
import { isImageFile } from '../data/usePhotoUpload';
import { useStudio } from '../studio/studio-context';
import { InlinePrice } from './InlinePrice';
import { InlineText } from './InlineText';
import { RowPhoto, openRowPhotoPicker } from './RowPhoto';
import { StatusCell } from './StatusCell';
import {
  CELL_EYE, CELL_LINE2, CELL_MENU, CELL_NAME, CELL_PHOTO, CELL_PRICE, CELL_STATUS, FROM_MEDIUM, ONLY_FULL,
  ONLY_MEDIUM, ROW_BASE, ROW_FULL, ROW_MEDIUM, ROW_NARROW,
} from './row-layout';

/**
 * One item in the outline (spec §7.7). Three container-query tiers from
 * `row-layout.ts`; the same cells move between them. Click map:
 *  - name: inline rename (fine pointer) / open the item (touch);
 *  - description line, row background: open the item;
 *  - photo: pick a file (empty) / open the item at its photo;
 *  - price: inline price; switch / Göster / eye: availability.
 * Pending quick-adds (`tmp_…`) are dimmed; a failed one offers Tekrar dene / Sil.
 */
export const ItemRow = memo(function ItemRow({
  item, categoryId: _categoryId, categoryVisible, feedback, pending, completion,
}: {
  item: MenuItemView;
  categoryId: string;
  categoryVisible: boolean;
  feedback?: RowFeedback;
  pending?: PendingCreate;
  completion: 'noPhoto' | 'noDescription' | null;
}) {
  const {
    copy, isTr, readOnly, canEdit, finePointer, actions, openItem, registerNameCell, openNameCell,
    focusAfterRemoval,
  } = useStudio();
  const pickPhoto = useRef<((file: File) => void) | null>(null);
  const temp = isTempId(item.id);
  const editable = canEdit && !temp;
  const badge = rowBadge(item, { isVisible: categoryVisible });
  const lang = isTr ? 'tr' : 'en';
  const registerName = useCallback((open: () => void) => registerNameCell(item.id, open), [registerNameCell, item.id]);

  const onRowClick = (e: MouseEvent<HTMLLIElement>) => {
    if (temp) return;
    const target = e.target as Element;
    if (target.closest('button,a,input,textarea,select,label,[role=menu],[role=switch],[data-no-open]')) return;
    openItem(item.id);
  };

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
    'font-body text-[14.5px] font-medium leading-5 text-[#0A0A0A] line-clamp-2 break-words pointer-coarse:text-[15px] pointer-coarse:font-semibold pointer-fine:@min-[480px]/outline:line-clamp-1';
  const description = item.description?.trim();
  const shownBadges = item.badges.slice(0, 2) as MenuBadge[];
  const allergenCount = item.allergens?.length ?? 0;

  return (
    <li
      id={`menu-row-li-${item.id}`}
      data-item-id={item.id}
      data-dropzone=""
      aria-busy={pending?.status === 'saving' || undefined}
      onClick={onRowClick}
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
      className={`group/row relative bg-white ${ROW_BASE} ${ROW_NARROW} ${ROW_MEDIUM} ${ROW_FULL} ${
        temp ? '' : 'cursor-pointer hover:bg-[#FCFCFC]'
      } ${pending?.status === 'saving' ? 'opacity-60' : ''} ${
        pending?.status === 'error' ? 'bg-[#FEF2F2]/60 shadow-[inset_2px_0_0_#DC2626]' : ''
      }`}
    >
      <div className={CELL_PHOTO}>
        {temp ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] pointer-fine:@min-[480px]/outline:h-10 pointer-fine:@min-[480px]/outline:w-10">
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

      <div className={CELL_NAME}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {temp ? (
            <span className={nameClass}>{item.name}</span>
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
            />
          ) : (
            <button
              type="button"
              id={`menu-row-${item.id}`}
              data-row-focus=""
              onClick={() => openItem(item.id)}
              aria-label={copy.item.openAria(item.name)}
              className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
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
                  className="min-w-0 truncate text-left text-[12.5px] text-[#737373] hover:text-[#0A0A0A]"
                >
                  {description}
                </button>
              ) : canEdit ? (
                <button
                  type="button"
                  onClick={() => openItem(item.id, 'description')}
                  className={`min-h-11 shrink-0 text-left text-[12.5px] pointer-fine:min-h-0 ${
                    completion === 'noDescription' ? 'font-semibold text-[#0A0A0A] underline underline-offset-2' : 'text-[#A3A3A3] hover:text-[#525252]'
                  }`}
                >
                  + {copy.item.addDescription}
                </button>
              ) : null}
              {shownBadges.map((b) => (
                <span
                  key={b}
                  className={`h-5 shrink-0 items-center rounded-full px-2 text-[11.5px] font-medium ${ONLY_FULL}`}
                  style={{ background: BADGE_TINTS[b]?.bg, color: BADGE_TINTS[b]?.fg }}
                >
                  {BADGE_LABELS[b]?.[lang] ?? b}
                </span>
              ))}
              {allergenCount > 0 && (
                <span className={`shrink-0 text-[11.5px] text-[#92400E] ${ONLY_FULL}`}>
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

      <div className={CELL_LINE2}>
        <div className={CELL_PRICE}>
          <InlinePrice
            itemId={item.id}
            cents={item.priceCents}
            currency={item.currency}
            name={item.name}
            editable={editable}
            errorMessage={feedback?.state === 'error' ? feedback.message : undefined}
          />
        </div>
        <div className={CELL_STATUS}>
          {temp ? (
            pending?.status === 'saving' ? <span className="text-[12.5px] text-[#737373]">{copy.outline.pendingSaving}</span> : null
          ) : (
            <StatusCell item={item} disabled={!canEdit} saving={feedback?.state === 'saving'} />
          )}
        </div>
      </div>

      <div className={CELL_EYE}>
        {!temp && item.isAvailable && (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => void actions.hideItem(item.id)}
            aria-label={copy.item.hideAria(item.name)}
            title={`${copy.item.hide} (H)`}
            className="bz-btn-icon h-8 w-8 disabled:opacity-40"
          >
            <EyeOff size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className={CELL_MENU}>
        {!temp && (
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
                  onSelect={() => void duplicate()}
                >
                  {copy.item.duplicate}
                </PulseMenuItem>
                <PulseMenuDivider />
                <PulseMenuItem
                  icon={item.isAvailable ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'H' : undefined}
                  onSelect={() => void (item.isAvailable ? actions.hideItem(item.id) : actions.showItem(item.id))}
                >
                  {item.isAvailable ? copy.item.hide : copy.item.show}
                </PulseMenuItem>
                <PulseMenuDivider />
                <PulseMenuItem
                  danger
                  icon={<Trash2 size={13} strokeWidth={2} />}
                  trailing={finePointer ? 'Del' : undefined}
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
