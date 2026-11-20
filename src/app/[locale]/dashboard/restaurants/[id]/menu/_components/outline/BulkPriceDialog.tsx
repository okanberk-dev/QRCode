'use client';

import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { AlertBanner, Field, Modal } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import {
  PRICE_ROUNDINGS, parsePercentInput, previewPriceOp, type PriceOp, type PriceRounding,
} from '../menu-bulk-price';
import { checkPrice, currencySymbol } from '../menu-item-form';
import { isTempId } from '../menu-merge';
import type { CategoryShape } from '../menu-types';
import { useStudio } from '../studio/studio-context';

type Kind = PriceOp['kind'];
const PREVIEW_ROWS = 6;

/**
 * "Fiyatları değiştir" (spec §7.7, G3): percent / amount / fixed, up or down,
 * optional rounding, with a preview of every change before anything is sent.
 * Runs N×PATCH (4 at a time) with progress. All saved → the dialog closes and
 * toasts with one "Geri al"; some failed → it stays open with a banner and
 * "Başarısızları tekrar dene" (the saved ones are already one undo entry).
 */
export function BulkPriceDialog({
  itemIds, categories, onClose,
}: {
  itemIds: string[];
  categories: CategoryShape[];
  onClose: () => void;
}) {
  const { copy, isTr, actions, toaster } = useStudio();
  const locale = isTr ? 'tr-TR' : 'en-US';
  const valueId = useId();
  const roundId = useId();
  const items = useMemo(() => {
    const wanted = new Set(itemIds);
    return categories.flatMap((c) => c.items.filter((i) => wanted.has(i.id) && !isTempId(i.id)));
  }, [categories, itemIds]);
  // Prices as they were when the dialog opened: a retry must not apply the change twice.
  const base = useRef(items.map((i) => ({ id: i.id, name: i.name, priceCents: i.priceCents, currency: i.currency })));

  const [kind, setKind] = useState<Kind>('percent');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [value, setValue] = useState('');
  const [rounding, setRounding] = useState<PriceRounding>(100);
  const roundingTouched = useRef(false);
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<{ id: string; to: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currencies = new Set(base.current.map((i) => (i.currency || 'TRY').toUpperCase()));
  const mixed = currencies.size > 1;
  const symbol = mixed ? null : currencySymbol([...currencies][0] ?? 'TRY');

  const parsed = useMemo((): { op: PriceOp | null; error: string | null } => {
    if (!value.trim()) return { op: null, error: null };
    if (kind === 'percent') {
      const v = parsePercentInput(value);
      return v === null ? { op: null, error: copy.bulkPrice.percentInvalid } : { op: { kind, direction, value: v }, error: null };
    }
    const check = checkPrice(value);
    if (check.kind !== 'ok') return { op: null, error: copy.item.priceInvalid };
    return kind === 'fixed'
      ? { op: { kind, cents: check.cents }, error: null }
      : { op: { kind, direction, cents: check.cents }, error: null };
  }, [value, kind, direction, copy]);

  const preview = useMemo(
    () => (parsed.op ? previewPriceOp(base.current, parsed.op, rounding) : null),
    [parsed.op, rounding],
  );
  const changes = preview?.changes ?? [];
  const k = changes.length;

  const pickKind = (next: Kind) => {
    setKind(next);
    if (!roundingTouched.current) setRounding(next === 'percent' ? 100 : 0);
  };

  const apply = async (list: { id: string; to: number }[]) => {
    setError(null);
    setRunning({ done: 0, total: list.length });
    const r = await actions.bulkSetPrices(list, (done) => setRunning({ done, total: list.length }));
    setRunning(null);
    if (r.ok) {
      onClose();
      if (r.updated > 0) toaster.notify({ message: copy.fmt.toast.pricesUpdated(r.updated), undo: r.undo });
      return;
    }
    if (r.undo) toaster.pushUndo(copy.fmt.toast.pricesUpdated(r.updated), r.undo);
    const failedSet = new Set(r.failedIds);
    setFailed(list.filter((c) => failedSet.has(c.id)));
    setError(r.message);
  };

  const busy = running !== null;
  const frozen = failed !== null;

  const segmented = <T extends string>(
    label: string,
    options: { value: T; label: string; disabled?: boolean }[],
    current: T,
    onPick: (v: T) => void,
  ): ReactNode => (
    <div role="group" aria-label={label} className="inline-flex w-full gap-0.5 rounded-[10px] bg-[#F2F2F2] p-[3px] sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={current === o.value}
          disabled={o.disabled || busy || frozen}
          onClick={() => onPick(o.value)}
          className={`min-h-[40px] flex-1 rounded-[7px] px-4 text-[13px] font-medium disabled:opacity-40 sm:flex-none pointer-fine:min-h-8 ${
            current === o.value
              ? 'bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(10,10,10,0.08),0_0_0_1px_rgba(10,10,10,0.04)]'
              : 'text-[#525252] hover:text-[#0A0A0A]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const roundLabel = (step: PriceRounding) =>
    step === 0 ? copy.bulkPrice.roundNone : symbol ? `${step / 100} ${symbol}` : String(step / 100);

  return (
    <Modal
      size={480}
      onClose={busy ? () => undefined : onClose}
      title={
        <span className="flex flex-col">
          <span className="bz-h-tight text-[18px]">{copy.bulkPrice.title}</span>
          <span className="text-[12.5px] font-normal text-[#737373]">{copy.bulkPrice.subtitle(base.current.length)}</span>
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]">
            {frozen ? copy.item.close : copy.bulkPrice.cancel}
          </button>
          {frozen ? (
            <button
              type="button"
              onClick={() => failed && void apply(failed)}
              disabled={busy || !failed?.length}
              aria-busy={busy || undefined}
              className="bz-btn-primary min-h-[44px] sm:min-h-[36px]"
            >
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {busy && running ? copy.fmt.bulkPrice.progress(running.done, running.total) : copy.bulkPrice.retryFailed}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void apply(changes.map((c) => ({ id: c.id, to: c.to })))}
              disabled={busy || k === 0 || parsed.op === null}
              aria-busy={busy || undefined}
              className="bz-btn-primary min-h-[44px] sm:min-h-[36px]"
            >
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {busy && running ? copy.fmt.bulkPrice.progress(running.done, running.total) : copy.fmt.bulkPrice.apply(k)}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-[#0A0A0A]">{copy.bulkPrice.modeLabel}</p>
          {segmented<Kind>(
            copy.bulkPrice.modeLabel,
            [
              { value: 'percent', label: copy.bulkPrice.percent },
              { value: 'amount', label: copy.bulkPrice.amount, disabled: mixed },
              { value: 'fixed', label: copy.bulkPrice.fixed, disabled: mixed },
            ],
            kind,
            pickKind,
          )}
          {mixed && <p className="text-[12px] text-[#737373]">{copy.bulkPrice.mixedCurrency}</p>}
        </div>
        {kind !== 'fixed' &&
          segmented<'up' | 'down'>(
            copy.bulkPrice.directionLabel,
            [
              { value: 'up', label: copy.bulkPrice.increase },
              { value: 'down', label: copy.bulkPrice.decrease },
            ],
            direction,
            setDirection,
          )}
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <Field
            label={kind === 'percent' ? copy.bulkPrice.percentValue : kind === 'amount' ? copy.bulkPrice.amountValue : copy.bulkPrice.fixedValue}
            htmlFor={valueId}
            error={parsed.error ?? undefined}
          >
            {/* Field wires the label to its first child: the wrapper gets its own id, so the
                label and the error reach the input itself. */}
            <div id={`${valueId}-box`} className="relative">
              <input
                id={valueId}
                aria-describedby={parsed.error ? `${valueId}-error` : undefined}
                aria-invalid={parsed.error ? true : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={busy || frozen}
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                autoFocus
                className="bz-input h-11 pr-8 text-right tabular-nums pointer-fine:h-9"
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-0 flex h-11 items-center text-[12.5px] text-[#737373] pointer-fine:h-9">
                {kind === 'percent' ? '%' : (symbol ?? '')}
              </span>
            </div>
          </Field>
          <Field label={copy.bulkPrice.round} htmlFor={roundId}>
            {/* Native select: keyboard-operable inside the Modal and Esc closes only the list. */}
            <select
              id={roundId}
              value={String(rounding)}
              onChange={(e) => {
                roundingTouched.current = true;
                setRounding(Number(e.target.value) as PriceRounding);
              }}
              disabled={busy || frozen}
              className="bz-input h-11 w-full pointer-fine:h-9"
            >
              {PRICE_ROUNDINGS.map((step) => (
                <option key={step} value={String(step)}>
                  {roundLabel(step)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {preview && !frozen && (
          <div className="space-y-2" aria-live="polite">
            <p className="text-[12px] font-semibold text-[#0A0A0A]">{copy.bulkPrice.previewLabel}</p>
            {k === 0 ? (
              <p className="text-[13px] text-[#737373]">{copy.bulkPrice.none}</p>
            ) : (
              <ul className="divide-y divide-[#EDEDED] rounded-xl border border-[#EDEDED]">
                {changes.slice(0, PREVIEW_ROWS).map((c) => {
                  const currency = base.current.find((i) => i.id === c.id)?.currency ?? 'TRY';
                  return (
                    <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                      <span className="min-w-0 flex-1 truncate font-body font-medium text-[#0A0A0A]">{c.name}</span>
                      <span className="shrink-0 tabular-nums text-[#737373]">{formatPrice(c.from, currency, locale)}</span>
                      <ArrowRight size={12} strokeWidth={2} className="shrink-0 text-[#A3A3A3]" aria-hidden="true" />
                      <span className={`shrink-0 font-semibold tabular-nums ${c.to === 0 ? 'text-[#92400E]' : 'text-[#0A0A0A]'}`}>
                        {formatPrice(c.to, currency, locale)}
                      </span>
                    </li>
                  );
                })}
                {k > PREVIEW_ROWS && (
                  <li className="px-3 py-2 text-[12.5px] text-[#737373]">{copy.fmt.bulkPrice.more(k - PREVIEW_ROWS)}</li>
                )}
              </ul>
            )}
            {preview.unchanged > 0 && <p className="text-[12.5px] text-[#737373]">{copy.fmt.bulkPrice.unchanged(preview.unchanged)}</p>}
            {preview.zeroCount > 0 && (
              <p className="flex items-center gap-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12.5px] text-[#92400E]">
                <AlertTriangle size={13} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                {copy.fmt.bulkPrice.zeroWarning(preview.zeroCount)}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
