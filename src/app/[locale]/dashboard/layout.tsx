import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  isAdminRole,
  verifyAdminTokenForLayout,
  verifyJwt,
  verifyUserTokenForLayout,
  type PanelActor,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeamMemberRole } from '@/lib/panel-access';
import { getPanelRestaurants, getPanelUser, getToolUsage } from './_lib/panel-data';
import { toolVisibility } from '@/lib/feature-visibility';
import UserDashboardShell from '@/components/dashboard/UserDashboardShell';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import type { Locale } from '@/lib/translations';
import { getSiteSettings } from '@/lib/site-settings';
// React Query is only used inside the owner panel (useCurrentRole), so its
// provider lives here instead of the root layout — public pages don't ship it.
import { QueryProvider } from '@/components/providers/QueryProvider';
import '@/components/panel/pano/pano.css';

export const dynamic = 'force-dynamic';

// Stage 25 §38.101 Phase A #3 — process-local cache.
// Owner shell + admin shell her ikisi de aktif duyuruları fetch ediyordu;
// duyuru create/edit/delete frequency çok düşük. The cache is per serverless
// instance, so an admin save in /admin cannot clear it here (the old comment
// promised a `clearAnnouncementsCache()` that never existed). Keep the TTL
// short instead: an archived/critical announcement disappears from owner
// panels within a minute, while a cold query (take 5) stays cheap.
const ANNOUNCEMENTS_CACHE_TTL_MS = 60 * 1000;
const announcementsCache = new Map<Locale, { data: DashboardAnnouncement[]; expiresAt: number }>();

