'use client';

import { memo } from 'react';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { PendingCreate, RowFeedback } from '../data/useMenuActions';
import type { FilteredSection } from '../menu-filter';
import { useStudio } from '../studio/studio-context';
import { CategorySection } from './CategorySection';
import { NewCategoryRow } from './NewCategoryRow';

/**
 * The whole menu as one continuous outline (spec §7.7): every category a
 * section, in customer order. Search / filter show matching rows only and
 * open collapsed sections; "+ Yeni kategori" is hidden meanwhile and in Servis.
 * Drag and drop arrives in chunk 3.
 */
export const MenuOutline = memo(function MenuOutline({
  sections, filterActive, query, onClearSearch, collapsed, onToggleCollapse, completion, rows, pendingCreates,
}: {
  sections: FilteredSection[];
  filterActive: boolean;
  query: string;
  onClearSearch: () => void;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  completion: 'noPhoto' | 'noDescription' | null;
  rows: Record<string, RowFeedback>;
  pendingCreates: Record<string, PendingCreate>;
}) {
  const { copy, canEdit, mode } = useStudio();

  if (!filterActive && sections.length === 0) {
    return canEdit ? <NewCategoryRow autoFocus /> : null;
  }

  return (
    <div>
      <h2 className="sr-only">{copy.outline.srTitle}</h2>
      {filterActive && sections.length === 0 ? (
        <EmptyState
          icon={<SearchX size={20} strokeWidth={2} />}
          title={query.trim() ? copy.fmt.noResults(query.trim()) : copy.fmt.filterSummary(copy.outline.filters.all, 0)}
          action={
            <button type="button" onClick={onClearSearch} className="bz-btn-ghost">
              {copy.outline.clearSearch}
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sections.map(({ category, items }) => (
            <CategorySection
              key={category.id}
              category={category}
              items={items}
              collapsed={!filterActive && collapsed.has(category.id)}
              onToggleCollapse={onToggleCollapse}
              filterActive={filterActive}
              completion={completion}
              rows={rows}
              pendingCreates={pendingCreates}
            />
          ))}
          {canEdit && mode === 'edit' && !filterActive && <NewCategoryRow />}
        </div>
      )}
    </div>
  );
});
