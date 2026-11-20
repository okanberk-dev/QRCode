'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CategoryShape } from '../menu-types';

/**
 * `?edit=<itemId>` (from analytics) opens that item once — after the menu and
 * the role have loaded, never for read-only users, ignored without a word when
 * the item is unknown. `?share=1` opens "Paylaş ve QR" once when the menu
 * module is on. Both are then removed with `router.replace` (other params kept,
 * no scroll). Must-keep #3.
 */
export function useUrlIntents({
  ready, readOnly, menuEnabled, categories, onEdit, onShare,
}: {
  ready: boolean;
  readOnly: boolean;
  menuEnabled: boolean;
  categories: CategoryShape[];
  onEdit: (itemId: string, categoryId: string) => void;
  onShare: () => void;
}): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !ready) return;
    handled.current = true;
    const editId = searchParams?.get('edit') ?? null;
    const wantsShare = searchParams?.get('share') === '1';
    if (!editId && !wantsShare) return;

    if (editId && !readOnly) {
      const owner = categories.find((c) => c.items.some((i) => i.id === editId));
      if (owner) onEdit(editId, owner.id);
    }
    if (wantsShare && menuEnabled) onShare();

    const rest = new URLSearchParams(searchParams?.toString() ?? '');
    rest.delete('edit');
    rest.delete('share');
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [ready, readOnly, menuEnabled, categories, onEdit, onShare, searchParams, pathname, router]);
}
