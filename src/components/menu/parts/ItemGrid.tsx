import { formatPrice } from '@/lib/format';
import type { MenuItemView } from '../PublicMenuView';
import ItemMedia from './ItemMedia';
import { AllergenLine, Badges, ITEM_ARTICLE_CLASS, ItemName, Price, SoldOutChip } from './ItemBits';
import type { MenuRenderContext } from './types';

const GRID_ASPECT: Record<'1/1' | '4/5' | '4/3', string> = {
  '1/1': 'aspect-square',
  '4/5': 'aspect-[4/5]',
  '4/3': 'aspect-[4/3]',
};

/** Price chip drawn on a photo: self-contained fill + shadow, never text on the photo itself. */
function PriceChip({ item, priceLocale }: { item: MenuItemView; priceLocale: string }) {
  return (
    <span className="bzm-price absolute right-2 bottom-2 z-[2] rounded-(--m-r-pill) bg-(--m-accent-fill) px-2.5 py-1 text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge),0_4px_12px_-2px_rgb(0_0_0/.25)]">
      {formatPrice(item.priceCents, item.currency, priceLocale)}
    </span>
  );
}

/**
 * `grid` (2 columns, 3 from 42rem; every item gets a media box) and `feature`
 * (one big 4:3 photo per item; items without a photo become a text block).
 */
export default function ItemGrid({
  ctx, items, categoryId, layout, eagerCount,
}: {
  ctx: MenuRenderContext;
  items: MenuItemView[];
  categoryId: string;
  layout: 'grid' | 'feature';
  eagerCount: number;
}) {
  const { d, copy, locale, priceLocale } = ctx;
  const cards = d.knobs.cardStyle === 'cards';
  const grid = layout === 'grid';
  const overlay = d.structure.priceOverlay;

  return (
    <div className={grid ? 'grid grid-cols-2 gap-x-(--m-grid-gap) gap-y-[calc(var(--m-grid-gap)*1.75)] @2xl/menu:grid-cols-3 @2xl/menu:gap-x-[calc(var(--m-grid-gap)*1.5)]' : 'flex flex-col gap-8'}>
      {items.map((item, idx) => {
        const priceLabel = formatPrice(item.priceCents, item.currency, priceLocale);
        const hasPhoto = Boolean(item.imageUrl);
        const showMedia = grid || hasPhoto;
        // Grid always draws a media box (photo or monogram tile), so the chip
        // keeps every price on the same spot across a row of cards. Feature
        // items without a photo have no box: their price sits in the text.
        const chip = overlay && showMedia && !item.isOutOfStock;
        const eager = idx < eagerCount;
        const media = showMedia ? (
          <ItemMedia
            src={item.imageUrl}
            name={item.name}
            locale={locale}
            eager={eager}
            highPriority={idx === 0 && eagerCount > 0 && d.structure.header !== 'cover'}
            soldOut={item.isOutOfStock}
            className={`w-full ${grid ? GRID_ASPECT[d.structure.gridAspect] : 'aspect-[4/3]'} ${cards ? '' : 'rounded-(--m-r-img)'}`}
          >
            {chip && <PriceChip item={item} priceLocale={priceLocale} />}
          </ItemMedia>
        ) : null;

        const caption = grid ? (
          <div className={cards ? 'p-3' : 'pt-3'}>
            <ItemName item={item} copy={copy} priceLabel={priceLabel} variant="grid" clamp />
            {!chip && <Price item={item} d={d} priceLocale={priceLocale} className="mt-1 block" />}
            {item.isOutOfStock && <SoldOutChip copy={copy} className="mt-2" />}
            {item.description && <p className="bzm-desc mt-1.5 line-clamp-2">{item.description}</p>}
            <Badges badges={item.badges} d={d} locale={locale} max={2} className="mt-2" />
            <AllergenLine allergens={item.allergens} locale={locale} copy={copy} className="mt-2" />
          </div>
        ) : (
          <div className={cards ? 'p-4 @md/menu:p-5' : hasPhoto ? 'pt-4' : 'border-t border-(--m-rule) pt-5'}>
            <div className="flex items-baseline gap-3">
              <div className="min-w-0 flex-1">
                <ItemName item={item} copy={copy} priceLabel={priceLabel} variant="feature" />
              </div>
              {!chip && <Price item={item} d={d} priceLocale={priceLocale} className="shrink-0" />}
            </div>
            {item.isOutOfStock && <SoldOutChip copy={copy} className="mt-2" />}
            {item.description && <p className="bzm-desc mt-2 line-clamp-3">{item.description}</p>}
            <Badges badges={item.badges} d={d} locale={locale} className="mt-3" />
            <AllergenLine allergens={item.allergens} locale={locale} copy={copy} className="mt-2.5" />
          </div>
        );

        return (
          <article
            key={item.id}
            data-pid={item.id}
            data-sold-out={item.isOutOfStock || undefined}
            ref={(el) => ctx.setProductRef(item.id, el)}
            onClick={() => ctx.onProductClick(item, categoryId)}
            className={`${ITEM_ARTICLE_CLASS} flex flex-col rounded-(--m-r-card) ${
              cards
                ? 'overflow-hidden bg-(--m-surface) ring-1 ring-(--m-rule) group-data-[scheme=light]/menu:shadow-[0_1px_2px_rgb(0_0_0/0.04)]'
                : ''
            }`}
          >
            {media}
            {caption}
          </article>
        );
      })}
    </div>
  );
}
