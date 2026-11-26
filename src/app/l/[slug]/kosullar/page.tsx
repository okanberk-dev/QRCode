import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadPublicLoyaltyProgram } from '@/lib/loyalty-server';
import { pickPublicLocale } from '../../loyalty-public';
import BusinessLegalPage from '../BusinessLegalPage';

// Üyelik koşulları of one business's loyalty programme (CLAUDE.md §61).
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await loadPublicLoyaltyProgram(slug);
  return {
    title: program ? `Üyelik koşulları — ${program.restaurant.name}` : 'Buaze',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const program = await loadPublicLoyaltyProgram(slug);
  if (!program) notFound();
  const locale = pickPublicLocale(lang, (await headers()).get('accept-language'));
  return <BusinessLegalPage program={program} locale={locale} docKey="sadakat-uyelik-kosullari" />;
}
