import type { ReactNode } from 'react';
import { CreditCard } from 'lucide-react';
import type { PublicSavedCard } from '@/lib/billing/card-types';
import { billingText, cardAriaLabel, cardBrandLabel, formatCardExpiry, type BillingLocale } from './billing-copy';

/**
 * The saved card, drawn (billing spec §12.2): graphite plate, a lime glow, a
 * contactless-free chip and the Buaze pulse line as a quiet watermark. It
 * shows only what Buaze has: issuer, brand name (text, no logo assets),
 * •••• last4 and the expiry. Never a full or partial card number.
 *
 * Presentational and hook-free, so the panel and the review page share it.
 */
export default function CardVisual({
  card,
  locale,
  size = 'md',
  emptyAction,
  emptyHint,
}: {
  card: PublicSavedCard | null;
  locale: BillingLocale;
  size?: 'md' | 'sm';
  /** Empty state only: the call to action under the text. */
  emptyAction?: ReactNode;
  /** Empty state only: an extra muted line (e.g. why saving is not available yet). */
  emptyHint?: ReactNode;
}) {
  const sm = size === 'sm';
  const maxW = sm ? 'max-w-[240px]' : 'max-w-[340px]';

  if (!card) {
    return (
      <div
        className={`flex w-full ${maxW} ${sm ? 'min-h-[150px]' : 'aspect-[1.586/1] min-h-[190px]'} flex-col items-center justify-center rounded-[14px] border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-5 py-6 text-center`}
      >
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-[#EDEDED]">
          <CreditCard size={20} strokeWidth={1.75} className="text-[#A3A3A3]" />
        </span>
        <p className="mt-3 text-[14px] font-semibold text-[#0A0A0A]">{billingText('pm.empty', locale)}</p>
        <p className="mt-1 max-w-[260px] text-[12px] leading-[1.5] text-[#737373]">{billingText('pm.emptyBody', locale)}</p>
        {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
        {emptyHint ? <p className="mt-2 max-w-[260px] text-[11.5px] leading-[1.45] text-[#737373]">{emptyHint}</p> : null}
      </div>
    );
  }

  const brand = cardBrandLabel(card.brand, locale);
  const expiry = formatCardExpiry(card.expMonth, card.expYear);
  return (
    <div className={`w-full ${maxW}`}>
      <div
        role="img"
        aria-label={cardAriaLabel(card, locale)}
        className={`relative w-full aspect-[1.586/1] overflow-hidden rounded-[14px] bg-[#0A0A0A] text-white ring-1 ring-inset ring-white/[0.06] shadow-[0_12px_32px_rgba(10,10,10,0.18)] ${
          sm ? 'p-3.5' : 'p-4 sm:p-5'
        } ${card.expired ? 'grayscale opacity-70' : ''} motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-0.5`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(198,242,78,0.16),transparent_60%)]"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-[30%] h-[22%] w-full opacity-[0.07]"
          viewBox="0 0 340 60"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 32 H120 L134 32 L146 8 L160 54 L172 20 L182 38 L194 32 H340"
            stroke="#C6F24E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className={`min-w-0 truncate text-[#A3A3A3] ${sm ? 'text-[11px]' : 'text-[12px]'}`}>{card.issuer ?? 'Buaze'}</span>
            <span className={`bz-mono shrink-0 uppercase tracking-[0.14em] text-white/80 ${sm ? 'text-[10px]' : 'text-[11px]'}`}>{brand}</span>
          </div>
          <svg aria-hidden="true" width={sm ? 24 : 28} height={sm ? 17 : 20} viewBox="0 0 28 20" fill="none">
            <rect x="0.5" y="0.5" width="27" height="19" rx="4" stroke="#C6F24E" strokeOpacity="0.7" />
            <path d="M0.5 7H9.5V13H0.5M27.5 7H18.5V13H27.5M9.5 10H18.5M14 0.5V7M14 13V19.5" stroke="#C6F24E" strokeOpacity="0.45" />
          </svg>
          <div className="flex items-end justify-between gap-3">
            <span className={`bz-mono whitespace-nowrap tracking-[0.12em] ${sm ? 'text-[12.5px]' : 'text-[15px]'}`}>
              <span className="text-white/55">•••• •••• •••• </span>
              {card.last4 ?? '••••'}
            </span>
            {expiry ? <span className={`bz-mono shrink-0 text-[#A3A3A3] ${sm ? 'text-[11px]' : 'text-[12px]'}`}>{expiry}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
