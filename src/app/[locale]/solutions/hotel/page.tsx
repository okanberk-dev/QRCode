// Singular design-spec slug alias — forwards to /solutions/hotels.
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export default async function HotelRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/solutions/hotels`);
}
