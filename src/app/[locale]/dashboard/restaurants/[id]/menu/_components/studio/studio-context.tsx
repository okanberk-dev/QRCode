'use client';

import { createContext, useContext } from 'react';
import type { ToasterApi } from '../kit/Toaster';
import type { MenuCopy } from '../menu-i18n';
import type { CategoryShape } from '../menu-types';
import type { MenuActions } from '../data/useMenuActions';

/**
 * What every studio component reads from the page (spec §7.3).
 *
 * The value is built to stay referentially stable while the menu changes:
 * fast-changing data (categories, per-row save state, pending rows) reaches
 * rows as props, and `getCategories()` reads the latest menu on demand. So a
 * toggle re-renders its row, not every consumer of this context.
 */
export interface StudioContextValue {
  restaurantId: string;
  locale: 'tr' | 'en';
  isTr: boolean;
  copy: MenuCopy;
  readOnly: boolean;
  canEdit: boolean;
  isPublished: boolean;
  finePointer: boolean;
  mode: 'edit' | 'service';
  actions: MenuActions;
  toaster: ToasterApi;
  getCategories(): CategoryShape[];
  openItem(itemId: string, focusField?: 'photo' | 'description'): void;
  createItemIn(categoryId: string): void;
  focusQuickAdd(categoryId: string): void;
  focusNewCategory(): void;
  jumpToCategory(categoryId: string): void;
  registerQuickAdd(categoryId: string, open: () => void): () => void;
  registerNewCategory(open: () => void): () => void;
  /** Spreadsheet price run over the visible rows (fine pointers). */
  registerPriceCell(itemId: string, open: () => void): () => void;
  openPriceCell(fromItemId: string, dir: 1 | -1): void;
  /** Inline rename opened from elsewhere (a duplicate's name on fine pointers). */
  registerNameCell(itemId: string, open: () => void): () => void;
  openNameCell(itemId: string): void;
  /** scrollIntoView({ block: 'nearest' }) + row flash. */
  flashItem(itemId: string): void;
  /** Completion workflow: keep a row that stopped matching the filter on screen for 1.2 s. */
  linger(itemId: string): void;
  /** After a row is removed: focus the next row, else the previous, else its section header. */
  focusAfterRemoval(itemId: string): void;
  askConfirm(opts: {
    title: string;
    body?: string;
    confirmLabel: string;
    cancelLabel: string;
    variant?: 'default' | 'danger';
    onConfirm: () => void | Promise<void>;
  }): void;
}

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio must be used inside the Menu Studio');
  return value;
}
