import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import CreateBusinessClient from './_components/CreateBusinessClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewRestaurantPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);
  }
  const tokenRole = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(tokenRole)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);

  // §22 — team_member / area manager cannot create businesses (backend
  // `canWriteRestaurant` + create POST gate). Bounce them to the list instead
  // of rendering a form they cannot submit.
  if ((user.role || 'restaurant_owner') === 'team_member') {
    redirect(`/${locale}/dashboard/restaurants`);
  }

  return (
    <CreateBusinessClient locale={locale} initialNotificationEmail={user.email} />
  );
}
