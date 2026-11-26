// The customer's loyalty card (CLAUDE.md §60). The token in the URL is the
// card's secret: no-store, no referrer, not indexed. The QR on the card is the
// card link itself, so staff can scan it and the customer can reopen it.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { loadPublicLoyaltyCard, loyaltyPublicBaseUrl, toPublicCardDto } from '@/lib/loyalty-server';
import { loyaltyCardPath } from '@/lib/loyalty';
import { pickPublicLocale } from '../../../loyalty-public';
import CardView from './CardView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ lang?: string; new?: string }>;
}

export const metadata: Metadata = {
  title: 'Sadakat kartı',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function LoyaltyCardPage({ params, searchParams }: PageProps) {
  const { slug, token } = await params;
  const sp = await searchParams;
  const card = await loadPublicLoyaltyCard(token);
  if (!card || card.program.slug !== slug) notFound();
  const locale = pickPublicLocale(sp.lang, (await headers()).get('accept-language'));
  const url = `${loyaltyPublicBaseUrl()}${loyaltyCardPath(slug, token)}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return (
    <CardView
      locale={locale}
      token={token}
      slug={slug}
      initial={toPublicCardDto(card)}
      qrDataUrl={qrDataUrl}
      justJoined={sp.new === '1'}
    />
  );
}
