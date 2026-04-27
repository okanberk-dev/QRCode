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
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      {/* Soft top gradient */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_62%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 sm:px-5 py-5 sm:py-6">
        {/* Top bar — logo + customer login link */}
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 sm:gap-2.5">
            <BuazeLogo size={32} />
            <span className="text-lg sm:text-xl font-semibold tracking-tight">
              buaze<span className="text-[#A8D62E]">.</span>
            </span>
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            className="hidden rounded-full border border-[#EDEDED] px-4 py-2 text-[13px] font-semibold text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors sm:inline-flex"
          >
            Müşteri girişi
          </Link>
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-[420px]">
            {/* Brand block — mobile-friendly icon + heading */}
            <div className="mb-6 sm:mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <p className="pulse-eyebrow text-[#737373]">YÖNETİCİ PANELİ</p>
              <h1
                className="mt-2 text-[32px] sm:text-[38px] font-medium leading-[1] tracking-[-0.04em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Giriş yap
              </h1>
              <p className="mt-2.5 text-[13px] sm:text-sm text-[#737373] leading-[1.55] max-w-[320px] mx-auto">
                Yönetim paneline erişmek için hesabını doğrula.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-3xl sm:rounded-[28px] border border-[#EDEDED] bg-white p-5 sm:p-7 shadow-[0_24px_70px_-42px_rgba(10,10,10,0.45)]">
              {error && (
                <div className="mb-4">
                  <AlertBanner kind="danger">{error}</AlertBanner>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                    Kullanıcı adı
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
                      size={16}
                      strokeWidth={2}
                    />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={credentials.username}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, username: e.target.value }))
                      }
                      className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[14px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                      placeholder="admin"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                    Şifre
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
                      size={16}
                      strokeWidth={2}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-12 text-[14px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
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

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label
                    htmlFor="rememberMe"
                    className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#525252] select-none"
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
                  <Link
                    href="/admin/forgot-password"
                    className="text-[12px] font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                  >
                    Şifremi unuttum
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0A0A0A] px-5 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-70"
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

            {/* Mobile customer-login fallback */}
            <Link
              href={`/${locale}/auth/login`}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors sm:hidden"
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
