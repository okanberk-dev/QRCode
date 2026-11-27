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
  { icon: Zap, label: 'Gerçek zamanlı yorum akışı', sub: 'Tüm işletmeler tek panelde' },
  { icon: Sparkles, label: 'Buaze Pulse AI', sub: 'Onaylı, ton-duyarlı yanıt taslakları' },
  { icon: ShieldCheck, label: 'KVKK + Google politikası', sub: 'Şeffaf, uyumlu yorum yönetimi' },
] as const;

const TRUST_MARKS = ['KVKK UYUMLU', 'ŞİFRELİ OTURUM', 'reCAPTCHA KORUMALI'] as const;

/* Decorative ECG line — pure SVG, no data. Draws once on mount and idles as
   a subtle "live" signal. Motion is disabled by the global reduced-motion
   blanket (globals.css). */
function PulseLine({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 120"
      preserveAspectRatio="none"
      className={`h-[120px] w-full ${className}`}
    >
      <defs>
        <linearGradient id="adminPulseFade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#D7FE03" stopOpacity="0" />
          <stop offset="0.12" stopColor="#D7FE03" stopOpacity="1" />
          <stop offset="0.88" stopColor="#D7FE03" stopOpacity="1" />
          <stop offset="1" stopColor="#D7FE03" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 62 H150 L172 62 L184 30 L198 96 L212 44 L224 62 H300 L322 62 L334 18 L350 104 L364 40 L376 62 H460 L482 62 L494 34 L508 90 L522 48 L534 62 H640"
        fill="none"
        stroke="url(#adminPulseFade)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2000"
        strokeDashoffset="0"
        style={{ animation: 'ecgDraw 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}
      />
    </svg>
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
    <main className="relative w-full min-h-[100dvh] bg-white text-pn-ink selection:bg-pn-accent/40 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ================= BRAND PANEL (desktop) ================= */}
      <aside className="relative hidden overflow-hidden bg-pn-ink text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-44 -right-40 h-[520px] w-[520px] rounded-full bg-pn-accent/25 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-32%] left-[-18%] h-[460px] w-[460px] rounded-full bg-pn-accent-hover/15 blur-[150px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-2.5 self-start" aria-label="Buaze ana sayfa">
            <BuazeLogo size={36} variant="on-dark" />
            <span className="bz-h-tight text-[22px]" style={{ letterSpacing: '-0.03em' }}>
              buaze<span className="text-pn-accent">.</span>
            </span>
          </Link>

          <div className="max-w-[460px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pn-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pn-accent" />
              </span>
              <span className="text-[13px] font-medium text-white/80">YÖNETİCİ KONSOLU</span>
            </div>

            <h2 className="mt-7 text-[44px] xl:text-[56px] font-medium leading-[1.0] tracking-[-0.04em] text-white">
              Her yorum
              <br />
              bir <span className="text-pn-accent">nabız.</span>
            </h2>
            <p className="mt-5 max-w-[400px] text-[15px] leading-[1.65] text-white/70">
              İşletmelerin itibarını tek panelden izle: yorum akışı, QR performansı, Pulse AI
              taslakları ve platform sağlığı — hepsi burada.
            </p>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between px-4 pt-3.5">
                <span className="text-[13px] font-medium text-white/50">CANLI NABIZ</span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-pn-accent">
                  <span className="bz-pulse-dot" />
                  Akış aktif
                </span>
              </div>
              <PulseLine className="-mt-2" />
            </div>

            <ul className="mt-7 space-y-3.5">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[20px] bg-pn-accent/12 text-pn-accent">
                    <Icon size={16} strokeWidth={2.2} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-medium text-white/90">{label}</span>
                    <span className="block text-[13px] text-white/50">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {TRUST_MARKS.map((m) => (
              <span key={m} className="text-[13px] font-medium text-white/40">
                {m}
              </span>
            ))}
            <span className="ml-auto text-[12px] text-white/35">
              © {new Date().getFullYear()} BUAZE
            </span>
          </div>
        </div>
      </aside>

      {/* ================= FORM PANEL ================= */}
      <section className="relative flex min-h-[100dvh] flex-col lg:min-h-0">
        {/* Mobile ambient — soft lime wash behind the header */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(120%_80%_at_50%_0%,#EAF9B8_0%,rgba(234,249,184,0.35)_45%,rgba(255,255,255,0)_75%)] lg:hidden"
        />

        <header className="relative flex items-center justify-between px-5 pt-[calc(16px+env(safe-area-inset-top,0px))] sm:px-8 sm:pt-7 lg:justify-end lg:px-12 lg:pt-9">
          <Link href="/" className="inline-flex items-center gap-2.5 lg:hidden" aria-label="Buaze ana sayfa">
            <BuazeLogo size={32} />
            <span className="bz-h-tight text-[20px]" style={{ letterSpacing: '-0.03em' }}>
              buaze<span className="text-pn-accent-ink">.</span>
            </span>
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-pn-ink/10 bg-white/70 px-4 text-[13px] font-medium text-[#525252] backdrop-blur-sm transition-colors hover:border-pn-ink hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 lg:text-[13px]"
          >
            İşletme girişi
            <ArrowRight size={13} strokeWidth={2.2} />
          </Link>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:py-8">
          <div className="bz-fade-in w-full max-w-[440px]">
            <div className="rounded-[28px] border border-pn-line bg-white p-5 shadow-[0_30px_80px_-48px_rgba(10,10,10,0.45)] sm:p-8 lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none">
              {/* Heading */}
              <div className="mb-6 sm:mb-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-pn-line bg-pn-canvas px-3 py-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pn-ink text-pn-accent">
                    <ShieldCheck size={11} strokeWidth={2.5} />
                  </span>
                  <span className="text-[13px] font-medium text-pn-ink">YÖNETİCİ PANELİ</span>
                </span>
                <h1 className="mt-4 text-[32px] sm:text-[42px] font-medium leading-[1.02] tracking-[-0.04em] text-pn-ink">
                  Tekrar hoş geldin.
                </h1>
                <p className="mt-2.5 max-w-[380px] text-[14px] sm:text-[15px] leading-[1.6] text-[#525252]">
                  Konsola erişmek için kullanıcı adın ve şifrenle doğrula.
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
                <div className="space-y-1.5">
                  <label htmlFor="adminUsername" className="text-[13px] font-medium text-[#737373]">
                    Kullanıcı adı
                  </label>
                  <div className="group relative">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-pn-ink"
                      size={16}
                      strokeWidth={2}
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
                      className="w-full min-h-[52px] rounded-[24px] border border-pn-line bg-pn-canvas py-3.5 pl-11 pr-4 text-[16px] sm:text-[15px] font-medium text-pn-ink outline-none transition-all placeholder:font-normal placeholder:text-[#A3A3A3] hover:border-pn-line-strong hover:bg-white focus:border-pn-ink focus:bg-white focus:ring-4 focus:ring-pn-accent/30"
                      placeholder="kullanici.adi"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="adminPassword" className="text-[13px] font-medium text-[#737373]">
                      Şifre
                    </label>
                    <Link
                      href="/admin/forgot-password"
                      prefetch={false}
                      className="group/forgot inline-flex min-h-[32px] items-center gap-1 rounded-full text-[12px] font-medium text-pn-ink transition-colors hover:text-pn-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
                    >
                      <KeyRound size={12} strokeWidth={2.4} aria-hidden />
                      <span className="underline-offset-4 group-hover/forgot:underline">
                        Şifremi unuttum
                      </span>
                    </Link>
                  </div>
                  <div className="group relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-pn-ink"
                      size={16}
                      strokeWidth={2}
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
                      className="w-full min-h-[52px] rounded-[24px] border border-pn-line bg-pn-canvas py-3.5 pl-11 pr-14 text-[16px] sm:text-[15px] font-medium text-pn-ink outline-none transition-all placeholder:font-normal placeholder:text-[#A3A3A3] hover:border-pn-line-strong hover:bg-white focus:border-pn-ink focus:bg-white focus:ring-4 focus:ring-pn-accent/30"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[20px] text-[#737373] transition-colors hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {capsLock && (
                    <p id="adminCapsHint" className="flex items-center gap-1.5 text-[12px] font-medium text-[#92400E]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D97706]" aria-hidden />
                      Caps Lock açık.
                    </p>
                  )}
                </div>

                {/* Remember me */}
                <label
                  htmlFor="rememberMe"
                  className="flex min-h-[44px] cursor-pointer select-none items-center gap-3 text-[13px] font-medium text-[#525252]"
                >
                  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer h-5 w-5 appearance-none rounded-[10px] border border-pn-line-strong bg-white transition-colors checked:border-pn-ink checked:bg-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
                    />
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      className="pointer-events-none absolute h-3 w-3 text-pn-accent opacity-0 transition-opacity peer-checked:opacity-100"
                    >
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>
                    Beni 30 gün hatırla
                    <span className="block text-[12px] font-normal text-[#A3A3A3]">
                      Sadece kişisel cihazlarda kullan.
                    </span>
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="bz-btn-lime mt-1 min-h-[54px] w-full text-[15px] shadow-[0_18px_40px_-20px_rgba(215,254,3,0.9)] hover:shadow-[0_18px_40px_-18px_rgba(168,214,46,0.9)] disabled:shadow-none"
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
                      <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 space-y-2 text-center">
                <p className="text-[12px] text-[#A3A3A3]">
                  Buaze yönetici girişi · yalnızca yetkili ekip
                </p>
                <RecaptchaNotice className="mx-auto max-w-[360px]" />
              </div>
            </div>
          </div>
        </div>

        <footer className="relative px-5 pb-[calc(14px+env(safe-area-inset-bottom,0px))] text-center lg:hidden">
          <span className="text-[13px] font-medium text-[#C4C4C4]">© {new Date().getFullYear()} BUAZE</span>
        </footer>
      </section>
    </main>
  );
}

export default function AdminLogin() {
  return (
    <Suspense
      fallback={
        <main className="flex w-full min-h-[100dvh] items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-pn-ink" />
        </main>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
