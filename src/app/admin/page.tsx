'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { type Locale, locales, defaultLocale } from '@/lib/translations';
import { AlertBanner } from '@/components/ui';

export default function AdminLogin() {
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
      const recaptchaToken = await getRecaptchaToken('admin_login');
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
    <main className="min-h-screen flex-1 bg-[#FFFFFF] text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_62%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BuazeLogo size={36} />
            <span className="text-xl font-semibold tracking-tight">
              buaze<span className="text-[#A8D62E]">.</span>
            </span>
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            className="hidden rounded-full border border-[#EDEDED] px-4 py-2 text-sm font-semibold text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] sm:inline-flex"
          >
            Müşteri girişi
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
                <ShieldCheck size={24} />
              </div>
              <p className="pulse-eyebrow text-[#737373]">YÖNETİCİ PANELİ</p>
              <h1 className="mt-2 text-[38px] font-medium leading-none tracking-[-0.055em] text-[#0A0A0A]">
                Giriş yap
              </h1>
              <p className="mt-3 text-sm font-medium leading-6 text-[#737373]">
                Yönetim paneline erişmek için hesabınızı doğrulayın.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#EDEDED] bg-white p-6 shadow-[0_24px_70px_-42px_rgba(10,10,10,0.45)] sm:p-8">
              {error && (
                <div className="mb-5">
                  <AlertBanner kind="danger">{error}</AlertBanner>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#737373]">Kullanıcı adı</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={18} />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={credentials.username}
                      onChange={e => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-4 pl-12 pr-4 text-sm font-semibold text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                      placeholder="admin"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#737373]">Şifre</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={credentials.password}
                      onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-4 pl-12 pr-12 text-sm font-semibold text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#737373] hover:bg-[#EAF9B8] hover:text-[#0A0A0A] transition-colors"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="rememberMe" className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#525252]">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D4D4D4] accent-[#C6F24E]"
                    />
                    Beni hatırla
                  </label>
                  <span className="text-[11px] font-semibold text-[#737373]">Bot koruması aktif</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A0A0A] px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Panele gir'}
                  {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />}
                </button>

                <RecaptchaNotice locale="tr" className="text-center px-1" />
              </form>
            </div>

            <Link
              href={`/${locale}/auth/login`}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 text-[13px] font-semibold text-[#737373] hover:text-[#0A0A0A] sm:hidden"
            >
              Müşteri paneline geç <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