async function fetchActiveAnnouncements(locale: Locale): Promise<DashboardAnnouncement[]> {
  // Stage 25 §38.101 Phase A #3 — cache hit
  const cached = announcementsCache.get(locale);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  try {
    const now = new Date();
    const rows = await prisma.announcement.findMany({
      where: {
        status: 'published',
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ locale: 'all' }, { locale }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });
    const data: DashboardAnnouncement[] = rows.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      severity: a.severity as DashboardAnnouncement['severity'],
      priority: a.priority,
      ctaText: a.ctaText,
      ctaLink: a.ctaLink,
      isDismissible: a.isDismissible,
      updatedAt: a.updatedAt.toISOString(),
    }));
    announcementsCache.set(locale, { data, expiresAt: Date.now() + ANNOUNCEMENTS_CACHE_TTL_MS });
    return data;
  } catch (error) {
    console.error('[DashboardLayout announcements]', error);
    return [];
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();

  // Admin bypass: superadmin/manager reach the menu builder and other owner
  // dashboard pages via /admin/restaurants/[id]/menu -> this route. They have
  // an admin_token (not a user_token), so we let them through with a thin
  // "Admin görünümü" bar instead of the owner shell. The underlying APIs
  // gate on requireRestaurantAccess which already allows these roles.
  //
  // CLAUDE.md §38 audit-api-401 — use the staleness-aware verifier so a
  // password-rotated admin token doesn't render this branch only for every
  // API call to 401.
  //
  // "Owner gibi gör" (impersonation) keeps admin_token alive next to a
  // user_token carrying an `impersonating` claim. Checking admin_token first
  // sent impersonating admins to this thin admin bar: no owner shell, no
  // sidebar and — worst — no ImpersonationBanner, so there was no countdown
  // and no "Çıkış". The API layer already prefers the impersonated actor
  // (getPanelActorFromRequest §38.238); the layout now matches it. The
  // session itself is re-validated on every API call, and the banner's
  // actor-context fetch fails closed if it has ended.
  const adminToken = cookieStore.get('admin_token')?.value;
  const userTokenPeek = cookieStore.get('user_token')?.value;
  const peekPayload = userTokenPeek ? await verifyJwt(userTokenPeek) : null;
  const isImpersonating =
    !!peekPayload &&
    typeof peekPayload.impersonating === 'object' &&
    peekPayload.impersonating !== null;
  if (adminToken && !isImpersonating) {
    const adminPayload = await verifyAdminTokenForLayout(adminToken);
    if (adminPayload && isAdminRole(adminPayload.role)) {
      return (
        <div className="bz-panel min-h-dvh bg-pn-canvas">
          {/* Admin preview of the owner panel: a dark Pano bar instead of the
              owner navigation (docs/design/DASHBOARD_DESIGN.md §5.1). */}
          <div className="mx-2 mt-2 flex h-14 items-center justify-between gap-3 rounded-[24px] bg-pn-ink px-5 text-white">
            <p className="min-w-0 truncate text-[13px] text-white/70 sm:text-[14px]">
              {locale === 'en' ? 'Admin view' : 'Admin görünümü'} · {typeof adminPayload.username === 'string' ? adminPayload.username : 'superadmin'}
            </p>
            <Link
              href="/admin/restaurants"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-pn-accent px-4 text-[14px] font-medium text-pn-ink transition-colors hover:bg-pn-accent-hover"
            >
              {locale === 'en' ? '← Admin panel' : '← Admin paneli'}
            </Link>
          </div>
          <QueryProvider>{children}</QueryProvider>
        </div>
      );
    }
  }

  const token = cookieStore.get('user_token')?.value;

  if (!token) {
    redirect(`/${locale}/auth/login`);
  }

  // CLAUDE.md §38 audit-api-401 — full session check (matches API
  // `getUserFromRequest`). Bare `verifyJwt` previously admitted tokens
  // whose UserSession was revoked (logout-elsewhere, password reset,
  // post-Stage-19 missing row) — APIs rejected them and the user
  // bounced between rendering and 401 spam.
  const payload = await verifyUserTokenForLayout(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login`);
  }

  // Request-memoised (React cache): the page of this request reads the same
  // user and business list without another query.
  const user = await getPanelUser(payload.userId);

  if (!user || !user.isActive) {
    redirect(`/${locale}/auth/login`);
  }

  const isTrialExpired = user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < new Date();
  if (isTrialExpired) {
    redirect(`/${locale}/pricing?trial=expired`);
  }
  // A paid card period that ran out (CLAUDE.md §44): same gate as an expired trial.
  if (user.plan === 'expired') {
    redirect(`/${locale}/pricing?plan=expired`);
  }

  // §22 franchise destekli scope — sidebar workspace switcher + downstream
  // page'ler doğru subset görür. Owner kendi sahip olduğu tüm restoranları,
  // team_member (franchise area manager) `TeamMember.locations` array'indeki
  // alt-küme'yi görür. Eski flat `prisma.user.findUnique({ restaurants })`
  // pattern owner-only data dönüyordu; team_member için ya boş ya da
  // owner-blind IDOR riski yaratıyordu (envanter notlarına bkz).
  const actor: PanelActor = {
    id: user.id,
    role: user.role || 'restaurant_owner',
    restaurantId: null,
    username: null,
    email: user.email,
    plan: user.plan,
    source: 'user',
  };
  // §22 viewer-mode UI gating — team_member ise TeamMember.role'u çek;
  // owner için null döner (gating uygulanmaz). Helper Owner/admin/manager için
  // erken return ile DB hit yapmaz.
  //
  // Businesses: same scope (getScopedRestaurantIds) and order (createdAt asc)
  // as before; the shell shows the first 50. The full list is shared with the
  // page through the request cache (owners: one `userId` query).
  // Independent reads run side by side (each is a round trip to Supabase;
  // CLAUDE.md §14.1 readAll note). Announcements and site settings are cached.
  const [allRestaurants, teamRole, announcements, { logoUrl }] = await Promise.all([
    getPanelRestaurants(actor.id, actor.role, actor.email),
    getTeamMemberRole(actor),
    fetchActiveAnnouncements(locale),
    getSiteSettings(),
  ]);
  const viewerMode = teamRole === 'viewer';
  const restaurants = allRestaurants.slice(0, 50);
  // Cmd+K palette list — what `GET /api/restaurants` returned to it on every
  // open: active businesses in scope, newest first, at most 20.
  const paletteRestaurants = allRestaurants
    .filter((restaurant) => restaurant.isActive)
    .reverse()
    .slice(0, 20)
    .map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      category: restaurant.category,
    }));

  const totalFeedbacks = restaurants.reduce((sum, r) => sum + r._count.feedbacks, 0);
  // §57 — surveys / audits appear in "Araçlar" only for workspaces using them.
  const tools = toolVisibility(await getToolUsage(allRestaurants.map((r) => r.id)));

  return (
    <>
    <UserDashboardShell
      locale={locale}
      announcements={announcements}
      logoUrl={logoUrl}
      viewerMode={viewerMode}
      canAddBusiness={(user.role || 'restaurant_owner') !== 'team_member'}
      isImpersonating={isImpersonating}
      paletteRestaurants={paletteRestaurants}
      tools={tools}
      user={{
        name: user.name,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt?.toISOString() || null,
      }}
      workspace={{
        primaryName: restaurants[0]?.name ?? null,
        locationCount: restaurants.length,
        feedbackCount: totalFeedbacks,
        restaurants: restaurants.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          category: restaurant.category,
          primaryColor: restaurant.primaryColor,
          isActive: restaurant.isActive,
          menuEnabled: restaurant.menuEnabled,
          externalPlatformsEnabled: restaurant.externalPlatformsEnabled,
          feedbackCount: restaurant._count.feedbacks,
        })),
      }}
    >
      <QueryProvider>{children}</QueryProvider>
    </UserDashboardShell>
    </>
  );
}
