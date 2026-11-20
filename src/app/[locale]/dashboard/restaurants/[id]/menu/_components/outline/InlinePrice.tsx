'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { formatPrice } from '@/lib/format';
import { checkPrice, currencySymbol, priceEcho, priceToInput } from '../menu-item-form';
import { useStudio } from '../studio/studio-context';

/**
 * Price in a row, edited in place (spec §8.1, G4). Saves are silent: no toast,
 * the SaveIndicator says "Kaydedildi · canlı" and ⌘Z / "Geri al" undo it.
 *
 * Keys: Enter saves and — on fine pointers — opens the next visible row's
 * price (a spreadsheet run across categories); Shift+Enter goes up; Tab saves
 * and moves on; Esc cancels. Touch: Enter saves and closes. An empty field
 * puts the old price back (a price is required); 0 is allowed and shown amber.
 */
export function InlinePrice({
  itemId, cents, currency, name, editable, errorMessage,
}: {
  itemId: string;
  cents: number;
  currency: string;
  name: string;
  editable: boolean;
  /** The last save of this row failed (shown under the price). */
  errorMessage?: string;
}) {
  const { copy, isTr, finePointer, actions, registerPriceCell, openPriceCell, hasPriceCell } = useStudio();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayRef = useRef<HTMLButtonElement | null>(null);
  const closing = useRef(false);
  const msgId = useId();

  const open = () => {
    if (!editable) return;
    setDraft(priceToInput(cents, isTr));
    setError(null);
    closing.current = false;
    setEditing(true);
  };
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => registerPriceCell(itemId, () => openRef.current()), [itemId, registerPriceCell]);
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
    el.scrollIntoView({ block: 'nearest' });
  }, [editing]);

  const close = (focusDisplay: boolean) => {
    closing.current = true;
    setEditing(false);
    setError(null);
    if (focusDisplay) requestAnimationFrame(() => displayRef.current?.focus());
  };

  /** Save (when changed) and close. False when the text is not a price. */
  const commit = (focusDisplay: boolean): boolean => {
    const check = checkPrice(draft);
    if (check.kind === 'empty') {
      close(focusDisplay);
      return true;
    }
    if (check.kind === 'invalid') {
      setError(copy.item.priceInvalid);
      return false;
    }
    close(focusDisplay);
    if (check.cents !== cents) void actions.setItemPrice(itemId, check.cents);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      // A price run moves to the next row; at the end of the list focus returns to this row's price.
      const run = finePointer && hasPriceCell(itemId, dir);
      if (!commit(!run)) return;
      if (run) openPriceCell(itemId, dir);
    } else if (e.key === 'Tab') {
      if (!commit(false)) e.preventDefault();
    }
  };

  const zero = cents === 0;
  const shown = formatPrice(cents, currency || 'TRY', isTr ? 'tr-TR' : 'en-US');

  if (editing) {
    const check = checkPrice(draft);
    const echo = priceEcho(draft, currency, isTr);
    const message = error ?? (check.kind === 'empty' ? copy.item.priceRequired : echo);
    return (
      <div className="relative z-10 w-[120px] pointer-fine:@min-[480px]/outline:absolute pointer-fine:@min-[480px]/outline:right-0 pointer-fine:@min-[480px]/outline:top-1/2 pointer-fine:@min-[480px]/outline:-translate-y-1/2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (closing.current) return;
            if (!commit(false)) close(false);
          }}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          aria-label={copy.item.priceAria(name)}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? msgId : undefined}
          className="bz-input h-9 pr-7 text-right tabular-nums pointer-coarse:h-11"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-0 flex h-9 items-center text-[12.5px] text-[#737373] pointer-coarse:h-11"
        >
          {currencySymbol(currency)}
        </span>
        {message && (
          <p
            id={msgId}
            role={error ? 'alert' : undefined}
            className={`absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11.5px] shadow-sm ring-1 ring-[#EDEDED] ${
              error ? 'text-[#DC2626]' : 'text-[#525252]'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  const text = (
    <span
      className={`inline-flex items-center gap-1.5 text-[14px] font-semibold tabular-nums pointer-coarse:text-[16px] ${
        zero ? 'text-[#92400E]' : 'text-[#0A0A0A]'
      }`}
    >
      {zero && <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" aria-hidden="true" />}
      {shown}
      {zero && <span className="sr-only">{copy.inline.zeroPriceSr}</span>}
    </span>
  );

  return (
    <div className="min-w-0">
      {editable ? (
        <button
          ref={displayRef}
          type="button"
          data-price-cell=""
          onClick={open}
          aria-label={`${copy.item.priceAria(name)}: ${shown}`}
          className="-mx-1.5 inline-flex min-h-11 items-center rounded-md px-1.5 hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] pointer-fine:min-h-0 pointer-fine:py-1"
        >
          {text}
        </button>
      ) : (
        text
      )}
      {errorMessage && (
        <p role="alert" className="mt-0.5 max-w-[220px] text-[12px] leading-snug text-[#DC2626]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
