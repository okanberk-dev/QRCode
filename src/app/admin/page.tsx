'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { AlertBanner } from '@/components/ui';
import { type Locale, locales, defaultLocale } from '@/lib/translations';
import { getRecaptchaToken, preloadRecaptcha } from '@/lib/recaptcha-client';

const REDIRECT_FALLBACK = '/admin/dashboard';

/**
 * `?redirect=` comes from the admin middleware (encoded path + search). Only
 * same-origin `/admin/*` targets are honoured — anything else (external
 * URLs, protocol-relative `//host`, back-slash tricks, the login page
 * itself) collapses to the dashboard so the param can never be abused as
 * an open redirect.
 */
function resolveSafeRedirect(raw: string | null): string {
  if (!raw) return REDIRECT_FALLBACK;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return REDIRECT_FALLBACK;
  }
  if (!value.startsWith('/admin')) return REDIRECT_FALLBACK;
  if (value.startsWith('//') || value.includes('\\') || /[\r\n]/.test(value)) return REDIRECT_FALLBACK;
  if (value === '/admin' || value.startsWith('/admin?') || value.startsWith('/admin#')) return REDIRECT_FALLBACK;
  return value;
}

const FEATURES = [
  { icon: Zap, label: 'Tüm işletmeler tek panelde', sub: 'Yorumlar, QR kodları ve platform bağlantıları' },
  { icon: Sparkles, label: 'Pulse AI yanıt taslakları', sub: 'Onaylanmadan gönderilmez' },
  { icon: ShieldCheck, label: 'Korumalı giriş', sub: 'Şifreli oturum ve reCAPTCHA' },
] as const;

const TRUST_MARKS = ['KVKK uyumlu', 'Şifreli oturum', 'reCAPTCHA korumalı'] as const;

/* Decorative product preview for the wide-screen panel (Fintora home in
   miniature): pill tabs, a headline card, a bar chart with one hatched
   black bar and two list rows. Built from plain blocks — no numbers, no
   names, no claims. */
