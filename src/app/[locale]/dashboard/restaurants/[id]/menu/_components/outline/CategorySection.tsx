'use client';

import { memo } from 'react';
import type { MenuItemView } from '@/components/menu/PublicMenuView';
import type { PendingCreate, RowFeedback } from '../data/useMenuActions';
import type { CategoryShape } from '../menu-types';
import { useStudio } from '../studio/studio-context';
import { CategoryHeader } from './CategoryHeader';
import { ItemRow } from './ItemRow';
import { QuickAddRow } from './QuickAddRow';
import { ServiceRow } from './ServiceRow';

/**
 * One category of the continuous outline. Never uses `data-cat-id` or
 * `cat-*` ids: the preview's `PublicMenuView` looks those up on `document`.
 */
export const CategorySection = memo(function CategorySection({
  category, items, collapsed, onToggleCollapse, filterActive, completion, rows, pendingCreates,
}: {
  category: CategoryShape;
  items: MenuItemView[];
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  filterActive: boolean;
  completion: 'noPhoto' | 'noDescription' | null;
  rows: Record<string, RowFeedback>;
  pendingCreates: Record<string, PendingCreate>;
}) {
  const { copy, canEdit, mode } = useStudio();
  const service = mode === 'service';
  const bodyId = `menu-section-body-${category.id}`;
  return (
    <section
      id={`menu-section-${category.id}`}
      aria-labelledby={`menu-section-title-${category.id}`}
      data-section-id={category.id}
      className={`bz-card scroll-mt-[124px] overflow-hidden p-0 lg:scroll-mt-[180px] ${
        category.isVisible ? '' : 'border-l-[3px] border-l-[#D4D4D4]'
      }`}
    >
      <CategoryHeader
        category={category}
        collapsed={collapsed}
        onToggleCollapse={() => onToggleCollapse(category.id)}
        sectionBodyId={bodyId}
      />
      <div id={bodyId} hidden={collapsed}>
        {!collapsed && (
          <>
            {items.length > 0 ? (
              <ul role="list" className="divide-y divide-[#EDEDED]">
                {items.map((item) =>
                  service ? (
                    <ServiceRow key={item.id} item={item} categoryVisible={category.isVisible} feedback={rows[item.id]} />
                  ) : (
                    <ItemRow
                      key={item.id}
                      item={item}
                      categoryId={category.id}
                      categoryVisible={category.isVisible}
                      feedback={rows[item.id]}
                      pending={pendingCreates[item.id]}
                      completion={completion}
                    />
                  ),
                )}
              </ul>
            ) : (
              <div className="px-4 py-4">
                <p className="text-[13px] font-medium text-[#0A0A0A]">{copy.outline.emptyCategory}</p>
                {canEdit && !service && <p className="mt-0.5 text-[12.5px] text-[#737373]">{copy.outline.emptyCategoryBody}</p>}
              </div>
            )}
            {canEdit && !service && !filterActive && (
              <div className="border-t border-[#EDEDED]">
                <QuickAddRow categoryId={category.id} categoryName={category.name} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
});
