'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, User } from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { AlertBanner } from '@/components/ui';

function ForgotPasswordContent() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Kullanıcı adı zorunlu.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'İşlem başarısız.');
        setLoading(false);
        return;
      }
      // Always show generic success — server may have silently no-op'd
      // (nonexistent username, no recovery email). Anti-enumeration UX.
      setSubmitted(true);
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_62%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 sm:px-5 py-5 sm:py-6">
        <header className="flex items-center justify-between">
          <Link href="/admin" className="inline-flex items-center gap-2 sm:gap-2.5">
            <BuazeLogo size={32} />
            <span className="text-lg sm:text-xl font-semibold tracking-tight">
              buaze<span className="text-[#A8D62E]">.</span>
            </span>
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] px-3 py-1.5 text-[12px] font-semibold text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
          >
            <ArrowLeft size={12} strokeWidth={2} />
            Girişe dön
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-6 sm:mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <p className="pulse-eyebrow text-[#737373]">YÖNETİCİ PANELİ</p>
              <h1
                className="mt-2 text-[28px] sm:text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Şifremi unuttum
              </h1>
              <p className="mt-2.5 text-[13px] sm:text-sm text-[#737373] leading-[1.55] max-w-[340px] mx-auto">
                Kullanıcı adını gir; profilinde kayıtlı kurtarma e-postasına 6 haneli kod
                göndereceğiz.
              </p>
            </div>

            <div className="rounded-3xl sm:rounded-[28px] border border-[#EDEDED] bg-white p-5 sm:p-7 shadow-[0_24px_70px_-42px_rgba(10,10,10,0.45)]">
              {submitted ? (
                <div className="text-center py-2">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E]">
                    <Mail size={24} strokeWidth={2} className="text-[#0A0A0A]" />
                  </div>
                  <h2
                    className="bz-h-tight"
                    style={{ fontSize: 20 }}
                  >
                    Kodu gönderdik
                  </h2>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.55]">
                    Eğer bu kullanıcı için kayıtlı bir kurtarma e-postası varsa kod birkaç dakika
                    içinde gelecek. Kodun{' '}
                    <span className="font-semibold text-[#0A0A0A]">15 dakika</span> geçerlidir.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/reset-password?username=${encodeURIComponent(username.trim())}`)}
                    className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0A0A0A] px-5 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
                  >
                    Kodumu girdim
                    <ArrowRight size={16} strokeWidth={2} />
                  </button>
                  <p className="mt-3 text-[11px] text-[#737373]">
                    Kod gelmediyse{' '}
                    <button
                      type="button"
                      className="font-semibold text-[#0A0A0A] underline hover:text-[#A8D62E]"
                      onClick={() => setSubmitted(false)}
                    >
                      tekrar dene
                    </button>{' '}
                    veya yöneticinle iletiş.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <AlertBanner kind="danger">{error}</AlertBanner>
                  )}

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
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[14px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                        placeholder="admin"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-[#737373] leading-[1.5]">
                      Profilinde kurtarma e-postası yoksa kod gönderilemez. Yöneticinle iletiş.
                    </p>
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
                        Kodu gönder
                        <ArrowRight
                          size={16}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
