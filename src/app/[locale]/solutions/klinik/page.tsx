// Turkish slug alias — forwards to the canonical /solutions/healthcare.
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/translations';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export default async function KlinikRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/solutions/healthcare`);
}
