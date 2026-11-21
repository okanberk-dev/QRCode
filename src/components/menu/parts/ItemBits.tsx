import type { CSSProperties } from 'react';
import { formatPrice } from '@/lib/format';
import { COLOR_BADGE_PAIRS, QUIET_BADGE_HUES, type ResolvedMenuDesign } from '@/lib/menu-design';
import type { MenuBadge } from '@/lib/validations';
import { ALLERGEN_META, ALLERGEN_VISIBLE_COUNT, BADGE_META, knownAllergens, knownBadges, type MenuCopy, type MenuLocale } from '../menu-labels';
import type { MenuItemView } from '../PublicMenuView';

/** Tabular price; colour from the price style, struck through when sold out. */
export function Price({
  item, d, priceLocale, large = false, className = '',
}: {
  item: MenuItemView;
  d: ResolvedMenuDesign;
  priceLocale: string;
  large?: boolean;
  className?: string;
}) {
  const tone = item.isOutOfStock
    ? 'text-(--m-muted) line-through decoration-1'
    : d.knobs.price === 'accent'
      ? 'text-(--m-accent-text)'
      : 'text-(--m-ink)';
  return (
    <span className={`bzm-price ${large ? 'bzm-price--lg' : ''} ${tone} ${className}`}>
      {formatPrice(item.priceCents, item.currency, priceLocale)}
    </span>
  );
}

function BadgeChip({ badge, d, locale }: { badge: MenuBadge; d: ResolvedMenuDesign; locale: MenuLocale }) {
  const meta = BADGE_META[badge];
  const Icon = meta.icon;
  if (badge === 'sef_onerisi') {
    return (
      <li className="inline-flex h-6 items-center gap-1 rounded-(--m-r-pill) bg-(--m-accent-fill) px-2 text-[12px] leading-4 font-semibold text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge)]">
        <Icon size={12} strokeWidth={2.25} aria-hidden fill="currentColor" />
        {meta[locale]}
      </li>
    );
  }
  // Every colour below is a verified constant (menu-design.ts §3.5), never owner input.
  if (d.knobs.badges === 'color') {
    const pair = COLOR_BADGE_PAIRS[badge];
    const style: CSSProperties = d.scheme === 'dark'
      ? { backgroundColor: pair.dark.bg, color: pair.dark.fg, boxShadow: `inset 0 0 0 1px ${pair.dark.border}` }
      : { backgroundColor: pair.light.bg, color: pair.light.fg };
    return (
      <li style={style} className="inline-flex h-6 items-center gap-1 rounded-(--m-r-pill) px-2 text-[12px] leading-4 font-medium">
        <Icon size={12} strokeWidth={2} aria-hidden />
        {meta[locale]}
      </li>
    );
  }
  return (
    <li className="inline-flex h-6 items-center gap-1 rounded-(--m-r-pill) bg-(--m-surface-2) px-2 text-[12px] leading-4 font-medium text-(--m-ink-2)">
      <Icon size={12} strokeWidth={2} aria-hidden style={{ color: QUIET_BADGE_HUES[badge][d.scheme] }} />
      {meta[locale]}
    </li>
  );
}

/** Badge chips, sentence case. `max` shows the first N plus a "+N" chip (grid cards). */
export function Badges({
  badges, d, locale, max, className = '',
}: {
  badges: readonly string[];
  d: ResolvedMenuDesign;
  locale: MenuLocale;
  max?: number;
  className?: string;
}) {
  const list = knownBadges(badges);
  if (list.length === 0) return null;
  const shown = max !== undefined ? list.slice(0, max) : list;
  const rest = list.length - shown.length;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((b) => <BadgeChip key={b} badge={b} d={d} locale={locale} />)}
      {rest > 0 && (
        <li className="inline-flex h-6 items-center rounded-(--m-r-pill) bg-(--m-surface-2) px-2 text-[12px] leading-4 font-medium text-(--m-ink-2)">
          <span aria-hidden>+{rest}</span>
          <span className="sr-only">{list.slice(max).map((b) => BADGE_META[b][locale]).join(', ')}</span>
        </li>
      )}
    </ul>
  );
}

/**
 * "Alerjen: Gluten, Süt / laktoz, Yumurta +2". Never clamped or truncated:
 * on a narrow card it simply wraps. Screen readers get the full list.
 */
export function AllergenLine({
  allergens, locale, copy, className = '',
}: {
  allergens: readonly string[] | undefined;
  locale: MenuLocale;
  copy: MenuCopy;
  className?: string;
}) {
  const known = knownAllergens(allergens);
  if (known.length === 0) return null;
  const names = known.map((a) => ALLERGEN_META[a][locale]);
  const hidden = names.length - ALLERGEN_VISIBLE_COUNT;
  const full = names.join(', ');
  return (
    <p title={`${copy.allergen}: ${full}`} className={`text-[13px] leading-[19px] text-(--m-ink-2) ${className}`}>
      <span className="font-semibold text-(--m-ink)">{copy.allergen}:</span>{' '}
      <span aria-hidden>
        {names.slice(0, ALLERGEN_VISIBLE_COUNT).join(', ')}
        {hidden > 0 ? ` +${hidden}` : ''}
      </span>
      <span className="sr-only">{full}</span>
    </p>
  );
}

/**
 * The card's one interactive control: an `h3 > button` whose ::after covers
 * the whole article, so Enter/Space and clicks anywhere bubble as exactly one
 * click to the article's handler. The accessible name carries the price and
 * the sold-out state.
 */
export function ItemName({
  item, copy, priceLabel, variant = 'list', clamp = false,
}: {
  item: MenuItemView;
  copy: MenuCopy;
  priceLabel: string;
  variant?: 'list' | 'grid' | 'feature';
  clamp?: boolean;
}) {
  const role = variant === 'grid' ? 'bzm-item bzm-item--grid' : variant === 'feature' ? 'bzm-item bzm-item--feature' : 'bzm-item';
  return (
    <h3 className={`${role} min-w-0 ${item.isOutOfStock ? 'text-(--m-ink-2)' : ''}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        className="cursor-pointer text-left after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:outline-none"
      >
        <span className={clamp ? 'line-clamp-3' : ''}>{item.name}</span>
        <span className="sr-only">, {priceLabel}{item.isOutOfStock ? `, ${copy.soldOut}` : ''}</span>
      </button>
    </h3>
  );
}

/**
 * Shared article chrome: data-pid contract and the focus ring (from the inner
 * button). No radius here: a `rows` list draws its dividers as each article's
 * bottom border, and a rounded box curls those lines up at both ends. Cards and
 * grid tiles add `rounded-(--m-r-card)` themselves.
 */
export const ITEM_ARTICLE_CLASS =
  'group/item relative cursor-pointer outline-offset-2 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-(--m-focus) has-[button:focus-visible]:outline-solid';

export function SoldOutChip({ copy, className = '' }: { copy: MenuCopy; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex h-6 items-center rounded-(--m-r-pill) bg-(--m-surface-2) px-2 text-[12px] leading-4 font-semibold text-(--m-ink) ring-1 ring-(--m-rule) ${className}`}>
      {copy.soldOut}
    </span>
  );
}