function PanelPreview() {
  const bars = [38, 56, 44, 72, 52, 88, 64];
  return (
    <div aria-hidden className="rounded-[24px] bg-pn-canvas p-4">
      <div className="flex items-center gap-1.5">
        <span className="h-7 w-16 rounded-full bg-pn-accent" />
        <span className="h-7 w-14 rounded-full bg-white" />
        <span className="h-7 w-14 rounded-full bg-white" />
        <span className="ml-auto h-7 w-7 rounded-full bg-white" />
      </div>
      <div className="mt-3 grid grid-cols-[1.1fr_1fr] gap-2.5">
        <div className="rounded-[18px] bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="h-2.5 w-20 rounded-full bg-[#E3E3E6]" />
            <span className="h-6 w-6 rounded-full bg-pn-canvas" />
          </div>
          <span className="mt-3 block h-6 w-16 rounded-full bg-pn-ink/85" />
          <span className="mt-2 block h-4 w-12 rounded-full bg-[#E6F7EA]" />
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-6 rounded-full bg-pn-canvas" />
            ))}
          </div>
          <svg viewBox="0 0 120 36" preserveAspectRatio="none" className="mt-3 h-9 w-full">
            <path d="M0 30 C 14 26, 22 18, 36 20 S 60 28, 74 16 S 100 8, 120 6 L120 36 L0 36 Z" fill="#F1FDF3" />
            <path d="M0 30 C 14 26, 22 18, 36 20 S 60 28, 74 16 S 100 8, 120 6" fill="none" stroke="#111110" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="flex flex-col rounded-[18px] bg-white p-3.5">
          <span className="h-2.5 w-16 rounded-full bg-[#E3E3E6]" />
          <div className="mt-auto flex h-[104px] items-end gap-1.5 pt-3">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-full ${i === 5 ? 'pn-hatch-accent' : 'bg-[#E3E3E6]'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5">
            <span className="h-8 w-8 shrink-0 rounded-full bg-pn-accent" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-2.5 w-28 rounded-full bg-[#E3E3E6]" />
              <span className="block h-2 w-20 rounded-full bg-pn-canvas" />
            </span>
            <span className="h-5 w-12 rounded-full bg-pn-accent-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const usernameRef = useRef<HTMLInputElement>(null);

  const redirectTarget = useMemo(
    () => resolveSafeRedirect(searchParams.get('redirect')),
    [searchParams],
  );
  const cameFromProtectedPage = redirectTarget !== REDIRECT_FALLBACK;

  useEffect(() => {
    const browser = navigator.language.split('-')[0] as Locale;
    if ((locales as string[]).includes(browser)) setLocale(browser);
    // Warm the reCAPTCHA script while the operator types — first submit then
    // skips the script download + ready() handshake.
    preloadRecaptcha();
    // Desktop only: auto-focus the username. On touch devices focusing
    // would pop the keyboard over the form before the user has read it.
    if (window.matchMedia('(min-width: 1024px) and (hover: hover)').matches) {
      usernameRef.current?.focus();
    }
  }, []);

  // Lockout countdown ticker — only runs while a 429 lock is active.
  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const lockSecondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  useEffect(() => {
    if (lockedUntil && lockSecondsLeft === 0) setLockedUntil(null);
  }, [lockedUntil, lockSecondsLeft]);

  const detectCapsLock = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || lockSecondsLeft > 0) return;
    setError('');
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('admin_login').catch(() => null);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, rememberMe, recaptchaToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('Retry-After') || '0');
          if (retryAfter > 0) setLockedUntil(Date.now() + Math.min(retryAfter, 1800) * 1000);
        }
        setError(data.error || 'Giriş yapılamadı.');
        setLoading(false);
        return;
      }

      router.push(redirectTarget);
      router.refresh();
    } catch {
      setError('Bağlantı hatası. İnternet bağlantını kontrol edip tekrar dene.');
      setLoading(false);
    }
  };

  const submitDisabled = loading || lockSecondsLeft > 0;
  const formatLock = (s: number) =>
    s >= 60 ? `${Math.floor(s / 60)} dk ${String(s % 60).padStart(2, '0')} sn` : `${s} sn`;

  return (
    <main className="relative w-full min-h-[100dvh] bg-pn-canvas text-pn-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1280px] flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-[calc(16px+env(safe-area-inset-top,0px))] sm:px-6 sm:pt-6 lg:pb-6">
        {/* Top bar: logo + business sign-in. */}
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
            aria-label="Buaze ana sayfa"
          >
            <BuazeLogo size={36} />
            <span className="text-[20px] font-medium tracking-[-0.03em]">
              buaze<span className="text-pn-accent">.</span>
            </span>
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            className="bz-btn-ghost inline-flex items-center gap-1.5 text-[13px] max-sm:bg-[#F6F6F6]"
          >
            İşletme girişi
            <ArrowRight size={14} aria-hidden />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-2.5 lg:py-6">
          {/* ================= FORM CARD ================= */}
          <section className="flex w-full items-center justify-center lg:rounded-[28px] lg:bg-white lg:p-8">
            <div className="bz-fade-in w-full max-w-[420px] rounded-[28px] bg-white p-5 sm:p-8 lg:rounded-none lg:p-0">
              {/* Heading */}
              <div className="mb-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pn-accent text-white" aria-hidden>
                  <ShieldCheck size={22} />
                </span>
                <h1 className="mt-5 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-pn-ink">
                  Tekrar hoş geldin
                </h1>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#737373]">
                  Yönetici paneline giriş için kullanıcı adın ve şifrenle doğrula.
                </p>
              </div>

              {cameFromProtectedPage && !error && (
                <div className="mb-4">
                  <AlertBanner kind="info">
                    Oturumun sona erdi ya da bu sayfa giriş gerektiriyor. Doğruladıktan sonra
                    kaldığın yere döneceksin.
                  </AlertBanner>
                </div>
              )}

              {error && (
                <div className="mb-4" role="alert" aria-live="assertive">
                  <AlertBanner kind="danger">
                    {error}
                    {lockSecondsLeft > 0 && (
                      <span className="mt-1 block tabular-nums text-[12px] opacity-80">
                        Tekrar deneme: {formatLock(lockSecondsLeft)}
                      </span>
                    )}
                  </AlertBanner>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                {/* Username */}
                <div className="space-y-2">
                  <label htmlFor="adminUsername" className="text-[14px] text-[#737373]">
                    Kullanıcı adı
                  </label>
                  <div className="group relative">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A] transition-colors group-focus-within:text-pn-ink"
                      size={17}
                      aria-hidden
                    />
                    <input
                      ref={usernameRef}
                      id="adminUsername"
                      name="username"
                      type="text"
                      required
                      autoComplete="username"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      value={credentials.username}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, username: e.target.value }))
                      }
                      className="bz-input w-full min-h-[48px] pl-11 text-[16px] sm:text-[15px]"
                      placeholder="kullanici.adi"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="adminPassword" className="text-[14px] text-[#737373]">
                      Şifre
                    </label>
                    <Link
                      href="/admin/forgot-password"
                      prefetch={false}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-full text-[13px] font-medium text-[#737373] underline-offset-4 transition-colors hover:text-pn-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
                    >
                      <KeyRound size={13} aria-hidden />
                      Şifremi unuttum
                    </Link>
                  </div>
                  <div className="group relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A] transition-colors group-focus-within:text-pn-ink"
                      size={17}
                      aria-hidden
                    />
                    <input
                      id="adminPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      enterKeyHint="go"
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, password: e.target.value }))
                      }
                      onKeyDown={detectCapsLock}
                      onKeyUp={detectCapsLock}
                      onBlur={() => setCapsLock(false)}
                      aria-describedby={capsLock ? 'adminCapsHint' : undefined}
                      className="bz-input w-full min-h-[48px] pl-11 pr-14 text-[16px] sm:text-[15px]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {capsLock && (
                    <p id="adminCapsHint" className="flex items-center gap-1.5 text-[13px] text-[#8A5A00]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D97706]" aria-hidden />
                      Caps Lock açık.
                    </p>
                  )}
                </div>

                {/* Remember me */}
                <label
                  htmlFor="rememberMe"
                  className="flex min-h-[44px] cursor-pointer select-none items-center gap-3 text-[14px] text-pn-ink"
                >
                  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer h-5 w-5 appearance-none rounded-[7px] border border-[#D6D6D6] bg-white transition-colors checked:border-pn-accent checked:bg-pn-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
                    />
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                    >
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>
                    Beni 30 gün hatırla
                    <span className="block text-[13px] text-[#9A9A9A]">
                      Sadece kişisel cihazlarda kullan.
                    </span>
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="bz-btn-primary mt-1 min-h-[48px] w-full text-[15px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} aria-hidden />
                      Doğrulanıyor…
                    </>
                  ) : lockSecondsLeft > 0 ? (
                    <>
                      <LockKeyhole size={16} aria-hidden />
                      Kilitli · {formatLock(lockSecondsLeft)}
                    </>
                  ) : (
                    <>
                      Panele gir
                      <ArrowRight size={17} aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 space-y-2 text-center">
                <p className="text-[13px] text-[#9A9A9A]">
                  Buaze yönetici girişi · yalnızca yetkili ekip
                </p>
                <RecaptchaNotice className="mx-auto max-w-[360px]" />
              </div>
            </div>
          </section>

          {/* ================= PREVIEW PANEL (wide screens) ================= */}
          <aside className="hidden flex-col rounded-[28px] bg-white p-8 lg:flex">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-pn-accent-soft px-3 py-1.5 text-[13px] font-medium text-pn-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-pn-accent" aria-hidden />
              Yönetici konsolu
            </span>
            <h2 className="mt-5 max-w-[420px] text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-pn-ink">
              İşletmelerin itibarını tek panelden izle
            </h2>
            <p className="mt-2 max-w-[440px] text-[14px] leading-[1.6] text-[#737373]">
              Yorum akışı, QR kodları, Pulse AI taslakları ve platform bağlantıları bir arada.
            </p>

            <div className="mt-6">
              <PanelPreview />
            </div>

            <ul className="mt-5 flex flex-col gap-2">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <li key={label} className="pn-row min-h-[60px] py-2.5">
                  <span className="pn-row-icon" aria-hidden>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-pn-ink">{label}</span>
                    <span className="block text-[13px] text-[#9A9A9A]">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
              {TRUST_MARKS.map((m) => (
                <span key={m} className="rounded-full bg-pn-canvas px-3 py-1.5 text-[13px] text-[#737373]">
                  {m}
                </span>
              ))}
              <span className="ml-auto text-[13px] text-[#9A9A9A]">© {new Date().getFullYear()} Buaze</span>
            </div>
          </aside>
        </div>

        <footer className="text-center lg:hidden">
          <span className="text-[13px] text-[#9A9A9A]">© {new Date().getFullYear()} Buaze</span>
        </footer>
      </div>
    </main>
  );
}

export default function AdminLogin() {
  return (
    <Suspense
      fallback={
        <main className="flex w-full min-h-[100dvh] items-center justify-center bg-pn-canvas">
          <Loader2 className="h-8 w-8 animate-spin text-pn-accent" />
        </main>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
