'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Plug, RefreshCw } from 'lucide-react';
import { AlertBanner, EmptyState, PageHeader, PulseSelect } from '@/components/ui';
import type { Locale } from '@/lib/translations';
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
import { ACTIVE_BUSINESS_STORAGE_KEY, resolveActiveRestaurantId } from '@/lib/active-business';

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

export function GoogleReviewsClient({
  locale,
  initialRestaurants,
  canWrite,
  placesConfigured,
}: GoogleReviewsClientProps) {
  const isTr = locale === 'tr';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [restaurants, setRestaurants] = useState<RestaurantRow[]>(initialRestaurants ?? []);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  // Hydrated from the server: the list is already here, only the remembered
  // business (localStorage, unreadable on the server) is still to be resolved.
  const [loadingInitial, setLoadingInitial] = useState(initialRestaurants === undefined);
  // §38.B Stage 122 — workspace fetch silent fail bug. Previously
  // `/api/restaurants?limit=50` 4xx/5xx left `restaurants=[]` +
  // `activeRestaurantId=null` without any UI signal — the page stuck
  // on a spinner with no recovery path. Surface the fetch failure as
  // an AlertBanner with retry CTA so owners can act instead of staring
  // at an empty page.
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [reloadWorkspaceKey, setReloadWorkspaceKey] = useState(0);
  // Businesses whose saved Google listing Google no longer finds (the switcher
  // shows "Eşleşmedi" for them even though a Place ID is stored).
  const [notFoundIds, setNotFoundIds] = useState<Set<string>>(new Set());
  // "Next: …" jumps to the next unmatched business and focuses its search.
  const [focusSearchFor, setFocusSearchFor] = useState<string | null>(null);

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
    // Hydrated from the server: no request on the first run — only work out
    // which business is on screen (URL → remembered business → first).
    if (skipFirstListFetchRef.current) {
      skipFirstListFetchRef.current = false;
      const stored =
        typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY) : null;
      setActiveRestaurantId(
        resolveActiveRestaurantId({
          restaurants: initialRestaurants ?? [],
          queryRestaurantId: searchParams.get('restaurantId') ?? searchParams.get('restaurant'),
          storedRestaurantId: stored,
        }),
      );
      setLoadingInitial(false);
      return;
    }
    (async () => {
      setWorkspaceError(null);
      try {
        const res = await fetch('/api/restaurants?limit=50');
        if (!res.ok) {
          // §38.B Stage 122 — surface non-2xx instead of silently leaving
          // `restaurants=[]` + `activeRestaurantId=null` (the page used to sit
          // on a spinner with no recovery path). Owner-safe copy only: no
          // server text and no HTTP codes.
          setWorkspaceError(
            isTr
              ? 'İşletme listesi alınamadı. Biraz sonra tekrar dene.'
              : "Couldn't load your businesses. Please try again shortly.",
          );
          return;
        }
        const data = await res.json();
        const list = data.data ?? [];
        if (!list.length) {
          // §38.B Stage 122 — owner workspace gerçekten boş (yeni hesap,
          // henüz restaurant eklenmedi). Spinner çekilince empty state
          // görünür; aşağıdaki "no business" branch tetiklenir.
          setRestaurants([]);
          setActiveRestaurantId(null);
          return;
        }
        const requested = searchParams.get('restaurantId') ?? searchParams.get('restaurant');
        const stored =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY)
            : null;
        const resolved = resolveActiveRestaurantId({
          restaurants: list,
          queryRestaurantId: requested,
          storedRestaurantId: stored,
        });
        setRestaurants(list);
        setActiveRestaurantId(resolved ?? list[0]?.id ?? null);
      } catch (err) {
        console.error('[google-reviews] workspace fetch failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
        setWorkspaceError(
          isTr
            ? 'İşletme listesi alınamadı. Bağlantını kontrol edip tekrar dene.'
            : "Couldn't load your businesses. Check your connection and try again.",
        );
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [searchParams, isTr, reloadWorkspaceKey, initialRestaurants]);

  const selectRestaurant = (restaurantId: string) => {
    setActiveRestaurantId(restaurantId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('restaurant');
    params.set('restaurantId', restaurantId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  // Switcher state word. Computed from the list rows alone (pure, no server
  // call); "not found" overrides a stored Place ID that Google no longer knows.
  const optionStateOf = (r: RestaurantRow): PlacesOptionState => {
    const base = placesOptionState(r);
    return base === 'found' && notFoundIds.has(r.id) ? 'unmatched' : base;
  };
  const matchedCount = restaurants.filter((r) => optionStateOf(r) === 'found').length;
  const switcherOptions = restaurants.map((r) => ({
    value: r.id,
    label: `${r.name} · ${placesOptionStateLabel(optionStateOf(r), locale)}`,
  }));

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
        eyebrow="GOOGLE"
        title={isTr ? 'Google Yorumları' : 'Google Reviews'}
        description={
          isTr
            ? "İşletmeni Google'da bul; puanını, yorumlarını ve profil eksiklerini hemen gör."
            : 'Find your business on Google and instantly see your rating, reviews and profile gaps.'
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
      ) : loadingInitial || (restaurants.length > 0 && !activeRestaurant) ? (
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
          {restaurants.length > 1 && (
            <div className="space-y-2">
              <p id="google-switcher-summary" className="text-[12.5px] leading-[1.5] text-[#525252]">
                {formatBusinessSummary(matchedCount, restaurants.length, locale)}
              </p>
              <PulseSelect
                value={activeRestaurantId ?? ''}
                onChange={(id) => {
                  // A manual switch never moves focus into a search field (that
                  // is only for "Next: …", which sets the hint itself).
                  setFocusSearchFor(null);
                  selectRestaurant(id);
                }}
                options={switcherOptions}
                ariaLabel={isTr ? 'İşletme seç' : 'Select business'}
                aria-describedby="google-switcher-summary"
                className="w-full max-w-md"
              />
            </div>
          )}

          {/* §38.72 — Workspace cross-link hint (navigation, kept). Google
              Yorumları tek-platform; tüm platform durumu için
              /dashboard/platforms workspace overview'a link. */}
          <div className="flex min-h-11 items-center gap-2 text-[12px] text-[#525252]">
            <Plug size={12} strokeWidth={2} className="shrink-0" aria-hidden="true" />
            <span>
              {isTr ? 'Diğer platformları da yönetmek için ' : 'Manage other platforms in '}
              <Link
                href={`/${locale}/dashboard/platforms${
                  activeRestaurantId ? `?restaurantId=${encodeURIComponent(activeRestaurantId)}` : ''
                }`}
                className="inline-flex min-h-11 items-center rounded font-medium text-[#0A0A0A] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
              >
                {isTr ? 'Platform bağlantıları' : 'Platform links'}
              </Link>
              {isTr ? ' sayfasına git.' : '.'}
            </span>
          </div>

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
