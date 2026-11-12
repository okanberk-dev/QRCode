'use client';

/**
 * "Your business on Google": the Places-based profile that leads the Google
 * reviews page for every business, independent of the optional Google sign-in
 * (reply feature), the admin switch and the Google quota.
 *
 * - not linked / listing gone  -> ConnectCard (search + pick)
 * - linked                     -> RatingCard + ProfileChecklist + SampleReviews
 *                                 (RatingStrip + checklist when the reply
 *                                 feature is fully set up)
 *
 * Mount it ONLY once the active business is resolved and key it by the
 * business id: no profile request or auto-search may ever be issued for a
 * provisional business (each Details call is billed).
 *
 * Storage stance: Places content lives in React state and in the module-level
 * in-memory copy of `places-client.ts` (10 minutes, lost on reload). Nothing
 * is written to localStorage / sessionStorage / IndexedDB.
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, Info } from 'lucide-react';
import { AlertBanner, ErrorState } from '@/components/ui';
import {
  hasManualReviewLink,
  placesOptionState,
  resolveRestaurantPlaceId,
  type PlacesProfileResponse,
  type PlacesSelectResponse,
} from '@/lib/google-places';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';
import { PlacesBusinessPicker } from './PlacesBusinessPicker';
import { PlacesProfileSkeleton } from './GoogleReviewsSkeleton';
import { ProfileChecklist, RatingCard, RatingStrip, SampleReviews } from './PlacesProfileCards';
import {
  BANNER_TOUCH_CLS,
  fetchPlacesProfile,
  forgetProfileMemory,
  placeMapsUrl,
  readProfileMemory,
  useCountdown,
  type PlacesPickerRestaurant,
  type ProfileFetchResult,
  type UiLocale,
} from './places-client';

const COPY = {
  tr: {
    connectTitle: "İşletmeni Google'da bul",
    connectBody:
      'Adını yaz, listeden seç. Puanın ve yorumların hemen gelir; Google hesabına giriş gerekmez.',
    unmatched:
      "Google yorum linkin kayıtlı ama Google'daki işletmeyle eşleşmedi. İşletmeni seçersen link otomatik güncellenir ve puanını hemen görürsün.",
    manualTitle: 'Google yorum linki',
    manualBody: 'Google araması şu an kullanılamıyor. Yorum linkini elle ekleyebilirsin.',
    manualBodyEdit: 'Google araması şu an kullanılamıyor. Kayıtlı linki elle düzenleyebilirsin.',
    manualBodyUnmatched:
      "Kayıtlı yorum linkin Google'daki işletmeyle eşleşmedi. Google araması şu an kullanılamıyor; linki elle düzenleyebilirsin.",
    manualAdd: 'Linki elle ekle',
    manualEdit: 'Linki düzenle',
    matched: (name: string) => `${name} Google'da bulundu ve eşlendi.`,
    next: (name: string) => `Sıradaki: ${name} →`,
    cancel: 'Vazgeç',
    errorTitle: 'Google bilgileri alınamadı',
    retry: 'Tekrar dene',
    retryWait: (n: number) => `${n} sn sonra`,
    staleWarn: "Google şu an yanıt vermedi; son alınan bilgiler gösteriliyor.",
    openOnGoogle: "Google'da aç",
    newTab: '(yeni sekmede açılır)',
  },
  en: {
    connectTitle: 'Find your business on Google',
    connectBody:
      'Type its name and pick it from the list. Your rating and reviews appear right away — no Google sign-in needed.',
    unmatched:
      'Your Google review link is saved but not matched to a Google listing. Pick your business and the link updates automatically.',
    manualTitle: 'Google review link',
    manualBody: "Google search isn't available right now. You can add your review link manually.",
    manualBodyEdit: "Google search isn't available right now. You can edit your saved link manually.",
    manualBodyUnmatched:
      "Your saved review link isn't matched to a Google listing. Google search isn't available right now; you can edit the link manually.",
    manualAdd: 'Add the link manually',
    manualEdit: 'Edit the link',
    matched: (name: string) => `${name} is matched to its Google listing.`,
    next: (name: string) => `Next: ${name} →`,
    cancel: 'Cancel',
    errorTitle: "Couldn't load Google details",
    retry: 'Try again',
    retryWait: (n: number) => `in ${n}s`,
    staleWarn: "Google didn't respond just now; showing the last details we received.",
    openOnGoogle: 'Open on Google',
    newTab: '(opens in a new tab)',
  },
} as const;

type Load =
  | { phase: 'idle' }
  | { phase: 'loading'; placeId: string }
  | { phase: 'done'; placeId: string; response: PlacesProfileResponse }
  | { phase: 'failed'; placeId: string; status: number | null };

function initialLoad(restaurantId: string, placeId: string | null): Load {
  if (!placeId) return { phase: 'idle' };
  const memory = readProfileMemory(restaurantId, placeId);
  return memory ? { phase: 'done', placeId, response: memory } : { phase: 'loading', placeId };
}

function fromResult(placeId: string, result: ProfileFetchResult): Load {
  if (result.kind === 'response') return { phase: 'done', placeId, response: result.response };
  return { phase: 'failed', placeId, status: result.kind === 'http' ? result.status : null };
}

type RefreshProblem = 'failed' | 'limit_restaurant' | 'limit_global';

interface MatchedNotice {
  name: string;
  next: { id: string; name: string } | null;
}

export interface PlacesProfileSectionProps {
  restaurant: PlacesPickerRestaurant;
  /** Every business of the owner (duplicate warning + the "next business" button). */
  restaurants: PlacesPickerRestaurant[];
  locale: UiLocale;
  /** The reply feature is fully set up (`status.connected && status.selectedLocation`). */
  oauthActive: boolean;
  /** The reply section's status request finished (no compact/full flicker before that). */
  statusLoaded: boolean;
  /** A listing was picked: the parent updates its copy of the business row. */
  onLinked: (result: PlacesSelectResponse, name: string) => void;
  /** What Google said about the saved listing (flips the switcher's state word). */
  onProfileState?: (restaurantId: string, state: 'found' | 'not_found') => void;
  /** Switch the page to another business ("Sıradaki: …"). */
  onSwitchBusiness?: (restaurantId: string) => void;
  /** Move focus into the search field when the picker appears. */
  focusSearch?: boolean;
  /** Anchor id of the reply section (link from the sample reviews). */
  replyAnchorId?: string;
  /**
   * What the server already knows (undefined = learn it from the requests):
   * `canWrite` false → read-only card at once; `placesConfigured` false →
   * the "search unavailable" row at once, no request.
   */
  canWrite?: boolean;
  placesConfigured?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// ConnectCard (module level: a stable identity keeps the picker mounted)
