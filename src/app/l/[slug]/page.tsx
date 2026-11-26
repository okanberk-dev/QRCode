// Loyalty join page = the business's customer panel (CLAUDE.md §60, §61):
// cover, logo, welcome text, offers, contact, and the way in — one tap with
// the Buaze customer account, or a short guest form. Linked from the
// counter QR and NFC tags (`?source=nfc`). Not indexed.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { activeRewards, earnRuleLine, loyaltyCardPath, normalizeKind, readLoyaltyTiers, rewardRuleLine } from '@/lib/loyalty';
import { loadPublicLoyaltyProgram, publicBusiness } from '@/lib/loyalty-server';
import { readLoyaltyPortal } from '@/lib/loyalty-portal';
import { getCustomerFromCookies } from '@/lib/customer-auth';
import LoyaltyPortalFrame from '@/components/loyalty/LoyaltyPortalFrame';
import PortalRewardsInfo from '@/components/loyalty/PortalRewardsInfo';
import { pickPublicLocale } from '../loyalty-public';
import JoinView from './JoinView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; source?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await loadPublicLoyaltyProgram(slug);
  return {
    title: program ? `${program.name} — ${program.restaurant.name}` : 'Buaze',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function LoyaltyJoinPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const program = await loadPublicLoyaltyProgram(slug);
  if (!program) notFound();
  const account = await getCustomerFromCookies();
  const locale = pickPublicLocale(sp.lang ?? (account?.locale === 'en' ? 'en' : undefined), (await headers()).get('accept-language'));
  const kind = normalizeKind(program.kind);
  const rewards = activeRewards(program.rewards);
  const portal = readLoyaltyPortal(program.portal);
  const business = publicBusiness(program);
  const own = account
    ? await prisma.loyaltyMember.findFirst({
        where: { programId: program.id, customerAccountId: account.id },
        select: { cardToken: true },
      })
    : null;
  const source = sp.source === 'nfc' || sp.source === 'link' ? sp.source : 'qr';

  return (
    <LoyaltyPortalFrame
      locale={locale}
      slug={program.slug}
      portal={portal}
      business={business}
      accentColor={program.accentColor}
      programName={program.name}
      account={account ? { firstName: account.firstName } : null}
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
        source={source}
        ownCardPath={own ? loyaltyCardPath(program.slug, own.cardToken) : null}
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
  );
}
