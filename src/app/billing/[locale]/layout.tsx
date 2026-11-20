import type { Metadata, Viewport } from 'next';
import RootHtml from '@/components/root/RootHtml';
import { buildBaseMetadata, ROOT_VIEWPORT } from '@/lib/root-metadata';

// Root layout of the billing pages (/billing/{locale}/checkout, /result;
// billing spec D12, §3.4, CLAUDE.md §52). These pages hand the owner to
// PayNKolay's card page or come back from it, so they render NO third-party
// script: `RootHtml secure` drops analytics, the cookie banner and the Vercel
// scripts, and src/middleware.ts enforces a nonce + 'strict-dynamic' CSP.
// Dynamic on purpose: the nonce is per request. No notFound() here; an
// unknown locale segment is redirected to /billing/tr/… by the middleware.
export const dynamic = 'force-dynamic';
export const viewport: Viewport = ROOT_VIEWPORT;

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildBaseMetadata();
  return {
    ...base,
    title: { absolute: 'Buaze' },
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function BillingRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <RootHtml lang={locale === 'en' ? 'en' : 'tr'} secure>
      {children}
    </RootHtml>
  );
}
