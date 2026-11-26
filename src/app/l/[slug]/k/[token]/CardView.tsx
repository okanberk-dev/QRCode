'use client';

// The customer's digital loyalty card (CLAUDE.md §60). Polls every 15 s
// while the page is visible, so a stamp added at the counter shows up on the
// customer's phone right away.
import { useEffect, useRef, useState } from 'react';
import { Cake, Check, Crown, Gift, Loader2, Smartphone } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import {
  birthdayGiftAvailable,
  expiresAt,
  formatMemberCode,
  nextTier,
  tierFor,
  unitLabel,
} from '@/lib/loyalty';
import type { PublicCardDto } from '@/lib/loyalty-server';
import { CARD_STORAGE_PREFIX, PUBLIC_COPY, type PublicLocale } from '../../../loyalty-public';

const POLL_MS = 15_000;

export default function CardView({
  locale,
  token,
  slug,
  initial,
  qrDataUrl,
  justJoined,
}: {
  locale: PublicLocale;
  token: string;
  slug: string;
  initial: PublicCardDto;
  qrDataUrl: string;
  justJoined: boolean;
}) {
  const t = PUBLIC_COPY[locale];
  const tr = locale === 'tr';
  const [card, setCard] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [last4, setLast4] = useState('');
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const balanceRef = useRef(initial.member.balance);

  useEffect(() => {
    document.documentElement.lang = locale;
    setNow(new Date());
    try {
      window.localStorage.setItem(`${CARD_STORAGE_PREFIX}${slug}`, window.location.pathname);
    } catch {
      /* storage blocked */
    }
  }, [locale, slug]);

  useEffect(() => {
    if (left) return;
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/public/loyalty/card/${token}`, { cache: 'no-store' });
        if (res.status === 404) {
          setLeft(true);
          return;
        }
        if (!res.ok) return;
        const next = (await res.json()) as PublicCardDto;
        const gained = next.member.balance - balanceRef.current;
        if (gained > 0) {
          setToast(t.updated(gained, unitLabel(next.program.kind, gained, locale)));
          window.setTimeout(() => setToast(null), 4000);
        }
        balanceRef.current = next.member.balance;
        setCard(next);
      } catch {
        /* offline: try again next tick */
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [left, locale, t, token]);

  const leave = async () => {
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      const res = await fetch(`/api/public/loyalty/card/${token}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last4 }),
      });
      if (res.ok) {
        try {
          window.localStorage.removeItem(`${CARD_STORAGE_PREFIX}${slug}`);
        } catch {
          /* storage blocked */
        }
        setLeft(true);
        setLeaveOpen(false);
        return;
      }
      setLeaveError(res.status === 400 ? t.leaveWrong : t.errors.DEFAULT);
    } catch {
      setLeaveError(t.errors.DEFAULT);
    } finally {
      setLeaveBusy(false);
    }
  };

  if (left) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] px-4">
        <div className="max-w-[360px] text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8]">
            <Check size={22} />
          </span>
          <p className="mt-4 text-[16px] font-medium text-[#0A0A0A]">{t.leaveDone}</p>
        </div>
      </main>
    );
  }

  const { program, member, business } = card;
  const kind = program.kind;
  const tier = tierFor(member.visits, program.tiers);
  const upcoming = nextTier(member.visits, program.tiers);
  const birthday = now ? birthdayGiftAvailable(program, member, now) : false;
  const expiry = expiresAt(member, program.expiryDays);
  const dateFmt = (iso: string | Date) =>
    new Date(iso).toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-4 pb-12 pt-6">
      <div className="mx-auto w-full max-w-[440px]">
        {toast && (
          <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-[400px] rounded-2xl bg-[#0A0A0A] px-4 py-3 text-center text-[15px] font-semibold text-[#C6F24E] shadow-lg" role="status">
            {toast}
          </div>
        )}

        {justJoined && (
          <p className="mb-4 rounded-2xl bg-[#F0FDF4] px-4 py-3 text-[14px] text-[#166534]" role="status">
            {tr ? 'Kartınız açıldı. Bu sayfayı kaydedin ya da ana ekrana ekleyin.' : 'Your card is ready. Bookmark this page or add it to your home screen.'}
          </p>
        )}

        <LoyaltyCardFace
          businessName={business.name}
          programName={program.name}
          kind={kind}
          balance={member.balance}
          rewards={program.rewards}
          accentColor={business.color}
          memberName={member.firstName}
          code={member.code}
          tierName={tier?.name ?? null}
          locale={locale}
        />

        <section className="mt-4 rounded-2xl border border-[#EDEDED] bg-white p-5 text-center">
          <p className="text-[13px] font-medium text-[#525252]">{t.showAtCounter}</p>
          <img src={qrDataUrl} alt={tr ? 'Kart QR kodu' : 'Card QR code'} width={200} height={200} className="mx-auto mt-3 h-[200px] w-[200px]" />
          <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-[#737373]">{t.code}</p>
          <p className="font-mono text-[26px] font-semibold tracking-[0.18em] text-[#0A0A0A]">{formatMemberCode(member.code)}</p>
        </section>

        {birthday && program.birthdayReward && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-[#F5C6D6] bg-[#FFF1F5] px-4 py-3 text-[14px] text-[#831843]">
            <Cake size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {t.birthdayNow(program.birthdayReward)}
          </p>
        )}

        <section className="mt-4 rounded-2xl border border-[#EDEDED] bg-white p-4">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">{t.rewards}</h2>
          <ul className="mt-2 space-y-2">
            {program.rewards.map((r) => {
              const ready = member.balance >= r.cost;
              return (
                <li key={r.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${ready ? 'bg-[#F6FCE4]' : 'bg-[#FAFAFA]'}`}>
                  <span className="flex min-w-0 items-center gap-2 text-[14px] text-[#0A0A0A]">
                    <Gift size={16} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.title}</span>
                  </span>
                  <span className={`shrink-0 text-[12.5px] font-medium ${ready ? 'text-[#3F6212]' : 'text-[#737373]'}`}>
                    {ready ? t.rewardReady : t.rewardLeft(r.cost - member.balance, unitLabel(kind, r.cost - member.balance, locale))}
                  </span>
                </li>
              );
            })}
          </ul>
          {(tier || upcoming) && (
            <p className="mt-3 flex items-start gap-2 text-[13.5px] text-[#262626]">
              <Crown size={16} className="mt-0.5 shrink-0 text-[#CA8A04]" aria-hidden="true" />
              <span>
                {tier && <>{t.tierNow(tier.name)}{tier.perk ? ` — ${tier.perk}` : ''}. </>}
                {upcoming && t.tierNext(upcoming.visitsLeft, upcoming.tier.name)}
              </span>
            </p>
          )}
          {expiry && <p className="mt-2 text-[12.5px] text-[#737373]">{t.expires(dateFmt(expiry))}</p>}
          <p className="mt-2 text-[12.5px] text-[#737373]">
            {member.visits} {t.visits}
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-[#EDEDED] bg-white p-4">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">{t.history}</h2>
          {card.events.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#737373]">{t.noHistory}</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#F0F0F0]">
              {card.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                  <span className="min-w-0 truncate text-[#262626]">
                    {t.events[e.type] ?? e.type}
                    {e.rewardTitle ? `: ${e.rewardTitle}` : ''}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {e.amount !== 0 && (
                      <span className={`font-medium tabular-nums ${e.amount > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                        {e.amount > 0 ? '+' : ''}
                        {e.amount}
                      </span>
                    )}
                    <span className="text-[12px] text-[#A3A3A3]">{dateFmt(e.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 flex items-start gap-2 text-[12.5px] text-[#737373]">
          <Smartphone size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {t.homeScreen}
        </p>

        {program.terms && (
          <section className="mt-4 rounded-2xl border border-[#EDEDED] bg-white p-4">
            <h2 className="text-[13px] font-semibold text-[#0A0A0A]">{t.terms}</h2>
            <p className="mt-1 whitespace-pre-line text-[13px] text-[#525252]">{program.terms}</p>
          </section>
        )}

        <div className="mt-6 text-center">
          {!leaveOpen ? (
            <button type="button" onClick={() => setLeaveOpen(true)} className="min-h-[44px] text-[13px] text-[#737373] underline underline-offset-4">
              {t.leave}
            </button>
          ) : (
            <div className="rounded-2xl border border-[#FECACA] bg-white p-4 text-left">
              <p className="text-[15px] font-semibold text-[#0A0A0A]">{t.leaveTitle}</p>
              <p className="mt-1 text-[13px] text-[#525252]">{t.leaveBody}</p>
              <input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                className="mt-3 w-32 rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-center font-mono text-[18px] tracking-[0.3em]"
                aria-label={tr ? 'Telefonun son 4 hanesi' : 'Last 4 digits of the phone'}
                placeholder="••••"
              />
              {leaveError && <p className="mt-2 text-[13px] text-[#991B1B]" role="alert">{leaveError}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setLeaveOpen(false)} className="min-h-[44px] flex-1 rounded-xl border border-[#E5E5E5] text-[14px]">
                  {t.leaveCancel}
                </button>
                <button
                  type="button"
                  disabled={last4.length !== 4 || leaveBusy}
                  onClick={() => void leave()}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#B91C1C] text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  {leaveBusy ? <Loader2 size={16} className="animate-spin" /> : t.leaveConfirm}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[12px] text-[#A3A3A3]">{t.controller(business.name)}</p>
      </div>
    </main>
  );
}