// ─────────────────────────────────────────────────────────────────────────

interface ConnectCardProps {
  restaurant: PlacesPickerRestaurant;
  restaurants: PlacesPickerRestaurant[];
  locale: UiLocale;
  canWrite: boolean | undefined;
  placesConfigured: boolean | undefined;
  autoSearch: boolean;
  autoFocus: boolean;
  notice: { kind: 'info' | 'warn'; text: string } | null;
  onSelected: (placeId: string, name: string, result: PlacesSelectResponse) => void;
  onForbidden: () => void;
  onCancel?: () => void;
}

function ConnectCard({
  restaurant,
  restaurants,
  locale,
  canWrite,
  placesConfigured,
  autoSearch,
  autoFocus,
  notice,
  onSelected,
  onForbidden,
  onCancel,
}: ConnectCardProps) {
  const copy = COPY[locale];
  const headingId = useId();
  // Search is known to be off (server said so) and the actor may edit: one
  // short card — one sentence saying what is wrong and what to do, the
  // manual-link button — instead of a disabled search form plus stacked
  // banners. The "saved link not matched" info is folded into that sentence;
  // only the "Google no longer finds this listing" warning stays a banner.
  // A read-only member still gets the picker's own read-only line.
  const searchOff = placesConfigured === false && canWrite !== false;
  const hasLink = hasManualReviewLink(restaurant);
  const shownNotice = searchOff && notice?.kind === 'info' ? null : notice;
  const searchOffBody =
    notice?.kind === 'info' ? copy.manualBodyUnmatched : hasLink ? copy.manualBodyEdit : copy.manualBody;
  const manualLinkHref = `/${locale}/dashboard/platforms/google?restaurantId=${encodeURIComponent(restaurant.id)}`;
  return (
    <section aria-labelledby={headingId} className="bz-card space-y-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="bz-h-tight text-[20px] leading-tight">
            {searchOff ? copy.manualTitle : copy.connectTitle}
          </h2>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-[#525252]">
            {searchOff ? searchOffBody : copy.connectBody}
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="bz-btn-ghost min-h-11 shrink-0">
            {copy.cancel}
          </button>
        )}
      </div>
      {shownNotice && (
        <AlertBanner
          kind={shownNotice.kind}
          icon={
            shownNotice.kind === 'info' ? (
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            ) : undefined
          }
        >
          {shownNotice.text}
        </AlertBanner>
      )}
      {searchOff ? (
        <Link href={manualLinkHref} className="bz-btn-ghost min-h-11 w-full sm:w-auto">
          {hasLink ? copy.manualEdit : copy.manualAdd}
        </Link>
      ) : (
        <PlacesBusinessPicker
          restaurant={restaurant}
          restaurants={restaurants}
          locale={locale}
          canWrite={canWrite}
          placesConfigured={placesConfigured}
          autoSearch={autoSearch}
          autoFocus={autoFocus}
          onSelected={onSelected}
          onForbidden={onForbidden}
        />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// The section
// ─────────────────────────────────────────────────────────────────────────

export function PlacesProfileSection({
  restaurant,
  restaurants,
  locale,
  oauthActive,
  statusLoaded,
  onLinked,
  onProfileState,
  onSwitchBusiness,
  focusSearch = false,
  replyAnchorId = 'google-reply',
  canWrite: serverCanWrite,
  placesConfigured,
}: PlacesProfileSectionProps) {
  const copy = COPY[locale];
  const placeId = resolveRestaurantPlaceId(restaurant);

  const [load, setLoad] = useState<Load>(() => initialLoad(restaurant.id, placeId));
  const [forbidden, setForbidden] = useState(false);
  const [changing, setChanging] = useState(false);
  const [matched, setMatched] = useState<MatchedNotice | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProblem, setRefreshProblem] = useState<RefreshProblem | null>(null);
  const [refreshBlocked, setRefreshBlocked] = useState(false);
  const refreshWait = useCountdown();
  const retryWait = useCountdown();

  const mountedRef = useRef(true);
  const placeIdRef = useRef(placeId);
  const headingRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    placeIdRef.current = placeId;
  }, [placeId]);

  // Load the profile of the saved listing: in-memory copy first, else ONE
  // request (single-flight, so the React StrictMode double effect is harmless).
  useEffect(() => {
    if (!placeId) {
      setLoad({ phase: 'idle' });
      return;
    }
    const memory = readProfileMemory(restaurant.id, placeId);
    if (memory) {
      setLoad({ phase: 'done', placeId, response: memory });
      return;
    }
    let cancelled = false;
    setLoad({ phase: 'loading', placeId });
    void fetchPlacesProfile(restaurant.id, placeId).then((result) => {
      if (!cancelled) setLoad(fromResult(placeId, result));
    });
    return () => {
      cancelled = true;
    };
  }, [restaurant.id, placeId]);

  // A `load` produced for another listing (the parent has just updated the row
  // after a pick) must never render for the new one: show the skeleton until
  // the effect above has started the new request.
  const current: Load =
    placeId && load.phase !== 'idle' && load.placeId !== placeId ? { phase: 'loading', placeId } : load;

  const response = current.phase === 'done' ? current.response : null;
  const okProfile = response?.state === 'ok' ? response.profile : undefined;
  const okFetchedAt = response?.state === 'ok' ? response.fetchedAt : undefined;
  const canWrite: boolean | undefined =
    forbidden || serverCanWrite === false ? false : response ? response.canWrite : serverCanWrite;

  // Tell the page what Google said, so the switcher's state word follows.
  const reportedRef = useRef<string>('');
  useEffect(() => {
    if (!response) return;
    const state = response.state === 'ok' ? 'found' : response.state === 'not_found' ? 'not_found' : null;
    if (!state) return;
    const key = `${restaurant.id}:${state}`;
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    onProfileState?.(restaurant.id, state);
  }, [response, restaurant.id, onProfileState]);

  // A transient failure carries a small cooldown for "Tekrar dene".
  useEffect(() => {
    if (response?.state === 'error' && response.error?.reason === 'upstream' && response.error.retryAfterSeconds) {
      retryWait.start(response.error.retryAfterSeconds);
    }
    // `retryWait.start` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const gridReady = Boolean(okProfile) && statusLoaded;

  // After a pick: move focus to the profile heading once the card exists.
  useEffect(() => {
    if (!gridReady || !pendingFocusRef.current) return;
    if (headingRef.current) {
      headingRef.current.focus();
      pendingFocusRef.current = false;
    }
  }, [gridReady]);

  const nextBusinessFor = useCallback((): { id: string; name: string } | null => {
    if (restaurants.length < 2) return null;
    const index = restaurants.findIndex((r) => r.id === restaurant.id);
    for (let step = 1; step < restaurants.length; step += 1) {
      const candidate = restaurants[(Math.max(0, index) + step) % restaurants.length];
      if (candidate && candidate.id !== restaurant.id && placesOptionState(candidate) !== 'found') {
        return { id: candidate.id, name: candidate.name };
      }
    }
    return null;
  }, [restaurants, restaurant.id]);

  const handleSelected = useCallback(
    (newPlaceId: string, name: string, result: PlacesSelectResponse) => {
      forgetProfileMemory(restaurant.id);
      setChanging(false);
      setRefreshProblem(null);
      setRefreshBlocked(false);
      setMatched({ name, next: nextBusinessFor() });
      pendingFocusRef.current = true;
      // Same listing picked again: nothing reloads, so move focus right away.
      if (newPlaceId === placeIdRef.current && headingRef.current) {
        headingRef.current.focus();
        pendingFocusRef.current = false;
      }
      onLinked(result, name);
    },
    [restaurant.id, nextBusinessFor, onLinked],
  );

  const handleForbidden = useCallback(() => setForbidden(true), []);

  const refresh = useCallback(async () => {
    const current = placeIdRef.current;
    if (!current || refreshing) return;
    setRefreshing(true);
    setRefreshProblem(null);
    refreshWait.start(30);
    const result = await fetchPlacesProfile(restaurant.id, current);
    if (!mountedRef.current || placeIdRef.current !== current) return;
    setRefreshing(false);
    if (result.kind === 'response') {
      const r = result.response;
      if (r.state === 'ok' || r.state === 'not_found') {
        setLoad({ phase: 'done', placeId: current, response: r });
        return;
      }
      if (r.state === 'error' && r.error && r.error.reason !== 'upstream') {
        setRefreshProblem(r.error.reason);
        setRefreshBlocked(true);
        return;
      }
    }
    // Keep what is on screen; say so.
    setRefreshProblem('failed');
    // `refreshWait.start` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id, refreshing]);

  const retry = useCallback(() => {
    const current = placeIdRef.current;
    if (!current) return;
    setLoad({ phase: 'loading', placeId: current });
    void fetchPlacesProfile(restaurant.id, current).then((result) => {
      if (mountedRef.current && placeIdRef.current === current) setLoad(fromResult(current, result));
    });
  }, [restaurant.id]);

  const mapsHref = placeId ? placeMapsUrl(placeId) : null;

  // ── pieces ────────────────────────────────────────────────────────────

  const matchedBanner = matched ? (
    <AlertBanner
      kind="success"
      onDismiss={() => setMatched(null)}
      className={BANNER_TOUCH_CLS}
      icon={<span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 self-center rounded-full bg-[#16A34A]" />}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-0">
        <span>{copy.matched(matched.name)}</span>
        {matched.next && onSwitchBusiness && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            onClick={() => {
              const id = matched.next!.id;
              setMatched(null);
              onSwitchBusiness(id);
            }}
          >
            {copy.next(matched.next.name)}
          </button>
        )}
      </span>
    </AlertBanner>
  ) : null;

  const openOnGoogleLink = mapsHref ? (
    <a
      href={mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline underline-offset-2"
    >
      {copy.openOnGoogle}
      <ExternalLink size={13} aria-hidden="true" />
      <span className="sr-only"> {copy.newTab}</span>
    </a>
  ) : null;

  const retryButton = (
    <button
      type="button"
      className="bz-btn-ghost min-h-11"
      aria-disabled={retryWait.left > 0}
      onClick={() => {
        if (retryWait.left > 0) return;
        retry();
      }}
    >
      {retryWait.left > 0 ? `${copy.retry} · ${copy.retryWait(retryWait.left)}` : copy.retry}
    </button>
  );

  const connectNotice: ConnectCardProps['notice'] =
    response?.state === 'not_found'
      ? { kind: 'warn', text: ownerGoogleMessage('profile_not_found', locale) }
      : hasManualReviewLink(restaurant)
        ? { kind: 'info', text: copy.unmatched }
        : null;

  const connectCard = (cancel?: () => void) => (
    <ConnectCard
      restaurant={restaurant}
      restaurants={restaurants}
      locale={locale}
      canWrite={canWrite}
      placesConfigured={placesConfigured}
      autoSearch={!cancel}
      autoFocus={Boolean(cancel) || focusSearch}
      notice={cancel ? null : connectNotice}
      onSelected={handleSelected}
      onForbidden={handleForbidden}
      onCancel={cancel}
    />
  );

  // ── body ──────────────────────────────────────────────────────────────

  let body: ReactNode;

  if (!placeId || current.phase === 'idle' || response?.state === 'not_linked' || response?.state === 'not_found') {
    body = connectCard();
  } else if (current.phase === 'loading') {
    body = <PlacesProfileSkeleton />;
  } else if (current.phase === 'failed') {
    body = (
      <ErrorState
        title={copy.errorTitle}
        body={
          <span className="flex flex-col items-center gap-3">
            <span>{ownerGoogleMessage(current.status === 401 ? 'UNAUTHORIZED' : 'profile_upstream', locale)}</span>
            {retryButton}
          </span>
        }
      />
    );
  } else if (response?.state === 'unavailable') {
    body = (
      <div className="bz-card space-y-2 p-5">
        <AlertBanner kind="info">{ownerGoogleMessage('profile_unavailable', locale)}</AlertBanner>
        {openOnGoogleLink}
      </div>
    );
  } else if (response?.state === 'error') {
    const reason = response.error?.reason ?? 'upstream';
    if (reason === 'upstream') {
      body = (
        <ErrorState
          title={copy.errorTitle}
          body={
            <span className="flex flex-col items-center gap-3">
              <span>{ownerGoogleMessage('profile_upstream', locale)}</span>
              {retryButton}
            </span>
          }
        />
      );
    } else {
      // Daily limits: no retry button (a retry on a tripped limit would loop).
      body = (
        <div className="bz-card space-y-2 p-5">
          <AlertBanner kind="warn">
            {ownerGoogleMessage(reason === 'limit_restaurant' ? 'profile_limit_restaurant' : 'profile_limit_global', locale)}
          </AlertBanner>
          {reason === 'limit_restaurant' && openOnGoogleLink}
        </div>
      );
    }
  } else if (okProfile && okFetchedAt) {
    if (!statusLoaded) {
      body = <PlacesProfileSkeleton />;
    } else {
      const compact = oauthActive;
      const refreshBanner =
        refreshProblem === null ? null : (
          <AlertBanner kind="warn">
            {refreshProblem === 'limit_restaurant'
              ? ownerGoogleMessage('profile_limit_restaurant', locale)
              : refreshProblem === 'limit_global'
                ? ownerGoogleMessage('profile_limit_global', locale)
                : copy.staleWarn}
          </AlertBanner>
        );
      body = (
        <div className="space-y-4">
          {changing && connectCard(() => setChanging(false))}
          {refreshBanner}
          {compact ? (
            <div className="grid grid-cols-1 items-start gap-4">
              <RatingStrip profile={okProfile} locale={locale} headingRef={headingRef} />
              <ProfileChecklist profile={okProfile} locale={locale} wide />
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              <RatingCard
                profile={okProfile}
                fallbackName={restaurant.name}
                fetchedAt={okFetchedAt}
                locale={locale}
                headingRef={headingRef}
                className="lg:col-start-1 lg:row-start-1"
                onChange={canWrite === false ? undefined : () => setChanging(true)}
                onRefresh={() => void refresh()}
                refreshing={refreshing}
                refreshWait={refreshWait.left}
                refreshBlocked={refreshBlocked}
              />
              <ProfileChecklist
                profile={okProfile}
                locale={locale}
                className="lg:col-start-2 lg:row-start-1 lg:row-span-2"
              />
              <SampleReviews
                profile={okProfile}
                locale={locale}
                className="lg:col-start-1 lg:row-start-2"
                replyAnchorId={replyAnchorId}
              />
            </div>
          )}
        </div>
      );
    }
  } else {
    body = <PlacesProfileSkeleton />;
  }

  return (
    <section className="space-y-4" aria-busy={current.phase === 'loading' || undefined}>
      {matchedBanner}
      {body}
    </section>
  );
}

export default PlacesProfileSection;
