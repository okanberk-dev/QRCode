// Turkish + design-spec slug alias — forwards to /solutions/beauty-salon.
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export default async function SpaRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/solutions/beauty-salon`);
}
