'use client';

import { memo } from 'react';
import { EyeOff } from 'lucide-react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import { Badge } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import type { RowFeedback } from '../data/useMenuActions';
import { rowBadge } from '../menu-status';
import { useStudio } from '../studio/studio-context';
import { StatusCell } from './StatusCell';

/**
 * Servis mode row (G8): name, price and one big availability switch — nothing
 * else (no photo, ⋯, drag, inline edits). The name opens the item panel.
 */
export const ServiceRow = memo(function ServiceRow({
  item, categoryVisible, feedback,
}: {
  item: MenuItemView;
  categoryVisible: boolean;
  feedback?: RowFeedback;
}) {
  const { copy, isTr, canEdit, openItem } = useStudio();
  const badge = rowBadge(item, { isVisible: categoryVisible });
  return (
    <li
      id={`menu-row-li-${item.id}`}
      data-item-id={item.id}
      className="grid min-h-[60px] scroll-mt-[124px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-white px-4 py-2 lg:scroll-mt-[180px]"
    >
      <div className="min-w-0">
        <button
          type="button"
          id={`menu-row-${item.id}`}
          data-row-focus=""
          onClick={() => openItem(item.id)}
          aria-label={copy.item.openAria(item.name)}
          className="min-w-0 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
        >
          <span className="font-body text-[15px] font-medium leading-5 text-pn-ink line-clamp-2 break-words">{item.name}</span>
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="text-[13px] tabular-nums text-[#737373]">
            {formatPrice(item.priceCents, item.currency || 'TRY', isTr ? 'tr-TR' : 'en-US')}
          </span>
          {badge === 'categoryHidden' && (
            <Badge kind="off">
              <EyeOff size={11} strokeWidth={2} aria-hidden="true" /> {copy.category.categoryHidden}
            </Badge>
          )}
          {badge === 'hidden' && <Badge kind="off">{copy.item.hidden}</Badge>}
        </div>
      </div>
      <div className="flex items-center justify-end">
        <StatusCell item={item} disabled={!canEdit} saving={feedback?.state === 'saving'} service />
      </div>
    </li>
  );
});
