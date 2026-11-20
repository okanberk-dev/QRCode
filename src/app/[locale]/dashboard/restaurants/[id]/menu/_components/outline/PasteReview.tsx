'use client';

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { AlertCircle, FolderPlus, Loader2, Pencil } from 'lucide-react';
import { APCheckbox, AlertBanner } from '@/components/ui';
import { MENU_BULK_MAX_ITEMS } from '@/lib/menu-bulk-parse';
import { formatPrice } from '@/lib/format';
import type { CommitPasteResult } from '../data/useMenuActions';
import type { ToasterApi } from '../kit/Toaster';
import type { MenuCopy } from '../menu-i18n';
import { currencySymbol } from '../menu-item-form';
import { pastePlan, revalidateRow, targetReadableCount, type PasteRow, type PasteRowError, type PasteSection } from '../menu-paste';
import { useStudio } from '../studio/studio-context';

/** Toast for a finished paste (+ undo), then scroll to and flash the first new row. */
export function announcePaste(
  r: CommitPasteResult,
  { copy, toaster, flashItem }: { copy: MenuCopy; toaster: ToasterApi; flashItem: (id: string) => void },
): void {
  const parts = [copy.fmt.toast.itemsAdded(r.itemsAdded)];
  if (r.categoriesDone > 0) parts.push(copy.fmt.toast.categoriesAdded(r.categoriesDone));
  toaster.notify({ message: parts.join(' · '), undo: r.undo });
  if (r.firstItemId) flashItem(r.firstItemId);
}

const reasonOf = (copy: MenuCopy, error: PasteRowError): string =>
  error === 'no_price' ? copy.paste.noPrice
    : error === 'no_name' ? copy.paste.noName
      : error === 'name_too_long' ? copy.paste.nameTooLong
        : copy.paste.badPrice;

/** Sections that go to the picked category (headerless lines, unticked headers). */
const intoTarget = (s: PasteSection) => s.header === null || !s.asCategory;
const readable = (s: PasteSection) => s.rows.filter((r) => r.error === null && r.priceCents !== null).length;

/**
 * Review of a pasted list before anything is created (spec §7.7 / §8.3):
 * every line with how it was read, header lines as "Yeni kategori: …"
 * (untick to add the items to the picked category instead), rows editable in
 * place, ≤30 items per category. "Ekle" creates the picked category's rows,
 * then each new category with its rows, and stops at the first failure: what
 * was created leaves the list, the rest stays with a banner.
 */
