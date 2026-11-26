// The customer's loyalty card inside the business's customer panel
// (CLAUDE.md §60, §61). The token in the URL is the card's secret: no-store,
// no referrer, not indexed. The QR on the card is the card link itself, so
// staff can scan it and the customer can reopen it.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { loadPublicLoyaltyCard, loyaltyPublicBaseUrl, toPublicCardDto } from '@/lib/loyalty-server';
import { earnRuleLine, loyaltyCardPath, rewardRuleLine } from '@/lib/loyalty';
import { getCustomerFromCookies } from '@/lib/customer-auth';
import LoyaltyPortalFrame from '@/components/loyalty/LoyaltyPortalFrame';
import PortalRewardsInfo from '@/components/loyalty/PortalRewardsInfo';
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
  const account = await getCustomerFromCookies();
  const locale = pickPublicLocale(sp.lang ?? (account?.locale === 'en' ? 'en' : undefined), (await headers()).get('accept-language'));
  const url = `${loyaltyPublicBaseUrl()}${loyaltyCardPath(slug, token)}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const dto = toPublicCardDto(card);
  return (
    <LoyaltyPortalFrame
      locale={locale}
      slug={slug}
      portal={dto.portal}
      business={dto.business}
      accentColor={card.program.accentColor}
      programName={card.program.name}
      account={account ? { firstName: account.firstName } : null}
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
  );
}
