// The customer's loyalty card inside the business's customer panel
// (CLAUDE.md §60, §61). The token in the URL is the card's secret: no-store,
// no referrer, not indexed, no third-party script (secure root). The QR on
// the card is the card link itself, so staff can scan it and the customer
// can reopen it. `?via=qr|nfc` (a scan at the counter) shows the arrival
// screen; the card can be added to the home screen as a small app.
//
// Staff mode: a panel user with access to this business (owner, team,
// admin) who opens the link — usually by scanning the customer's QR with
// the phone's own camera — gets the counter screen for this customer
// (src/lib/loyalty-staff.ts). `?view=customer` shows them the customer's
// card instead, without saving anything on their phone.
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
import { loadStaffCard, pickCardView, staffPanelHref } from '@/lib/loyalty-staff';
import { vapidPublicKey } from '@/lib/web-push';
import { pickPublicLocale } from '../../../loyalty-public';
import CardView from './CardView';
import StaffCounterView from './StaffCounterLazy';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ lang?: string; new?: string; via?: string; view?: string; from?: string }>;
}

const getCard = cache((token: string) => loadPublicLoyaltyCard(token));
/** Null for customers (no panel cookie: no work). */
const getStaff = cache((token: string, slug: string) => loadStaffCard(token, slug));

async function staffFor(params: PageProps['params'], searchParams: PageProps['searchParams']) {
  const [{ slug, token }, sp] = await Promise.all([params, searchParams]);
  if (sp.view === 'customer') return null;
  return getStaff(token, slug);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, token } = await params;
  const staff = await staffFor(params, searchParams);
  if (staff) {
    return {
      title: `Kasa modu — ${staff.restaurantName}`,
      robots: { index: false, follow: false },
      referrer: 'no-referrer',
      formatDetection: { telephone: false },
    };
  }
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

export async function generateViewport({ params, searchParams }: PageProps): Promise<Viewport> {
  const { token } = await params;
  if (await staffFor(params, searchParams)) return { ...ROOT_VIEWPORT, themeColor: '#111110' };
  const card = await getCard(token);
  if (!card) return ROOT_VIEWPORT;
  const pal = portalPalette(readLoyaltyPortal(card.program.portal).theme, card.program.accentColor);
  return { ...ROOT_VIEWPORT, themeColor: pal.band };
}

export default async function LoyaltyCardPage({ params, searchParams }: PageProps) {
  const { slug, token } = await params;
  const sp = await searchParams;
  const staff = await getStaff(token, slug);
  if (staff && pickCardView({ staffAccess: true, viewParam: sp.view }) === 'staff') {
    const staffLocale = pickPublicLocale(sp.lang, (await headers()).get('accept-language'));
    return (
      <StaffCounterView
        locale={staffLocale}
        restaurantId={staff.restaurantId}
        restaurantName={staff.restaurantName}
        moduleEnabled={staff.moduleEnabled}
        panelHref={staffPanelHref(staff, staffLocale)}
        customerHref={`/l/${slug}/k/${token}?view=customer${staffLocale === 'en' ? '&lang=en' : ''}`}
        program={staff.program}
        member={staff.member}
        access={staff.access}
        arrival={sp.from !== 'customer'}
      />
    );
  }

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
            branchNames={dto.business.branchNames}
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
          staffHref={staff ? `/l/${slug}/k/${token}?from=customer${locale === 'en' ? '&lang=en' : ''}` : null}
          pushKey={vapidPublicKey()}
        />
      </LoyaltyPortalFrame>
    </>
  );
}
