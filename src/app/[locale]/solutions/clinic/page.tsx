// Design-spec slug alias — forwards to /solutions/healthcare.
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export default async function ClinicRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/solutions/healthcare`);
}
