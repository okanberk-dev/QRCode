// Loyalty join page = the business's customer panel (CLAUDE.md §60, §61):
// cover, logo, welcome text, offers, contact, and the way in — one tap with
// the Buaze customer account, or a short guest form. Linked from the
// counter QR (`?source=qr`) and NFC tags (`?source=nfc`). Not indexed.
//
// Returning customers skip the form: when the signed-in account or this
// phone (httpOnly cookie, src/lib/loyalty-device.ts) already has a card
// here, the scan opens that card. `?new=1` opens the form anyway (a second
// person on the same phone).
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { prisma } from '@/lib/prisma';
import { activeRewards, earnRuleLine, loyaltyCardPath, normalizeKind, readLoyaltyTiers, rewardRuleLine } from '@/lib/loyalty';
import { loadPublicLoyaltyProgram, publicBusiness } from '@/lib/loyalty-server';
import { portalPalette, readLoyaltyPortal } from '@/lib/loyalty-portal';
import { getCustomerFromCookies } from '@/lib/customer-auth';
import { cardCookieName, readCardCookie } from '@/lib/loyalty-device';
import { ROOT_VIEWPORT } from '@/lib/root-metadata';
import LoyaltyPortalFrame from '@/components/loyalty/LoyaltyPortalFrame';
import PortalRewardsInfo from '@/components/loyalty/PortalRewardsInfo';
import ArrivalSplash from '@/components/loyalty/ArrivalSplash';
import SoundToggle from '@/components/loyalty/SoundToggle';
import { pickPublicLocale } from '../loyalty-public';
import JoinView from './JoinView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; source?: string; new?: string }>;
}

const getProgram = cache((slug: string) => loadPublicLoyaltyProgram(slug));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  return {
    title: program ? `${program.restaurant.name} — ${program.name}` : 'Buaze',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    formatDetection: { telephone: false },
  };
}

/** The phone's browser bar takes the business colour. */
export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return ROOT_VIEWPORT;
  const pal = portalPalette(readLoyaltyPortal(program.portal).theme, program.accentColor);
  return { ...ROOT_VIEWPORT, themeColor: pal.band };
}

function arrivalSource(value: string | undefined): 'qr' | 'nfc' | 'link' | null {
  return value === 'qr' || value === 'nfc' || value === 'link' ? value : null;
}

export default async function LoyaltyJoinPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const program = await getProgram(slug);
  if (!program) notFound();
  const account = await getCustomerFromCookies();
  const source = arrivalSource(sp.source);
  const via = source ? `?via=${source}` : '';

  if (sp.new !== '1') {
    // 1) The signed-in Buaze account has a card here.
    if (account) {
      const own = await prisma.loyaltyMember.findFirst({
        where: { programId: program.id, customerAccountId: account.id },
        select: { cardToken: true },
      });
      if (own) redirect(`${loyaltyCardPath(program.slug, own.cardToken)}${via}`);
    }
    // 2) This phone opened a card here before.
    const remembered = readCardCookie((await cookies()).get(cardCookieName(program.slug))?.value);
    if (remembered) {
      const card = await prisma.loyaltyMember.findFirst({
        where: { programId: program.id, cardToken: remembered },
        select: { cardToken: true },
      });
      if (card) redirect(`${loyaltyCardPath(program.slug, card.cardToken)}${via}`);
    }
  }

  const locale = pickPublicLocale(sp.lang ?? (account?.locale === 'en' ? 'en' : undefined), (await headers()).get('accept-language'));
  const kind = normalizeKind(program.kind);
  const rewards = activeRewards(program.rewards);
  const portal = readLoyaltyPortal(program.portal);
  const business = publicBusiness(program);
  const pal = portalPalette(portal.theme, program.accentColor);

  return (
    <>
      {source && source !== 'link' && (
        <ArrivalSplash
          locale={locale}
          mode="join"
          source={source}
          businessName={business.name}
          logoUrl={portal.logoUrl}
          coverUrl={portal.coverUrl}
          band={pal.band}
          onBand={pal.onBand}
          accent={pal.accent}
          headline={portal.headline}
        />
      )}
      <LoyaltyPortalFrame
        locale={locale}
        slug={program.slug}
        portal={portal}
        business={business}
        accentColor={program.accentColor}
        programName={program.name}
        account={account ? { firstName: account.firstName } : null}
        headerStart={<SoundToggle locale={locale} />}
        info={
          <PortalRewardsInfo
            locale={locale}
            earnLine={earnRuleLine(program, locale)}
            rewardLines={rewards.map((r) => rewardRuleLine(kind, r, locale))}
            birthdayReward={program.birthdayReward}
            tiers={readLoyaltyTiers(program.tiers)}
            terms={program.terms}
          />
        }
      >
        <JoinView
          locale={locale}
          slug={program.slug}
          businessName={program.restaurant.name}
          source={source ?? 'link'}
          account={
            account
              ? { firstName: account.firstName, lastName: account.lastName, phone: account.phone, email: account.email }
              : null
          }
          program={{
            name: program.name,
            kind,
            accentColor: program.accentColor,
            welcomeBonus: program.welcomeBonus,
            birthdayReward: program.birthdayReward,
            rewards: rewards.map((r) => ({ title: r.title, cost: r.cost })),
          }}
        />
      </LoyaltyPortalFrame>
    </>
  );
}
