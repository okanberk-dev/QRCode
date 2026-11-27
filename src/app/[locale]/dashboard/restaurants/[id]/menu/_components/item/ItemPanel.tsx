'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Copy, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { AlertBanner, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import type { UndoRun } from '../data/useMenuActions';
import { Sheet } from '../kit/Sheet';
import {
  buildCreatePayload, buildEditPatch, checkPrice, initialItemFormValues, isItemFormDirty, nextItemFormValues,
  type ItemFormValues,
} from '../menu-item-form';
import type { ItemDraftOverlay } from '../menu-merge';
import type { CategoryShape, ItemTarget } from '../menu-types';
import { MENU_TOUCH, afterMenuCloses, useIsSmUp } from '../menu-ui';
import { useStudio } from '../studio/studio-context';
import { ItemForm } from './ItemForm';

export interface ItemPanelSaved {
  itemId?: string;
  name: string;
  undo?: UndoRun;
  moved?: boolean;
  categoryId?: string;
}

/**
 * The form of one panel instance, kept by the page so a remount that is not a
 * new open (the 1024px breakpoint flips docked ⇄ sheet) seeds the new panel
 * with what was typed. `key` names the instance; a new open gets a new key.
 */
export interface ItemPanelDraft {
  key: string;
  initial: ItemFormValues;
  values: ItemFormValues;
}

/**
 * Add / edit one item (spec §7.8). `docked`: the right column's "Ürün" tab
 * (≥1024) — the outline stays usable next to it. `sheet`: a right (tablet) or
 * bottom (phone) sheet with its own "Düzenle / Önizle" switch.
 *
 * Every close path (X, Vazgeç, Esc, backdrop, prev / next, another row, …)
 * goes through the page, which asks first when the form has unsaved changes;
 * the question renders in place (`leaveConfirm`) because nothing outside a
 * Radix modal is clickable while it is open.
 */
