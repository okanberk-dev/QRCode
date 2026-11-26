'use client';

// The customer's digital loyalty card (CLAUDE.md §60, §61).
//
// Live: the page listens to the card's event stream (SSE), so a stamp added
// at the counter lands on the phone at once — the stamp drops in, a short
// sound plays (if the visitor touched the page once; browsers require it)
// and the phone vibrates. Without the stream it polls. A reward that just
// became ready gets confetti. The QR opens full screen for the counter.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Cake, Check, Crown, Download, Eye, Gift, Loader2, Maximize2, Share, UserCheck, UserPlus, X } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import ConfettiBurst from '@/components/loyalty/ConfettiBurst';
import {
  activeRewards,
  birthdayGiftAvailable,
  expiresAt,
  formatMemberCode,
  nextTier,
  tierFor,
  unitLabel,
} from '@/lib/loyalty';
import type { PublicCardDto } from '@/lib/loyalty-server';
import { haptic, playSound } from '@/lib/loyalty-sound';
import { CARD_STORAGE_PREFIX, PUBLIC_COPY, type PublicLocale } from '../../../loyalty-public';

type Copy = (typeof PUBLIC_COPY)[PublicLocale];
type Celebration = { id: number; title: string; body?: string; confetti: boolean };

const POLL_FAST_MS = 8_000;
const POLL_SLOW_MS = 20_000;
const FAST_WINDOW_MS = 5 * 60_000;

