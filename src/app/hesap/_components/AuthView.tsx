'use client';

// Sign in / sign up for the Buaze customer account (CLAUDE.md §61): Google
// first, e-mail + password below. A new Google user sees one consent step
// (name check, terms + privacy notice, opt-in marketing). Phone and birthday
// are never asked for: they fold away as optional (2026-11-28).
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2 } from 'lucide-react';
import { ACCOUNT_COPY, accountError, accountLegalLinks, customerApi, errorCode, type AccountLocale } from '../account-copy';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, CHECKBOX, INPUT, LINK, MUTED, NOTICE_ERROR, NOTICE_WARN, SelectBox } from './ui';

type Mode = 'login' | 'register';

interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
}

export default function AuthView({
  locale,
  mode: initialMode,
  next,
  intro,
}: {
  locale: AccountLocale;
  mode: Mode;
  next: string;
  /** Optional line above the form, e.g. "Kafe Lale kartınızı hesabınıza ekleyin". */
  intro?: string | null;
}) {
  const c = ACCOUNT_COPY[locale];
  const legal = accountLegalLinks(locale);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState<null | 'form' | 'google'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    birthDay: '',
    birthMonth: '',
    terms: false,
    privacy: false,
    marketing: false,
    website: '',
  });
  const [google, setGoogle] = useState<{ idToken: string; profile: GoogleProfile } | null>(null);
  const [more, setMore] = useState(false);
  const attempt = useRef(0);

  const done = useCallback(() => {
    window.location.assign(next);
  }, [next]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((s) => ({ ...s, [key]: value }));

  const birthday = () => {
    const m = Number.parseInt(form.birthMonth, 10);
    const d = Number.parseInt(form.birthDay, 10);
    return Number.isFinite(m) && Number.isFinite(d) ? { birthMonth: m, birthDay: d } : {};
  };

  const sendGoogle = useCallback(
    async (idToken: string, extra?: Record<string, unknown>) => {
      const { status, data } = await customerApi<{ code?: string; profile?: GoogleProfile }>('/api/customer/auth/google', {
        body: { idToken, locale, ...extra },
      });
      if (status === 409 && data.code === 'SIGNUP_REQUIRED' && data.profile) {
        setGoogle({ idToken, profile: data.profile });
        setForm((s) => ({ ...s, firstName: data.profile!.firstName, lastName: data.profile!.lastName, email: data.profile!.email }));
        setBusy(null);
        return;
      }
      done();
    },
    [done, locale],
  );

  // Google redirect fallback: finish the sign-in on return.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import('@/lib/firebase-client');
        mod.preloadGoogleSignIn();
        if (!mod.isGoogleRedirectPending()) return;
        setBusy('google');
        const idToken = await mod.consumeGoogleRedirectIdToken();
        if (cancelled) return;
        if (!idToken) {
          setBusy(null);
          return;
        }
        await sendGoogle(idToken);
      } catch (err) {
        if (cancelled) return;
        setBusy(null);
        setError(accountError(c, errorCode(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [c, sendGoogle]);

  const startGoogle = async () => {
    setError(null);
    setNotice(null);
    setBusy('google');
    const mine = ++attempt.current;
    let settled = false;
    let stop = () => {};
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
        setNotice(c.googleUnavailable);
        setBusy(null);
        return;
      }
      if (result.status === 'idToken') await sendGoogle(result.idToken);
    } catch (err) {
      settled = true;
      stop();
      if (attempt.current !== mine) return;
      const code = (err as { code?: string })?.code ?? '';
      setBusy(null);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code.startsWith('auth/')) {
        const { getFirebaseErrorMessage } = await import('@/lib/firebase-client');
        setError(getFirebaseErrorMessage(err, locale));
        return;
      }
      setError(accountError(c, errorCode(err)));
    }
  };

  const finishGoogleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!google) return;
    if (!form.terms || !form.privacy) {
      setError(c.errors.CONSENT_REQUIRED);
      return;
    }
    setError(null);
    setBusy('form');
    try {
      await sendGoogle(google.idToken, {
        consentTerms: true,
        consentPrivacy: true,
        marketingConsent: form.marketing,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone.trim() || null,
        ...birthday(),
      });
    } catch (err) {
      const code = errorCode(err);
      // The Google token lives one hour; start over if it expired.
      if (code === 'GOOGLE_TOKEN_INVALID') setGoogle(null);
      setError(accountError(c, code));
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === 'register' && (!form.terms || !form.privacy)) {
      setError(c.errors.CONSENT_REQUIRED);
      return;
    }
    setBusy('form');
    try {
      if (mode === 'login') {
        await customerApi('/api/customer/auth/login', { body: { email: form.email, password: form.password } });
      } else {
        await customerApi('/api/customer/auth/register', {
          body: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone.trim() || null,
            password: form.password,
            ...birthday(),
            consentTerms: true,
            consentPrivacy: true,
            marketingConsent: form.marketing,
            locale,
            website: form.website || undefined,
          },
        });
      }
      done();
    } catch (err) {
      setError(accountError(c, errorCode(err)));
      setBusy(null);
    }
  };

  const consentBlock = (
    <div className="space-y-3 rounded-[20px] bg-white p-4 text-[13.5px] leading-snug text-[#404040] sm:bg-[#F6F6F6]">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" className={CHECKBOX} checked={form.terms} onChange={(e) => set('terms', e.target.checked)} required />
        <span>
          {c.consentTerms}{' '}
          <a href={legal.terms} target="_blank" rel="noopener" className="font-medium text-[#111110] underline underline-offset-2">
            {c.terms}
          </a>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" className={CHECKBOX} checked={form.privacy} onChange={(e) => set('privacy', e.target.checked)} required />
        <span>
          {c.consentPrivacy}{' '}
          <a href={legal.privacy} target="_blank" rel="noopener" className="font-medium text-[#111110] underline underline-offset-2">
            {c.privacy}
          </a>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" className={CHECKBOX} checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} />
        <span>
          {c.marketing}{' '}
          <a href={legal.commercial} target="_blank" rel="noopener" className="text-[#111110] underline underline-offset-2">
            ETK
          </a>
        </span>
      </label>
    </div>
  );

  const nameFields = (
    <div className="grid grid-cols-2 gap-3">
      <Labeled label={c.firstName} id="acc-first">
        <input id="acc-first" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={`${INPUT} w-full`} autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" required maxLength={40} />
      </Labeled>
      <Labeled label={c.lastName} id="acc-last">
        <input id="acc-last" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={`${INPUT} w-full`} autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" required maxLength={40} />
      </Labeled>
    </div>
  );

  const extraFields = (
    <>
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
        className={`flex min-h-[44px] w-full items-center justify-between rounded-full px-1 text-left text-[14px] font-medium ${MUTED}`}
      >
        <span>{c.optionalMore}</span>
        <ChevronDown size={18} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${more ? 'rotate-180' : ''}`} />
      </button>
      {more && (
        <>
        <Labeled label={c.phone} id="acc-phone" hint={c.phoneHint}>
          <input id="acc-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={`${INPUT} w-full`} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" enterKeyHint="next" />
        </Labeled>
        <Labeled label={c.birthday} id="acc-bday" hint={c.birthdayHint}>
          <div className="flex gap-2">
            <input id="acc-bday" value={form.birthDay} onChange={(e) => set('birthDay', e.target.value.replace(/\D/g, '').slice(0, 2))} className={`${INPUT} w-20 text-center`} inputMode="numeric" placeholder={c.day} aria-label={c.day} />
            <SelectBox value={form.birthMonth} onChange={(e) => set('birthMonth', e.target.value)} className="min-w-0 flex-1" aria-label={c.month}>
              <option value="">{c.month}</option>
              {c.months.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </SelectBox>
          </div>
        </Labeled>
        </>
      )}
    </>
  );

  if (google) {
    return (
      <section className={CARD}>
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[26px]">{c.googleConsentTitle}</h1>
        <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>{c.googleConsentLead}</p>
        <form onSubmit={finishGoogleSignup} className="mt-5 space-y-4">
          <p className="truncate rounded-full bg-white px-4 py-3 text-[14px] text-[#525252] sm:bg-[#F6F6F6]">{google.profile.email}</p>
          {nameFields}
          {extraFields}
          {consentBlock}
          {error && <ErrorLine text={error} />}
          <div className="flex gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => { setGoogle(null); setError(null); }}>
              {c.back}
            </button>
            <button type="submit" className={`${BTN_PRIMARY} min-w-0 flex-1`} disabled={busy !== null}>
              {busy === 'form' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {c.googleContinue}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className={CARD}>
      {intro && <p className="mb-4 inline-flex rounded-full bg-[#F4FBDC] px-3 py-1.5 text-[13px] font-medium text-[#111110]">{intro}</p>}
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">{mode === 'login' ? c.loginTitle : c.registerTitle}</h1>
      <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>{mode === 'login' ? c.loginLead : c.registerLead}</p>

      <button
        type="button"
        onClick={() => void startGoogle()}
        disabled={busy !== null}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-white text-[15px] font-medium text-[#1F1F1F] transition-colors duration-200 hover:bg-[#F8F8F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111110] focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleMark />}
        {busy === 'google' ? c.googleBusy : c.google}
      </button>
      {notice && <p className={`mt-3 ${NOTICE_WARN}`}>{notice}</p>}

      <div className={`my-6 flex items-center gap-3 text-[13px] ${MUTED}`}>
        <span className="h-px flex-1 bg-[#E3E3E3]" />
        {c.or}
        <span className="h-px flex-1 bg-[#E3E3E3]" />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        {mode === 'register' && nameFields}
        <Labeled label={c.email} id="acc-email">
          <input id="acc-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={`${INPUT} w-full`} autoComplete="email" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="next" required />
        </Labeled>
        <Labeled label={c.password} id="acc-password" hint={mode === 'register' ? c.passwordHint : undefined}>
          <input id="acc-password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={`${INPUT} w-full`} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} enterKeyHint={mode === 'login' ? 'go' : 'next'} required />
        </Labeled>
        {mode === 'register' && extraFields}
        {mode === 'register' && consentBlock}
        {/* Honeypot: hidden from people. */}
        <input type="text" name="website" value={form.website} onChange={(e) => set('website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        {error && <ErrorLine text={error} />}
        <button type="submit" className={`${BTN_PRIMARY} w-full`} disabled={busy !== null}>
          {busy === 'form' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {busy === 'form' ? c.working : mode === 'login' ? c.login : c.register}
        </button>
      </form>

      <div className={`mt-6 flex flex-col gap-3 text-[14px] ${MUTED} sm:flex-row sm:items-center sm:justify-between`}>
        <span>
          {mode === 'login' ? c.toRegister : c.toLogin}{' '}
          <button
            type="button"
            className={LINK}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? c.toRegisterLink : c.toLoginLink}
          </button>
        </span>
        {mode === 'login' && (
          <Link href={`/hesap/sifre${locale === 'en' ? '?lang=en' : ''}`} className={`${LINK} self-start`}>
            {c.forgot}
          </Link>
        )}
      </div>
    </section>
  );
}

export function Labeled({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block px-1 text-[14px] font-medium text-[#111110]">
        {label}
      </label>
      {children}
      {hint && <p className={`mt-1.5 px-1 text-[12.5px] leading-snug ${MUTED}`}>{hint}</p>}
    </div>
  );
}

export function ErrorLine({ text }: { text: string }) {
  return (
    <p role="alert" className={NOTICE_ERROR}>
      {text}
    </p>
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
