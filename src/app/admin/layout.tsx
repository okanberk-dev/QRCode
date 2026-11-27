import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import RootHtml from '@/components/root/RootHtml';
import { buildBaseMetadata, ROOT_VIEWPORT } from '@/lib/root-metadata';
import AdminPanoChrome from '@/components/admin/AdminPanoChrome';
import AnnouncementBanner, { type DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner';
import { verifyJwt, type PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminTranslationProvider } from '@/components/admin/AdminTranslationProvider';
import {
  authenticateAdminLayout,
  loadAdminPanelProfile,
  type AdminPanelProfile,
} from '@/lib/admin-profile';
import '@/components/panel/pano/pano.css';

// Root layout for the admin panel (one root layout per top-level segment,
// see src/components/root/RootHtml.tsx). It already reads cookies, so the
// <html lang> follows the admin's ADMIN_LOCALE choice; switching it reloads.
export const viewport: Viewport = ROOT_VIEWPORT;

export function generateMetadata(): Promise<Metadata> {
  return buildBaseMetadata();
}

// Per-instance cache; short TTL so admin edits propagate within a minute.
const ADMIN_ANNOUNCEMENTS_CACHE_TTL_MS = 60 * 1000;
const adminAnnouncementsCache = new Map<
  'tr' | 'en',
  { data: DashboardAnnouncement[]; expiresAt: number }
>();

async function fetchActiveAnnouncements(locale: 'tr' | 'en'): Promise<DashboardAnnouncement[]> {
  const cached = adminAnnouncementsCache.get(locale);
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
    const data = rows.map((a) => ({
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
    adminAnnouncementsCache.set(locale, {
      data,
      expiresAt: Date.now() + ADMIN_ANNOUNCEMENTS_CACHE_TTL_MS,
    });
    return data;
  } catch (error) {
    console.error('[AdminLayout announcements]', error);
    return [];
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  const adminLocale = (cookieStore.get('ADMIN_LOCALE')?.value === 'en' ? 'en' : 'tr') as 'tr' | 'en';

  let isAuthenticated = false;
  let actor: PanelActor | null = null;
  // Filled by the same AdminUser read that checked staleness; null means
  // "load it below the usual way" (env-admin / legacy path).
  let preloadedProfile: AdminPanelProfile | null = null;

  try {
    if (token) {
      // CLAUDE.md §38 audit-api-401 — staleness-aware verification matches
      // the API gate. Without it a token issued before the most recent admin
      // password rotation would render the panel chrome only for every
      // downstream fetch to 401. One AdminUser read decides staleness and
      // carries the profile + grants (§14.1, no repeated reads of the row).
      const auth = await authenticateAdminLayout(token);
      if (auth) {
        isAuthenticated = true;
        actor = auth.actor;
        preloadedProfile = auth.profile;
      }
    }
  } catch {
    isAuthenticated = false;
    actor = null;
    preloadedProfile = null;
  }

  // Unauthenticated requests only ever reach the login / password-recovery
  // pages (middleware redirects everything else), so the layout renders the
  // children without the panel chrome instead of redirecting.
  const showSidebar = isAuthenticated;

  // "Owner gibi gör" keeps admin_token next to an impersonating user_token.
  // While it is alive, every shared API (`/api/feedback`, `/api/restaurants`…)
  // resolves to the impersonated OWNER (getPanelActorFromRequest §38.238), so
  // an admin who navigated back to /admin saw owner-scoped lists or 403s with
  // nothing on screen explaining why and no way to end the session here.
  // Mount the same banner the owner shell uses — it validates the session via
  // /api/account/actor-context and renders nothing once it has ended.
  let impersonationActive = false;
  if (showSidebar) {
    const userToken = cookieStore.get('user_token')?.value;
    const userPeek = userToken ? await verifyJwt(userToken) : null;
    impersonationActive =
      !!userPeek && typeof userPeek.impersonating === 'object' && userPeek.impersonating !== null;
  }

  // Sequential, not Promise.all over Prisma reads (CLAUDE.md §14.1,
  // connection_limit=1). Announcements come from a 60 s process cache.
  let announcements: DashboardAnnouncement[] = [];
  let adminProfile: AdminPanelProfile | null = null;
  if (showSidebar && actor) {
    adminProfile = preloadedProfile ?? (await loadAdminPanelProfile(actor));
    announcements = await fetchActiveAnnouncements(adminLocale);
  }

  const pageColumn = (
          <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:[scrollbar-gutter:stable]">
            <main
              id="panel-main-content"
              tabIndex={-1}
              /* `[&>*]:w-full`: page wrappers are `mx-auto max-w-[N]` flex
                 items; auto margins disable stretch, so without a width they
                 shrank to their content (§42.1). */
              className={`flex min-h-0 min-w-0 flex-1 flex-col ${!showSidebar ? 'items-center justify-center min-h-[100dvh]' : 'pb-[env(safe-area-inset-bottom,0px)] lg:pt-2 [&>*]:w-full'}`}
            >
              {showSidebar && announcements.length > 0 && (
                <AnnouncementBanner announcements={announcements} locale={adminLocale} />
              )}
              {children}
            </main>
          </div>
  );

  return (
    <RootHtml lang={adminLocale}>
      <AdminTranslationProvider initialLocale={adminLocale}>
        {/* Pano shell (docs/design/DASHBOARD_DESIGN.md): icon rail on the
            left, pill tabs on top, canvas background. From lg up the page
            scrolls in its own column under the tabs — vertical only,
            horizontal clipped, stable gutter (CLAUDE.md §42.5.1). */}
        <div className="bz-panel relative flex min-h-[100dvh] flex-col bg-pn-canvas lg:h-screen lg:overflow-hidden">
          {impersonationActive && <ImpersonationBanner />}
          {showSidebar && (
            <a href="#panel-main-content" className="bz-skip-link">
              {adminLocale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
            </a>
          )}
          {showSidebar ? (
            <AdminPanoChrome
              announcements={announcements}
              profile={adminProfile}
              role={adminProfile?.role || actor?.role || 'manager'}
              permissions={adminProfile?.permissions ?? []}
            >
              {pageColumn}
            </AdminPanoChrome>
          ) : (
            pageColumn
          )}
        </div>
      </AdminTranslationProvider>
    </RootHtml>
  );
}
