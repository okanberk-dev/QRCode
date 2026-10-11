'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export interface DebouncedUrlInput {
  /** Value bound to the <input>. Updates on every keystroke. */
  input: string;
  /** onChange handler — the URL is written after `delayMs` of inactivity. */
  setInput: (value: string) => void;
  /**
   * Set the input without a debounced write — for "clear" actions that write
   * the URL themselves in the same tick (e.g. `filters.setMany({ search: '' })`).
   */
  replaceInput: (value: string) => void;
}

/**
 * Text input bound to one URL-synced filter (search boxes).
 *
 * Binding an <input> straight to `filters.values.x` makes every keystroke wait
 * for a router round trip; React resets the field to the old URL value in the
 * meantime and typed characters are lost. This hook keeps a local value for
 * the field, writes the trimmed value to the URL after `delayMs`, and only
 * copies the URL back into the field when it changed from outside (back /
 * forward, deep link, a "clear filters" button) — never the echo of its own
 * write, so a trailing space the user is still typing is not stripped.
 *
 *   const search = useDebouncedUrlInput(filters.values.search, (v) =>
 *     filters.setMany({ search: v, page: 1 }),
 *   );
 *   <input value={search.input} onChange={(e) => search.setInput(e.target.value)} />
 */
export function useDebouncedUrlInput(
  urlValue: string,
  push: (value: string) => void,
  delayMs = 300,
): DebouncedUrlInput {
  const [input, setInput] = useState(urlValue);
  const lastPushedRef = useRef(urlValue);
  // Latest `push` — it closes over the current search params, so the timer
  // must call the newest one (an older closure would drop other filters that
  // changed while the user was typing).
  const pushRef = useRef(push);
  useEffect(() => {
    pushRef.current = push;
  });

  // URL → input, only for changes this hook did not write.
  useEffect(() => {
    if (urlValue === lastPushedRef.current) return;
    lastPushedRef.current = urlValue;
    setInput(urlValue);
  }, [urlValue]);

  // input → URL, debounced.
  useEffect(() => {
    const next = input.trim();
    if (next === lastPushedRef.current) return;
    const t = setTimeout(() => {
      lastPushedRef.current = next;
      pushRef.current(next);
    }, delayMs);
    return () => clearTimeout(t);
  }, [input, delayMs]);

  const replaceInput = useCallback((value: string) => {
    lastPushedRef.current = value.trim();
    setInput(value);
  }, []);

  return { input, setInput, replaceInput };
}
