'use client';

// The way into a loyalty program (CLAUDE.md §60, §61), inside the
// business's customer panel. Signed-in Buaze customer → one tap, the card
// lands in "Kartlarım". Otherwise a short guest form: first + last name and
// phone; e-mail and birthday fold away as optional. Membership terms +
// privacy notice must be accepted; marketing is opt-in (§19.1). The tap on
// the join button also unlocks sound for the card page's celebration.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Nfc, ShieldCheck, Sparkles } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import type { LoyaltyKind } from '@/lib/loyalty';
import { haptic, unlockAudio } from '@/lib/loyalty-sound';
import { CARD_STORAGE_PREFIX, PUBLIC_COPY, type PublicLocale } from '../loyalty-public';

interface Props {
  locale: PublicLocale;
  slug: string;
  businessName: string;
  source: 'qr' | 'nfc' | 'link';
  account: { firstName: string; lastName: string; phone: string | null; email: string } | null;
  program: {
    name: string;
    kind: LoyaltyKind;
    accentColor: string | null;
    welcomeBonus: number;
    birthdayReward: string | null;
    rewards: Array<{ title: string; cost: number }>;
  };
}

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FIELD =
  'rounded-2xl border px-4 py-3.5 text-[16px] outline-none transition focus:ring-2 focus:ring-[color:var(--p-accent)] bg-[var(--p-bg)] border-[color:var(--p-border)] text-[color:var(--p-text)] placeholder:text-[color:var(--p-muted)] placeholder:opacity-70';
const INPUT = `mt-1.5 w-full ${FIELD}`;
const PANEL =
  'rounded-[26px] border p-5 space-y-4 bg-[var(--p-surface)] border-[color:var(--p-border)] shadow-[0_18px_40px_-32px_rgba(0,0,0,0.45)]';
const PRIMARY =
  'bzl-tap flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-[16.5px] font-semibold transition active:scale-[0.98] hover:opacity-95 disabled:opacity-40 bg-[var(--p-accent)] text-[color:var(--p-on-accent)] shadow-[0_14px_30px_-16px_rgba(0,0,0,0.45)]';

