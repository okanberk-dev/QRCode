'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  User,
} from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { AlertBanner } from '@/components/ui';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUsername = searchParams.get('username') || '';

  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !code.trim() || !newPassword) {
      setError('Tüm alanları doldur.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'İşlem başarısız.');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin'), 2200);
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-pn-canvas text-pn-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1152px] flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-[calc(16px+env(safe-area-inset-top,0px))] sm:px-6 sm:pt-6">
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

        <section className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <div className="bz-fade-in w-full max-w-[460px]">
            <div className="rounded-[28px] bg-white p-5 sm:p-8">
              {success ? (
                <div className="py-2 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pn-accent text-white">
                    <Check size={26} strokeWidth={2.4} aria-hidden="true" />
                  </div>
                  <h1 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-pn-ink">
                    Şifren güncellendi
                  </h1>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#737373]">
                    Birazdan giriş ekranına yönlendireceğiz. Yeni şifrenle giriş yapabilirsin.
                  </p>
                  <Link href="/admin" className="bz-btn-primary mt-6 min-h-[48px] w-full text-[15px]">
                    Girişe git
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pn-accent text-white" aria-hidden="true">
                      <ShieldCheck size={22} />
                    </span>
                    <h1 className="mt-5 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-pn-ink">
                      Yeni şifre belirle
                    </h1>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#737373]">
                      E-postana gelen 6 haneli kodu ve yeni şifreni gir.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <AlertBanner kind="danger">{error}</AlertBanner>}

                    {/* Username */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#737373]">
                        Kullanıcı adı
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A]" size={17} aria-hidden="true" />
                        <input
                          type="text"
                          required
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="bz-input w-full min-h-[48px] pl-11 text-[16px] sm:text-[15px]"
                          placeholder="admin"
                        />
                      </div>
                    </div>

                    {/* 6-digit code */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#737373]">
                        Doğrulama kodu
                      </label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A]" size={17} aria-hidden="true" />
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                          maxLength={6}
                          pattern="\d{6}"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                          className="bz-input w-full min-h-[48px] pl-11 text-[16px] tracking-[0.2em] tabular-nums placeholder:tracking-normal"
                          placeholder="000000"
                        />
                      </div>
                      <p className="text-[13px] text-[#9A9A9A]">
                        Kod 15 dakika geçerli. 5+ yanlış denemede 1 saat kilitlenir.
                      </p>
                    </div>

                    {/* New password */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#737373]">
                        Yeni şifre
                      </label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A]" size={17} aria-hidden="true" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bz-input w-full min-h-[48px] pl-11 pr-14 text-[16px] sm:text-[15px]"
                          placeholder="En az 8 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
                          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#737373]">
                        Şifreyi tekrarla
                      </label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A]" size={17} aria-hidden="true" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          minLength={8}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bz-input w-full min-h-[48px] pl-11 text-[16px] sm:text-[15px]"
                          placeholder="Tekrar gir"
                        />
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
                          Şifreyi sıfırla
                          <ArrowRight size={17} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] w-full items-center justify-center bg-pn-canvas">
          <Loader2 className="h-8 w-8 animate-spin text-pn-accent" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
