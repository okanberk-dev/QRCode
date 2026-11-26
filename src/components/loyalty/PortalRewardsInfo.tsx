// "How it works" block of the customer panel (CLAUDE.md §61): earn rule,
// rewards, birthday gift, tiers, terms. Themed through the --p-* variables
// set by LoyaltyPortalFrame. No hooks.
import { Cake, Crown, Gift } from 'lucide-react';
import type { LoyaltyTier } from '@/lib/loyalty';

export default function PortalRewardsInfo({
  locale,
  earnLine,
  rewardLines,
  birthdayReward,
  tiers,
  terms,
}: {
  locale: 'tr' | 'en';
  earnLine: string;
  rewardLines: string[];
  birthdayReward: string | null;
  tiers: LoyaltyTier[];
  terms: string | null;
}) {
  const tr = locale === 'tr';
  return (
    <section
      aria-labelledby="portal-how"
      className="rounded-[22px] border p-4"
      style={{ background: 'var(--p-surface)', borderColor: 'var(--p-border)' }}
    >
      <h2 id="portal-how" className="text-[16px] font-semibold">
        {tr ? 'Nasıl çalışır?' : 'How it works'}
      </h2>
      <p className="mt-1.5 text-[14px]" style={{ color: 'var(--p-muted)' }}>
        {earnLine}
      </p>
      <ul className="mt-3 space-y-2">
        {rewardLines.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[14px]">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
            >
              <Gift size={13} aria-hidden />
            </span>
            {line}
          </li>
        ))}
        {birthdayReward && (
          <li className="flex items-start gap-2.5 text-[14px]">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FCE7F3] text-[#BE185D]">
              <Cake size={13} aria-hidden />
            </span>
            {tr ? 'Doğum günü hediyesi' : 'Birthday gift'}: {birthdayReward}
          </li>
        )}
        {tiers.map((tier) => (
          <li key={tier.name} className="flex items-start gap-2.5 text-[14px]">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#A16207]">
              <Crown size={13} aria-hidden />
            </span>
            <span>
              {tier.name}: {tr ? `${tier.minVisits}. ziyaretten sonra` : `from visit ${tier.minVisits}`}
              {tier.perk ? ` — ${tier.perk}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {terms && (
        <p className="mt-3 whitespace-pre-line border-t pt-3 text-[12.5px]" style={{ borderColor: 'var(--p-border)', color: 'var(--p-muted)' }}>
          {terms}
        </p>
      )}
    </section>
  );
}
