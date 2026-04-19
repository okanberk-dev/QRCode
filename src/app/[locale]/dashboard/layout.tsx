import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserDashboardShell from '@/components/dashboard/UserDashboardShell';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import type { Locale } from '@/lib/translations';

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

  return (
    <UserDashboardShell
      locale={locale}
      announcements={announcements}
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
