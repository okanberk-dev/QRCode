'use client';

/**
 * "Find your business on Google": search + results + select (Places API
 * (New) via the app's own routes — no Google sign-in involved).
 *
 * Vocabulary: "bağla / connect" is reserved for the Google ACCOUNT sign-in of
 * the optional reply feature. This picker says bul / seç / eşle.
 *
 * Storage stance: search results live in React state only. The single browser
 * storage write is the `buaze.places.autosearch.{id}` sessionStorage boolean
 * that stops a reload from re-billing the automatic first search.
 *
 * Phase 2 reuses this component on the platforms page (props are generic).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { AlertBanner, Badge, useConfirmDialog } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import {
  defaultPlacesSearchQuery,
  isValidPlacesApiId,
  resolveRestaurantPlaceId,
  type PlacesSearchResultRow,
  type PlacesSelectResponse,
} from '@/lib/google-places';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';
import {
  BANNER_TOUCH_CLS,
  asRecord,
  bodyCode,
  hasAutoSearched,
  markAutoSearched,
  readJson,
  useCountdown,
  type PlacesPickerRestaurant,
  type UiLocale,
} from './places-client';

const MAX_RESULTS = 6;
const MAX_RATE_WAIT_SECONDS = 60;

const COPY = {
  tr: {
    label: 'İşletme adı ve semt',
    placeholder: "Örn. Mama's Burger Kadıköy",
    search: 'Ara',
    select: 'Bu işletmeyi seç',
    selecting: 'Seçiliyor…',
    selectAria: (name: string, address: string | null) =>
      `Bu işletmeyi seç: ${name}${address ? `, ${address}` : ''}`,
    tempClosed: 'Geçici olarak kapalı',
    permClosed: 'Kalıcı olarak kapandı',
    resultsSource: 'Sonuçlar',
    resultsLabel: 'Arama sonuçları',
    found: (n: number) => `${n} sonuç bulundu`,
    none: 'Sonuç bulunamadı',
    zero: 'Sonuç bulunamadı. Adı kısaltmayı ya da semt eklemeyi dene.',
    createProfile: "Google'da işletmem yok → Profil oluştur",
    alreadySelected: (name: string) => `Zaten ${name} için seçili`,
    retry: 'Tekrar dene',
    manualLink: 'Linki elle ekle',
    readOnly: 'Bu işletmenin Google profilini işletme yöneticisi seçebilir.',
    dirtyHint: 'Önce alttaki değişiklikleri kaydet.',
    replaceTitle: 'Google profili değişecek',
    replaceBody: (name: string) =>
      `Müşterilerin yorum yazmaya yönlendirildiği Google sayfası “${name}” olarak güncellenecek.`,
    replaceAlso: (name: string) => ` Bu kayıt ayrıca “${name}” için de seçili.`,
    replaceConfirm: 'Değiştir',
    dupTitle: 'Bu kayıt başka bir işletmende seçili',
    dupBody: (name: string) =>
      `Bu Google kaydı “${name}” için de seçili. Yine de bu işletme için seçmek istiyor musun?`,
    dupConfirm: 'Yine de seç',
    cancel: 'Vazgeç',
    newTab: '(yeni sekmede açılır)',
    wait: (n: number) => `${n} sn`,
    fallbackName: 'Google işletmesi',
  },
  en: {
    label: 'Business name and area',
    placeholder: "e.g. Mama's Burger Kadıköy",
    search: 'Search',
    select: 'Select this business',
    selecting: 'Selecting…',
    selectAria: (name: string, address: string | null) =>
      `Select this business: ${name}${address ? `, ${address}` : ''}`,
    tempClosed: 'Temporarily closed',
    permClosed: 'Permanently closed',
    resultsSource: 'Results',
    resultsLabel: 'Search results',
    found: (n: number) => `${n} results found`,
    none: 'No results found',
    zero: 'No results. Try a shorter name or add the neighbourhood.',
    createProfile: "I don't have a Google listing → Create a profile",
    alreadySelected: (name: string) => `Already selected for ${name}`,
    retry: 'Try again',
    manualLink: 'Add the link manually',
    readOnly: "Only a business manager can pick this business's Google profile.",
    dirtyHint: 'Save the changes below first.',
    replaceTitle: 'Google profile will change',
    replaceBody: (name: string) =>
      `The Google page customers are sent to for reviews will become “${name}”.`,
    replaceAlso: (name: string) => ` This listing is also selected for “${name}”.`,
    replaceConfirm: 'Change',
    dupTitle: 'This listing is selected for another business',
    dupBody: (name: string) =>
      `This Google listing is also selected for “${name}”. Do you still want to select it for this business?`,
    dupConfirm: 'Select anyway',
    cancel: 'Cancel',
    newTab: '(opens in a new tab)',
    wait: (n: number) => `${n}s`,
    fallbackName: 'Google business',
  },
} as const;

type Problem = 'failed' | 'daily_limit' | 'unavailable' | 'rate_limited' | 'session';

function text(value: unknown, max = 300): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

/** Defensive mapping of the search response (the server already normalises). */
function toSearchRows(data: unknown, fallbackName: string): PlacesSearchResultRow[] {
  const places = asRecord(data)?.places;
  if (!Array.isArray(places)) return [];
  const rows: PlacesSearchResultRow[] = [];
  for (const item of places) {
    const p = asRecord(item);
    if (!p) continue;
    const placeId = typeof p.placeId === 'string' ? p.placeId : '';
    if (!isValidPlacesApiId(placeId)) continue;
    const status = p.businessStatus;
    rows.push({
      placeId,
      displayName: text(p.displayName, 200) ?? fallbackName,
      formattedAddress: text(p.formattedAddress),
      googleMapsUri: null,
      businessStatus:
        status === 'OPERATIONAL' || status === 'CLOSED_TEMPORARILY' || status === 'CLOSED_PERMANENTLY'
          ? status
          : null,
      category: text(p.category, 120),
    });
    if (rows.length >= MAX_RESULTS) break;
  }
  return rows;
}

