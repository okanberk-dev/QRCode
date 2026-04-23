// Turkish slug alias — forwards to the canonical /solutions/law-firms.
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export default async function HukukRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/solutions/law-firms`);
}
