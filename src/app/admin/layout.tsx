import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import AnnouncementBanner, { type DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import { isAdminRole, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminTranslationProvider } from '@/components/admin/AdminTranslationProvider';

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
  let payload: any = null;

  try {
    if (token) {
      payload = await verifyJwt(token);
      isAuthenticated = !!payload && isAdminRole(payload.role);
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

  const announcements = showSidebar ? await fetchActiveAnnouncements(adminLocale) : [];

  return (
    <AdminTranslationProvider initialLocale={adminLocale as any}>
      <div className="flex flex-col lg:flex-row min-h-[100dvh] lg:h-screen bg-[#FFFFFF] lg:overflow-hidden font-sans selection:bg-[#C6F24E]/30 relative">
        {showSidebar && (
          <a href="#panel-main-content" className="bz-skip-link">
            {adminLocale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
          </a>
        )}
        {showSidebar && <AdminSidebar />}
        <main
          id="panel-main-content"
          tabIndex={-1}
          className={`flex-1 lg:overflow-auto flex flex-col ${!showSidebar ? 'items-center justify-center min-h-[100dvh]' : 'pb-28 lg:pb-0 pt-2 sm:pt-6'}`}
        >
          <div className={showSidebar ? "max-w-7xl mx-auto w-full" : "w-full max-w-full"}>
            {showSidebar && announcements.length > 0 && (
              <AnnouncementBanner announcements={announcements} locale={adminLocale} />
            )}
            {children}
          </div>
        </main>
        {showSidebar && <AdminMobileNav />}
      </div>
    </AdminTranslationProvider>
  );
}