export function PasteReview({
  variant, initialSections, targetCategoryId, onDone, onCancel, onEdited, onDirtyChange,
}: {
  variant: 'inline' | 'sheet';
  initialSections: PasteSection[];
  targetCategoryId: string | null;
  onDone: (r: CommitPasteResult) => void;
  onCancel: () => void;
  /** The owner changed a row (the sheet then offers "Yeniden oku" instead of following the text). */
  onEdited?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { copy, isTr, actions, toaster } = useStudio();
  const [sections, setSections] = useState<PasteSection[]>(initialSections);
  const [edited, setEdited] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleId = useId();

  // An open review holds text that would be lost: the page's leave guard asks first.
  useEffect(() => {
    onDirtyChange?.(true);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const plan = useMemo(() => pastePlan(sections), [sections]);
  const items = plan.intoTarget.length + plan.newCategories.reduce((n, c) => n + c.items.length, 0);
  const unreadable = sections.reduce((n, s) => n + s.rows.filter((r) => r.error !== null).length, 0);
  const busy = progress !== null;
  const blockedByTarget = plan.intoTarget.length > 0 && !targetCategoryId;
  // Sections bound for the picked category merge, so the cap is checked on their sum.
  const targetOverLimit = targetReadableCount(sections) > MENU_BULK_MAX_ITEMS;

  const markEdited = () => {
    if (!edited) {
      setEdited(true);
      onEdited?.();
    }
  };
  const updateRow = (sectionId: string, rowId: string, patch: Partial<PasteRow>, revalidate: boolean) => {
    markEdited();
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              rows: s.rows.map((r) => {
                if (r.id !== rowId) return r;
                const next = { ...r, ...patch };
                return revalidate ? revalidateRow(next, isTr) : next;
              }),
            },
      ),
    );
  };
  const setAsCategory = (sectionId: string, on: boolean) => {
    markEdited();
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, asCategory: on } : s)));
  };

  const commit = async () => {
    if (items === 0 || blockedByTarget) return;
    setError(null);
    setProgress({ done: 0, total: items });
    const r = await actions.commitPaste({ targetCategoryId, plan }, (done, total) => setProgress({ done, total }));
    setProgress(null);
    if (r.ok) {
      onDone(r);
      return;
    }
    if (r.undo) toaster.pushUndo(copy.fmt.toast.itemsAdded(r.itemsAdded), r.undo);
    // What was created leaves the list; the rest stays for "Tekrar dene".
    let created = r.categoriesDone;
    const rest = sections.filter((s) => {
      if (intoTarget(s)) return !r.targetDone || s.rows.some((row) => row.error !== null);
      if (readable(s) > 0 && created > 0) {
        created -= 1;
        return false;
      }
      return true;
    }).map((s) => (intoTarget(s) && r.targetDone ? { ...s, rows: s.rows.filter((row) => row.error !== null) } : s));
    setSections(rest);
    markEdited();
    const left = pastePlan(rest);
    const remaining = left.intoTarget.length + left.newCategories.reduce((n, c) => n + c.items.length, 0);
    setError([copy.fmt.paste.partial(remaining), r.message].filter(Boolean).join(' '));
  };

  const cancel = () => {
    if (edited && !busy) setConfirmDiscard(true);
    else onCancel();
  };

  const onRowKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingRow(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditingRow(null);
    }
  };

  const money = (cents: number) => formatPrice(cents, 'TRY', isTr ? 'tr-TR' : 'en-US');

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={variant === 'inline' ? 'space-y-3 bg-[#FCFCFC] px-3 py-3' : 'space-y-3'}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !editingRow && variant === 'inline') {
          e.stopPropagation();
          cancel();
        }
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id={titleId} className="text-[14px]">
          <span className="bz-h-tight">{copy.paste.preview}</span>
        </h4>
        <p className="text-[12.5px] text-[#525252]" aria-live="polite">
          {copy.fmt.paste.willAdd(items)}
          {unreadable > 0 && <span className="text-[#92400E]"> · {copy.fmt.paste.unreadable(unreadable)}</span>}
        </p>
      </div>

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {targetOverLimit && (
        <p className="text-[12px] text-[#92400E]">{copy.fmt.paste.overLimitNote(MENU_BULK_MAX_ITEMS)}</p>
      )}

      <div className="max-h-[50dvh] space-y-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.id} className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white">
            {section.header !== null && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[#EDEDED] bg-[#FAFAFA] px-3 py-2">
                <FolderPlus size={14} strokeWidth={2} className="shrink-0 text-[#525252]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-body text-[13.5px] font-semibold text-[#0A0A0A]">
                  {section.asCategory ? copy.fmt.paste.newCategory(section.header) : section.header}
                </span>
                <APCheckbox
                  size="sm"
                  checked={section.asCategory}
                  disabled={busy}
                  onChange={(on) => setAsCategory(section.id, on)}
                  label={<span className="text-[12.5px] text-[#525252]">{copy.paste.asCategory}</span>}
                  className="min-h-11 items-center pointer-fine:min-h-0"
                />
              </div>
            )}
            <ul className="divide-y divide-[#F2F2F2]">
              {section.rows.map((row) => {
                const editing = editingRow === row.id || row.error !== null;
                return (
                  <li key={row.id} className={`px-3 py-2 ${row.error ? 'bg-[#FFFBEB]' : ''}`}>
                    {editing ? (
                      <div className="space-y-1">
                        <div className="grid grid-cols-[1fr_96px] gap-2">
                          <input
                            value={row.name}
                            disabled={busy}
                            autoFocus={editingRow === row.id}
                            maxLength={140}
                            onChange={(e) => updateRow(section.id, row.id, { name: e.target.value }, false)}
                            onBlur={() => updateRow(section.id, row.id, {}, true)}
                            onKeyDown={onRowKey}
                            aria-label={copy.item.name}
                            className="bz-input h-11 text-[16px] sm:text-[13.5px] pointer-fine:h-8"
                          />
                          <div className="relative">
                            <input
                              value={row.price}
                              disabled={busy}
                              inputMode="decimal"
                              onChange={(e) => updateRow(section.id, row.id, { price: e.target.value }, false)}
                              onBlur={() => updateRow(section.id, row.id, {}, true)}
                              onKeyDown={onRowKey}
                              aria-label={copy.item.price}
                              className="bz-input h-11 pr-6 text-right text-[16px] tabular-nums sm:text-[13.5px] pointer-fine:h-8"
                            />
                            <span aria-hidden="true" className="pointer-events-none absolute right-2 top-0 flex h-11 items-center text-[12px] text-[#737373] pointer-fine:h-8">
                              {currencySymbol('TRY')}
                            </span>
                          </div>
                        </div>
                        {row.error && (
                          <p className="flex items-center gap-1 text-[12px] text-[#92400E]">
                            <AlertCircle size={12} strokeWidth={2} aria-hidden="true" />
                            {copy.fmt.paste.rowError(row.line, reasonOf(copy, row.error))}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-body text-[13.5px] text-[#0A0A0A]">{row.name}</span>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#0A0A0A]">
                          {row.priceCents !== null ? money(row.priceCents) : row.price}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setEditingRow(row.id)}
                          aria-label={copy.inline.editLabel(copy.item.name, row.name)}
                          className="bz-btn-icon h-11 w-11 shrink-0 pointer-fine:h-7 pointer-fine:w-7"
                        >
                          <Pencil size={12} strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {section.overLimit && !intoTarget(section) && (
              <p className="border-t border-[#EDEDED] px-3 py-2 text-[12px] text-[#92400E]">
                {copy.fmt.paste.overLimitNote(MENU_BULK_MAX_ITEMS)}
              </p>
            )}
          </div>
        ))}
      </div>

      {confirmDiscard ? (
        <div role="alertdialog" aria-label={copy.paste.discardTitle} className="space-y-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
          <p className="text-[13.5px] font-semibold text-[#991B1B]">{copy.paste.discardTitle}</p>
          <p className="text-[12.5px] text-[#991B1B]">{copy.paste.discardBody}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" autoFocus onClick={() => setConfirmDiscard(false)} className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]">
              {copy.paste.keep}
            </button>
            <button type="button" onClick={onCancel} className="bz-btn min-h-[44px] border-[#FCA5A5] text-[#991B1B] sm:min-h-[36px]">
              {copy.paste.discard}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {items === 0 && <p className="mr-auto text-[12.5px] text-[#737373]">{copy.paste.nothingToAdd}</p>}
          <button type="button" onClick={cancel} disabled={busy} className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]">
            {copy.paste.cancel}
          </button>
          <button
            type="button"
            onClick={() => void commit()}
            disabled={busy || items === 0 || blockedByTarget}
            aria-busy={busy || undefined}
            className="bz-btn-primary min-h-[44px] sm:min-h-[36px]"
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {progress ? copy.fmt.paste.committing(progress.done, progress.total) : copy.fmt.paste.commit(items, plan.newCategories.length)}
          </button>
        </div>
      )}
    </div>
  );
}
