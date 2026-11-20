'use client';

import { useCallback, useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { checkPrice, currencySymbol, priceToInput } from '../menu-item-form';
import { isMultiLinePaste, parsePasteBlock, parseSingleLine, type PasteSection } from '../menu-paste';
import { useStudio } from '../studio/studio-context';
import { PasteReview, announcePaste } from './PasteReview';

/**
 * "+ Ürün ekle" at the end of a section (spec §7.7, G7). Name ⏎ → price ⏎ adds
 * the item at once as a pending row and clears the fields with focus back on
 * the name, so a menu can be typed without waiting (creates in one category
 * run one after another on the server). Pasting "Mercimek Çorbası 90" into the
 * empty name fills both fields; several lines open the paste review in place
 * (into this category). Esc clears; Esc / leaving with both empty closes.
 */
export function QuickAddRow({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const { copy, actions, registerQuickAdd, isTr, toaster, flashItem, reportPasteDirty } = useStudio();
  const [pasted, setPasted] = useState<PasteSection[] | null>(null);
  const onPasteDirty = useCallback((dirty: boolean) => reportPasteDirty(`quick:${categoryId}`, dirty), [reportPasteDirty, categoryId]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const hintId = useId();

  const openForm = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => {
      nameRef.current?.focus();
      formRef.current?.scrollIntoView({ block: 'nearest' });
    });
  }, []);
  useEffect(() => registerQuickAdd(categoryId, openForm), [registerQuickAdd, categoryId, openForm]);

  const reset = () => {
    setName('');
    setPrice('');
    setNameError(null);
    setPriceError(null);
  };

  const submit = () => {
    const trimmed = name.replace(/\s+/g, ' ').trim();
    if (!trimmed) {
      setNameError(copy.item.nameRequired);
      nameRef.current?.focus();
      return;
    }
    const check = checkPrice(price);
    if (check.kind !== 'ok') {
      setPriceError(check.kind === 'empty' ? copy.item.priceRequired : copy.item.priceInvalid);
      priceRef.current?.focus();
      return;
    }
    actions.createItemQuick(categoryId, { name: trimmed.slice(0, 120), priceCents: check.cents });
    reset();
    nameRef.current?.focus();
  };

  const onKey = (field: 'name' | 'price') => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'name') {
        if (!name.trim()) {
          setNameError(copy.item.nameRequired);
          return;
        }
        priceRef.current?.focus();
      } else submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (!name && !price) setOpen(false);
      else reset();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    // Several lines → the paste review. One "name price" line fills both fields.
    if (isMultiLinePaste(text)) {
      e.preventDefault();
      setPasted(parsePasteBlock(text, isTr).sections);
      return;
    }
    if (name.trim()) return;
    const single = parseSingleLine(text);
    if (!single) return;
    e.preventDefault();
    setName(single.name);
    setPrice(priceToInput(single.priceCents, isTr));
    setNameError(null);
    setPriceError(null);
    requestAnimationFrame(() => priceRef.current?.focus());
  };

  if (pasted) {
    return (
      <PasteReview
        variant="inline"
        initialSections={pasted}
        targetCategoryId={categoryId}
        onDirtyChange={onPasteDirty}
        onCancel={() => {
          setPasted(null);
          requestAnimationFrame(() => nameRef.current?.focus());
        }}
        onDone={(r) => {
          setPasted(null);
          reset();
          announcePaste(r, { copy, toaster, flashItem });
        }}
      />
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openForm}
        className="flex min-h-[48px] w-full items-center gap-2 px-4 text-left text-[13.5px] font-medium text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6F24E]"
      >
        <Plus size={15} strokeWidth={2.25} aria-hidden="true" />
        {copy.outline.addItem}
        <span className="sr-only"> — {categoryName}</span>
      </button>
    );
  }

  return (
    <div
      ref={formRef}
      className="bg-[#FCFCFC] px-3 py-3"
      onBlur={(e) => {
        if (formRef.current?.contains(e.relatedTarget as Node | null)) return;
        if (!name && !price) setOpen(false);
      }}
    >
      <div className="grid grid-cols-[1fr_120px] gap-2 @min-[480px]/outline:grid-cols-[1fr_140px_auto]">
        <div className="min-w-0">
          <input
            ref={nameRef}
            value={name}
            maxLength={120}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            onKeyDown={onKey('name')}
            onPaste={onPaste}
            placeholder={copy.outline.quickAddNamePlaceholder}
            aria-label={`${copy.outline.quickAddName} — ${categoryName}`}
            aria-describedby={hintId}
            aria-invalid={nameError ? true : undefined}
            autoCapitalize="sentences"
            autoComplete="off"
            enterKeyHint="next"
            className="bz-input h-11 pointer-fine:h-9"
          />
          {nameError && <p role="alert" className="mt-1 text-[12px] text-[#DC2626]">{nameError}</p>}
        </div>
        <div className="relative min-w-0">
          <input
            ref={priceRef}
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              if (priceError) setPriceError(null);
            }}
            onKeyDown={onKey('price')}
            placeholder={copy.item.pricePlaceholder}
            aria-label={copy.outline.quickAddPrice}
            aria-invalid={priceError ? true : undefined}
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            className="bz-input h-11 pr-7 text-right tabular-nums pointer-fine:h-9"
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-0 flex h-11 items-center text-[12.5px] text-[#737373] pointer-fine:h-9">
            {currencySymbol('TRY')}
          </span>
          {priceError && <p role="alert" className="mt-1 text-[12px] text-[#DC2626]">{priceError}</p>}
        </div>
        <button
          type="button"
          onClick={submit}
          className="bz-btn-primary col-span-2 h-11 @min-[480px]/outline:col-span-1 pointer-fine:h-9 pointer-fine:min-h-0"
        >
          {copy.outline.quickAddSubmit}
        </button>
      </div>
      <p id={hintId} className="mt-1.5 text-[12px] text-[#737373]">
        {copy.outline.quickAddHint}
      </p>
    </div>
  );
}
