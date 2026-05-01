'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Generic URL-synced filter state hook (CLAUDE.md §28 + Linear/Stripe SaaS
 * pattern). Filter / tab / sort / page state'i `?key=value` query param'a
 * yansır → refresh sonrası state korunur, deeplink-friendly, browser back
 * doğal çalışır.
 *
 * Pattern:
 *   const filters = useUrlFilter({
 *     status: 'all',
 *     plan: 'all',
 *     search: '',
 *     page: 1,
 *   });
 *   filters.values.status     // current value (default if param absent)
 *   filters.set('status', 'active')   // updates state + URL
 *   filters.reset()           // back to defaults, URL clean
 *   filters.hasActive         // true if any non-default value present
 *
 * Sade ve type-safe: TypeScript defaults shape'inden values shape'ini infer
 * eder. Number ve boolean default'ları da string'e/number'a parse eder.
 *
 * URL update'i `router.replace({ scroll: false })` ile — browser history'e
 * yeni entry eklemez (back button beklenmedik davranmasın).
 */

type FilterValue = string | number | boolean;
type FilterDefaults = Record<string, FilterValue>;

type FilterValues<T extends FilterDefaults> = {
  [K in keyof T]: T[K];
};

export interface UrlFilterApi<T extends FilterDefaults> {
  values: FilterValues<T>;
  set: <K extends keyof T>(key: K, value: T[K] | null) => void;
  setMany: (updates: Partial<FilterValues<T>>) => void;
  reset: () => void;
  hasActive: boolean;
  toQueryString: () => string;
}

function parseValue<V extends FilterValue>(
  raw: string | null,
  fallback: V,
): V {
  if (raw === null) return fallback;
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : fallback) as V;
  }
  if (typeof fallback === 'boolean') {
    return (raw === 'true') as V;
  }
  return raw as V;
}

function isDefault<V extends FilterValue>(value: V, defaultValue: V): boolean {
  return value === defaultValue;
}

export function useUrlFilter<T extends FilterDefaults>(defaults: T): UrlFilterApi<T> {
  // Caller her render'da yeni object literal verirse referans değişikliği
  // set/setMany/hasActive/toQueryString callback'lerini destabilize eder
  // (useEffect deps'inde kullanılırsa loop riski). İlk render'daki defaults'u
  // dondururuz; default değerler runtime'da değişmemeli.
  const defaultsRef = useRef(defaults);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Derive current values from URL each render — single source of truth.
  // Hook consumers don't manage local useState; URL is canonical.
  const values = useMemo<FilterValues<T>>(() => {
    const out = {} as FilterValues<T>;
    for (const key in defaultsRef.current) {
      out[key] = parseValue(params.get(key), defaultsRef.current[key]);
    }
    return out;
  }, [params]);

  const writeUrl = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const set = useCallback<UrlFilterApi<T>['set']>(
    (key, value) => {
      const next = new URLSearchParams(params.toString());
      const def = defaultsRef.current[key];
      // null veya default → URL'den sil (clean URL)
      if (value === null || value === undefined || isDefault(value as FilterValue, def)) {
        next.delete(String(key));
      } else {
        next.set(String(key), String(value));
      }
      writeUrl(next);
    },
    [params, writeUrl],
  );

  const setMany = useCallback<UrlFilterApi<T>['setMany']>(
    (updates) => {
      const next = new URLSearchParams(params.toString());
      for (const key in updates) {
        const value = updates[key];
        const def = defaultsRef.current[key];
        if (value === null || value === undefined || isDefault(value as FilterValue, def)) {
          next.delete(String(key));
        } else {
          next.set(String(key), String(value));
        }
      }
      writeUrl(next);
    },
    [params, writeUrl],
  );

  const reset = useCallback(() => {
    writeUrl(new URLSearchParams());
  }, [writeUrl]);

  const hasActive = useMemo(() => {
    for (const key in defaultsRef.current) {
      if (!isDefault(values[key] as FilterValue, defaultsRef.current[key])) return true;
    }
    return false;
  }, [values]);

  const toQueryString = useCallback(() => {
    const next = new URLSearchParams();
    for (const key in defaultsRef.current) {
      const v = values[key];
      if (!isDefault(v as FilterValue, defaultsRef.current[key])) {
        next.set(String(key), String(v));
      }
    }
    return next.toString();
  }, [values]);

  // No-op effect: ensures state is reflected even if query params change
  // through external navigation. The useMemo above already does this.
  useEffect(() => {}, [values]);

  return { values, set, setMany, reset, hasActive, toQueryString };
}
