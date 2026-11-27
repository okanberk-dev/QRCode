'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import {
  DEFAULT_REDIRECT_MIN_RATING,
  REDIRECT_MIN_RATING_OPTIONS,
  normalizeRedirectMinRating,
  type RedirectMinRating,
} from '@/lib/constants';

interface RedirectThresholdPickerProps {
  restaurantId: string;
  /** Stored threshold. NULL / drifted values fall back to the default (5). */
  initialValue: number | null;
  locale: 'tr' | 'en';
  /** Id of a visible label element; falls back to an aria-label. */
  labelId?: string;
  /** Fires after a successful PUT so the parent can keep its row in sync. */
  onSaved?: (next: RedirectMinRating) => void;
}

const SAVED_NOTICE_MS = 2500;

const COPY = {
  tr: {
    label: (n: RedirectMinRating) =>
      n === 5 ? 'Yalnızca 5 yıldız' : '4 ve 5 yıldız',
    sub: (n: RedirectMinRating) =>
      n === 5
        ? '1-2-3-4 yıldız işletmene özel forma düşer'
        : '1-2-3 yıldız işletmene özel forma düşer',
    saving: 'Kaydediliyor…',
    saved: 'Kaydedildi',
    saveError: 'Eşik kaydedilemedi. Tekrar dene.',
    groupLabel: 'Yönlendirme eşiği',
    defaultTag: 'VARSAYILAN',
    note:
      'Bu eşik yalnızca hangi müşteriye herkese açık platform bağlantısının önerileceğini belirler. Her müşteri istediği yere yorum yazma hakkını korur; düşük puan veren müşteriler önce ekibinle özel paylaşım yapmayı tercih edebilir.',
  },
  en: {
    label: (n: RedirectMinRating) => (n === 5 ? '5 stars only' : '4 and 5 stars'),
    sub: (n: RedirectMinRating) =>
      n === 5
        ? '1-2-3-4 stars land in your own feedback form'
        : '1-2-3 stars land in your own feedback form',
    saving: 'Saving…',
    saved: 'Saved',
    saveError: 'Could not save the threshold. Try again.',
    groupLabel: 'Redirect threshold',
    defaultTag: 'DEFAULT',
    note:
      'This threshold only decides who is offered the public platform link. Every customer keeps the right to post wherever they want; lower-rating customers may prefer to share with your team privately first.',
  },
} as const;

/**
 * Owner control for `Restaurant.redirectMinRating` — the minimum star rating
 * that is handed the public review-platform link. Default 5.
 *
 * Self-persisting like `<DefaultRedirectPicker>`: optimistic update, PUT to
 * /api/restaurants/[id], revert + inline error on failure, "Kaydedildi"
 * announced through a polite live region on success.
 *
 * Keyboard: WAI-ARIA radio group — roving tabindex (only the checked option
 * is in the tab order), arrow keys move + select.
 */
export default function RedirectThresholdPicker({
  restaurantId,
  initialValue,
  locale,
  labelId,
  onSaved,
}: RedirectThresholdPickerProps) {
  const copy = COPY[locale] ?? COPY.tr;
  const [selected, setSelected] = useState<RedirectMinRating>(
    normalizeRedirectMinRating(initialValue),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<RedirectMinRating | null>(null);
  const [isPending, startTransition] = useTransition();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const savedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const persist = (next: RedirectMinRating) => {
    if (next === selected || isPending) return;
    const previous = selected;
    setSelected(next); // optimistic
    setPending(next);
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectMinRating: next }),
        });
        if (!res.ok) {
          setSelected(previous); // revert — never leave the UI claiming a save that failed
          setError(copy.saveError);
          return;
        }
        onSaved?.(next);
        setSaved(true);
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setSaved(false), SAVED_NOTICE_MS);
      } catch {
        setSelected(previous);
        setError(copy.saveError);
      } finally {
        setPending(null);
      }
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = REDIRECT_MIN_RATING_OPTIONS.length;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % count;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + count) % count;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = count - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
    persist(REDIRECT_MIN_RATING_OPTIONS[nextIndex]);
  };

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : copy.groupLabel}
        className="grid gap-2.5 sm:grid-cols-2"
      >
        {REDIRECT_MIN_RATING_OPTIONS.map((option, index) => {
          const active = selected === option;
          const busy = isPending && pending === option;
          return (
            <button
              key={option}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              // aria-disabled (not `disabled`) while saving: a disabled button
              // would drop keyboard focus mid arrow-key navigation.
              aria-disabled={isPending || undefined}
              onClick={() => persist(option)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`flex min-h-[44px] items-start gap-3 rounded-[24px] border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-2 aria-disabled:cursor-wait ${
                active
                  ? 'border-pn-ink bg-pn-accent-soft/40'
                  : 'border-pn-line bg-white hover:border-[#A3A3A3]'
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  active ? 'bg-pn-accent text-pn-ink' : 'bg-pn-canvas text-[#525252]'
                }`}
              >
                {busy ? (
                  <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
                ) : active ? (
                  <Check size={13} strokeWidth={2.6} />
                ) : (
                  <Star size={13} strokeWidth={2.2} />
                )}
              </span>
              <span className="min-w-0">
                <span className="bz-h-tight block text-[14px]">{copy.label(option)}</span>
                <span className="mt-0.5 block text-[12px] leading-[1.5] text-[#525252]">
                  {copy.sub(option)}
                </span>
                {option === DEFAULT_REDIRECT_MIN_RATING && (
                  <span className="text-[13px] font-medium mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-[#525252]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-pn-accent-hover" />
                    {copy.defaultTag}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      <div>
        {/* Always mounted so the "Kaydedildi" change is announced; empty it
            takes no space. */}
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-1 text-[12px] font-medium text-[#166534] [&:not(:empty)]:mb-2"
        >
          {saved && (
            <>
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              {copy.saved}
            </>
          )}
        </p>
        <p className="text-[12px] leading-[1.55] text-[#525252]">{copy.note}</p>
      </div>
    </div>
  );
}
