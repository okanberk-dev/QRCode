'use client';

import { GripVertical, ImageIcon } from 'lucide-react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { formatPrice } from '@/lib/format';

/** What follows the pointer while an item is dragged (DragOverlay): thumb, name, price. */
export function DragPreviewRow({ item, locale }: { item: MenuItemView; locale: 'tr' | 'en' }) {
  return (
    <div className="flex min-h-[56px] w-full max-w-[560px] items-center gap-3 rounded-[20px] border border-pn-line-strong bg-white px-3 py-2 bz-elev-3 motion-safe:scale-[1.02]">
      <GripVertical size={14} strokeWidth={2} className="shrink-0 text-[#737373]" aria-hidden="true" />
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-[14px] object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-pn-canvas text-[#A3A3A3]">
          <ImageIcon size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-body text-[14.5px] font-medium text-pn-ink">{item.name}</span>
      <span className="shrink-0 text-[14px] font-medium tabular-nums text-pn-ink">
        {formatPrice(item.priceCents, item.currency, locale === 'tr' ? 'tr-TR' : 'en-US')}
      </span>
    </div>
  );
}
