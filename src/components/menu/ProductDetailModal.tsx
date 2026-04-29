'use client';

import { useEffect } from 'react';
import { Flame, Leaf, Star, Sparkles, WheatOff, X, Sun, Sprout, Heart, CalendarRange, Droplets, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { MenuAllergen, MenuBadge } from '@/lib/validations';
import type { MenuItemView } from './PublicMenuView';

const ALLERGEN_LABELS: Record<MenuAllergen, { tr: string; en: string }> = {
  gluten:    { tr: 'Gluten',                en: 'Gluten' },
  sut:       { tr: 'Süt / laktoz',          en: 'Milk / lactose' },
  yumurta:   { tr: 'Yumurta',               en: 'Egg' },
  findik:    { tr: 'Sert kabuklu yemiş',    en: 'Tree nut' },
  fistik:    { tr: 'Yer fıstığı',           en: 'Peanut' },
  soya:      { tr: 'Soya',                  en: 'Soy' },
  balik:     { tr: 'Balık',                 en: 'Fish' },
  kabuklu:   { tr: 'Kabuklu deniz ürünü',   en: 'Crustacean' },
  yumusakca: { tr: 'Yumuşakça',             en: 'Mollusc' },
  susam:     { tr: 'Susam',                 en: 'Sesame' },
  hardal:    { tr: 'Hardal',                en: 'Mustard' },
  kereviz:   { tr: 'Kereviz',               en: 'Celery' },
};

const BADGE_META: Record<MenuBadge, { tr: string; en: string; icon: typeof Flame; cls: string }> = {
  populer:     { tr: 'Popüler',       en: 'Popular',       icon: Star,     cls: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]' },
  yeni:        { tr: 'Yeni',          en: 'New',           icon: Sparkles, cls: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]' },
  vegan:       { tr: 'Vegan',         en: 'Vegan',         icon: Leaf,     cls: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]' },
  vegetaryen:  { tr: 'Vejetaryen',    en: 'Vegetarian',    icon: Leaf,     cls: 'bg-[#EAF9B8] text-[#4D5C00] border border-[#D9EE7A]' },
  aci:         { tr: 'Acı',           en: 'Spicy',         icon: Flame,    cls: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' },
  sef_onerisi: { tr: 'Şef Önerisi',   en: "Chef's Pick",   icon: Star,     cls: 'bg-[#0A0A0A] text-[#C6F24E]' },
  glutensiz:   { tr: 'Glutensiz',     en: 'Gluten-Free',   icon: WheatOff, cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  kahvalti:    { tr: 'Kahvaltı',      en: 'Breakfast',     icon: Sun,            cls: 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]' },
  organik:     { tr: 'Organik',       en: 'Organic',       icon: Sprout,         cls: 'bg-[#ECFDF5] text-[#14532D] border border-[#A7F3D0]' },
  taze:        { tr: 'Taze',          en: 'Fresh',         icon: Droplets,       cls: 'bg-[#ECFEFF] text-[#155E75] border border-[#A5F3FC]' },
  sezonluk:    { tr: 'Sezonluk',      en: 'Seasonal',      icon: CalendarRange,  cls: 'bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]' },
  ev_yapimi:   { tr: 'Ev Yapımı',     en: 'Homemade',      icon: Heart,          cls: 'bg-[#FEF3C7] text-[#854D0E] border border-[#FDE68A]' },
};

interface Props {
  item: MenuItemView;
  accent: string;
  locale: 'tr' | 'en';
  onClose: () => void;
}

export default function ProductDetailModal({ item, accent, locale, onClose }: Props) {
  // Lock body scroll + ESC to close.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const priceLocale = locale === 'tr' ? 'tr-TR' : 'en-US';
  const outLabel = locale === 'tr' ? 'Tükendi' : 'Out of stock';
  const closeLabel = locale === 'tr' ? 'Kapat' : 'Close';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-6 fade-in duration-300"
      >
        {/* Sticky close button (thumb-accessible on mobile) */}
        <button
          onClick={onClose}
          aria-label={closeLabel}
          className="sticky top-3 float-right z-10 mr-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0A0A0A] shadow-md backdrop-blur transition-all hover:bg-white active:scale-95"
        >
          <X size={18} strokeWidth={2.4} />
        </button>

        {/* Hero image */}
        <div className="relative -mt-10 aspect-[4/3] w-full overflow-hidden bg-[#FFFFFF]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}11)` }}
            >
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.2" aria-hidden>
                <path d="M12 2v4M8 6h8M6 9c0 2 2 3 6 3s6-1 6-3M6 9v9a2 2 0 002 2h8a2 2 0 002-2V9" />
              </svg>
            </div>
          )}
          {item.isOutOfStock && (
            <span className="absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">
              {outLabel}
            </span>
          )}
        </div>

        <div className="space-y-5 px-5 pb-8 pt-5 sm:px-7 sm:pb-9">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-[#0A0A0A] sm:text-3xl">
              {item.name}
            </h2>
            <span className="shrink-0 rounded-2xl px-3 py-2 text-lg font-semibold tabular-nums sm:text-xl" style={{ backgroundColor: `${accent}1A`, color: accent }}>
              {formatPrice(item.priceCents, item.currency, priceLocale)}
            </span>
          </div>

          {item.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.badges.map((b) => {
                const meta = BADGE_META[b as MenuBadge];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <span key={b} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${meta.cls}`}>
                    <Icon size={11} strokeWidth={2} />
                    {meta[locale]}
                  </span>
                );
              })}
            </div>
          )}

          {item.description && (
            <p className="whitespace-pre-line text-[15px] font-medium leading-relaxed text-[#1A1A1A]">
              {item.description}
            </p>
          )}

          {item.allergens && item.allergens.length > 0 && (
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
                <Info size={11} strokeWidth={2.25} />
                {locale === 'tr' ? 'Alerjen bilgisi' : 'Allergen info'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.allergens
                  .filter((a): a is MenuAllergen => a in ALLERGEN_LABELS)
                  .map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#525252] ring-1 ring-[#EDEDED]"
                    >
                      {ALLERGEN_LABELS[a][locale]}
                    </span>
                  ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[#A3A3A3]">
                {locale === 'tr'
                  ? 'Bu ürün listelenen alerjenleri içerir veya çapraz bulaşma riski taşır.'
                  : 'This item contains or may have come into contact with the listed allergens.'}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-2 w-full rounded-2xl py-4 text-sm font-semibold uppercase tracking-widest text-white shadow-md transition-all active:scale-[0.99]"
            style={{ backgroundColor: accent }}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
