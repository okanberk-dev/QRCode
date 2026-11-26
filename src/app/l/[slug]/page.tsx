// Loyalty join page (CLAUDE.md §60): what the card gives, and a short form.
// Linked from the counter QR. Not indexed (robots + X-Robots-Tag).
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { activeRewards, earnRuleLine, normalizeKind, readLoyaltyTiers, rewardRuleLine } from '@/lib/loyalty';
import { loadPublicLoyaltyProgram } from '@/lib/loyalty-server';
import { pickPublicLocale } from '../loyalty-public';
import JoinView from './JoinView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
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
  const { lang } = await searchParams;
  const program = await loadPublicLoyaltyProgram(slug);
  if (!program) notFound();
  const locale = pickPublicLocale(lang, (await headers()).get('accept-language'));
  const kind = normalizeKind(program.kind);
  const rewards = activeRewards(program.rewards);

  return (
    <JoinView
      locale={locale}
      slug={program.slug}
      businessName={program.restaurant.name}
      program={{
        name: program.name,
        kind,
        accentColor: program.accentColor,
        welcomeBonus: program.welcomeBonus,
        birthdayReward: program.birthdayReward,
        terms: program.terms,
        earnLine: earnRuleLine(program, locale),
        rewardLines: rewards.map((r) => rewardRuleLine(kind, r, locale)),
        rewards: rewards.map((r) => ({ title: r.title, cost: r.cost })),
        tiers: readLoyaltyTiers(program.tiers),
      }}
    />
  );
}
