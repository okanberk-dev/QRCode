'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, RefreshCw } from 'lucide-react';
import { AlertBanner, Badge, EmptyState, PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { useActiveBusinessSelection } from '@/components/audits/useActiveBusinessSelection';
import { GoogleConnectFlashBanner } from '@/components/dashboard/google/GoogleConnectFlashBanner';
import { GoogleReplySection } from '@/components/dashboard/google/GoogleReplySection';
import { GoogleReviewsBodySkeleton } from '@/components/dashboard/google/GoogleReviewsSkeleton';
import { PlacesProfileSection } from '@/components/dashboard/google/PlacesProfileSection';
import { formatBusinessSummary } from '@/components/dashboard/google/places-client';
import {
  placesOptionState,
  placesOptionStateLabel,
  type PlacesOptionState,
  type PlacesSelectResponse,
} from '@/lib/google-places';

/** One business of the owner, as `/api/restaurants` lists it (the fields the Google page uses). */
export interface RestaurantRow {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
}

export interface GoogleReviewsClientProps {
  locale: Locale;
  /**
   * The owner's businesses, read on the server (the page passes them only for
   * a plain owner / team-member session). Undefined = fetch them here, as an
   * impersonating admin or an admin-only session must.
   */
  initialRestaurants?: RestaurantRow[];
  /** Server-known: false for a read-only team member. */
  canWrite?: boolean;
  /** Server-known: false when Places search is not set up. */
  placesConfigured?: boolean;
}

/** Badge tone of a business's Google state in the status line. */
const STATE_BADGE: Record<PlacesOptionState, 'ok' | 'warn' | 'off'> = {
  found: 'ok',
  unmatched: 'warn',
  'not-selected': 'off',
};

export function GoogleReviewsClient({
  locale,
  initialRestaurants,
  canWrite,
  placesConfigured,
}: GoogleReviewsClientProps) {
  const isTr = locale === 'tr';

  const [restaurants, setRestaurants] = useState<RestaurantRow[]>(initialRestaurants ?? []);
  // Hydrated from the server: the list is already here. Otherwise it is
  // fetched once on mount (and again on "Tekrar dene").
  const [loadingInitial, setLoadingInitial] = useState(initialRestaurants === undefined);
  // §38.B Stage 122 — workspace fetch silent fail bug. Previously
  // `/api/restaurants?limit=50` 4xx/5xx left `restaurants=[]` without any UI
  // signal — the page stuck on a spinner with no recovery path. Surface the
  // fetch failure as an AlertBanner with retry CTA so owners can act instead
  // of staring at an empty page.
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [reloadWorkspaceKey, setReloadWorkspaceKey] = useState(0);
  // Businesses whose saved Google listing Google no longer finds (the status
  // line shows "Eşleşmedi" for them even though a Place ID is stored).
  const [notFoundIds, setNotFoundIds] = useState<Set<string>>(new Set());
  // "Next: …" jumps to the next unmatched business and focuses its search.
  const [focusSearchFor, setFocusSearchFor] = useState<string | null>(null);

  // The business on screen follows the owner shell's business switcher
  // (sidebar / mobile top bar): `?restaurantId` → remembered business →
  // first business, plus the `buaze:active-restaurant-change` event. The page
  // has no picker of its own (§49 — one switcher per screen). `select` is used
  // only by "Sıradaki: …" and writes back the same way, so the shell follows.
  const { activeId: activeRestaurantId, ready: selectionReady, select: selectRestaurant } =
    useActiveBusinessSelection(restaurants, null);

  // A switch made elsewhere (shell) never moves focus into the search field;
  // only "Sıradaki: …" does, for the business it opens.
  useEffect(() => {
    setFocusSearchFor((prev) => (prev && prev !== activeRestaurantId ? null : prev));
  }, [activeRestaurantId]);

  // The reply region reports whether its first status request has settled and
  // whether the reply feature is fully set up. Keyed by business so a stale
  // report of the previous business never reaches the next one.
  const [replyState, setReplyState] = useState<{ id: string | null; settled: boolean; active: boolean }>({
    id: null,
    settled: false,
    active: false,
  });

  // The first run of the list effect below skips the request when the server
  // already sent the list.
  const skipFirstListFetchRef = useRef(initialRestaurants !== undefined);

  useEffect(() => {
    if (skipFirstListFetchRef.current) {
      skipFirstListFetchRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setWorkspaceError(null);
      try {
        const res = await fetch('/api/restaurants?limit=50');
        if (cancelled) return;
        if (!res.ok) {
          // §38.B Stage 122 — surface non-2xx instead of silently leaving
          // `restaurants=[]`. Owner-safe copy only: no server text and no
          // HTTP codes.
          setWorkspaceError(
            isTr
              ? 'İşletme listesi alınamadı. Biraz sonra tekrar dene.'
              : "Couldn't load your businesses. Please try again shortly.",
          );
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        // An empty list (new account) falls through to the "no business"
        // empty state below.
        setRestaurants(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        if (cancelled) return;
        console.error('[google-reviews] workspace fetch failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
        setWorkspaceError(
          isTr
            ? 'İşletme listesi alınamadı. Bağlantını kontrol edip tekrar dene.'
            : "Couldn't load your businesses. Check your connection and try again.",
        );
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTr, reloadWorkspaceKey]);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  // Status words, computed from the list rows alone (pure, no server call);
  // "not found" overrides a stored Place ID that Google no longer knows.
  const optionStateOf = (r: RestaurantRow): PlacesOptionState => {
    const base = placesOptionState(r);
    return base === 'found' && notFoundIds.has(r.id) ? 'unmatched' : base;
  };
  const matchedCount = restaurants.filter((r) => optionStateOf(r) === 'found').length;
  const activeState = activeRestaurant ? optionStateOf(activeRestaurant) : null;

  const handleLinked = (restaurantId: string, result: PlacesSelectResponse) => {
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === restaurantId
          ? {
              ...r,
              googlePlaceId: result.restaurant.googlePlaceId,
              googleReviewUrl: result.restaurant.googleReviewUrl,
            }
          : r,
      ),
    );
    setNotFoundIds((prev) => {
      if (!prev.has(restaurantId)) return prev;
      const next = new Set(prev);
      next.delete(restaurantId);
      return next;
    });
  };

  const handleProfileState = (restaurantId: string, state: 'found' | 'not_found') => {
    setNotFoundIds((prev) => {
      if (state === 'not_found' ? prev.has(restaurantId) : !prev.has(restaurantId)) return prev;
      const next = new Set(prev);
      if (state === 'not_found') next.add(restaurantId);
      else next.delete(restaurantId);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
      {/* §38 audit Fix #1 — connect button returnTo bu sayfa, callback
          ?google=connected|state-*|token-* status'lerini yakalar. */}
      <GoogleConnectFlashBanner locale={locale} />
      <PageHeader
        title={isTr ? 'Google Yorumları' : 'Google Reviews'}
        description={
          isTr
            ? 'Google puanını, yorumlarını ve profil eksiklerini tek yerde gör.'
            : 'See your Google rating, reviews and profile gaps in one place.'
        }
      />

      {workspaceError ? (
        // §38.B Stage 122 — `/api/restaurants?limit=50` fail. Previously
        // silent (spinner stuck forever); now surfaces with retry CTA so
        // the owner can recover without reloading the whole page.
        <div className="space-y-4">
          <AlertBanner kind="danger">{workspaceError}</AlertBanner>
          <button
            type="button"
            className="bz-btn-ghost min-h-11"
            onClick={() => setReloadWorkspaceKey((n) => n + 1)}
          >
            <RefreshCw size={13} aria-hidden="true" />
            {isTr ? 'Tekrar dene' : 'Try again'}
          </button>
        </div>
      ) : loadingInitial || (restaurants.length > 0 && (!selectionReady || !activeRestaurant)) ? (
        // Same flat skeleton as `loading.tsx` (identical geometry, no spinner):
        // the route fallback → client transition is not a second skeleton.
        <GoogleReviewsBodySkeleton />
      ) : restaurants.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} aria-hidden="true" />}
          title={isTr ? 'Henüz işletme yok' : 'No business yet'}
          body={
            isTr
              ? 'Google puanını ve yorumlarını görmek için önce bir işletme ekle.'
              : 'Add a business first to see its Google rating and reviews.'
          }
          action={
            <Link href={`/${locale}/dashboard/restaurants/new`} className="bz-btn-primary min-h-11">
              {isTr ? 'İşletme ekle' : 'Add a business'}
            </Link>
          }
        />
      ) : (
        <>
          {/* §49 — no page-level business picker: the shell's switcher
              (sidebar / mobile top bar) picks the business. For owners with
              several businesses one line says which business is on screen,
              its Google state and how many are matched overall. */}
          {restaurants.length > 1 && activeRestaurant && activeState && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] leading-[1.5] text-[#525252]">
              <span className="min-w-0 break-words font-medium text-[#0A0A0A]">{activeRestaurant.name}</span>
              <Badge kind={STATE_BADGE[activeState]}>{placesOptionStateLabel(activeState, locale)}</Badge>
              <span aria-hidden="true" className="hidden text-[#A3A3A3] sm:inline">
                ·
              </span>
              <span className="w-full sm:w-auto">{formatBusinessSummary(matchedCount, restaurants.length, locale)}</span>
            </div>
          )}

          {/* The profile section is mounted ONLY once the active business is
              resolved (never for a provisional one: each Details call is
              billed) and is keyed by it. */}
          {activeRestaurant && (
            <PlacesProfileSection
              key={`profile-${activeRestaurant.id}`}
              restaurant={activeRestaurant}
              restaurants={restaurants}
              locale={locale}
              oauthActive={replyState.id === activeRestaurant.id && replyState.active}
              statusLoaded={replyState.id === activeRestaurant.id && replyState.settled}
              canWrite={canWrite}
              placesConfigured={placesConfigured}
              onLinked={(result) => handleLinked(activeRestaurant.id, result)}
              onProfileState={handleProfileState}
              onSwitchBusiness={(id) => {
                setFocusSearchFor(id);
                selectRestaurant(id);
              }}
              focusSearch={focusSearchFor === activeRestaurant.id}
            />
          )}

          {activeRestaurant && (
            <GoogleReplySection
              key={`reply-${activeRestaurant.id}`}
              restaurantId={activeRestaurant.id}
              restaurantName={activeRestaurant.name}
              locale={locale}
              onReplyState={(id, state) => {
                setReplyState((prev) =>
                  prev.id === id && prev.settled === state.settled && prev.active === state.active
                    ? prev
                    : { id, settled: state.settled, active: state.active },
                );
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
