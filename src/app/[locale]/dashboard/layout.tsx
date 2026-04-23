import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserDashboardShell from '@/components/dashboard/UserDashboardShell';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import type { Locale } from '@/lib/translations';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

async function fetchActiveAnnouncements(locale: Locale): Promise<DashboardAnnouncement[]> {
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
    console.error('[DashboardLayout announcements]', error);
    return [];
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();

  // Admin bypass: superadmin/manager reach the menu builder and other owner
  // dashboard pages via /admin/restaurants/[id]/menu -> this route. They have
  // an admin_token (not a user_token), so we let them through with a thin
  // "Admin görünümü" bar instead of the owner shell. The underlying APIs
  // gate on requireRestaurantAccess which already allows these roles.
  const adminToken = cookieStore.get('admin_token')?.value;
  if (adminToken) {
    const adminPayload = await verifyJwt(adminToken);
    if (adminPayload && isAdminRole(adminPayload.role)) {
      return (
        <div className="min-h-screen bg-[#FFFFFF]">
          <div className="border-b border-[#EDEDED] bg-[#0A0A0A] text-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
              <p className="text-[11px] font-black uppercase tracking-widest">
                Admin görünümü — {typeof adminPayload.username === 'string' ? adminPayload.username : 'superadmin'}
              </p>
              <Link
                href="/admin/restaurants"
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-white/20"
              >
                ← Admin paneli
              </Link>
            </div>
          </div>
          {children}
        </div>
      );
    }
  }

  const token = cookieStore.get('user_token')?.value;

  if (!token) {
    redirect(`/${locale}/auth/login`);
  }

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      trialEndsAt: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    redirect(`/${locale}/auth/login`);
  }

  const isTrialExpired = user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < new Date();
  if (isTrialExpired) {
    redirect(`/${locale}/pricing?trial=expired`);
  }

  const announcements = await fetchActiveAnnouncements(locale);
  const { logoUrl } = await getSiteSettings();

  return (
    <UserDashboardShell
      locale={locale}
      announcements={announcements}
      logoUrl={logoUrl}
      user={{
        name: user.name,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt?.toISOString() || null,
      }}
    >
      {children}
    </UserDashboardShell>
  );
}
