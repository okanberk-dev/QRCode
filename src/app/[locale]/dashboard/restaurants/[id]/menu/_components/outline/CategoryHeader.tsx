'use client';

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, CheckSquare, ChevronDown, CircleSlash, ClipboardPaste, Eye, EyeOff, ListOrdered,
  MoreHorizontal, PencilLine, Percent, Plus, Text, Trash2,
} from 'lucide-react';
import { APSwitch, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import { isTempId } from '../menu-merge';
import type { CategoryShape } from '../menu-types';
import { MENU_TOUCH, afterMenuCloses } from '../menu-ui';
import { useStudio } from '../studio/studio-context';
import { InlineText } from './InlineText';
import { isDuplicateCategoryName } from './NewCategoryRow';

const DESCRIPTION_MAX = 300;

/**
 * Section header (spec §7.7): collapse, name (inline rename on fine pointers,
 * through ⋯ on touch), item count, "Menüde" switch and the ⋯ menu. Category
 * names are owner text: Inter on an inner element (the unlayered heading
 * rule beats utilities on the h3 itself, §15.3).
 */
export function CategoryHeader({
  category, collapsed, onToggleCollapse, sectionBodyId, index, total,
}: {
  category: CategoryShape;
  collapsed: boolean;
  onToggleCollapse: () => void;
  sectionBodyId: string;
  /** Position in the menu; -1 while filtering (no up / down then). */
  index: number;
  total: number;
}) {
  const {
    copy, canEdit, finePointer, mode, actions, getCategories, focusQuickAdd, askConfirm, openPasteSheet, openBulkPrice,
    startSelection, moveCategoryBy, openCategoryOrder,
  } = useStudio();
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [descFocused, setDescFocused] = useState(false);
  const openRename = useRef<(() => void) | null>(null);
  const registerRename = useCallback((open: () => void) => {
    openRename.current = open;
    return () => {
      openRename.current = null;
    };
  }, []);

  const items = category.items.filter((i) => !isTempId(i.id));
  const soldOut = items.filter((i) => i.isAvailable && i.isOutOfStock).length;
  const ids = items.map((i) => i.id);
  const service = mode === 'service';

  const validateName = (next: string) => {
    if (next.length > 80) return copy.category.nameTooLong;
    if (isDuplicateCategoryName(next, getCategories(), category.id)) return copy.category.duplicate;
    return null;
  };

  const startDescription = () => {
    setDescription(category.description ?? '');
    setEditingDescription(true);
  };
  const saveDescription = () => {
    setEditingDescription(false);
    const next = description.trim() || null;
    if (next !== (category.description?.trim() || null)) void actions.setCategoryDescription(category.id, next);
  };
  // Keyboard close of the description editor returns focus to the section ⋯ (never <body>).
  const actionsRef = useRef<HTMLButtonElement | null>(null);
  const refocusActions = () => requestAnimationFrame(() => actionsRef.current?.focus());
  const onDescKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditingDescription(false);
      refocusActions();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveDescription();
      refocusActions();
    }
  };

  const remove = async () => {
    const run = async (deleteItems: boolean) => {
      const r = await actions.deleteCategory(category.id, { deleteItems });
      if (!r.ok && r.code === 'CATEGORY_NOT_EMPTY') confirmWithItems(r.itemCount ?? items.length);
      else if (r.ok && r.neighbourId) {
        const next = r.neighbourId;
        requestAnimationFrame(() => document.getElementById(`menu-section-toggle-${next}`)?.focus());
      }
    };
    const confirmWithItems = (n: number) =>
      askConfirm({
        title: copy.fmt.deleteCategoryWithItemsTitle(category.name, n),
        body: copy.category.deleteWithItemsBody,
        confirmLabel: copy.category.deleteWithItems,
        cancelLabel: copy.dialogs.cancel,
        variant: 'danger',
        onConfirm: () => run(true),
      });
    if (items.length > 0) confirmWithItems(items.length);
    else await run(false);
  };

  const nameClass = 'font-body text-[16px] font-medium tracking-[-0.01em] text-pn-ink break-words';

  return (
    <div className="border-b border-pn-line">
      <div className="flex min-h-[52px] items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          id={`menu-section-toggle-${category.id}`}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-controls={sectionBodyId}
          aria-label={collapsed ? copy.category.expandAria(category.name) : copy.category.collapseAria(category.name)}
          className="bz-btn-icon h-11 w-11 shrink-0 pointer-fine:h-8 pointer-fine:w-8"
        >
          <ChevronDown size={16} strokeWidth={2} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <h3 id={`menu-section-title-${category.id}`} className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <InlineText
            value={category.name}
            label={copy.category.name}
            maxLength={80}
            editable={canEdit && finePointer && !service}
            displayClassName={nameClass}
            validate={validateName}
            registerOpen={registerRename}
            showButtons={!finePointer}
            onCommit={(name) => void actions.renameCategory(category.id, name)}
          />
          <span className="whitespace-nowrap font-body text-[12px] font-normal tracking-normal tabular-nums text-[#737373]">
            {copy.fmt.itemCount(items.length)}
            {soldOut > 0 ? ` · ${copy.fmt.soldOutCount(soldOut)}` : ''}
          </span>
        </h3>
        <APSwitch
          size="sm"
          checked={category.isVisible}
          disabled={!canEdit || service}
          onChange={(v) => void actions.setCategoryVisible(category.id, v)}
          ariaLabel={copy.category.visibleAria(category.name)}
          label={<span className="hidden text-[13px] font-medium text-[#525252] sm:inline">{copy.category.visible}</span>}
        />
        <PulseMenu
          className={`min-w-[220px] ${MENU_TOUCH}`}
          trigger={
            <button
              ref={actionsRef}
              type="button"
              disabled={!canEdit}
              aria-label={copy.category.actionsAria(category.name)}
              className="bz-btn-icon h-11 w-11 shrink-0 disabled:opacity-40 pointer-fine:h-8 pointer-fine:w-8"
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          }
        >
          {!service && (
            <>
              <PulseMenuItem icon={<PencilLine size={13} strokeWidth={2} />} onSelect={() => afterMenuCloses(() => openRename.current?.())}>
                {copy.category.rename}
              </PulseMenuItem>
              <PulseMenuItem icon={<Text size={13} strokeWidth={2} />} onSelect={() => afterMenuCloses(startDescription)}>
                {category.description ? copy.category.editDescription : copy.category.addDescription}
              </PulseMenuItem>
              <PulseMenuItem icon={<Plus size={13} strokeWidth={2} />} onSelect={() => afterMenuCloses(() => focusQuickAdd(category.id))}>
                {copy.category.addItemHere}
              </PulseMenuItem>
              <PulseMenuItem icon={<ClipboardPaste size={13} strokeWidth={2} />} onSelect={() => afterMenuCloses(() => openPasteSheet(category.id))}>
                {copy.category.pasteList}
              </PulseMenuItem>
              <PulseMenuDivider />
            </>
          )}
          <PulseMenuItem
            icon={<CheckCircle2 size={13} strokeWidth={2} />}
            disabled={soldOut === 0}
            onSelect={() => void actions.bulkSetFlags(ids, 'markAvailable')}
          >
            {copy.category.markAllAvailable}
          </PulseMenuItem>
          <PulseMenuItem
            icon={<CircleSlash size={13} strokeWidth={2} />}
            disabled={!items.some((i) => i.isAvailable && !i.isOutOfStock)}
            onSelect={() => void actions.bulkSetFlags(ids, 'markSoldOut')}
          >
            {copy.category.markAllSoldOut}
          </PulseMenuItem>
          {!service && (
            <>
              <PulseMenuItem
                icon={<Percent size={13} strokeWidth={2} />}
                disabled={ids.length === 0}
                onSelect={() => afterMenuCloses(() => openBulkPrice(ids))}
              >
                {copy.category.changePrices}
              </PulseMenuItem>
              <PulseMenuItem
                icon={<CheckSquare size={13} strokeWidth={2} />}
                disabled={ids.length === 0}
                onSelect={() => startSelection(ids)}
              >
                {copy.category.selectItems}
              </PulseMenuItem>
              <PulseMenuDivider />
              {index >= 0 && (
                <>
                  <PulseMenuItem
                    icon={<ArrowUp size={13} strokeWidth={2} />}
                    disabled={index <= 0}
                    onSelect={() => moveCategoryBy(category.id, -1)}
                  >
                    {copy.category.moveUp}
                  </PulseMenuItem>
                  <PulseMenuItem
                    icon={<ArrowDown size={13} strokeWidth={2} />}
                    disabled={index >= total - 1}
                    onSelect={() => moveCategoryBy(category.id, 1)}
                  >
                    {copy.category.moveDown}
                  </PulseMenuItem>
                </>
              )}
              <PulseMenuItem
                icon={<ListOrdered size={13} strokeWidth={2} />}
                disabled={total < 2 && index >= 0}
                onSelect={() => afterMenuCloses(openCategoryOrder)}
              >
                {copy.category.reorderCategories}
              </PulseMenuItem>
              <PulseMenuDivider />
              <PulseMenuItem
                icon={category.isVisible ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}
                onSelect={() => void actions.setCategoryVisible(category.id, !category.isVisible)}
              >
                {category.isVisible ? copy.category.hide : copy.category.show}
              </PulseMenuItem>
              <PulseMenuDivider />
              <PulseMenuItem danger icon={<Trash2 size={13} strokeWidth={2} />} onSelect={() => afterMenuCloses(() => void remove())}>
                {copy.category.delete}
              </PulseMenuItem>
            </>
          )}
        </PulseMenu>
      </div>
      {!category.isVisible && (
        <p className="flex items-center gap-1.5 px-4 pb-2 text-[12px] text-[#737373] sm:pl-[60px] pointer-fine:sm:pl-[52px]">
          <EyeOff size={12} strokeWidth={2} aria-hidden="true" />
          {copy.category.hiddenNote}
        </p>
      )}
      {editingDescription ? (
        <div className="px-4 pb-3">
          <textarea
            autoFocus
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={onDescKey}
            onFocus={() => setDescFocused(true)}
            onBlur={() => {
              setDescFocused(false);
              saveDescription();
            }}
            aria-label={copy.category.description}
            placeholder={copy.category.descriptionPlaceholder}
            className="bz-input min-h-[64px] resize-none text-[16px] sm:text-[13px]"
          />
          {descFocused && description.length > 250 && (
            <p className="mt-1 text-right text-[12px] text-[#737373]">
              {copy.fmt.descriptionCount(description.length, DESCRIPTION_MAX)}
            </p>
          )}
        </div>
      ) : category.description ? (
        <p className="px-4 pb-2.5 text-[13px] leading-snug text-[#525252] sm:pl-[60px] pointer-fine:sm:pl-[52px]">
          {category.description}
        </p>
      ) : null}
    </div>
  );
}
