'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { AlertBanner } from '@/components/ui';

function ForgotPasswordContent() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = identifier.trim();
    if (!value) {
      setError('Kullanıcı adı veya e-posta zorunlu.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Server her iki anahtarı da kabul eder (identifier yeni, username
        // legacy). Kullanıcı email girerse server email lookup yapar.
        body: JSON.stringify({ identifier: value, username: value }),
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      {/* Soft top accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-15%] h-[380px] w-[380px] rounded-full bg-[#C6F24E]/20 blur-[120px]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 sm:px-7 py-5 sm:py-7">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <Link href="/admin" className="inline-flex items-center gap-2.5">
            <BuazeLogo size={32} />
            <span className="bz-h-tight text-[20px] sm:text-[22px]" style={{ letterSpacing: '-0.03em' }}>
              buaze<span className="text-[#A8D62E]">.</span>
            </span>
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3.5 py-2 text-[12px] font-semibold text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
          >
            <ArrowLeft size={12} strokeWidth={2.2} />
            Girişe dön
          </Link>
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="bz-fade-in w-full max-w-[440px]">
            {/* Brand block */}
            <div className="mb-7 sm:mb-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E] shadow-[0_18px_40px_-22px_rgba(10,10,10,0.55)]">
                <KeyRound size={22} strokeWidth={2} />
              </div>
              <span className="pulse-eyebrow text-[#737373]">YÖNETİCİ PANELİ</span>
              {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily redundancy kaldırıldı. */}
              <h1 className="mt-3 text-[30px] sm:text-[38px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0A0A0A]">
                Şifremi unuttum
              </h1>
              <p className="mx-auto mt-3 max-w-[360px] text-[13px] sm:text-[14px] leading-[1.6] text-[#525252]">
                Kullanıcı adını veya kayıtlı kurtarma e-postanı gir; bu adrese{' '}
                <span className="font-semibold text-[#0A0A0A]">6 haneli kod</span>{' '}
                göndereceğiz.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-[28px] border border-[#EDEDED] bg-white p-6 sm:p-8 shadow-[0_28px_80px_-48px_rgba(10,10,10,0.45)]">
              {submitted ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#C6F24E] shadow-[0_18px_40px_-18px_rgba(168,214,46,0.6)]">
                    <Mail size={26} strokeWidth={2} className="text-[#0A0A0A]" />
                  </div>
                  {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily redundancy kaldırıldı. */}
                  <h2 className="text-[22px] font-medium tracking-[-0.03em] text-[#0A0A0A]">
                    Kodu gönderdik
                  </h2>
                  <p className="mx-auto mt-3 max-w-[340px] text-[13px] leading-[1.6] text-[#525252]">
                    Eğer bu kullanıcı için kayıtlı bir kurtarma e-postası varsa kod birkaç
                    dakika içinde gelecek. Kodun{' '}
                    <span className="font-semibold text-[#0A0A0A]">15 dakika</span>{' '}
                    geçerlidir.
                  </p>

                  {/* Sub-tip */}
                  <div className="mx-auto mt-5 flex max-w-[340px] items-start gap-2 rounded-2xl bg-[#FAFAFA] px-3.5 py-3 text-left text-[12px] leading-[1.55] text-[#525252]">
                    <CheckCircle2
                      size={14}
                      strokeWidth={2.2}
                      className="mt-0.5 shrink-0 text-[#A8D62E]"
                    />
                    <span>
                      Mailini açtıktan sonra{' '}
                      <span className="font-semibold text-[#0A0A0A]">spam / promosyon</span>{' '}
                      klasörünü de kontrol etmeyi unutma.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const value = identifier.trim();
                      const isEmail = value.includes('@');
                      const qs = isEmail ? '' : `?username=${encodeURIComponent(value)}`;
                      router.push(`/admin/reset-password${qs}`);
                    }}
                    className="bz-btn-primary mt-5 min-h-[52px] w-full text-[14px] shadow-[0_18px_40px_-22px_rgba(10,10,10,0.55)]"
                  >
                    Kodumu girdim
                    <ArrowRight
                      size={16}
                      strokeWidth={2.2}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </button>

                  <p className="mt-4 text-[12px] text-[#737373]">
                    Kod gelmediyse{' '}
                    <button
                      type="button"
                      className="bz-btn bz-btn-sm"
                      onClick={() => setSubmitted(false)}
                    >
                      tekrar dene
                    </button>{' '}
                    veya yöneticinle iletişime geç.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && <AlertBanner kind="danger">{error}</AlertBanner>}

                  <div className="space-y-2">
                    <label
                      htmlFor="adminIdentifier"
                      className="pulse-eyebrow text-[#737373]"
                    >
                      Kullanıcı adı veya e-posta
                    </label>
                    <div className="group relative">
                      <AtSign
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] transition-colors group-focus-within:text-[#0A0A0A]"
                        size={16}
                        strokeWidth={2}
                      />
                      <input
                        id="adminIdentifier"
                        type="text"
                        required
                        autoComplete="username"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="send"
                        inputMode="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full min-h-[52px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[16px] sm:text-[15px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] hover:border-[#D4D4D4] hover:bg-white focus:border-[#0A0A0A] focus:bg-white focus:ring-4 focus:ring-[#C6F24E]/30"
                        placeholder="admin veya admin@buaze.com"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-start gap-1.5 pt-0.5 text-[11.5px] leading-[1.55] text-[#737373]">
                      <Info size={11} strokeWidth={2} className="mt-0.5 shrink-0" />
                      <span>
                        Hesabında kayıtlı kurtarma e-postası yoksa kod gönderilemez. Bir
                        superadmin&apos;den e-posta eklenmesini iste; sonra tekrar dene.
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bz-btn-primary min-h-[54px] w-full text-[14px] shadow-[0_18px_40px_-22px_rgba(10,10,10,0.55)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        Kodu gönder
                        <ArrowRight
                          size={16}
                          strokeWidth={2.2}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer line */}
            <p className="mt-6 text-center text-[11px] tracking-[0.02em] text-[#A3A3A3]">
              Buaze hesap kurtarma · KVKK uyumlu, anti-enumerasyon korumalı
            </p>
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
