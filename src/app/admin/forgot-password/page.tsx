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
    <main className="relative min-h-[100dvh] w-full bg-pn-canvas text-pn-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1152px] flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-[calc(16px+env(safe-area-inset-top,0px))] sm:px-6 sm:pt-6">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3">
          <Link href="/admin" className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2">
            <BuazeLogo size={36} />
            <span className="text-[20px] font-medium tracking-[-0.03em]">
              buaze<span className="text-pn-accent">.</span>
            </span>
          </Link>
          <Link href="/admin" className="bz-btn-ghost inline-flex items-center gap-1.5 text-[13px] max-sm:bg-[#F6F6F6]">
            <ArrowLeft size={14} aria-hidden="true" />
            Girişe dön
          </Link>
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <div className="bz-fade-in w-full max-w-[440px]">
            {/* Card */}
            <div className="rounded-[28px] bg-white p-5 sm:p-8">
              {submitted ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pn-accent text-white">
                    <Mail size={24} aria-hidden="true" />
                  </div>
                  <h1 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-pn-ink">
                    Kodu gönderdik
                  </h1>
                  <p className="mx-auto mt-3 max-w-[340px] text-[14px] leading-[1.6] text-[#737373]">
                    Eğer bu kullanıcı için kayıtlı bir kurtarma e-postası varsa kod birkaç
                    dakika içinde gelecek. Kodun{' '}
                    <span className="font-medium text-pn-ink">15 dakika</span>{' '}
                    geçerlidir.
                  </p>

                  {/* Sub-tip */}
                  <div className="mx-auto mt-5 flex max-w-[360px] items-start gap-2.5 rounded-[16px] bg-pn-canvas px-4 py-3 text-left text-[13px] leading-[1.55] text-[#737373]">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-pn-accent" aria-hidden="true" />
                    <span>
                      Mailini açtıktan sonra{' '}
                      <span className="font-medium text-pn-ink">spam / promosyon</span>{' '}
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
                    className="bz-btn-primary mt-6 min-h-[48px] w-full text-[15px]"
                  >
                    Kodumu girdim
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>

                  <p className="mt-4 text-[13px] text-[#9A9A9A]">
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
                <>
                  <div className="mb-6">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pn-accent text-white" aria-hidden="true">
                      <KeyRound size={22} />
                    </span>
                    <h1 className="mt-5 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-pn-ink">
                      Şifremi unuttum
                    </h1>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#737373]">
                      Kullanıcı adını veya kayıtlı kurtarma e-postanı gir; bu adrese{' '}
                      <span className="font-medium text-pn-ink">6 haneli kod</span>{' '}
                      göndereceğiz.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && <AlertBanner kind="danger">{error}</AlertBanner>}

                    <div className="space-y-2">
                      <label htmlFor="adminIdentifier" className="text-[14px] text-[#737373]">
                        Kullanıcı adı veya e-posta
                      </label>
                      <div className="group relative">
                        <AtSign
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A] transition-colors group-focus-within:text-pn-ink"
                          size={17}
                          aria-hidden="true"
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
                          className="bz-input w-full min-h-[48px] pl-11 text-[16px] sm:text-[15px]"
                          placeholder="admin veya admin@buaze.com"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-start gap-1.5 pt-0.5 text-[13px] leading-[1.55] text-[#9A9A9A]">
                        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          Hesabında kayıtlı kurtarma e-postası yoksa kod gönderilemez. Bir
                          superadmin&apos;den e-posta eklenmesini iste; sonra tekrar dene.
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bz-btn-primary min-h-[48px] w-full text-[15px] disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                      ) : (
                        <>
                          Kodu gönder
                          <ArrowRight size={17} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Footer line */}
            <p className="mt-5 text-center text-[13px] text-[#9A9A9A]">
              Buaze hesap kurtarma · kullanıcı adı varlığı açığa çıkarılmaz
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
        <main className="flex min-h-[100dvh] w-full items-center justify-center bg-pn-canvas">
          <Loader2 className="h-8 w-8 animate-spin text-pn-accent" />
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
