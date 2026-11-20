'use client';

import { useEffect, useId, useRef } from 'react';
import { Info, X } from 'lucide-react';
import type { ResolvedMenuDesign } from '@/lib/menu-design';
import { ALLERGEN_META, knownAllergens, menuCopy, type MenuLocale } from './menu-labels';
import { Badges, Price } from './parts/ItemBits';
import ItemMedia from './parts/ItemMedia';
import type { MenuItemView } from './PublicMenuView';

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Product sheet: a bottom sheet on narrow screens, a centred dialog from
 * 36rem (container query on the overlay). ESC / backdrop close, body scroll
 * lock, initial focus on Close, Tab trap, focus returns to the opener.
 * Rendered as a sibling of the menu canvas so `position: fixed` works.
 */
export default function ProductDetailModal({
  item, design: d, locale, priceLocale, onClose,
}: {
  item: MenuItemView;
  design: ResolvedMenuDesign;
  locale: MenuLocale;
  priceLocale: string;
  onClose: () => void;
}) {
  const copy = menuCopy(locale);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus returns to the opening card from PublicMenuView (see openerId).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const allergens = knownAllergens(item.allergens);
  const hasPhoto = Boolean(item.imageUrl);

  return (
    <div className="@container/sheet fixed inset-0 z-50">
      <div aria-hidden onClick={onClose} className="bzm-fade-in absolute inset-0 bg-[rgb(0_0_0/.55)]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bzm-sheet-in absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col overflow-hidden rounded-t-(--m-r-sheet) bg-(--m-surface) text-(--m-ink) shadow-[0_-12px_40px_-12px_rgb(0_0_0/.35)] @xl/sheet:inset-x-auto @xl/sheet:bottom-auto @xl/sheet:top-1/2 @xl/sheet:left-1/2 @xl/sheet:max-h-[min(88%,820px)] @xl/sheet:w-[min(560px,calc(100%-48px))] @xl/sheet:-translate-x-1/2 @xl/sheet:-translate-y-1/2 @xl/sheet:rounded-(--m-r-sheet) @xl/sheet:shadow-[0_24px_60px_-20px_rgb(0_0_0/.45)]"
      >
        <span aria-hidden className="absolute top-2 left-1/2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-(--m-rule) @xl/sheet:hidden" />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute top-3 right-3 z-10 inline-flex size-11 items-center justify-center rounded-full bg-(--m-surface) text-(--m-ink) shadow-[0_2px_10px_rgb(0_0_0/.18)] ring-1 ring-(--m-rule) transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--m-focus)"
        >
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>

        <div className="overflow-y-auto overscroll-contain pb-[max(24px,env(safe-area-inset-bottom))]">
          {hasPhoto && (
            <ItemMedia
              src={item.imageUrl}
              name={item.name}
              alt={item.name}
              locale={locale}
              eager
              soldOut={item.isOutOfStock}
              className="aspect-[4/3] w-full"
            />
          )}

          <div className={`space-y-5 px-5 @md/sheet:px-7 ${hasPhoto ? 'pt-5' : 'pt-7 pr-16'}`}>
            <div>
              <h2 id={titleId} className="bzm-section">{item.name}</h2>
              <Price item={item} d={d} priceLocale={priceLocale} large className="mt-2 block" />
            </div>

            {item.isOutOfStock && (
              <p className="rounded-(--m-r-card) bg-(--m-surface-2) px-4 py-3 text-[14px] leading-5 font-semibold text-(--m-ink)">
                {copy.soldOutSheet}
              </p>
            )}

            <Badges badges={item.badges} d={d} locale={locale} />

            {item.description && (
              <p className="bzm-desc bzm-desc--ink whitespace-pre-line">{item.description}</p>
            )}

            {allergens.length > 0 && (
              <div className="rounded-(--m-r-card) bg-(--m-surface-2) p-4">
                <p className="flex items-center gap-1.5 text-[12px] leading-4 font-semibold tracking-[0.12em] text-(--m-ink-2) uppercase">
                  <Info size={14} strokeWidth={2.25} aria-hidden />
                  {copy.allergenInfo}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {allergens.map((a) => (
                    <li key={a} className="inline-flex h-7 items-center rounded-(--m-r-pill) bg-(--m-surface) px-2.5 text-[13px] leading-5 font-medium text-(--m-ink) ring-1 ring-(--m-rule)">
                      {ALLERGEN_META[a][locale]}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] leading-[18px] text-(--m-ink-2)">{copy.allergenDisclaimer}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-12 w-full rounded-(--m-r-card) bg-(--m-surface-2) text-[15px] font-semibold text-(--m-ink) transition-colors hover:bg-(--m-rule) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--m-focus)"
            >
              {copy.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
