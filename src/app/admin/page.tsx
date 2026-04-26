'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Radar, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import BuazeLogo from '@/components/marketing/BuazeLogo';

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('admin_login');
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, rememberMe, recaptchaToken })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.');
        setLoading(false);
        return;
      }

      const redirectPath = searchParams.get('redirect');
      if (redirectPath) {
        // Need to decode since we encoded it in middleware
        router.push(decodeURIComponent(redirectPath));
      } else {
        router.push('/admin/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex-1 bg-[#F7F7F2] text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        <section className="relative hidden overflow-hidden bg-[#0A0A0A] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-60">
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#C6F24E]/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[440px] w-[440px] rounded-full border border-[#C6F24E]/20" />
            <div className="absolute bottom-24 right-20 h-56 w-56 rounded-full bg-[#C6F24E]/10 blur-2xl" />
          </div>

          <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3">
            <BuazeLogo size={42} variant="on-dark" />
            <span className="text-2xl font-semibold tracking-tight">buaze<span className="text-[#C6F24E]">.</span></span>
          </Link>

          <div className="relative z-10 max-w-xl">
            <div className="pulse-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[#C6F24E]">
              <Radar size={14} />
              ADMIN SECURITY GATE
            </div>
            <h1 className="text-[64px] font-medium leading-[0.94] tracking-[-0.055em] text-white">
              Panel girişi kontrollü bir nabızdan geçer.
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-7 text-white/65">
              Buaze yönetim paneli reCAPTCHA Enterprise, IP/kullanıcı bazlı deneme limiti ve geçici kilitleme katmanlarıyla korunur.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { label: 'BOT FİLTRESİ', icon: ShieldCheck },
                { label: 'RATE LIMIT', icon: Activity },
                { label: 'HTTPONLY JWT', icon: LockKeyhole },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <Icon size={20} className="text-[#C6F24E]" />
                  <p className="mt-4 text-[10px] font-semibold tracking-[0.16em] text-white/65">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.14em] text-white/50">
              <span>LIVE DEFENCE</span>
              <span className="flex items-center gap-2 text-[#C6F24E]">
                <span className="h-2 w-2 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                ACTIVE
              </span>
            </div>
            <svg aria-hidden viewBox="0 0 420 96" className="mt-5 h-24 w-full text-[#C6F24E]">
              <path
                d="M0 64 C40 48 68 48 104 58 S170 76 202 40 S254 18 290 42 S350 80 420 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M0 64 C40 48 68 48 104 58 S170 76 202 40 S254 18 290 42 S350 80 420 22"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeWidth="18"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </section>

        <main className="flex items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2">
                <BuazeLogo size={34} />
                <span className="text-xl font-semibold tracking-tight">buaze<span className="text-[#A8D62E]">.</span></span>
              </Link>
              <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">SECURE</span>
            </div>

            <div className="rounded-[30px] border border-[#EDEDED] bg-white p-6 shadow-[0_24px_70px_-35px_rgba(10,10,10,0.45)] sm:p-8">
              <div className="mb-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
                  <ShieldCheck size={28} strokeWidth={2} />
                </div>
                <p className="pulse-eyebrow text-[#737373]">YÖNETİCİ PANELİ</p>
                <h2 className="mt-2 text-[34px] font-medium leading-none tracking-[-0.045em] text-[#0A0A0A]">
                  Güvenli giriş
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-[#737373]">
                  Hesabınızı doğruladıktan sonra yönetim paneline yönlendirileceksiniz.
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="pulse-eyebrow text-[#737373]">KULLANICI ADI</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" size={18} />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={credentials.username}
                      onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-4 pl-12 pr-4 text-sm font-semibold text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white focus:shadow-[0_0_0_5px_rgba(198,242,78,0.18)]"
                      placeholder="Kullanıcı adınız"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="pulse-eyebrow text-[#737373]">ŞİFRE</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-4 pl-12 pr-12 text-sm font-semibold text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white focus:shadow-[0_0_0_5px_rgba(198,242,78,0.18)]"
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
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D4D4D4] accent-[#C6F24E]"
                    />
                    Beni hatırla
                  </label>
                  <span className="text-[11px] font-semibold text-[#737373]">Bot koruması aktif</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C6F24E] px-5 py-4 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-[#A8D62E] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Panele giriş yap'}
                  {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />}
                </button>

                <RecaptchaNotice locale="tr" className="text-center px-1" />
              </form>
            </div>

            <div className="mt-7 text-center">
              <Link href="/tr/auth/login" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#525252] hover:text-[#0A0A0A] transition-colors">
                Müşteri paneline geç <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