export interface PlacesBusinessPickerProps {
  restaurant: PlacesPickerRestaurant;
  /** Every business of the owner — used to warn about duplicate selections. */
  restaurants: PlacesPickerRestaurant[];
  locale: UiLocale;
  /**
   * False for a read-only team member (known from the profile response).
   * `undefined` / `true` = not known yet: the picker is optimistic and learns
   * the truth from a 403.
   */
  canWrite?: boolean;
  /**
   * False when the server already knows Places search is not set up: the
   * picker shows the "unavailable" row (with the manual-link button) at once
   * and issues no request. `undefined` / `true` = search normally.
   */
  placesConfigured?: boolean;
  /** A form on the same page has unsaved changes: searching/selecting waits. */
  dirty?: boolean;
  /** Run ONE search on mount (once per browser session per business). Default true. */
  autoSearch?: boolean;
  /** Move focus to the search field on mount. */
  autoFocus?: boolean;
  onSelected: (placeId: string, name: string, result: PlacesSelectResponse) => void;
  /** Search or select answered 403: the actor cannot write this business. */
  onForbidden?: () => void;
}

export function PlacesBusinessPicker({
  restaurant,
  restaurants,
  locale,
  canWrite,
  placesConfigured,
  dirty = false,
  autoSearch = true,
  autoFocus = false,
  onSelected,
  onForbidden,
}: PlacesBusinessPickerProps) {
  const copy = COPY[locale === 'en' ? 'en' : 'tr'];
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const seqRef = useRef(0);
  const autoRanRef = useRef(false);
  const onForbiddenRef = useRef(onForbidden);
  useEffect(() => {
    onForbiddenRef.current = onForbidden;
  }, [onForbidden]);

  const [query, setQuery] = useState(() => defaultPlacesSearchQuery(restaurant.name, restaurant.city));
  const unconfigured = placesConfigured === false;
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>(unconfigured ? 'error' : 'idle');
  const [results, setResults] = useState<PlacesSearchResultRow[]>([]);
  const [problem, setProblem] = useState<Problem | null>(unconfigured ? 'unavailable' : null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [live, setLive] = useState('');
  const rateWait = useCountdown();
  const [confirmDialog, askConfirm] = useConfirmDialog();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const readOnly = canWrite === false || forbidden;
  const manualLinkHref = `/${locale}/dashboard/platforms/google?restaurantId=${encodeURIComponent(restaurant.id)}`;

  const markForbidden = useCallback(() => {
    setForbidden(true);
    onForbiddenRef.current?.();
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2 || busyRef.current || dirty || unconfigured) return;
    busyRef.current = true;
    const seq = ++seqRef.current;
    setPhase('loading');
    setProblem(null);
    setSelectError(null);
    setLive('');
    try {
      const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurant.id)}/google/places/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, locale }),
      });
      const data = await readJson(res);
      if (!mountedRef.current || seq !== seqRef.current) return;

      if (res.ok) {
        const rows = toSearchRows(data, copy.fallbackName);
        setResults(rows);
        setPhase('done');
        setLive(rows.length > 0 ? copy.found(rows.length) : copy.none);
        return;
      }

      const code = bodyCode(data);
      setResults([]);
      if (res.status === 403) {
        markForbidden();
        setPhase('idle');
        return;
      }
      if (res.status === 401) setProblem('session');
      else if (res.status === 429 && code === 'DAILY_LIMIT') setProblem('daily_limit');
      else if (res.status === 429) {
        setProblem('rate_limited');
        const header = Number(res.headers.get('retry-after'));
        rateWait.start(Number.isFinite(header) && header > 0 ? Math.min(MAX_RATE_WAIT_SECONDS, Math.ceil(header)) : 15);
      } else if (code === 'GOOGLE_PLACES_NOT_CONFIGURED' || code === 'GOOGLE_PLACES_BUSY') setProblem('unavailable');
      else setProblem('failed');
      setPhase('error');
    } catch {
      if (!mountedRef.current || seq !== seqRef.current) return;
      setResults([]);
      setProblem('failed');
      setPhase('error');
    } finally {
      busyRef.current = false;
    }
    // `rateWait.start` is stable; copy/locale are derived from `locale`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dirty, unconfigured, restaurant.id, locale, markForbidden]);

  // One automatic search per browser session per business. The ref makes the
  // React StrictMode double effect (next dev) harmless; the sessionStorage
  // boolean makes a reload show the prefilled field + the button instead of
  // billing a second search. No per-keystroke search, ever.
  useEffect(() => {
    if (!autoSearch || unconfigured || readOnly || dirty || autoRanRef.current) return;
    if (query.trim().length < 2) return;
    autoRanRef.current = true;
    if (hasAutoSearched(restaurant.id)) return;
    markAutoSearched(restaurant.id);
    void runSearch();
    // Intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const duplicateOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of restaurants) {
      if (r.id === restaurant.id) continue;
      const pid = resolveRestaurantPlaceId(r);
      if (pid && !map.has(pid)) map.set(pid, r.name);
    }
    return map;
  }, [restaurants, restaurant.id]);

  const ask = useCallback(
    (opts: { title: string; body: string; confirmLabel: string }) =>
      new Promise<boolean>((resolve) => {
        askConfirm({
          title: opts.title,
          body: opts.body,
          confirmLabel: opts.confirmLabel,
          cancelLabel: copy.cancel,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }),
    [askConfirm, copy.cancel],
  );

  const submitSelect = useCallback(
    async (row: PlacesSearchResultRow) => {
      setSelecting(row.placeId);
      setSelectError(null);
      try {
        const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurant.id)}/google/places/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: row.placeId }),
        });
        const data = await readJson(res);
        const saved = asRecord(asRecord(data)?.restaurant);
        if (res.ok && saved) {
          onSelected(row.placeId, row.displayName, data as PlacesSelectResponse);
          return;
        }
        if (!mountedRef.current) return;
        const code = bodyCode(data);
        if (res.status === 403) {
          markForbidden();
          return;
        }
        const key =
          res.status === 401
            ? 'UNAUTHORIZED'
            : code === 'PLACE_NOT_FOUND' || code === 'GOOGLE_UNAVAILABLE' || code === 'RATE_LIMITED'
              ? code
              : null;
        setSelectError(ownerGoogleMessage(key, locale));
      } catch {
        if (mountedRef.current) setSelectError(ownerGoogleMessage(null, locale));
      } finally {
        if (mountedRef.current) setSelecting(null);
      }
    },
    [restaurant.id, locale, onSelected, markForbidden],
  );

  const choose = useCallback(
    async (row: PlacesSearchResultRow) => {
      if (selecting || dirty || readOnly) return;
      const current = resolveRestaurantPlaceId(restaurant);
      const replacing = current !== null && current !== row.placeId;
      const dupName = duplicateOf.get(row.placeId) ?? null;

      // ONE dialog even when both conditions hold: the confirm hook closes its
      // dialog after the previous callback resolves, so chaining two would
      // dismiss the second one immediately.
      if (replacing) {
        const ok = await ask({
          title: copy.replaceTitle,
          body: copy.replaceBody(row.displayName) + (dupName ? copy.replaceAlso(dupName) : ''),
          confirmLabel: copy.replaceConfirm,
        });
        if (!ok) return;
      } else if (dupName) {
        const ok = await ask({
          title: copy.dupTitle,
          body: copy.dupBody(dupName),
          confirmLabel: copy.dupConfirm,
        });
        if (!ok) return;
      }
      await submitSelect(row);
    },
    [selecting, dirty, readOnly, restaurant, duplicateOf, ask, copy, submitSelect],
  );

  // `aria-disabled` (not the native attribute): a button that becomes natively
  // disabled while focused drops keyboard focus to <body>. Clicks are ignored
  // in the handlers instead.
  const searchDisabled =
    phase === 'loading' || query.trim().length < 2 || dirty || rateWait.left > 0 || unconfigured;
  const DISABLED_CLS = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-y-0';

  if (readOnly) {
    return (
      <p className="rounded-[20px] border border-pn-line bg-pn-canvas px-4 py-3 text-[13px] leading-[1.6] text-[#525252]">
        {copy.readOnly}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (searchDisabled) return;
          void runSearch();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-[#262626]">
            {copy.label}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={180}
            className="bz-input min-h-11"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            aria-describedby={dirty ? hintId : undefined}
          />
        </div>
        <button
          type="submit"
          className={`bz-btn-primary min-h-11 w-full sm:w-auto ${DISABLED_CLS}`}
          aria-disabled={searchDisabled || undefined}
        >
          {phase === 'loading' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
          {copy.search}
          {rateWait.left > 0 ? ` (${copy.wait(rateWait.left)})` : ''}
        </button>
      </form>

      {dirty && (
        <p id={hintId} className="text-[13px] text-[#92400E]">
          {copy.dirtyHint}
        </p>
      )}

      {/* Always mounted, so screen readers announce text changes. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live}
      </p>

      {selectError && (
        <AlertBanner kind="danger" onDismiss={() => setSelectError(null)} className={BANNER_TOUCH_CLS}>
          {selectError}
        </AlertBanner>
      )}

      {problem === 'failed' && (
        <div className="space-y-3">
          <AlertBanner kind="warn">{ownerGoogleMessage('places_search_failed', locale)}</AlertBanner>
          <button type="button" className="bz-btn-ghost min-h-11" onClick={() => void runSearch()}>
            {copy.retry}
          </button>
        </div>
      )}
      {problem === 'session' && <AlertBanner kind="warn">{ownerGoogleMessage('UNAUTHORIZED', locale)}</AlertBanner>}
      {problem === 'rate_limited' && <AlertBanner kind="warn">{ownerGoogleMessage('RATE_LIMITED', locale)}</AlertBanner>}
      {(problem === 'daily_limit' || problem === 'unavailable') && (
        <div className="space-y-3">
          <AlertBanner kind={problem === 'daily_limit' ? 'warn' : 'info'}>
            {ownerGoogleMessage(problem === 'daily_limit' ? 'DAILY_LIMIT' : 'GOOGLE_PLACES_NOT_CONFIGURED', locale)}
          </AlertBanner>
          <Link href={manualLinkHref} className="bz-btn-ghost min-h-11">
            {copy.manualLink}
          </Link>
        </div>
      )}

      {phase === 'loading' && (
        <ul className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="space-y-2 rounded-[20px] border border-pn-line bg-white p-4">
              <SkBox className="h-4 w-56 max-w-full" />
              <SkBox className="h-3 w-80 max-w-full" />
              <SkBox className="h-5 w-24" />
            </li>
          ))}
        </ul>
      )}

      {phase === 'done' && results.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-pn-line-strong bg-pn-canvas px-4 py-4 text-[13px] leading-[1.6] text-[#525252]">
          <p>{copy.zero}</p>
          <a
            href="https://business.google.com/create"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-medium text-pn-ink underline-offset-2 hover:underline"
          >
            {copy.createProfile}
            <ExternalLink size={13} aria-hidden="true" />
            <span className="sr-only">{copy.newTab}</span>
          </a>
        </div>
      )}

      {phase === 'done' && results.length > 0 && (
        <div className="space-y-2">
          <ul className="space-y-2" aria-label={copy.resultsLabel}>
            {results.map((row) => {
              const dupName = duplicateOf.get(row.placeId) ?? null;
              const busy = selecting === row.placeId;
              return (
                <li
                  key={row.placeId}
                  className="flex flex-col gap-3 rounded-[20px] border border-pn-line bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[14.5px] font-medium leading-snug text-pn-ink">{row.displayName}</p>
                    {row.formattedAddress && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.5] text-[#525252]">{row.formattedAddress}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {row.category && (
                        <Badge kind="ghost" dot={false}>
                          {row.category}
                        </Badge>
                      )}
                      {row.businessStatus === 'CLOSED_TEMPORARILY' && <Badge kind="warn">{copy.tempClosed}</Badge>}
                      {row.businessStatus === 'CLOSED_PERMANENTLY' && <Badge kind="danger">{copy.permClosed}</Badge>}
                      {dupName && (
                        <Badge kind="info" dot={false}>
                          {copy.alreadySelected(dupName)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`bz-btn-primary min-h-11 w-full shrink-0 sm:w-auto ${DISABLED_CLS}`}
                    aria-label={copy.selectAria(row.displayName, row.formattedAddress)}
                    aria-busy={busy || undefined}
                    aria-disabled={Boolean(selecting) || dirty || undefined}
                    onClick={() => void choose(row)}
                  >
                    {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                    {busy ? copy.selecting : copy.select}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[12px] font-normal text-[#525252]">
            {copy.resultsSource}: Google Maps
          </p>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

export default PlacesBusinessPicker;
