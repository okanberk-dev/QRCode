import { formatPrice } from '@/lib/format';
import type { MenuItemView } from '../PublicMenuView';
import ItemMedia from './ItemMedia';
import { AllergenLine, Badges, ITEM_ARTICLE_CLASS, ItemName, Price, SoldOutChip } from './ItemBits';
import type { MenuRenderContext } from './types';

/**
 * `list` (name + price on one baseline, description, badges, allergens, and a
 * thumb column when the category has any photo) and `text` (no media, a
 * dotted leader between name and price — the classic printed menu).
 */
export default function ItemList({
  ctx, items, categoryId, layout, eagerCount,
}: {
  ctx: MenuRenderContext;
  items: MenuItemView[];
  categoryId: string;
  layout: 'list' | 'text';
  /** First N thumbs load eagerly (first category only). */
  eagerCount: number;
}) {
  const { d, copy, locale, priceLocale } = ctx;
  const cards = d.knobs.cardStyle === 'cards';
  const withMedia = layout === 'list' && items.some((i) => Boolean(i.imageUrl));
  const thumbStart = d.structure.thumbSide === 'start';
  const arch = d.structure.thumbShape === 'arch';

  return (
    <div className={cards ? 'flex flex-col gap-3' : 'divide-y divide-(--m-rule)'}>
      {items.map((item, idx) => {
        const priceLabel = formatPrice(item.priceCents, item.currency, priceLocale);
        const nameRow = layout === 'text' ? (
          <div className="flex items-baseline">
            <ItemName item={item} copy={copy} priceLabel={priceLabel} />
            <span aria-hidden className="mx-2 min-w-4 flex-1 -translate-y-[0.28em] border-b border-dotted border-(--m-rule-strong)" />
            <Price item={item} d={d} priceLocale={priceLocale} className="shrink-0" />
          </div>
        ) : (
          <div className="flex items-baseline gap-3">
            <div className="min-w-0 flex-1"><ItemName item={item} copy={copy} priceLabel={priceLabel} /></div>
            <Price item={item} d={d} priceLocale={priceLocale} className="shrink-0" />
          </div>
        );
        return (
          <article
            key={item.id}
            data-pid={item.id}
            data-sold-out={item.isOutOfStock || undefined}
            ref={(el) => ctx.setProductRef(item.id, el)}
            onClick={() => ctx.onProductClick(item, categoryId)}
            className={`${ITEM_ARTICLE_CLASS} grid gap-4 py-(--m-row-py) ${
              withMedia ? (thumbStart ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_auto]') : 'grid-cols-1'
            } ${cards
              ? 'rounded-(--m-r-card) bg-(--m-surface) px-3.5 ring-1 ring-(--m-rule) group-data-[scheme=light]/menu:shadow-[0_1px_2px_rgb(0_0_0/0.04)]'
              : ''}`}
          >
            <div className={`min-w-0 ${withMedia ? 'self-center' : ''}`}>
              {nameRow}
              {item.isOutOfStock && <SoldOutChip copy={copy} className="mt-2" />}
              {item.description && <p className="bzm-desc mt-1.5 line-clamp-(--m-clamp)">{item.description}</p>}
              <Badges badges={item.badges} d={d} locale={locale} className="mt-2.5" />
              <AllergenLine allergens={item.allergens} locale={locale} copy={copy} className="mt-2" />
            </div>
            {withMedia && (
              <ItemMedia
                src={item.imageUrl}
                name={item.name}
                locale={locale}
                eager={idx < eagerCount}
                highPriority={idx === 0 && eagerCount > 0 && d.structure.header !== 'cover'}
                soldOut={item.isOutOfStock}
                className={`${thumbStart ? 'order-first' : ''} self-start rounded-(--m-r-thumb) ${
                  arch ? 'h-[calc(var(--m-thumb)*1.25)] w-(--m-thumb)' : 'size-(--m-thumb)'
                }`}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
