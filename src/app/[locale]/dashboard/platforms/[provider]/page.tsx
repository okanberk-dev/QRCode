import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; provider: string }>;
}

export default async function PlatformProviderRedirect({ params }: PageProps) {
  const { locale: localeParam, provider } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const suffix = provider ? `?provider=${encodeURIComponent(provider)}` : '';
  redirect(`/${locale}/dashboard/platforms${suffix}`);
}
