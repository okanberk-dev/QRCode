'use client';

// Page-level business picker that stays in step with the owner shell's
// business switcher (topbar / sidebar). Used by the audit pages and the
// survey pages (list + create).
//
// Source of truth, in order: `?restaurantId` in the URL (the shell writes it
// on business-scoped routes) → the remembered business in localStorage →
// the first business. Picking a business on the page writes it back the same
// way the platforms page does (localStorage + `?restaurantId` via
// replaceState + `buaze:active-restaurant-change`), so the topbar follows.
//
// `ready` is false only for the very first render: the server cannot read
// localStorage, so the first paint may name a different business than the
// shell. Consumers skip their fetch until `ready` to avoid loading (and
// briefly showing) the wrong business.

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ACTIVE_BUSINESS_STORAGE_KEY,
  normalizeRestaurantParam,
  resolveActiveRestaurantId,
  setRestaurantParam,
} from '@/lib/active-business';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function readStoredRestaurantId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

interface SelectionState {
  activeId: string | null;
  ready: boolean;
}

export function useActiveBusinessSelection(
  restaurants: ReadonlyArray<{ id: string }>,
  initialId: string | null,
): {
  activeId: string | null;
  ready: boolean;
  select: (id: string | null) => void;
} {
  const searchParams = useSearchParams();
  const queryId = normalizeRestaurantParam(
    searchParams.get('restaurantId') ?? searchParams.get('restaurant'),
  );
  const idsKey = restaurants.map((r) => r.id).join(',');
  const [state, setState] = useState<SelectionState>({ activeId: initialId, ready: false });

  // Follow the URL / remembered business. Re-runs when the shell changes
  // `?restaurantId` (router.replace or replaceState both update searchParams).
  useIsomorphicLayoutEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    const next = resolveActiveRestaurantId({
      restaurants: ids.map((id) => ({ id })),
      queryRestaurantId: queryId,
      storedRestaurantId: readStoredRestaurantId(),
    });
    setState((prev) =>
      prev.ready && prev.activeId === next ? prev : { activeId: next, ready: true },
    );
  }, [queryId, idsKey]);

  // The shell also announces a switch with an event — covers re-picking the
  // business that is already in the URL (no searchParams change).
  useEffect(() => {
    const ids = new Set(idsKey ? idsKey.split(',') : []);
    const handler = (event: Event) => {
      const id = (event as CustomEvent<{ restaurantId?: string }>).detail?.restaurantId;
      if (!id || !ids.has(id)) return;
      setState((prev) => (prev.activeId === id ? prev : { activeId: id, ready: true }));
    };
    window.addEventListener('buaze:active-restaurant-change', handler);
    return () => window.removeEventListener('buaze:active-restaurant-change', handler);
  }, [idsKey]);

  const select = useCallback((id: string | null) => {
    setState({ activeId: id, ready: true });
    // `null` ("all businesses") is a local list filter only — the shell
    // always scopes to one business, so leave the URL and storage alone.
    if (!id) return;
    try {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, id);
    } catch {
      /* storage blocked — the URL still carries the selection */
    }
    const search = setRestaurantParam(window.location.search, id);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
    window.dispatchEvent(
      new CustomEvent('buaze:active-restaurant-change', { detail: { restaurantId: id } }),
    );
  }, []);

  return { activeId: state.activeId, ready: state.ready, select };
}
