// Turkish slug alias — forwards to the canonical /solutions/hotels
// so design-spec and footer links work without duplicating content.
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export default async function OtelRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/solutions/hotels`);
}
