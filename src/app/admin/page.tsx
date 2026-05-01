'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { type Locale, locales, defaultLocale } from '@/lib/translations';
import { AlertBanner } from '@/components/ui';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const browser = navigator.language.split('-')[0] as Locale;
    if ((locales as string[]).includes(browser)) setLocale(browser);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('admin_login').catch(() => null);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, rememberMe, recaptchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.');
        setLoading(false);
        return;
      }

      const redirectPath = searchParams.get('redirect');
      router.push(redirectPath ? decodeURIComponent(redirectPath) : '/admin/dashboard');
      router.refresh();
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      {/* Mobile top accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_70%)] lg:hidden"
      />

      <div className="relative grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
        {/* ========= LEFT PANEL (desktop only) — graphite brand canvas ========= */}
        <aside className="relative hidden overflow-hidden bg-[#0A0A0A] text-white lg:flex lg:flex-col">
          {/* Lime ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 h-[460px] w-[460px] rounded-full bg-[#C6F24E]/25 blur-[120px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[-30%] left-[-15%] h-[420px] w-[420px] rounded-full bg-[#A8D62E]/20 blur-[140px]"
          />
          {/* Subtle grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />

          <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
            {/* Top — wordmark */}
            <Link href="/" className="inline-flex items-center gap-2.5 self-start">
              <BuazeLogo size={36} variant="on-dark" />
              <span className="bz-h-tight text-[22px]" style={{ letterSpacing: '-0.03em' }}>
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>

            {/* Center — narrative */}
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C6F24E] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C6F24E]" />
                </span>
                <span className="pulse-eyebrow text-white/80">YÖNETİCİ KONSOLU</span>
              </div>
              <h2
                className="mt-7 text-[44px] xl:text-[54px] font-medium leading-[1.02] tracking-[-0.04em] text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Her yorum
                <br />
                bir <span className="text-[#C6F24E]">nabız.</span>
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-[1.6] text-white/70">
                Restoran itibarını anlık izle. QR akışını yönet. Düşük puanları kapat,
                yüksek puanları platforma taşı.
              </p>

              {/* Feature pills */}
              <ul className="mt-8 space-y-3">
                {[
                  { icon: Zap, label: 'Gerçek zamanlı yorum akışı' },
                  { icon: ShieldCheck, label: 'KVKK + Google politika uyumu' },
                  { icon: Sparkles, label: 'Pulse AI yanıt önerileri' },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-[14px] text-white/85">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E]/12 text-[#C6F24E]">
                      <Icon size={15} strokeWidth={2.2} />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom — fine print */}
            <p className="text-[11px] tracking-[0.06em] text-white/40">
              © {new Date().getFullYear()} BUAZE · TÜM HAKLARI SAKLIDIR
            </p>
          </div>
        </aside>

        {/* ========= RIGHT PANEL — login form ========= */}
        <section className="relative flex flex-col px-5 sm:px-8 lg:px-12 py-6 sm:py-10">
          {/* Mobile / tablet header */}
          <header className="flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BuazeLogo size={32} />
              <span className="bz-h-tight text-[20px]" style={{ letterSpacing: '-0.03em' }}>
                buaze<span className="text-[#A8D62E]">.</span>
              </span>
            </Link>
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3.5 py-2 text-[12px] font-semibold text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            >
              Müşteri girişi
              <ArrowRight size={12} strokeWidth={2.2} />
            </Link>
          </header>

          {/* Desktop header — minimal */}
          <header className="hidden items-center justify-end lg:flex">
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-4 py-2 text-[13px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            >
              Müşteri girişi
              <ArrowRight size={13} strokeWidth={2.2} />
            </Link>
          </header>

          {/* Form column */}
          <div className="bz-fade-in flex flex-1 items-center justify-center py-8 sm:py-12 lg:py-6">
            <div className="w-full max-w-[440px]">
              {/* Eyebrow + heading */}
              <div className="mb-7 sm:mb-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 shadow-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
                    <ShieldCheck size={11} strokeWidth={2.5} />
                  </span>
                  <span className="pulse-eyebrow text-[#0A0A0A]">YÖNETİCİ PANELİ</span>
                </span>
                <h1
                  className="mt-5 text-[36px] sm:text-[44px] font-medium leading-[1.02] tracking-[-0.04em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Tekrar hoş geldin.
                </h1>
                <p className="mt-3 max-w-[380px] text-[14px] sm:text-[15px] leading-[1.6] text-[#525252]">
                  Konsola erişmek için kullanıcı adı ve şifrenle doğrula.
                </p>
              </div>

              {error && (
                <div className="mb-5">
                  <AlertBanner kind="danger">{error}</AlertBanner>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username */}
                <div className="space-y-2">
                  <label htmlFor="adminUsername" className="pulse-eyebrow text-[#737373]">
                    Kullanıcı adı
                  </label>
                  <div className="group relative">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#0A0A0A]"
                      size={16}
                      strokeWidth={2}
                    />
                    <input
                      id="adminUsername"
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
                      className="w-full min-h-[52px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[16px] sm:text-[15px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] hover:border-[#D4D4D4] hover:bg-white focus:border-[#0A0A0A] focus:bg-white focus:ring-4 focus:ring-[#C6F24E]/30"
                      placeholder="admin"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="adminPassword" className="pulse-eyebrow text-[#737373]">
                      Şifre
                    </label>
                    {/* Inline forgot link — easier to discover than below */}
                    <Link
                      href="/admin/forgot-password"
                      prefetch={false}
                      className="group/forgot inline-flex items-center gap-1 rounded-md text-[12px] font-semibold text-[#0A0A0A] transition-colors hover:text-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      <KeyRound size={12} strokeWidth={2.4} />
                      <span className="underline-offset-4 group-hover/forgot:underline">
                        Şifremi unuttum
                      </span>
                    </Link>
                  </div>
                  <div className="group relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#0A0A0A]"
                      size={16}
                      strokeWidth={2}
                    />
                    <input
                      id="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      enterKeyHint="send"
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="w-full min-h-[52px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-12 text-[16px] sm:text-[15px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] hover:border-[#D4D4D4] hover:bg-white focus:border-[#0A0A0A] focus:bg-white focus:ring-4 focus:ring-[#C6F24E]/30"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#737373] transition-colors hover:bg-[#EAF9B8] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label
                  htmlFor="rememberMe"
                  className="flex cursor-pointer select-none items-center gap-2.5 pt-1 text-[13px] font-medium text-[#525252]"
                >
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D4D4D4] accent-[#C6F24E]"
                  />
                  Beni 30 gün hatırla
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_40px_-22px_rgba(10,10,10,0.65)] transition-all hover:-translate-y-px hover:bg-[#1A1A1A] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Panele gir
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Footer — security note */}
              <p className="mt-7 text-center text-[11px] tracking-[0.02em] text-[#A3A3A3]">
                Buaze yönetici girişi · KVKK ve Google politikaları uyumlu
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminLogin() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </main>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
