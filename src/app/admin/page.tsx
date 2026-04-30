'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, User } from 'lucide-react';
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
      // Backend bot koruması (reCAPTCHA Enterprise) sessizce çalışır.
      // UI'da rozet/notice gösterilmez — kullanıcı için görünmez katman.
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
    <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      {/* Soft top gradient — Pulse §11 lime accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-15%] top-[-20%] h-[420px] w-[420px] rounded-full bg-[#C6F24E]/25 blur-[120px]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 sm:px-7 py-5 sm:py-7">
        {/* Top bar — logo + customer login link */}
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BuazeLogo size={34} />
            <span
              className="bz-h-tight"
              style={{ fontSize: 22, letterSpacing: '-0.03em' }}
            >
              buaze<span className="text-[#A8D62E]">.</span>
            </span>
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            className="hidden rounded-full border border-[#EDEDED] px-4 py-2 text-[13px] font-medium text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors sm:inline-flex"
          >
            Müşteri girişi
          </Link>
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-10 sm:py-12">
          <div className="w-full max-w-[440px]">
            {/* Brand block — eyebrow pill + heading */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
                  <ShieldCheck size={11} strokeWidth={2.5} />
                </span>
                <span className="pulse-eyebrow text-[#0A0A0A]">YÖNETİCİ PANELİ</span>
              </div>
              <h1
                className="bz-h-tight text-[34px] sm:text-[42px] leading-[1.02] text-[#0A0A0A]"
                style={{ letterSpacing: '-0.04em' }}
              >
                Giriş yap
              </h1>
              <p className="mt-3 text-[14px] sm:text-[15px] text-[#525252] leading-[1.6] max-w-[340px] mx-auto">
                Yönetim paneline erişmek için kullanıcı adı ve şifrenle doğrula.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-[28px] border border-[#EDEDED] bg-white p-6 sm:p-8 shadow-[0_28px_80px_-48px_rgba(10,10,10,0.5)]">
              {error && (
                <div className="mb-4">
                  <AlertBanner kind="danger">{error}</AlertBanner>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username */}
                <div className="space-y-2">
                  <label
                    htmlFor="adminUsername"
                    className="pulse-eyebrow text-[#737373]"
                  >
                    Kullanıcı adı
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
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
                      className="w-full min-h-[50px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[16px] sm:text-[15px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] hover:border-[#D4D4D4] focus:border-[#0A0A0A] focus:bg-white focus:ring-4 focus:ring-[#C6F24E]/30"
                      placeholder="admin"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="adminPassword"
                    className="pulse-eyebrow text-[#737373]"
                  >
                    Şifre
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
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
                      className="w-full min-h-[50px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-12 text-[16px] sm:text-[15px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] hover:border-[#D4D4D4] focus:border-[#0A0A0A] focus:bg-white focus:ring-4 focus:ring-[#C6F24E]/30"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#737373] hover:bg-[#EAF9B8] hover:text-[#0A0A0A] transition-colors"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot — `<a>` ensures full-page nav so the
                    link works even if Next router state hiccups */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label
                    htmlFor="rememberMe"
                    className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#525252] select-none"
                  >
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D4D4D4] accent-[#C6F24E]"
                    />
                    Beni hatırla
                  </label>
                  <a
                    href="/admin/forgot-password"
                    className="rounded-md text-[13px] font-semibold text-[#0A0A0A] underline-offset-4 hover:underline hover:text-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 transition-colors"
                  >
                    Şifremi unuttum
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_40px_-22px_rgba(10,10,10,0.6)] transition-all hover:bg-[#1A1A1A] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
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
            </div>

            {/* Footer line — security note */}
            <p className="mt-5 text-center text-[11px] text-[#A3A3A3] tracking-[0.02em]">
              Buaze yönetici girişi · KVKK ve Google politikaları uyumlu
            </p>

            {/* Mobile customer-login fallback */}
            <Link
              href={`/${locale}/auth/login`}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors sm:hidden"
            >
              Müşteri paneline geç
              <ArrowRight size={13} strokeWidth={2} />
            </Link>
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