export function ItemPanel({
  target, presentation, categories, visibleIds, readOnly, focusField, onRequestClose, onSaved, onGone,
  onNavigate, onDraftChange, onDirtyChange, leaveConfirm, sheetTab = 'edit', onSheetTab, preview, draftStash, draftKey,
}: {
  target: ItemTarget;
  presentation: 'docked' | 'sheet';
  categories: CategoryShape[];
  visibleIds: string[];
  readOnly: boolean;
  focusField?: 'photo' | 'description';
  onRequestClose: () => void;
  /** Saved (or nothing to save): close without asking. `null` = closed with no change. */
  onSaved: (saved: ItemPanelSaved | null) => void;
  /** The edited item no longer exists. */
  onGone: () => void;
  onNavigate: (itemId: string) => void;
  onDraftChange: (draft: ItemDraftOverlay | null) => void;
  onDirtyChange: (dirty: boolean) => void;
  leaveConfirm: { onConfirm: () => void; onCancel: () => void } | null;
  sheetTab?: 'edit' | 'preview';
  onSheetTab?: (tab: 'edit' | 'preview') => void;
  /** Sheet "Önizle" tab content (owns the preview slot while shown). */
  preview?: ReactNode;
  /** Page-held copy of this instance's form (see `ItemPanelDraft`). */
  draftStash?: MutableRefObject<ItemPanelDraft | null>;
  draftKey?: string;
}) {
  const { copy, isTr, isPublished, canEdit, finePointer, actions, toaster } = useStudio();
  const smUp = useIsSmUp();

  const owner = target.mode === 'edit' ? categories.find((c) => c.items.some((i) => i.id === target.itemId)) : undefined;
  const item = owner && target.mode === 'edit' ? owner.items.find((i) => i.id === target.itemId) : undefined;
  // Same instance remounted in the other presentation: keep its baseline and what was typed.
  const [restored] = useState<ItemPanelDraft | null>(() =>
    draftStash && draftKey && draftStash.current?.key === draftKey ? draftStash.current : null,
  );
  const [initial] = useState<ItemFormValues>(
    () =>
      restored?.initial ??
      initialItemFormValues(
        target.mode,
        target.mode === 'edit' && item ? { ...item, categoryId: owner?.id } : { categoryId: target.mode === 'create' ? target.categoryId : undefined },
        categories[0]?.id ?? '',
        isTr,
      ),
  );
  const [values, setValues] = useState<ItemFormValues>(() => restored?.values ?? initial);
  useEffect(() => {
    if (draftStash && draftKey) draftStash.current = { key: draftKey, initial, values };
  }, [draftStash, draftKey, initial, values]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ name: string; undoId: string | null } | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const photoRef = useRef<HTMLButtonElement | null>(null);

  const currency = (item?.currency || 'TRY').toUpperCase();
  const editable = !readOnly;
  const dirty = editable && isItemFormDirty(target.mode, initial, values);

  useEffect(() => {
    if (target.mode === 'edit' && !item) onGone();
  }, [target, item, onGone]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  // Preview overlay of the unsaved draft (debounced; nothing is sent).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDraftChange({
        mode: target.mode,
        itemId: target.mode === 'edit' ? target.itemId : undefined,
        categoryId: values.categoryId,
        values,
        fallbackName: target.mode === 'edit' ? (item?.name ?? '') : copy.item.newItem,
        currency,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [values, target, item?.name, currency, copy.item.newItem, onDraftChange]);
  useEffect(() => () => onDraftChange(null), [onDraftChange]);

  const focusTarget = useCallback((): HTMLElement | null => {
    if (focusField === 'photo') return photoRef.current;
    if (focusField === 'description') return descriptionRef.current;
    if (target.mode === 'create' && finePointer && editable) return nameRef.current;
    return titleRef.current;
  }, [focusField, target.mode, finePointer, editable]);
  const initialFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (presentation !== 'docked') return;
    const el = focusTarget();
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  }, [presentation, focusTarget]);

  const patch = useCallback((change: Partial<ItemFormValues>) => {
    setValues((v) => ({ ...v, ...change }));
    if ('name' in change) setNameError(null);
    if ('price' in change) setPriceError(null);
  }, []);

  const save = async (addAnother: boolean) => {
    if (!editable || saving) return;
    if (uploading) return setFormError(copy.photo.waitUpload);
    const name = values.name.replace(/\s+/g, ' ').trim();
    if (!name) {
      setNameError(copy.item.nameRequired);
      nameRef.current?.focus();
      return;
    }
    const price = checkPrice(values.price);
    if (price.kind !== 'ok') {
      setPriceError(price.kind === 'empty' ? copy.item.priceRequired : copy.item.priceInvalid);
      priceRef.current?.focus();
      return;
    }
    const current = { ...values, name, imageUrl: values.imageUrl?.trim() || null };
    setFormError(null);
    if (target.mode === 'create') {
      setSaving(true);
      const r = await actions.createItem({ ...buildCreatePayload(current, price.cents), currency: 'TRY' });
      setSaving(false);
      if (!r.ok) return setFormError(r.message);
      if (addAnother) {
        const undoId = r.undo ? toaster.pushUndo(copy.fmt.toast.itemAdded(name), r.undo) : null;
        setNotice({ name, undoId });
        setValues((v) => nextItemFormValues(v));
        setNameError(null);
        setPriceError(null);
        if (finePointer) nameRef.current?.focus();
        return;
      }
      onSaved({ itemId: r.item?.id, name, undo: r.undo, categoryId: current.categoryId });
      return;
    }
    const editPatch = buildEditPatch(initial, current);
    if (Object.keys(editPatch).length === 0) return onSaved(null);
    setSaving(true);
    const r = await actions.updateItem(target.itemId, editPatch);
    setSaving(false);
    if (!r.ok) return setFormError(r.message);
    onSaved({ itemId: target.itemId, name: r.item?.name ?? name, undo: r.undo, moved: r.moved, categoryId: current.categoryId });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void save(false);
    } else if (
      e.key === 'Escape' &&
      presentation === 'docked' &&
      !leaveConfirm &&
      // Esc already handled by an inner layer (⋯ menu, a portaled popover) closes only that layer.
      !e.defaultPrevented &&
      e.currentTarget.contains(e.target as Node)
    ) {
      e.preventDefault();
      onRequestClose();
    }
  };

  const index = target.mode === 'edit' ? visibleIds.indexOf(target.itemId) : -1;
  const prevId = index > 0 ? visibleIds[index - 1] : null;
  const nextId = index !== -1 && index < visibleIds.length - 1 ? visibleIds[index + 1] : null;
  const categoryName = categories.find((c) => c.id === values.categoryId)?.name ?? '';

  const title =
    target.mode === 'create' ? (
      <span className="bz-h-tight [word-spacing:0.1em] text-[18px]">{copy.item.newItem}</span>
    ) : (
      <>
        <span className="sr-only">{copy.item.editPrefix} </span>
        <span className="truncate font-body text-[17px] font-medium tracking-[-0.01em]">{item?.name}</span>
      </>
    );

  const navButtons =
    target.mode === 'edit' ? (
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          disabled={!prevId}
          onClick={() => prevId && onNavigate(prevId)}
          aria-label={copy.item.prev}
          className="bz-btn-icon h-11 w-11 disabled:opacity-30 pointer-fine:h-8 pointer-fine:w-8"
        >
          <ChevronUp size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={!nextId}
          onClick={() => nextId && onNavigate(nextId)}
          aria-label={copy.item.next}
          className="bz-btn-icon h-11 w-11 disabled:opacity-30 pointer-fine:h-8 pointer-fine:w-8"
        >
          <ChevronDown size={16} strokeWidth={2} />
        </button>
        {canEdit && (
          <PulseMenu
            className={`min-w-[220px] ${MENU_TOUCH}`}
            trigger={
              <button type="button" aria-label={copy.item.actions} className="bz-btn-icon h-11 w-11 pointer-fine:h-8 pointer-fine:w-8">
                <MoreHorizontal size={16} strokeWidth={2} />
              </button>
            }
          >
            <PulseMenuItem icon={<Copy size={13} strokeWidth={2} />} onSelect={() => void actions.duplicateItem(target.itemId)}>
              {copy.item.duplicate}
            </PulseMenuItem>
            <PulseMenuDivider />
            <PulseMenuItem
              danger
              icon={<Trash2 size={13} strokeWidth={2} />}
              onSelect={() =>
                afterMenuCloses(() => {
                  const id = target.itemId;
                  onSaved(null);
                  void actions.deleteItem(id);
                })
              }
            >
              {copy.item.delete}
            </PulseMenuItem>
          </PulseMenu>
        )}
      </div>
    ) : null;

  const noticeNode = notice ? (
    <div role="status" className="flex items-center gap-2 rounded-[20px] border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[13px] font-medium text-[#166534]">
      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{copy.fmt.itemAddedNotice(notice.name)}</span>
      {notice.undoId && (
        <button
          type="button"
          onClick={() => {
            const id = notice.undoId;
            setNotice(null);
            if (id) void toaster.undoById(id);
          }}
          className="-my-3 inline-flex min-h-11 shrink-0 items-center px-2 font-medium underline underline-offset-2 pointer-fine:my-0 pointer-fine:min-h-0 pointer-fine:px-0"
        >
          {copy.save.undo}
        </button>
      )}
    </div>
  ) : null;

  const form = (
    <ItemForm
      mode={target.mode}
      values={values}
      onChange={patch}
      currency={currency}
      categories={categories}
      readOnly={!editable}
      nameError={nameError}
      priceError={priceError}
      onEnterSave={(addAnother) => void save(addAnother)}
      nameRef={nameRef}
      priceRef={priceRef}
      descriptionRef={descriptionRef}
      photoRef={photoRef}
      onUploadingChange={setUploading}
      notice={noticeNode}
    />
  );

  const footer = (
    <div className="space-y-2">
      {formError && (
        <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
          {formError}
        </AlertBanner>
      )}
      {isPublished && editable && (
        <p className="flex items-center gap-1.5 text-[12px] text-[#525252]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
          {copy.item.saveLiveHint}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!editable ? (
          <button type="button" onClick={onRequestClose} className="bz-btn-ghost">
            {copy.item.close}
          </button>
        ) : (
          <>
            <button type="button" onClick={onRequestClose} className="bz-btn-ghost">
              {copy.item.cancel}
            </button>
            {target.mode === 'create' && (
              <button type="button" onClick={() => void save(true)} disabled={saving || uploading} className="bz-btn-ghost">
                {copy.item.saveAndAdd}
              </button>
            )}
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={saving || uploading}
              aria-busy={saving || undefined}
              title={uploading ? copy.photo.waitUpload : undefined}
              className="bz-btn-primary"
            >
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {saving ? copy.item.saving : copy.item.save}
            </button>
          </>
        )}
      </div>
    </div>
  );

  const confirm = leaveConfirm ? (
    <div
      role="alertdialog"
      aria-labelledby="item-leave-title"
      aria-describedby="item-leave-body"
      className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-[320px] text-center">
        <p id="item-leave-title" className="bz-h-tight [word-spacing:0.1em] text-[16px] text-pn-ink">
          {copy.dialogs.leaveTitle}
        </p>
        <p id="item-leave-body" className="mt-2 text-[13px] leading-relaxed text-[#525252]">
          {copy.dialogs.leaveBody}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" autoFocus onClick={leaveConfirm.onCancel} className="bz-btn-ghost flex-1">
            {copy.dialogs.keepEditing}
          </button>
          <button type="button" onClick={leaveConfirm.onConfirm} className="bz-btn-danger flex-1">
            {copy.dialogs.leave}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const meta = (
    <p className="truncate text-[12px] text-[#737373]">
      {categoryName ? `${categoryName} · ` : ''}
      {isPublished ? copy.item.liveMenu : copy.item.draftMenu}
    </p>
  );

  if (presentation === 'sheet') {
    return (
      <Sheet
        open
        side={smUp ? 'right' : 'bottom'}
        widthClass="sm:max-w-[520px]"
        onRequestClose={onRequestClose}
        title={title}
        initialFocusRef={initialFocusRef}
        headerExtra={
          <div className="flex shrink-0 items-center gap-1">
            <div role="tablist" aria-label={copy.view.label} className="inline-flex gap-0.5 rounded-[10px] bg-pn-canvas p-[3px]">
              {(['edit', 'preview'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={sheetTab === tab}
                  onClick={() => onSheetTab?.(tab)}
                  className={`min-h-[38px] rounded-[7px] px-3 text-[13px] font-medium ${
                    sheetTab === tab ? 'bg-white text-pn-ink shadow-[0_1px_2px_rgba(10,10,10,0.08),0_0_0_1px_rgba(10,10,10,0.04)]' : 'text-[#525252]'
                  }`}
                >
                  {tab === 'edit' ? copy.item.editTab : copy.item.previewTab}
                </button>
              ))}
            </div>
          </div>
        }
        footer={sheetTab === 'edit' ? footer : undefined}
        overlay={confirm}
        bodyClassName="@container flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div onKeyDown={onKeyDown} ref={(el) => {
          initialFocusRef.current = el ? focusTarget() : null;
        }}>
          <div className="mb-4 flex items-start gap-2">
            <div className="min-w-0 flex-1">{meta}</div>
            {navButtons}
          </div>
          <div hidden={sheetTab !== 'edit'}>{form}</div>
          {sheetTab === 'preview' && preview}
        </div>
      </Sheet>
    );
  }

  return (
    <section
      role="region"
      aria-labelledby="item-panel-title"
      onKeyDown={onKeyDown}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center gap-2 border-b border-pn-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id="item-panel-title" ref={titleRef} tabIndex={-1} className="flex min-w-0 items-center outline-none">
            {title}
          </h2>
          {meta}
        </div>
        {navButtons}
      </div>
      <div className="@container min-h-0 flex-1 overflow-y-auto px-4 py-5">{form}</div>
      <div className="border-t border-pn-line bg-white px-4 py-3">{footer}</div>
      {confirm}
    </section>
  );
}

/** Stable key for a panel instance (a new create form gets a fresh one). */
export function useItemPanelKey(target: ItemTarget | null, nonce: number): string | null {
  return useMemo(
    () => (target ? (target.mode === 'edit' ? `edit:${target.itemId}` : `create:${target.categoryId}:${nonce}`) : null),
    [target, nonce],
  );
}
