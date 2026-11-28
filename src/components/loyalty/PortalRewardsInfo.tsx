// "How it works" block of the customer panel (CLAUDE.md §61): earn rule,
// rewards, birthday gift, tiers, terms. Themed through the --p-* variables
// set by LoyaltyPortalFrame. No hooks.
import { Cake, Crown, Gift, Store, Sparkles } from 'lucide-react';
import type { LoyaltyTier } from '@/lib/loyalty';

export default function PortalRewardsInfo({
  locale,
  earnLine,
  rewardLines,
  birthdayReward,
  tiers,
  terms,
  branchNames = [],
}: {
  locale: 'tr' | 'en';
  earnLine: string;
  rewardLines: string[];
  birthdayReward: string | null;
  tiers: LoyaltyTier[];
  terms: string | null;
  /** Chain card (§61): the other businesses where it is valid. */
  branchNames?: string[];
}) {
  const tr = locale === 'tr';
  const row = 'flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-[14px] leading-snug';
  return (
    <section
      aria-labelledby="portal-how"
      className="rounded-[28px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      style={{ background: 'var(--p-surface)' }}
    >
      <h2 id="portal-how" className="text-[17px] font-medium tracking-[-0.01em] [font-family:var(--font-heading)]">
        {tr ? 'Nasıl çalışır?' : 'How it works'}
      </h2>
      <p className="mt-2 flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: 'var(--p-muted)' }}>
        <Sparkles size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--p-strong)' }} aria-hidden="true" />
        <span>{earnLine}</span>
      </p>
      {branchNames.length > 0 && (
        <p className="mt-2 flex items-start gap-2.5 text-[13.5px] leading-relaxed">
          <Store size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--p-strong)' }} aria-hidden="true" />
          <span>
            {tr ? 'Bu kart şu şubelerde de geçerli: ' : 'This card also works at: '}
            <strong className="font-semibold">{branchNames.join(', ')}</strong>
          </span>
        </p>
      )}
      <ul className="mt-3 space-y-1.5">
        {rewardLines.map((line) => (
          <li key={line} className={row} style={{ background: 'var(--p-bg)' }}>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
            >
              <Gift size={15} aria-hidden />
            </span>
            <span className="min-w-0 font-medium">{line}</span>
          </li>
        ))}
        {birthdayReward && (
          <li className={row} style={{ background: 'var(--p-bg)' }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FCE7F3] text-[#BE185D]">
              <Cake size={15} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="font-medium">{tr ? 'Doğum günü hediyesi' : 'Birthday gift'}</span>: {birthdayReward}
            </span>
          </li>
        )}
        {tiers.map((tier) => (
          <li key={tier.name} className={row} style={{ background: 'var(--p-bg)' }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#A16207]">
              <Crown size={15} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="font-medium">{tier.name}</span>: {tr ? `${tier.minVisits}. ziyaretten sonra` : `from visit ${tier.minVisits}`}
              {tier.perk ? ` — ${tier.perk}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {terms && (
        <p className="mt-4 whitespace-pre-line border-t pt-3 text-[12.5px] leading-relaxed" style={{ borderColor: 'var(--p-border)', color: 'var(--p-muted)' }}>
          {terms}
        </p>
      )}
    </section>
  );
}