export default function CardView({
  locale,
  token,
  slug,
  initial,
  qrDataUrl,
  justJoined,
  viewer,
  staffHref = null,
  pushKey = null,
}: {
  locale: PublicLocale;
  token: string;
  slug: string;
  initial: PublicCardDto;
  qrDataUrl: string;
  justJoined: boolean;
  /** Signed-in Buaze customer looking at this card (§61). */
  viewer: { signedIn: boolean; owns: boolean };
  /**
   * Set when a panel user opened the customer view from staff mode (§61):
   * a bar leads back, and nothing is saved on this (staff) phone.
   */
  staffHref?: string | null;
  /** VAPID public key: card notifications are available (§61). */
  pushKey?: string | null;
}) {
  const t = PUBLIC_COPY[locale];
  const tr = locale === 'tr';
  const [card, setCard] = useState(initial);
  const [highlightFrom, setHighlightFrom] = useState<number | null>(justJoined ? 0 : null);
  const [stampKey, setStampKey] = useState(0);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [fullQr, setFullQr] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [last4, setLast4] = useState('');
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const balanceRef = useRef(initial.member.balance);
  const lastEventRef = useRef<string | null>(initial.events[0]?.id ?? null);
  const openedAt = useRef(Date.now());
  const celebrationId = useRef(0);

  const celebrate = useCallback((c: Omit<Celebration, 'id'>) => {
    celebrationId.current += 1;
    const id = celebrationId.current;
    setCelebration({ ...c, id });
    window.setTimeout(() => setCelebration((cur) => (cur?.id === id ? null : cur)), 3400);
  }, []);

  // React to what changed since the last read (stream or poll alike).
  const applyCard = useCallback(
    (next: PublicCardDto) => {
      const before = balanceRef.current;
      const after = next.member.balance;
      const kind = next.program.kind;
      const newestId = next.events[0]?.id ?? null;
      const fresh: PublicCardDto['events'] = [];
      for (const e of next.events) {
        if (e.id === lastEventRef.current) break;
        fresh.push(e);
      }
      lastEventRef.current = newestId;
      balanceRef.current = after;
      setCard(next);
      if (fresh.length === 0) return;
      const latest = fresh[0];
      const wasReady = activeRewards(next.program.rewards).some((r) => r.cost <= before);
      const isReady = activeRewards(next.program.rewards).some((r) => r.cost <= after);
      if (latest.type === 'earn' || latest.type === 'birthday' || (latest.type === 'adjust' && after > before)) {
        const gained = Math.max(0, after - before);
        if (kind === 'stamps') setHighlightFrom(before);
        else setHighlightFrom(0);
        setStampKey((k) => k + 1);
        haptic([18, 50, 24]);
        if (!wasReady && isReady) {
          playSound('stamp');
          window.setTimeout(() => playSound('reward'), 420);
          celebrate({ title: tr ? 'Ödülünüz hazır!' : 'Your reward is ready!', body: tr ? 'Kasada isteyin.' : 'Ask for it at the counter.', confetti: true });
        } else {
          playSound('stamp');
          celebrate({
            title: latest.type === 'birthday' ? (tr ? 'İyi ki doğdunuz!' : 'Happy birthday!') : `+${gained || latest.amount} ${unitLabel(kind, gained || latest.amount, locale)}`,
            body: tr ? 'Kartınıza eklendi.' : 'Added to your card.',
            confetti: latest.type === 'birthday',
          });
        }
        return;
      }
      if (latest.type === 'redeem') {
        haptic([24, 60, 24]);
        playSound('reward');
        celebrate({
          title: tr ? 'Afiyet olsun!' : 'Enjoy!',
          body: latest.rewardTitle ? (tr ? `${latest.rewardTitle} verildi.` : `${latest.rewardTitle} given.`) : undefined,
          confetti: true,
        });
      }
    },
    [celebrate, locale, tr],
  );

  const refresh = useCallback(
    async (remember = false) => {
      if (left) return;
      try {
        const res = await fetch(`/api/public/loyalty/card/${token}${remember ? '?remember=1' : ''}`, { cache: 'no-store' });
        if (res.status === 404) {
          setLeft(true);
          return;
        }
        if (!res.ok) return;
        applyCard((await res.json()) as PublicCardDto);
      } catch {
        /* offline: the next tick tries again */
      }
    },
    [applyCard, left, token],
  );

  // Mount: remember this phone, start the clock, celebrate a fresh card.
  // A staff preview remembers nothing: the staff phone is not the customer's.
  useEffect(() => {
    document.documentElement.lang = locale;
    setNow(new Date());
    if (!staffHref) {
      try {
        window.localStorage.setItem(`${CARD_STORAGE_PREFIX}${slug}`, window.location.pathname);
      } catch {
        /* storage blocked */
      }
    }
    void refresh(!staffHref);
    if (justJoined) {
      haptic([16, 40, 20]);
      playSound('stamp');
      celebrate({ title: tr ? 'Kartınız açıldı' : 'Your card is ready', body: tr ? 'Kasada bu kartı gösterin.' : 'Show this card at the counter.', confetti: true });
      // Drop ?new=1 so a reload does not celebrate again.
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live stream; polling only when the stream is not there.
  useEffect(() => {
    if (left) return;
    let es: EventSource | null = null;
    let streaming = false;
    let timer: number | null = null;

    const schedulePoll = () => {
      if (timer !== null) window.clearTimeout(timer);
      const fast = Date.now() - openedAt.current < FAST_WINDOW_MS;
      timer = window.setTimeout(async () => {
        if (document.visibilityState === 'visible' && !streaming) await refresh();
        schedulePoll();
      }, streaming ? POLL_SLOW_MS * 3 : fast ? POLL_FAST_MS : POLL_SLOW_MS);
    };

    const openStream = () => {
      if (typeof EventSource === 'undefined' || es) return;
      es = new EventSource(`/api/public/loyalty/card/${token}/events`);
      es.addEventListener('open', () => {
        streaming = true;
      });
      es.addEventListener('change', () => {
        void refresh();
      });
      es.addEventListener('error', () => {
        streaming = false;
        if (es && es.readyState === EventSource.CLOSED) es = null;
      });
    };
    const closeStream = () => {
      es?.close();
      es = null;
      streaming = false;
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        openStream();
        void refresh();
      } else {
        closeStream();
      }
    };

    if (document.visibilityState === 'visible') openStream();
    schedulePoll();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer !== null) window.clearTimeout(timer);
      closeStream();
    };
  }, [left, refresh, token]);

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
      setLeaveError(res.status === 400 ? t.leaveWrong : res.status === 429 ? t.errors.RATE_LIMIT : t.errors.DEFAULT);
    } catch {
      setLeaveError(t.errors.DEFAULT);
    } finally {
      setLeaveBusy(false);
    }
  };

  if (left) {
    return (
      <div className="py-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
          <Check size={22} />
        </span>
        <p className="mt-4 text-[16px] font-medium">{t.leaveDone}</p>
      </div>
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
  const panel = 'rounded-[24px] border border-[color:var(--p-border)] bg-[var(--p-surface)] p-5 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.5)]';

  return (
    <div className="space-y-4">
      {celebration && <CelebrationLayer key={celebration.id} celebration={celebration} />}

      {staffHref && (
        <a
          href={staffHref}
          className="bzl-tap flex items-center justify-between gap-3 rounded-[18px] bg-[#0A0A0A] px-4 py-3 text-white shadow-[0_14px_30px_-18px_rgba(0,0,0,0.6)]"
        >
          <span className="flex min-w-0 items-center gap-2 text-[13.5px]">
            <Eye size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{tr ? 'Müşterinin gördüğü kart' : 'What the customer sees'}</span>
          </span>
          <span className="shrink-0 rounded-full bg-[#C6F24E] px-3 py-1.5 text-[12.5px] font-semibold text-[#0A0A0A]">
            {tr ? 'Kasa moduna dön' : 'Back to staff mode'}
          </span>
        </a>
      )}

      <div className="bzl-float">
        <LoyaltyCardFace
          key={stampKey}
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
          highlightFrom={highlightFrom}
          shine
        />
      </div>

      <section className={`${panel} text-center`}>
        <p className="text-[13px] font-medium text-[color:var(--p-muted)]">{t.showAtCounter}</p>
        <button
          type="button"
          onClick={() => setFullQr(true)}
          className="bzl-tap group relative mx-auto mt-3 block rounded-2xl bg-white p-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)] transition active:scale-[0.98]"
          aria-label={tr ? 'QR kodu büyüt' : 'Enlarge the QR code'}
        >
          { }
          <img src={qrDataUrl} alt={tr ? 'Kart QR kodu' : 'Card QR code'} width={196} height={196} className="h-[196px] w-[196px]" />
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#0A0A0A] text-white">
            <Maximize2 size={15} aria-hidden="true" />
          </span>
        </button>
        <p className="mt-4 text-[11.5px] uppercase tracking-[0.16em] text-[color:var(--p-muted)]">{t.code}</p>
        <p className="font-mono text-[30px] font-semibold tracking-[0.2em]">{formatMemberCode(member.code)}</p>
      </section>

      {!staffHref && (
        <AccountBlock t={t} slug={slug} token={token} locale={locale} signedIn={viewer.signedIn} owns={viewer.owns} hasAccount={card.member.hasAccount} />
      )}

      {birthday && program.birthdayReward && (
        <p className="flex items-start gap-2 rounded-[20px] border border-[#F5C6D6] bg-[#FFF1F5] px-4 py-3 text-[14px] text-[#831843]">
          <Cake size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {t.birthdayNow(program.birthdayReward)}
        </p>
      )}

      <section className={panel}>
        <h2 className="text-[16px] font-semibold">{t.rewards}</h2>
        <ul className="mt-3 space-y-2">
          {program.rewards.map((r) => {
            const ready = member.balance >= r.cost;
            const pct = Math.min(100, Math.round((member.balance / r.cost) * 100));
            return (
              <li key={r.id} className={`overflow-hidden rounded-2xl ${ready ? 'bg-[#F6FCE4] text-[#0A0A0A]' : 'bg-[var(--p-bg)]'}`}>
                <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-[14.5px] font-medium">
                    <Gift size={16} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.title}</span>
                  </span>
                  <span className={`shrink-0 text-[12.5px] font-semibold ${ready ? 'text-[#3F6212]' : 'text-[color:var(--p-muted)]'}`}>
                    {ready ? t.rewardReady : t.rewardLeft(r.cost - member.balance, unitLabel(kind, r.cost - member.balance, locale))}
                  </span>
                </div>
                {!ready && (
                  <div className="h-1 w-full" style={{ background: 'var(--p-border)' }}>
                    <div className="h-full transition-[width] duration-700" style={{ width: `${pct}%`, background: 'var(--p-accent)' }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {(tier || upcoming) && (
          <p className="mt-3 flex items-start gap-2 text-[13.5px]">
            <Crown size={16} className="mt-0.5 shrink-0 text-[#CA8A04]" aria-hidden="true" />
            <span>
              {tier && (
                <>
                  {t.tierNow(tier.name)}
                  {tier.perk ? ` — ${tier.perk}` : ''}.{' '}
                </>
              )}
              {upcoming && t.tierNext(upcoming.visitsLeft, upcoming.tier.name)}
            </span>
          </p>
        )}
        {expiry && <p className="mt-2 text-[12.5px] text-[color:var(--p-muted)]">{t.expires(dateFmt(expiry))}</p>}
        <p className="mt-2 text-[12.5px] text-[color:var(--p-muted)]">
          {member.visits} {t.visits}
        </p>
      </section>

      {!staffHref && <InstallCard locale={locale} businessName={business.name} />}
      {!staffHref && pushKey && <NotifyCard locale={locale} token={token} pushKey={pushKey} />}

      <section className={panel}>
        <h2 className="text-[16px] font-semibold">{t.history}</h2>
        {card.events.length === 0 ? (
          <p className="mt-2 text-[13px] text-[color:var(--p-muted)]">{t.noHistory}</p>
        ) : (
          <ul className="mt-2 divide-y divide-[color:var(--p-border)]">
            {card.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                <span className="min-w-0 truncate">
                  {t.events[e.type] ?? e.type}
                  {e.rewardTitle ? `: ${e.rewardTitle}` : ''}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {e.amount !== 0 && (
                    <span className={`font-semibold tabular-nums ${e.amount > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {e.amount > 0 ? '+' : ''}
                      {e.amount}
                    </span>
                  )}
                  <span className="text-[12px] text-[color:var(--p-muted)]">{dateFmt(e.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!staffHref && (
        <div className="flex flex-col items-center gap-1 pt-2 text-center">
          <Link href={`/l/${slug}?new=1${tr ? '' : '&lang=en'}`} className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] text-[color:var(--p-muted)] underline underline-offset-4">
            <UserPlus size={14} aria-hidden="true" /> {tr ? 'Bu telefonda başka biri için kart aç' : 'Open a card for someone else on this phone'}
          </Link>
          {!leaveOpen ? (
            <button type="button" onClick={() => setLeaveOpen(true)} className="min-h-[44px] text-[13px] text-[color:var(--p-muted)] underline underline-offset-4">
              {t.leave}
            </button>
          ) : (
            <div className="mt-2 w-full rounded-[22px] border border-[#FECACA] bg-[var(--p-surface)] p-4 text-left">
              <p className="text-[15px] font-semibold">{t.leaveTitle}</p>
              <p className="mt-1 text-[13px] text-[color:var(--p-muted)]">{t.leaveBody}</p>
              <input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                className="mt-3 w-36 rounded-xl border border-[color:var(--p-border)] bg-[var(--p-bg)] px-3 py-3 text-center font-mono text-[20px] tracking-[0.3em]"
                aria-label={tr ? 'Telefonun son 4 hanesi' : 'Last 4 digits of the phone'}
                placeholder="••••"
              />
              {leaveError && (
                <p className="mt-2 text-[13px] text-[#991B1B]" role="alert">
                  {leaveError}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setLeaveOpen(false)} className="min-h-[46px] flex-1 rounded-xl border border-[color:var(--p-border)] text-[14px]">
                  {t.leaveCancel}
                </button>
                <button
                  type="button"
                  disabled={last4.length !== 4 || leaveBusy}
                  onClick={() => void leave()}
                  className="flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-[#B91C1C] text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  {leaveBusy ? <Loader2 size={16} className="animate-spin" /> : t.leaveConfirm}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {fullQr && (
        <FullScreenQr
          locale={locale}
          qrDataUrl={qrDataUrl}
          code={member.code}
          businessName={business.name}
          firstName={member.firstName}
          onClose={() => setFullQr(false)}
        />
      )}
    </div>
  );
}

// ─── pieces ───────────────────────────────────────────────────────────────

function CelebrationLayer({ celebration }: { celebration: Celebration }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" aria-live="polite" role="status">
      <div
        className="bzl-toast absolute left-1/2 w-[min(92vw,420px)] rounded-[22px] px-5 py-4 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
        style={{ top: 'max(14px, env(safe-area-inset-top))', background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
      >
        <p className="text-[22px] font-semibold leading-tight tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>
          {celebration.title}
        </p>
        {celebration.body && <p className="mt-0.5 text-[14px] opacity-85">{celebration.body}</p>}
      </div>
      {celebration.confetti && <ConfettiBurst className="left-1/2 top-[30%]" />}
    </div>
  );
}

function FullScreenQr({
  locale,
  qrDataUrl,
  code,
  businessName,
  firstName,
  onClose,
}: {
  locale: PublicLocale;
  qrDataUrl: string;
  code: string;
  businessName: string;
  firstName: string | null;
  onClose: () => void;
}) {
  const tr = locale === 'tr';
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr ? 'Kasada gösterilecek QR' : 'QR to show at the counter'}
      className="bzl-fade fixed inset-0 z-[85] flex flex-col items-center justify-center bg-white px-6 text-[#0A0A0A]"
      style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      onClick={onClose}
    >
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#737373]">{businessName}</p>
      {firstName && <p className="mt-1 text-[20px] font-semibold">{firstName}</p>}
      { }
      <img src={qrDataUrl} alt={tr ? 'Kart QR kodu' : 'Card QR code'} className="mt-6 aspect-square w-[min(82vw,380px)]" />
      <p className="mt-6 font-mono text-[38px] font-semibold tracking-[0.22em]">{formatMemberCode(code)}</p>
      <p className="mt-3 max-w-[300px] text-center text-[13.5px] text-[#525252]">
        {tr ? 'Ekran parlaklığını artırın; görevli QR’ı okutur ya da kodu yazar.' : 'Turn the brightness up; staff scan the QR or type the code.'}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white"
      >
        <X size={18} aria-hidden="true" /> {tr ? 'Kapat' : 'Close'}
      </button>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Add to home screen": Android shows the install prompt, iPhone gets the two steps. */
function InstallCard({ locale, businessName }: { locale: PublicLocale; businessName: string }) {
  const tr = locale === 'tr';
  const [mode, setMode] = useState<'hidden' | 'android' | 'ios' | 'done'>('hidden');
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) setMode('ios');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setMode('android');
    };
    const onInstalled = () => setMode('done');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (mode === 'hidden') return null;
  const box = 'rounded-[24px] border border-[color:var(--p-border)] bg-[var(--p-surface)] p-4';
  if (mode === 'done') {
    return (
      <p className={`${box} flex items-center gap-2 text-[14px]`}>
        <Check size={16} aria-hidden="true" /> {tr ? 'Kart ana ekranınızda.' : 'The card is on your home screen.'}
      </p>
    );
  }
  return (
    <div className={`${box} flex items-start gap-3`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}>
        <Download size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold">{tr ? 'Kartı ana ekrana ekleyin' : 'Add the card to your home screen'}</p>
        {mode === 'android' ? (
          <>
            <p className="mt-0.5 text-[12.5px] text-[color:var(--p-muted)]">
              {tr ? `${businessName} kartınız uygulama gibi tek dokunuşla açılır.` : `Your ${businessName} card opens in one tap, like an app.`}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold"
              style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
              onClick={async () => {
                const p = promptRef.current;
                if (!p) return;
                await p.prompt();
                const choice = await p.userChoice.catch(() => null);
                if (choice?.outcome === 'accepted') setMode('done');
              }}
            >
              {tr ? 'Ana ekrana ekle' : 'Add to home screen'}
            </button>
          </>
        ) : (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[color:var(--p-muted)]">
            {tr ? 'Safari’de alttaki ' : 'In Safari tap '}
            <Share size={13} className="inline -translate-y-px" aria-label={tr ? 'Paylaş' : 'Share'} />
            {tr ? ' Paylaş düğmesine, sonra “Ana Ekrana Ekle”ye dokunun.' : ' Share, then “Add to Home Screen”.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── notifications (§61) ─────────────────────────────────────────────────

const PUSH_FLAG = 'buaze:push:';

function applicationServerKey(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * "Tell me when my reward is ready": Web Push through the /l/ service
 * worker. Two kinds of message only (reward ready, birthday gift). One
 * browser subscription serves every card on the phone, so turning it off
 * here removes only this card.
 */
function NotifyCard({ locale, token, pushKey }: { locale: PublicLocale; token: string; pushKey: string }) {
  const tr = locale === 'tr';
  const [state, setState] = useState<'hidden' | 'off' | 'on' | 'busy' | 'denied' | 'ios' | 'error'>('hidden');
  const api = `/api/public/loyalty/card/${token}/push`;

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (ios && !standalone) setState('ios');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker
      .getRegistration('/l/')
      .then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        let flagged = false;
        try {
          flagged = window.localStorage.getItem(`${PUSH_FLAG}${token}`) === '1';
        } catch {
          /* storage blocked */
        }
        setState(sub && flagged && Notification.permission === 'granted' ? 'on' : 'off');
      })
      .catch(() => setState('off'));
  }, [token]);

  const enable = async () => {
    setState('busy');
    try {
      // First call inside the tap (iOS asks for it this way).
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      await navigator.serviceWorker.register('/l/sw.js', { scope: '/l/' });
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(pushKey) as BufferSource }));
      const json = sub.toJSON();
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }),
      });
      if (!res.ok) throw new Error('subscribe');
      try {
        window.localStorage.setItem(`${PUSH_FLAG}${token}`, '1');
      } catch {
        /* storage blocked */
      }
      haptic(12);
      setState('on');
    } catch {
      setState('error');
    }
  };

  const disable = async () => {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/l/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch(api, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      }
      try {
        window.localStorage.removeItem(`${PUSH_FLAG}${token}`);
      } catch {
        /* storage blocked */
      }
      setState('off');
    } catch {
      setState('error');
    }
  };

  if (state === 'hidden') return null;
  const box = 'rounded-[24px] border border-[color:var(--p-border)] bg-[var(--p-surface)] p-4';
  const btn =
    'bzl-tap mt-3 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold bg-[var(--p-accent)] text-[color:var(--p-on-accent)] disabled:opacity-50';

  return (
    <div className={`${box} flex items-start gap-3`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}>
        {state === 'denied' ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1" aria-live="polite">
        {state === 'on' ? (
          <>
            <p className="text-[14.5px] font-semibold">{tr ? 'Bildirimler açık' : 'Notifications are on'}</p>
            <p className="mt-0.5 text-[12.5px] text-[color:var(--p-muted)]">
              {tr ? 'Ödülünüz hazır olunca ve doğum gününüzde haber vereceğiz.' : 'We will tell you when your reward is ready and on your birthday.'}
            </p>
            <button type="button" onClick={() => void disable()} className="mt-2 min-h-[40px] text-[13px] text-[color:var(--p-muted)] underline underline-offset-4">
              {tr ? 'Bildirimleri kapat' : 'Turn off'}
            </button>
          </>
        ) : (
          <>
            <p className="text-[14.5px] font-semibold">{tr ? 'Ödülünüz hazır olunca haber verelim' : 'Get told when your reward is ready'}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[color:var(--p-muted)]">
              {state === 'ios'
                ? tr
                  ? 'iPhone’da bildirim için kartı önce ana ekrana ekleyin, sonra ana ekrandan açıp buradan açın.'
                  : 'On iPhone, add the card to your home screen first, open it from there and turn notifications on here.'
                : state === 'denied'
                  ? tr
                    ? 'Bildirimler bu tarayıcıda kapalı. Açmak için tarayıcı ya da telefon ayarlarından izin verin.'
                    : 'Notifications are blocked in this browser. Allow them in the browser or phone settings.'
                  : tr
                    ? 'Yalnız iki konuda bildirim gelir: ödülünüz hazır olduğunda ve doğum gününüzde. Reklam göndermeyiz.'
                    : 'Only two kinds: when your reward is ready and on your birthday. No ads.'}
            </p>
            {state === 'error' && (
              <p className="mt-1 text-[12.5px] text-[#991B1B]" role="alert">
                {tr ? 'Bildirimler açılamadı. Tekrar deneyin.' : 'Could not turn notifications on. Try again.'}
              </p>
            )}
            {(state === 'off' || state === 'busy' || state === 'error') && (
              <button type="button" onClick={() => void enable()} disabled={state === 'busy'} className={btn}>
                {state === 'busy' ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} aria-hidden="true" />}
                {tr ? 'Bildirimleri aç' : 'Turn on notifications'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AccountBlock({
  t,
  slug,
  token,
  locale,
  signedIn,
  owns,
  hasAccount,
}: {
  t: Copy;
  slug: string;
  token: string;
  locale: PublicLocale;
  signedIn: boolean;
  owns: boolean;
  hasAccount: boolean;
}) {
  const tr = locale === 'tr';
  const [state, setState] = useState<'idle' | 'busy' | 'verify' | 'done' | 'taken' | 'error'>(owns ? 'done' : 'idle');
  const [digits, setDigits] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const box = 'rounded-[24px] border border-[color:var(--p-border)] bg-[var(--p-surface)] p-4';
  const btn =
    'bzl-tap inline-flex min-h-[46px] items-center justify-center rounded-2xl px-4 text-[14px] font-semibold bg-[var(--p-accent)] text-[color:var(--p-on-accent)] disabled:opacity-50';

  const link = async (last4?: string) => {
    setState('busy');
    setMessage(null);
    try {
      const res = await fetch('/api/customer/cards/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(last4 ? { token, last4 } : { token }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      const data = (await res.json().catch(() => null)) as { code?: string } | null;
      if (data?.code === 'CARD_VERIFY_REQUIRED') {
        setState('verify');
        return;
      }
      if (data?.code === 'WRONG_DIGITS') {
        setState('verify');
        setMessage(t.leaveWrong);
        return;
      }
      if (data?.code === 'CARD_IN_OTHER_ACCOUNT' || data?.code === 'ACCOUNT_HAS_CARD') {
        setState('taken');
        return;
      }
      setState(last4 ? 'verify' : 'error');
      setMessage(data?.code === 'RATE_LIMIT' ? t.errors.RATE_LIMIT : t.errors.DEFAULT);
    } catch {
      setState('error');
      setMessage(t.errors.DEFAULT);
    }
  };

  if (state === 'done') {
    return (
      <div className={`${box} flex items-center justify-between gap-3`}>
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <UserCheck size={17} aria-hidden /> {t.inAccount}
        </span>
        <Link href="/hesap" className="text-[13.5px] font-semibold underline underline-offset-2">
          {tr ? 'Kartlarım' : 'My cards'}
        </Link>
      </div>
    );
  }
  if (signedIn) {
    if ((hasAccount && state === 'idle') || state === 'taken') {
      return <p className="text-center text-[12.5px] text-[color:var(--p-muted)]">{t.otherAccountCard}</p>;
    }
    if (state === 'verify') {
      return (
        <div className={box}>
          <p className="text-[14px] font-semibold">{t.addToAccount}</p>
          <p className="mt-1 text-[12.5px] text-[color:var(--p-muted)]">
            {tr
              ? 'Kartın sizin olduğunu doğrulamak için kartta kayıtlı telefonun son 4 hanesini yazın.'
              : 'To confirm the card is yours, type the last 4 digits of the phone on the card.'}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              className="w-28 rounded-xl border border-[color:var(--p-border)] bg-[var(--p-bg)] px-3 py-2.5 text-center font-mono text-[18px] tracking-[0.3em]"
              aria-label={tr ? 'Telefonun son 4 hanesi' : 'Last 4 digits of the phone'}
              placeholder="••••"
            />
            <button type="button" className={btn} disabled={digits.length !== 4} onClick={() => void link(digits)}>
              {tr ? 'Doğrula' : 'Confirm'}
            </button>
          </div>
          {message && (
            <p className="mt-2 text-[12.5px] text-[#B91C1C]" role="alert">
              {message}
            </p>
          )}
        </div>
      );
    }
    return (
      <div className={`${box} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <span className="text-[13.5px]">{state === 'error' && message ? message : t.createAccountLead}</span>
        <button type="button" className={btn} onClick={() => void link()} disabled={state === 'busy'}>
          {state === 'busy' ? <Loader2 size={16} className="animate-spin" /> : t.addToAccount}
        </button>
      </div>
    );
  }
  if (hasAccount) return null;
  const next = encodeURIComponent(`/l/${slug}/k/${token}`);
  return (
    <div className={`${box} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{t.createAccount}</span>
        <span className="block text-[12.5px] text-[color:var(--p-muted)]">{t.createAccountLead}</span>
      </span>
      <Link href={`/hesap/kayit?${locale === 'en' ? 'lang=en&' : ''}next=${next}`} className={btn}>
        {t.addToAccount}
      </Link>
    </div>
  );
}
