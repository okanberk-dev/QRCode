import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import AdminTopbar from '@/components/admin/AdminTopbar';
import AnnouncementBanner, { type DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner';
import {
  isAdminRole,
  verifyAdminTokenForLayout,
  verifyJwt,
  type PanelActor,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminTranslationProvider } from '@/components/admin/AdminTranslationProvider';
import { loadAdminPanelProfile, type AdminPanelProfile } from '@/lib/admin-profile';

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
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
  let payload: Awaited<ReturnType<typeof verifyJwt>> = null;
  let actor: PanelActor | null = null;

  try {
    if (token) {
      // CLAUDE.md §38 audit-api-401 — staleness-aware verifier matches the
      // API gate. Without it a token issued before the most recent admin
      // password rotation would render the panel chrome only for every
      // downstream fetch to 401.
      payload = await verifyAdminTokenForLayout(token);
      const role = getStringClaim(payload, 'role');
      isAuthenticated = !!payload && isAdminRole(role);
      if (isAuthenticated && role) {
        actor = {
          id: getStringClaim(payload, 'id') || 'env-admin',
          role,
          restaurantId: getStringClaim(payload, 'restaurantId'),
          username: getStringClaim(payload, 'username'),
          email: getStringClaim(payload, 'email') || getStringClaim(payload, 'username'),
          plan: getStringClaim(payload, 'plan'),
          source: 'admin',
        };
      }
    }
  } catch {
    isAuthenticated = false;
  }

  // Not authenticated — send to login (but not if already on /admin login or trial page)
  // Layout wraps all /admin/* so we only redirect if needed
  if (!isAuthenticated) {
    // Children will be the login page; don't redirect to avoid loop
  }

  // If authenticated as restaurant_owner with trial expired, redirect to trial-expired page
  if (isAuthenticated && payload?.role === 'restaurant_owner' && payload?.plan === 'trial') {
    // Logic for trial expiration check could go here if needed.
  }

  // Determine if we should show the sidebar.
  // We hide it if not authenticated.
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

  let announcements: DashboardAnnouncement[] = [];
  let adminProfile: AdminPanelProfile | null = null;
  if (showSidebar && actor) {
    [announcements, adminProfile] = await Promise.all([
      fetchActiveAnnouncements(adminLocale),
      loadAdminPanelProfile(actor),
    ]);
  }

  return (
    <AdminTranslationProvider initialLocale={adminLocale}>
      <div className="flex flex-col lg:flex-row min-h-[100dvh] lg:h-screen bg-[#FFFFFF] lg:overflow-hidden font-sans selection:bg-[#C6F24E]/30 relative">
        {showSidebar && (
          <a href="#panel-main-content" className="bz-skip-link">
            {adminLocale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
          </a>
        )}
        {showSidebar && <AdminSidebar announcements={announcements} initialProfile={adminProfile} />}
        <main
          id="panel-main-content"
          tabIndex={-1}
          /* §42 — `lg:overflow-auto` made this scroll container scrollable on
             BOTH axes, so any wide child (table, chart) let the whole panel
             slide left under the sidebar on a trackpad swipe ("panel kayması").
             Scroll vertically only, clip horizontal overflow, and reserve the
             scrollbar gutter so content width never jumps (owner shell parity,
             CLAUDE.md §42.5).
             `[&>*]:w-full` (sidebar layout only): page wrappers are
             `mx-auto max-w-[N]` flex items; auto margins disable stretch, so
             without a width they shrank to their content (CSV button cut off
             at 1440, sideways overflow at 390). */
          className={`flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:[scrollbar-gutter:stable] flex flex-col ${!showSidebar ? 'items-center justify-center min-h-[100dvh]' : 'pb-[calc(96px+env(safe-area-inset-bottom,0px))] lg:pb-0 bg-[#FAFAFA] [&>*]:w-full'}`}
        >
          {impersonationActive && <ImpersonationBanner />}
          {showSidebar && (
            <AdminTopbar
              announcements={announcements}
              displayName={adminProfile?.name || adminProfile?.username || null}
            />
          )}
          {/* §42 canonical panel layout — admin shell only renders chrome
              (topbar + announcement banner). Page wrappers handle their own
              `mx-auto max-w-[1100|1200|1400] px-4 sm:px-7 py-6 lg:py-8`. Owner
              shell parity (UserDashboardShell): no double-wrap, no extra pt. */}
          {showSidebar && announcements.length > 0 && (
            <AnnouncementBanner announcements={announcements} locale={adminLocale} />
          )}
          {children}
        </main>
        {showSidebar && <AdminMobileNav role={adminProfile?.role || actor?.role || 'manager'} />}
      </div>
    </AdminTranslationProvider>
  );
}
