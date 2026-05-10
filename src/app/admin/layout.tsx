import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import AdminTopbar from '@/components/admin/AdminTopbar';
import AnnouncementBanner, { type DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import { isAdminRole, verifyJwt, type PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminTranslationProvider } from '@/components/admin/AdminTranslationProvider';
import { loadAdminPanelProfile, type AdminPanelProfile } from '@/lib/admin-profile';

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

async function fetchActiveAnnouncements(locale: 'tr' | 'en'): Promise<DashboardAnnouncement[]> {
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
    return rows.map((a) => ({
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
      payload = await verifyJwt(token);
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
          className={`flex-1 lg:overflow-auto flex flex-col ${!showSidebar ? 'items-center justify-center min-h-[100dvh]' : 'pb-[calc(96px+env(safe-area-inset-bottom,0px))] lg:pb-0 bg-[#FAFAFA]'}`}
        >
          {showSidebar && (
            <AdminTopbar
              announcements={announcements}
              displayName={adminProfile?.name || adminProfile?.username || null}
            />
          )}
          <div className={showSidebar ? "max-w-7xl mx-auto w-full pt-2 sm:pt-6" : "w-full max-w-full"}>
            {showSidebar && announcements.length > 0 && (
              <AnnouncementBanner announcements={announcements} locale={adminLocale} />
            )}
            {children}
          </div>
        </main>
        {showSidebar && <AdminMobileNav role={adminProfile?.role || actor?.role || 'manager'} />}
      </div>
    </AdminTranslationProvider>
  );
}
