'use client';

import { useState, useTransition } from 'react';
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
}

const COPY = {
  tr: {
    label: (n: RedirectMinRating) =>
      n === 5 ? 'Yalnızca 5 yıldız' : '4 ve 5 yıldız',
    sub: (n: RedirectMinRating) =>
      n === 5
        ? '1-2-3-4 yıldız işletmene özel forma düşer'
        : '1-2-3 yıldız işletmene özel forma düşer',
    saving: 'Kaydediliyor…',
    saveError: 'Eşik kaydedilemedi. Tekrar dene.',
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
    saveError: 'Could not save the threshold. Try again.',
    note:
      'This threshold only decides who is offered the public platform link. Every customer keeps the right to post wherever they want; lower-rating customers may prefer to share with your team privately first.',
  },
} as const;

/**
 * Owner control for `Restaurant.redirectMinRating` — the minimum star rating
 * that is handed the public review-platform link. Default 5.
 *
 * Self-persisting like `<DefaultRedirectPicker>`: optimistic update, PUT to
 * /api/restaurants/[id], revert + inline error on failure.
 */
export default function RedirectThresholdPicker({
  restaurantId,
  initialValue,
  locale,
}: RedirectThresholdPickerProps) {
  const copy = COPY[locale] ?? COPY.tr;
  const [selected, setSelected] = useState<RedirectMinRating>(
    normalizeRedirectMinRating(initialValue),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<RedirectMinRating | null>(null);
  const [isPending, startTransition] = useTransition();

  const persist = (next: RedirectMinRating) => {
    if (next === selected) return;
    const previous = selected;
    setSelected(next); // optimistic
    setPending(next);
    setError(null);

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
        }
      } catch {
        setSelected(previous);
        setError(copy.saveError);
      } finally {
        setPending(null);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label={locale === 'tr' ? 'Yönlendirme eşiği' : 'Redirect threshold'}
        className="grid gap-2.5 sm:grid-cols-2"
      >
        {REDIRECT_MIN_RATING_OPTIONS.map((option) => {
          const active = selected === option;
          const busy = isPending && pending === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={isPending}
              onClick={() => persist(option)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                active
                  ? 'border-[#0A0A0A] bg-[#EAF9B8]/40'
                  : 'border-[#EDEDED] bg-white hover:border-[#A3A3A3]'
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  active ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#F5F5F5] text-[#737373]'
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
                <span className="bz-h-tight block text-[13.5px]">{copy.label(option)}</span>
                <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-[#737373]">
                  {copy.sub(option)}
                </span>
                {option === DEFAULT_REDIRECT_MIN_RATING && (
                  <span className="pulse-eyebrow mt-1.5 block text-[9.5px] text-[#A8D62E]">
                    {locale === 'tr' ? 'VARSAYILAN' : 'DEFAULT'}
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

      <p className="text-[11.5px] leading-[1.55] text-[#737373]">{copy.note}</p>
    </div>
  );
}
