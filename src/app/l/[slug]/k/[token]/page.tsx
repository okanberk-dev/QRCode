// The customer's loyalty card inside the business's customer panel
// (CLAUDE.md §60, §61). The token in the URL is the card's secret: no-store,
// no referrer, not indexed, no third-party script (secure root). The QR on
// the card is the card link itself, so staff can scan it and the customer
// can reopen it. `?via=qr|nfc` (a scan at the counter) shows the arrival
// screen; the card can be added to the home screen as a small app.
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import QRCode from 'qrcode';
import { loadPublicLoyaltyCard, loyaltyPublicBaseUrl, toPublicCardDto } from '@/lib/loyalty-server';
import { earnRuleLine, loyaltyCardPath, rewardRuleLine } from '@/lib/loyalty';
import { portalPalette, readLoyaltyPortal } from '@/lib/loyalty-portal';
import { getCustomerFromCookies } from '@/lib/customer-auth';
import { ROOT_VIEWPORT } from '@/lib/root-metadata';
import LoyaltyPortalFrame from '@/components/loyalty/LoyaltyPortalFrame';
import PortalRewardsInfo from '@/components/loyalty/PortalRewardsInfo';
import ArrivalSplash from '@/components/loyalty/ArrivalSplash';
import SoundToggle from '@/components/loyalty/SoundToggle';
import { pickPublicLocale } from '../../../loyalty-public';
import CardView from './CardView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ lang?: string; new?: string; via?: string }>;
}

const getCard = cache((token: string) => loadPublicLoyaltyCard(token));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, token } = await params;
  const card = await getCard(token);
  const name = card && card.program.slug === slug ? card.program.restaurant.name : null;
  return {
    title: name ? `${name} — ${card!.program.name}` : 'Sadakat kartı',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    formatDetection: { telephone: false },
    ...(name
      ? {
          manifest: `/l/${slug}/k/${token}/app-manifest`,
          appleWebApp: { capable: true, title: name.slice(0, 30), statusBarStyle: 'black-translucent' as const },
          icons: { apple: `/l/${slug}/app-icon?size=180` },
        }
      : {}),
  };
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  const { token } = await params;
  const card = await getCard(token);
  if (!card) return ROOT_VIEWPORT;
  const pal = portalPalette(readLoyaltyPortal(card.program.portal).theme, card.program.accentColor);
  return { ...ROOT_VIEWPORT, themeColor: pal.band };
}

export default async function LoyaltyCardPage({ params, searchParams }: PageProps) {
  const { slug, token } = await params;
  const sp = await searchParams;
  const card = await getCard(token);
  if (!card || card.program.slug !== slug) notFound();
  const account = await getCustomerFromCookies();
  const locale = pickPublicLocale(sp.lang ?? (account?.locale === 'en' ? 'en' : undefined), (await headers()).get('accept-language'));
  const url = `${loyaltyPublicBaseUrl()}${loyaltyCardPath(slug, token)}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const dto = toPublicCardDto(card);
  const pal = portalPalette(dto.portal.theme, card.program.accentColor);
  const via = sp.via === 'qr' || sp.via === 'nfc' ? sp.via : null;

  return (
    <>
      {via && sp.new !== '1' && (
        <ArrivalSplash
          locale={locale}
          mode="card"
          source={via}
          businessName={dto.business.name}
          logoUrl={dto.portal.logoUrl}
          coverUrl={dto.portal.coverUrl}
          band={pal.band}
          onBand={pal.onBand}
          accent={pal.accent}
          firstName={dto.member.firstName}
        />
      )}
      <LoyaltyPortalFrame
        locale={locale}
        slug={slug}
        portal={dto.portal}
        business={dto.business}
        accentColor={card.program.accentColor}
        programName={card.program.name}
        account={account ? { firstName: account.firstName } : null}
        headerStart={<SoundToggle locale={locale} />}
        info={
          <PortalRewardsInfo
            locale={locale}
            earnLine={earnRuleLine(card.program, locale)}
            rewardLines={dto.program.rewards.map((r) => rewardRuleLine(dto.program.kind, r, locale))}
            birthdayReward={dto.program.birthdayReward}
            tiers={dto.program.tiers}
            terms={dto.program.terms}
          />
        }
      >
        <CardView
          locale={locale}
          token={token}
          slug={slug}
          initial={dto}
          qrDataUrl={qrDataUrl}
          justJoined={sp.new === '1'}
          viewer={{ signedIn: Boolean(account), owns: Boolean(account && card.member.customerAccountId === account.id) }}
        />
      </LoyaltyPortalFrame>
    </>
  );
}
