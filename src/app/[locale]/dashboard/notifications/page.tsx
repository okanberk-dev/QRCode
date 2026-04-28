import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { verifyJwt } from '@/lib/auth';
import type { Locale } from '@/lib/translations';
import OwnerNotificationsForm from './OwnerNotificationsForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Bildirim ayarları — Buaze' : 'Notification settings — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function OwnerNotificationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);
  const payload = await verifyJwt(token);
  if (!payload) redirect(`/${locale}/auth/login`);

  return <OwnerNotificationsForm locale={locale} />;
}
