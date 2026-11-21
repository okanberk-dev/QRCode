import { cookies, headers } from 'next/headers';
import { verifyAdminTokenForLayout, verifyJwt } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { adminActorFromPayload } from '@/lib/admin-session-row';
import {
  buildRestaurantListWhere,
  loadRestaurantListPage,
  parseRestaurantListQuery,
} from '@/lib/admin-restaurants-list';
import RestaurantsClient, { type Restaurant } from './RestaurantsClient';

export const dynamic = 'force-dynamic';

/** Same page size the client requests (/api/restaurants caps at 100). */
const PAGE_SIZE = 100;

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * True for a client-side update of this same page: useUrlFilter's
 * router.replace on every filter / debounced search change (and
 * router.refresh) re-renders the page on the server. RestaurantsClient keeps
 * its own rows and refetches through the API then (useState ignores new
 * props), so hydrating again would only repeat the list query and ship up to
 * 100 full rows in each RSC response. The router sends the client's current
 * tree (page segment without its search params) in `next-router-state-tree`;
 * a hard load or a navigation from another page does not carry
 * admin → restaurants → __PAGE__. Unreadable header → hydrate as before.
 */
function isSamePageUpdate(h: Headers): boolean {
  if (h.get('rsc') !== '1') return false;
  const raw = h.get('next-router-state-tree');
  if (!raw) return false;
  try {
    const segments: string[] = [];
    let node: unknown = JSON.parse(decodeURIComponent(raw));
    while (Array.isArray(node)) {
      const segment = node[0];
      segments.push(typeof segment === 'string' ? segment : '');
      const parallel = node[1] as { children?: unknown } | undefined;
      node = parallel?.children;
    }
    const i = segments.indexOf('admin');
    return i >= 0 && segments[i + 1] === 'restaurants' && (segments[i + 2] ?? '').startsWith('__PAGE__');
  } catch {
    return false;
  }
}

function firstParam(sp: SearchParams, key: string): string | null {
  const value = sp[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Admin businesses list. §40.10 server hydration: the first page for the
 * URL's filters is rendered with the page, so the list no longer waits for
 * hydration + a client round-trip. The query is the one GET /api/restaurants
 * runs (src/lib/admin-restaurants-list.ts), built from the same parameters
 * the client sends, so later client refetches return the same rows.
 */
export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialRows: Restaurant[] | undefined;
  let initialTotal: number | undefined;

  // An "owner gibi gör" session makes /api/restaurants answer for the
  // impersonated owner; keep the client path there.
  const userToken = cookieStore.get('user_token')?.value;
  const userPeek = userToken ? await verifyJwt(userToken) : null;
  const impersonating =
    !!userPeek && typeof userPeek.impersonating === 'object' && userPeek.impersonating !== null;

  if (adminToken && !impersonating && !isSamePageUpdate(await headers())) {
    try {
      // Same gate as the API (signature + role + password-rotation staleness).
      const payload = await verifyAdminTokenForLayout(adminToken);
      const actor = payload ? adminActorFromPayload(payload) : null;
      if (actor) {
        const sp = await searchParams;
        // Mirror RestaurantsClient.fetchRestaurants: useUrlFilter defaults
        // (status 'active', plan 'all'), attention/owner only when set.
        const qp = new URLSearchParams();
        qp.set('status', firstParam(sp, 'status') ?? 'active');
        qp.set('plan', firstParam(sp, 'plan') ?? 'all');
        const attention = firstParam(sp, 'attention') ?? '';
        if (attention) qp.set('attention', attention);
        const owner = firstParam(sp, 'owner') ?? '';
        if (owner) qp.set('ownerId', owner);
        qp.set('limit', String(PAGE_SIZE));
        qp.set('page', '1');

        const query = parseRestaurantListQuery(qp);
        const scopedIds = await getScopedRestaurantIds(actor);
        const where = await buildRestaurantListWhere(query, scopedIds);
        const { data, total } = await loadRestaurantListPage(where, query);
        // JSON round-trip: the client receives exactly what the API sends
        // (ISO date strings, Decimal → string), never class instances.
        initialRows = JSON.parse(JSON.stringify(data)) as Restaurant[];
        initialTotal = total;
      }
    } catch (error) {
      // Soft-fail: the client loads the list as before.
      console.error('[AdminRestaurantsPage] hydration failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
      });
      initialRows = undefined;
      initialTotal = undefined;
    }
  }

  return <RestaurantsClient initialRows={initialRows} initialTotal={initialTotal} />;
}