export default function JoinView({ locale, slug, businessName, source, account, program }: Props) {
  const t = PUBLIC_COPY[locale];
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  const [mode, setMode] = useState<'account' | 'guest'>(account ? 'account' : 'guest');
  const [more, setMore] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: account?.phone ?? '',
    email: '',
    day: '',
    month: '',
    consent: false,
    marketing: false,
    website: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showFloat, setShowFloat] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      setSaved(window.localStorage.getItem(`${CARD_STORAGE_PREFIX}${slug}`));
    } catch {
      setSaved(null);
    }
  }, [locale, slug]);

  // Floating "open my card" button while the form is off screen (phones).
  useEffect(() => {
    const el = formRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Only while the form is still below: past it (contact, footer) the button would cover content.
    const io = new IntersectionObserver(
      ([entry]) => setShowFloat(!entry.isIntersecting && entry.boundingClientRect.top > 0),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const join = async (useAccount: boolean) => {
    if (!form.consent) return;
    // Inside the tap: lets the card page play its sound after the redirect.
    unlockAudio();
    haptic(10);
    setBusy(true);
    setError(null);
    setNotice(null);
    const month = Number.parseInt(form.month, 10);
    const day = Number.parseInt(form.day, 10);
    const bday = Number.isFinite(month) && Number.isFinite(day) ? { birthMonth: month, birthDay: day } : {};
    try {
      const res = await fetch(`/api/public/loyalty/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          useAccount
            ? { useAccount: true, phone: form.phone || null, ...bday, consent: true, marketingConsent: form.marketing, locale, source }
            : {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone,
                email: form.email.trim() || null,
                ...bday,
                consent: true,
                marketingConsent: form.marketing,
                locale,
                source,
                ...(form.website ? { website: form.website } : {}),
              },
        ),
      });
      const data = (await res.json().catch(() => null)) as { status?: string; cardPath?: string | null; emailSent?: boolean; code?: string } | null;
      if (res.ok && (data?.status === 'created' || data?.status === 'own') && data.cardPath) {
        try {
          window.localStorage.setItem(`${CARD_STORAGE_PREFIX}${slug}`, data.cardPath);
        } catch {
          /* storage blocked */
        }
        const qs = [locale === 'en' ? 'lang=en' : null, data.status === 'created' ? 'new=1' : null].filter(Boolean).join('&');
        router.push(`${data.cardPath}${qs ? `?${qs}` : ''}`);
        return;
      }
      if (res.ok && data?.status === 'exists') {
        setNotice(data.emailSent ? t.existsMailed : t.exists);
        return;
      }
      setError(t.errors[data?.code ?? ''] ?? t.errors.DEFAULT);
    } catch {
      setError(t.errors.DEFAULT);
    } finally {
      setBusy(false);
    }
  };

  const months = locale === 'tr' ? MONTHS_TR : MONTHS_EN;
  const legalQ = locale === 'en' ? '?lang=en' : '';
  const phoneOk = form.phone.replace(/\D/g, '').length >= 7;
  const guestReady = Boolean(form.consent && form.firstName.trim() && form.lastName.trim() && phoneOk);
  const label = 'text-[13px] font-semibold tracking-[0.01em]';
  const muted = { color: 'var(--p-muted)' } as const;

  const consentBoxes = (
    <div className="space-y-3 pt-1">
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed">
        <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]" />
        <span>
          {t.consentAll}{' '}
          <a href={`/l/${slug}/kosullar${legalQ}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
            {t.termsLink}
          </a>
          {' · '}
          <a href={`/l/${slug}/aydinlatma${legalQ}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
            {t.privacyLink}
          </a>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed">
        <input type="checkbox" checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]" />
        <span>{t.marketing}</span>
      </label>
    </div>
  );

  const messages = (
    <>
      {error && (
        <p className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#991B1B]" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-2xl bg-[#F0FDF4] px-4 py-3 text-[14px] text-[#166534]" role="status">
          {notice}
        </p>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <div className="bzl-float">
        <LoyaltyCardFace
          businessName={businessName}
          programName={program.name}
          kind={program.kind}
          balance={program.welcomeBonus}
          rewards={program.rewards}
          accentColor={program.accentColor}
          locale={locale}
          shine
        />
      </div>

      {program.welcomeBonus > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[13.5px] font-medium" style={muted}>
          <Sparkles size={15} aria-hidden="true" />
          {locale === 'tr'
            ? `Katılınca ${program.welcomeBonus} ${program.kind === 'stamps' ? 'damga' : 'puan'} hediye`
            : `${program.welcomeBonus} ${program.kind === 'stamps' ? (program.welcomeBonus === 1 ? 'stamp' : 'stamps') : 'points'} free when you join`}
        </p>
      )}

      {source === 'nfc' && (
        <p className="flex items-start gap-2 text-[13px]" style={muted}>
          <Nfc size={16} className="mt-0.5 shrink-0" aria-hidden /> {t.nfcHint}
        </p>
      )}

      {saved && (
        <a href={saved} className="bzl-tap flex items-center justify-between gap-3 rounded-2xl border border-[#A8D62E] bg-[#F6FCE4] px-4 py-3.5 text-[#0A0A0A]">
          <span className="text-[14px]">{t.savedOnDevice}</span>
          <span className="text-[14px] font-semibold">{t.openMyCard} →</span>
        </a>
      )}

      <div ref={formRef} id="katil" className="scroll-mt-6">
        {account && mode === 'account' ? (
          <form
            className={PANEL}
            onSubmit={(e) => {
              e.preventDefault();
              void join(true);
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[18px] font-semibold text-[#C6F24E]">
                {account.firstName.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold">
                  {account.firstName} {account.lastName}
                </p>
                <p className="truncate text-[13px]" style={muted}>
                  {account.email}
                </p>
              </div>
            </div>
            {!account.phone && (
              <label className="block">
                <span className={label}>{t.phone}</span>
                <input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" />
                <span className="mt-1.5 block text-[12.5px]" style={muted}>
                  {t.phoneHint}
                </span>
              </label>
            )}
            <p className="flex items-start gap-2 text-[12.5px]" style={muted}>
              <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden /> {t.accountShares}
            </p>
            {consentBoxes}
            {messages}
            <button type="submit" disabled={busy || !form.consent || !phoneOk} className={PRIMARY}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : t.accountJoin(account.firstName)}
            </button>
            <button type="button" onClick={() => setMode('guest')} className="w-full py-1 text-center text-[13px] underline underline-offset-2" style={muted}>
              {t.guestInstead}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {!account && (
              <a
                href={`/hesap?${locale === 'en' ? 'lang=en&' : ''}next=${encodeURIComponent(`/l/${slug}${source === 'nfc' ? '?source=nfc' : ''}`)}`}
                className="bzl-tap flex items-center gap-3 rounded-[22px] border px-4 py-3.5 transition hover:opacity-95"
                style={{ background: 'var(--p-surface)', borderColor: 'var(--p-border)' }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <GoogleMark />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">{t.withAccountTitle}</span>
                  <span className="block truncate text-[12.5px]" style={muted}>
                    {t.signInGoogle}
                  </span>
                </span>
                <span aria-hidden="true" className="text-[18px]" style={muted}>
                  →
                </span>
              </a>
            )}
            <form
              className={PANEL}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void join(false);
              }}
            >
              <p className="text-[17px] font-semibold tracking-[-0.01em]">{t.joinTitle}</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>{t.firstName}</span>
                  <input required value={form.firstName} maxLength={40} onChange={(e) => set('firstName', e.target.value)} className={INPUT} autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" />
                </label>
                <label className="block">
                  <span className={label}>{t.lastName}</span>
                  <input required value={form.lastName} maxLength={40} onChange={(e) => set('lastName', e.target.value)} className={INPUT} autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" />
                </label>
              </div>
              <label className="block">
                <span className={label}>{t.phone}</span>
                <input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" enterKeyHint="done" />
                <span className="mt-1.5 block text-[12.5px]" style={muted}>
                  {t.phoneHint}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setMore((v) => !v)}
                aria-expanded={more}
                className="flex min-h-[44px] w-full items-center justify-between rounded-2xl px-1 text-left text-[13.5px] font-medium"
                style={muted}
              >
                <span>{locale === 'tr' ? 'E-posta ve doğum günü (isteğe bağlı)' : 'E-mail and birthday (optional)'}</span>
                <ChevronDown size={18} aria-hidden="true" className={`transition-transform ${more ? 'rotate-180' : ''}`} />
              </button>
              {more && (
                <div className="bzl-fade space-y-4">
                  <label className="block">
                    <span className={label}>{t.email}</span>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={INPUT} inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                    <span className="mt-1.5 block text-[12.5px]" style={muted}>
                      {t.emailHint}
                    </span>
                  </label>
                  {program.birthdayReward && (
                    <fieldset>
                      <legend className={label}>{t.birthdayLabel}</legend>
                      <div className="mt-1.5 flex gap-2">
                        <select value={form.day} onChange={(e) => set('day', e.target.value)} className={`${FIELD} w-28 shrink-0`} aria-label={t.day}>
                          <option value="">{t.day}</option>
                          {Array.from({ length: 31 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                        <select value={form.month} onChange={(e) => set('month', e.target.value)} className={`${FIELD} min-w-0 flex-1`} aria-label={t.month}>
                          <option value="">{t.month}</option>
                          {months.map((m, i) => (
                            <option key={m} value={i + 1}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </fieldset>
                  )}
                </div>
              )}

              {/* Honeypot: hidden from people, tempting for bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />
              {consentBoxes}
              {messages}
              <button type="submit" disabled={busy || !guestReady} className={PRIMARY}>
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> {t.submitting}
                  </>
                ) : (
                  t.submit
                )}
              </button>
              {account && (
                <button type="button" onClick={() => setMode('account')} className="w-full py-1 text-center text-[13px] underline underline-offset-2" style={muted}>
                  {t.useAccountInstead}
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {showFloat && (
        <div className="bzl-fade fixed inset-x-0 bottom-0 z-40 px-4 sm:hidden" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            className={`${PRIMARY} mx-auto max-w-[480px]`}
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t.submit}
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
