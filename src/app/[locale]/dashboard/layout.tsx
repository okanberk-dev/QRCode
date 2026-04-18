import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserDashboardShell from '@/components/dashboard/UserDashboardShell';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

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

  return (
    <UserDashboardShell
      locale={locale}
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
