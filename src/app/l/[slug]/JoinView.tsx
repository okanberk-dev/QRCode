'use client';

// The way into a loyalty program (CLAUDE.md §60, §61), inside the
// business's customer panel. One screen, no second sign-in page:
// - Signed-in Buaze customer → one tap, the card lands in "Kartlarım".
// - "Google ile katıl" → the Google window, then the account is opened (or
//   signed in) and the card is created in the same tap. A Google name
//   without a last name asks for it once.
// - "Google olmadan katıl" → first + last name only; phone, e-mail and
//   birthday fold away as optional (the phone is never asked for, 2026-11-28).
// Membership terms + privacy notice must be accepted (one box, which also
// names the account terms for the Google path); marketing is opt-in for the
// business only (§19.1). The join tap also unlocks the card page's sound.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Loader2, Nfc, ShieldCheck, Sparkles } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import type { LoyaltyKind } from '@/lib/loyalty';
import { haptic, unlockAudio } from '@/lib/loyalty-sound';
import { CARD_STORAGE_PREFIX, PUBLIC_COPY, type PublicLocale } from '../loyalty-public';

interface Props {
  locale: PublicLocale;
  slug: string;
  businessName: string;
  source: 'qr' | 'nfc' | 'link';
  account: { firstName: string; lastName: string; phone: string | null; email: string; hasBirthday: boolean } | null;
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

/** Survives the Google redirect fallback (popup blocked): what was ticked. */
const INTENT_KEY = (slug: string) => `buaze:loyalty-google:${slug}`;

// Pill fields and buttons on borderless 24 px cards; colours come from the
// business's panel theme (--p-*), so only the shapes are Buaze's.
const FIELD =
  'h-[52px] rounded-full border px-5 text-[16px] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[color:var(--p-strong)] focus:ring-2 focus:ring-[color:var(--p-strong)] bg-[var(--p-bg)] border-[color:var(--p-border)] text-[color:var(--p-text)] placeholder:text-[color:var(--p-muted)] placeholder:opacity-70 motion-reduce:transition-none';
const INPUT = `mt-1.5 w-full ${FIELD}`;
const PANEL = 'rounded-[28px] p-5 sm:p-6 space-y-4 bg-[var(--p-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-28px_rgba(0,0,0,0.25)]';
const TITLE = 'text-[21px] font-medium leading-tight tracking-[-0.02em] [font-family:var(--font-heading)]';
const PRIMARY =
  'bzl-tap flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full text-[16.5px] font-semibold transition-[opacity,transform] duration-200 active:scale-[0.98] hover:opacity-95 disabled:opacity-40 motion-reduce:transition-none bg-[var(--p-accent)] text-[color:var(--p-on-accent)] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--p-surface)]';
const SECONDARY =
  'bzl-tap flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[opacity,transform] duration-200 active:scale-[0.98] hover:opacity-90 motion-reduce:transition-none bg-[var(--p-bg)] text-[color:var(--p-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--p-surface)]';

type JoinResponse = { status?: string; cardPath?: string | null; emailSent?: boolean; code?: string } | null;

export default function JoinView({ locale, slug, businessName, source, account, program }: Props) {
  const t = PUBLIC_COPY[locale];
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  // guest = the no-Google form; account = signed in; choose = Google first.
  const [step, setStep] = useState<'choose' | 'guest' | 'account'>(account ? 'account' : 'choose');
  const [more, setMore] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    day: '',
    month: '',
    consent: false,
    marketing: false,
    website: '',
  });
  const [busy, setBusy] = useState<null | 'google' | 'join'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [consentError, setConsentError] = useState(false);
  // Google said yes but the name has no last name: ask once, then retry.
  const [googleName, setGoogleName] = useState<{ idToken: string } | null>(null);
  const [showFloat, setShowFloat] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const attempt = useRef(0);

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

  const birthday = () => {
    const month = Number.parseInt(form.month, 10);
    const day = Number.parseInt(form.day, 10);
    return Number.isFinite(month) && Number.isFinite(day) ? { birthMonth: month, birthDay: day } : {};
  };

  const openCard = useCallback(
    (data: JoinResponse) => {
      if (!data?.cardPath) return false;
      try {
        window.localStorage.setItem(`${CARD_STORAGE_PREFIX}${slug}`, data.cardPath);
      } catch {
        /* storage blocked */
      }
      const qs = [locale === 'en' ? 'lang=en' : null, data.status === 'created' ? 'new=1' : null].filter(Boolean).join('&');
      router.push(`${data.cardPath}${qs ? `?${qs}` : ''}`);
      return true;
    },
    [locale, router, slug],
  );

  /** Creates the card; `useAccount` uses the signed-in profile. */
  const postJoin = useCallback(
    async (useAccount: boolean, marketing: boolean, extra: Record<string, unknown>) => {
      const res = await fetch(`/api/public/loyalty/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...extra, useAccount, consent: true, marketingConsent: marketing, locale, source }),
      });
      const data = (await res.json().catch(() => null)) as JoinResponse;
      if (res.ok && (data?.status === 'created' || data?.status === 'own') && openCard(data)) return true;
      if (res.ok && data?.status === 'exists') {
        setNotice(data.emailSent ? t.existsMailed : t.exists);
        return false;
      }
      setError(t.errors[data?.code ?? ''] ?? t.errors.DEFAULT);
      return false;
    },
    [locale, openCard, slug, source, t],
  );

  /**
   * Google → Buaze customer account (opened with the account terms the
   * customer just accepted, or simply signed in) → card. Business marketing
   * consent is not the account's: the account starts without it.
   */
  const finishGoogle = useCallback(
    async (idToken: string, marketing: boolean, names?: { firstName: string; lastName: string }) => {
      setBusy('google');
      setError(null);
      try {
        const res = await fetch('/api/customer/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            locale,
            consentTerms: true,
            consentPrivacy: true,
            marketingConsent: false,
            ...(names ?? {}),
          }),
        });
        const data = (await res.json().catch(() => null)) as { code?: string } | null;
        if (!res.ok) {
          if (data?.code === 'NAME_REQUIRED') {
            setGoogleName({ idToken });
            setBusy(null);
            return;
          }
          setGoogleName(null);
          setError(t.errors[data?.code ?? ''] ?? t.errors.DEFAULT);
          setBusy(null);
          return;
        }
        setGoogleName(null);
        if (!(await postJoin(true, marketing, {}))) setBusy(null);
      } catch {
        setError(t.errors.DEFAULT);
        setBusy(null);
      }
    },
    [locale, postJoin, t],
  );

  // Google redirect fallback (popup blocked): finish on return.
  useEffect(() => {
    if (account) return;
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import('@/lib/firebase-client');
        mod.preloadGoogleSignIn();
        if (!mod.isGoogleRedirectPending()) return;
        let intent: { marketing?: boolean } | null = null;
        try {
          intent = JSON.parse(window.sessionStorage.getItem(INTENT_KEY(slug)) ?? 'null');
          window.sessionStorage.removeItem(INTENT_KEY(slug));
        } catch {
          intent = null;
        }
        setBusy('google');
        const idToken = await mod.consumeGoogleRedirectIdToken();
        if (cancelled) return;
        if (!idToken || !intent) {
          setBusy(null);
          return;
        }
        setForm((f) => ({ ...f, consent: true, marketing: Boolean(intent?.marketing) }));
        await finishGoogle(idToken, Boolean(intent.marketing));
      } catch {
        if (!cancelled) setBusy(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, finishGoogle, slug]);

  const requireConsent = () => {
    if (form.consent) return true;
    setConsentError(true);
    consentRef.current?.focus();
    return false;
  };

  // Classic Google button (2026-11-28, kullanıcı kararı): one tap opens
  // Google straight away, like signing up on the site. Acceptance is the
  // "Devam ederek … kabul etmiş olursunuz" line under the button; only the
  // optional marketing opt-in stays a checkbox (never pre-checked).
  const joinWithGoogle = async () => {
    // Inside the tap: lets the card page play its sound after the redirect.
    unlockAudio();
    haptic(10);
    setError(null);
    setNotice(null);
    setBusy('google');
    const mine = ++attempt.current;
    let settled = false;
    let stop = () => {};
    try {
      window.sessionStorage.setItem(INTENT_KEY(slug), JSON.stringify({ marketing: form.marketing }));
    } catch {
      /* storage blocked: the popup path still works */
    }
    try {
      const mod = await import('@/lib/firebase-client');
      stop = mod.watchPopupFocusReturn(() => {
        if (!settled && attempt.current === mine) setBusy(null);
      });
      const result = await mod.startGoogleSignIn();
      settled = true;
      stop();
      if (attempt.current !== mine) return;
      if (result.status === 'unconfigured') {
        setError(t.googleUnavailable);
        setBusy(null);
        return;
      }
      if (result.status === 'idToken') {
        try {
          window.sessionStorage.removeItem(INTENT_KEY(slug));
        } catch {
          /* ignore */
        }
        await finishGoogle(result.idToken, form.marketing);
      }
    } catch (err) {
      settled = true;
      stop();
      if (attempt.current !== mine) return;
      setBusy(null);
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code.startsWith('auth/')) {
        const { getFirebaseErrorMessage } = await import('@/lib/firebase-client');
        setError(getFirebaseErrorMessage(err, locale));
        return;
      }
      setError(t.errors.DEFAULT);
    }
  };

  const join = async (useAccount: boolean) => {
    if (!requireConsent()) return;
    unlockAudio();
    haptic(10);
    setBusy('join');
    setError(null);
    setNotice(null);
    const phone = form.phone.trim() || null;
    try {
      const ok = await postJoin(
        useAccount,
        form.marketing,
        useAccount
          ? { phone, ...birthday() }
          : {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phone,
              email: form.email.trim() || null,
              ...birthday(),
              ...(form.website ? { website: form.website } : {}),
            },
      );
      if (!ok) setBusy(null);
    } catch {
      setError(t.errors.DEFAULT);
      setBusy(null);
    }
  };

  const months = locale === 'tr' ? MONTHS_TR : MONTHS_EN;
  const legalQ = locale === 'en' ? '?lang=en' : '';
  const accountLegal = { terms: `/${locale}/musteri-hesabi-kosullari`, privacy: `/${locale}/musteri-hesabi-aydinlatma` };
  const guestReady = Boolean(form.firstName.trim() && form.lastName.trim());
  const label = 'px-1 text-[14px] font-medium';
  const muted = { color: 'var(--p-muted)' } as const;
  const linkCls = 'font-medium underline underline-offset-2';

  const consentBoxes = (withAccountTerms: boolean) => (
    <div className="space-y-3 rounded-[20px] bg-[var(--p-bg)] p-4">
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed">
        <input
          ref={consentRef}
          type="checkbox"
          checked={form.consent}
          onChange={(e) => {
            set('consent', e.target.checked);
            if (e.target.checked) setConsentError(false);
          }}
          aria-invalid={consentError || undefined}
          aria-describedby={consentError ? 'join-consent-error' : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[color:var(--p-text)]"
        />
        <span>
          {t.consentAll}{' '}
          <a href={`/l/${slug}/kosullar${legalQ}`} target="_blank" rel="noopener" className={linkCls}>
            {t.termsLink}
          </a>
          {' · '}
          <a href={`/l/${slug}/aydinlatma${legalQ}`} target="_blank" rel="noopener" className={linkCls}>
            {t.privacyLink}
          </a>
          {withAccountTerms && (
            <>
              <br />
              <span style={muted}>
                {t.consentGoogle}{' '}
                <a href={accountLegal.terms} target="_blank" rel="noopener" className={linkCls}>
                  {t.accountTermsLink}
                </a>
                {' · '}
                <a href={accountLegal.privacy} target="_blank" rel="noopener" className={linkCls}>
                  {t.accountPrivacyLink}
                </a>
              </span>
            </>
          )}
        </span>
      </label>
      {consentError && (
        <p id="join-consent-error" className="rounded-[12px] bg-[#FEF3F2] px-3 py-2 text-[13px] font-medium text-[#B42318]" role="alert">
          {t.consentMissing}
        </p>
      )}
      <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed">
        <input type="checkbox" checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[color:var(--p-text)]" />
        <span>{t.marketing}</span>
      </label>
    </div>
  );

  const messages = (
    <>
      {error && (
        <p className="rounded-[16px] bg-[#FEF3F2] px-4 py-3 text-[14px] leading-snug text-[#B42318]" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-[16px] bg-[#EEF8F0] px-4 py-3 text-[14px] leading-snug text-[#1E7A35]" role="status">
          {notice}
        </p>
      )}
    </>
  );

  const birthdayFields = program.birthdayReward ? (
    <fieldset>
      <legend className={label}>{t.birthdayLabel}</legend>
      <div className="mt-1.5 flex gap-2">
        <SelectBox value={form.day} onChange={(e) => set('day', e.target.value)} className="w-28 shrink-0" aria-label={t.day}>
          <option value="">{t.day}</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </SelectBox>
        <SelectBox value={form.month} onChange={(e) => set('month', e.target.value)} className="min-w-0 flex-1" aria-label={t.month}>
          <option value="">{t.month}</option>
          {months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </SelectBox>
      </div>
    </fieldset>
  ) : null;

  const phoneField = (
    <label className="block">
      <span className={label}>{t.phoneOptional}</span>
      <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" enterKeyHint="done" />
      <span className="mt-1.5 block text-[12.5px]" style={muted}>
        {t.phoneHint}
      </span>
    </label>
  );

  const moreToggle = (text: string) => (
    <button
      type="button"
      onClick={() => setMore((v) => !v)}
      aria-expanded={more}
      className="flex min-h-[44px] w-full items-center justify-between rounded-full px-1 text-left text-[14px] font-medium"
      style={muted}
    >
      <span>{text}</span>
      <ChevronDown size={18} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${more ? 'rotate-180' : ''}`} />
    </button>
  );

  const nameFields = (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className={label}>{t.firstName}</span>
        <input required value={form.firstName} maxLength={40} onChange={(e) => set('firstName', e.target.value)} className={INPUT} autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" />
      </label>
      <label className="block">
        <span className={label}>{t.lastName}</span>
        <input required value={form.lastName} maxLength={40} onChange={(e) => set('lastName', e.target.value)} className={INPUT} autoComplete="family-name" autoCapitalize="words" enterKeyHint="done" />
      </label>
    </div>
  );

  let body: React.ReactNode;
  if (googleName) {
    body = (
      <form
        className={PANEL}
        onSubmit={(e) => {
          e.preventDefault();
          if (!guestReady) return;
          void finishGoogle(googleName.idToken, form.marketing, { firstName: form.firstName.trim(), lastName: form.lastName.trim() });
        }}
      >
        <div className="space-y-1 px-1">
          <p className={TITLE}>{t.googleNameTitle}</p>
          <p className="text-[13.5px]" style={muted}>
            {t.googleNameLead}
          </p>
        </div>
        {nameFields}
        {messages}
        <button type="submit" disabled={busy !== null || !guestReady} className={PRIMARY}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : t.googleNameContinue}
        </button>
      </form>
    );
  } else if (account && step === 'account') {
    body = (
      <form
        className={PANEL}
        onSubmit={(e) => {
          e.preventDefault();
          void join(true);
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--p-accent)] text-[18px] font-semibold text-[color:var(--p-on-accent)]">
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
        <p className="flex items-start gap-2 text-[12.5px]" style={muted}>
          <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden /> {t.accountShares}
        </p>
        {(!account.phone || (program.birthdayReward && !account.hasBirthday)) && (
          <>
            {moreToggle(t.optionalMoreAccount)}
            {more && (
              <div className="bzl-fade space-y-4">
                {!account.phone && phoneField}
                {!account.hasBirthday && birthdayFields}
              </div>
            )}
          </>
        )}
        {consentBoxes(false)}
        {messages}
        <button type="submit" disabled={busy !== null} className={PRIMARY}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : t.accountJoin(account.firstName)}
        </button>
        <button type="button" onClick={() => setStep('guest')} className="min-h-[44px] w-full text-center text-[13.5px] underline underline-offset-4" style={muted}>
          {t.guestInstead}
        </button>
      </form>
    );
  } else if (step === 'guest') {
    body = (
      <form
        className={PANEL}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!guestReady) return;
          void join(false);
        }}
      >
        <p className={`px-1 ${TITLE}`}>{t.joinTitle}</p>
        {nameFields}
        {moreToggle(t.optionalMore)}
        {more && (
          <div className="bzl-fade space-y-4">
            {phoneField}
            <label className="block">
              <span className={label}>{t.email}</span>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={INPUT} inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
              <span className="mt-1.5 block text-[12.5px]" style={muted}>
                {t.emailHint}
              </span>
            </label>
            {birthdayFields}
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
        {consentBoxes(false)}
        {messages}
        <button type="submit" disabled={busy !== null || !guestReady} className={PRIMARY}>
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {t.submitting}
            </>
          ) : (
            t.submit
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(account ? 'account' : 'choose');
            setError(null);
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 text-center text-[13.5px] underline underline-offset-4"
          style={muted}
        >
          {!account && <ArrowLeft size={14} aria-hidden="true" />}
          {account ? t.useAccountInstead : t.backToGoogle}
        </button>
      </form>
    );
  } else {
    body = (
      <div className={PANEL}>
        <div className="space-y-1 px-1">
          <p className={TITLE}>{t.joinTitle}</p>
          <p className="text-[13.5px] leading-relaxed" style={muted}>
            {t.googleJoinLead}
          </p>
        </div>
        {messages}
        <button
          type="button"
          onClick={() => void joinWithGoogle()}
          disabled={busy !== null}
          className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border border-[#DADCE0] bg-white px-5 text-[15px] font-medium text-[#1F1F1F] shadow-[0_1px_2px_rgba(60,64,67,0.15)] transition-[background-color,box-shadow,scale] duration-200 hover:bg-[#F8F9FA] hover:shadow-[0_1px_3px_rgba(60,64,67,0.25)] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F] focus-visible:ring-offset-2"
        >
          {busy === 'google' ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {t.googleJoinBusy}
            </>
          ) : (
            <>
              <GoogleMark />
              {t.googleJoin}
            </>
          )}
        </button>
        <p className="px-1 text-center text-[12.5px] leading-relaxed" style={muted}>
          {t.googleLegalPrefix}{' '}
          <a href={`/l/${slug}/kosullar${legalQ}`} target="_blank" rel="noopener" className={linkCls}>
            {t.googleLegalTerms}
          </a>{' '}
          {t.googleLegalAnd}{' '}
          <a href={accountLegal.terms} target="_blank" rel="noopener" className={linkCls}>
            {t.googleLegalAccount}
          </a>{' '}
          {t.googleLegalSuffix}{' '}
          <a href={`/l/${slug}/aydinlatma${legalQ}`} target="_blank" rel="noopener" className={linkCls}>
            {t.privacyLink}
          </a>
          {' · '}
          <a href={accountLegal.privacy} target="_blank" rel="noopener" className={linkCls}>
            {t.accountPrivacyLink}
          </a>
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-[16px] bg-[var(--p-bg)] px-4 py-3 text-[13px] leading-relaxed">
          <input
            type="checkbox"
            checked={form.marketing}
            onChange={(e) => set('marketing', e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[color:var(--p-text)]"
          />
          <span>{t.marketing}</span>
        </label>
        <div className="flex items-center gap-3 text-[13px]" style={muted}>
          <span className="h-px flex-1" style={{ background: 'var(--p-border)' }} />
          {t.or}
          <span className="h-px flex-1" style={{ background: 'var(--p-border)' }} />
        </div>
        <button
          type="button"
          onClick={() => {
            setStep('guest');
            setError(null);
          }}
          disabled={busy !== null}
          className={SECONDARY}
        >
          {t.withoutGoogle}
        </button>
        <a
          href={`/hesap/giris?${locale === 'en' ? 'lang=en&' : ''}next=${encodeURIComponent(`/l/${slug}${source === 'nfc' ? '?source=nfc' : ''}`)}`}
          className="block min-h-[44px] pt-2 text-center text-[13px] underline underline-offset-4"
          style={muted}
        >
          {t.emailSignIn}
        </a>
      </div>
    );
  }

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
        <p className="flex justify-center">
          <span className="inline-flex min-h-[36px] items-center gap-2 rounded-full bg-[var(--p-surface)] py-1.5 pl-1.5 pr-4 text-[13.5px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--p-accent)] text-[color:var(--p-on-accent)]">
              <Sparkles size={13} aria-hidden="true" />
            </span>
            {locale === 'tr'
              ? `Katılınca ${program.welcomeBonus} ${program.kind === 'stamps' ? 'damga' : 'puan'} hediye`
              : `${program.welcomeBonus} ${program.kind === 'stamps' ? (program.welcomeBonus === 1 ? 'stamp' : 'stamps') : 'points'} free when you join`}
          </span>
        </p>
      )}

      {source === 'nfc' && (
        <p className="flex items-start gap-2.5 rounded-[20px] bg-[var(--p-surface)] px-4 py-3 text-[13px] leading-relaxed" style={muted}>
          <Nfc size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--p-strong)' }} aria-hidden /> {t.nfcHint}
        </p>
      )}

      {saved && (
        <a
          href={saved}
          className="bzl-tap flex min-h-[60px] items-center justify-between gap-3 rounded-full bg-[var(--p-surface)] py-2 pl-5 pr-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-transform duration-200 active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--p-bg)]"
        >
          <span className="text-[14px] font-medium">{t.savedOnDevice}</span>
          <span className="inline-flex h-11 shrink-0 items-center rounded-full bg-[var(--p-accent)] px-4 text-[14px] font-semibold text-[color:var(--p-on-accent)]">
            {t.openMyCard} →
          </span>
        </a>
      )}

      <div ref={formRef} id="katil" className="scroll-mt-6">
        {body}
      </div>

      {showFloat && (
        <div className="bzl-fade fixed inset-x-0 bottom-0 z-40 px-4 sm:hidden" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            className={`${PRIMARY} mx-auto max-w-[480px] shadow-[0_16px_32px_-16px_rgba(0,0,0,0.45)]`}
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t.submit}
          </button>
        </div>
      )}
    </div>
  );
}

/** Native select in the pill field look; iOS draws no arrow once `appearance` is off. */
function SelectBox({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative block ${className}`}>
      <select {...rest} className={`${FIELD} w-full cursor-pointer appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--p-muted)' }}
      />
    </span>
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
