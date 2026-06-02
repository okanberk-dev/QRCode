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
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,#EAF9B8_0%,rgba(234,249,184,0)_62%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1152px] flex-col px-4 sm:px-7 py-6 sm:py-7">
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
          <div className="w-full max-w-[460px]">
            <div className="mb-6 sm:mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <p className="pulse-eyebrow text-[#737373]">YÖNETİCİ PANELİ</p>
              {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily redundancy kaldırıldı. */}
              <h1 className="mt-2 text-[28px] sm:text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0A0A0A]">
                Yeni şifre belirle
              </h1>
              <p className="mt-2.5 text-[13px] sm:text-sm text-[#737373] leading-[1.55] max-w-[360px] mx-auto">
                E-postana gelen 6 haneli kodu ve yeni şifreni gir.
              </p>
            </div>

            <div className="rounded-3xl sm:rounded-[28px] border border-[#EDEDED] bg-white p-5 sm:p-7 shadow-[0_24px_70px_-42px_rgba(10,10,10,0.45)]">
              {success ? (
                <div className="text-center py-2">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E]">
                    <Check size={26} strokeWidth={3} className="text-[#0A0A0A]" />
                  </div>
                  <h2 className="bz-h-tight" style={{ fontSize: 20 }}>
                    Şifren güncellendi
                  </h2>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.55]">
                    Birazdan giriş ekranına yönlendireceğiz. Yeni şifrenle giriş yapabilirsin.
                  </p>
                  <Link
                    href="/admin"
                    className="bz-btn-primary mt-5 min-h-[48px] w-full rounded-2xl text-[14px]"
                  >
                    Girişe git
                    <ArrowRight size={16} strokeWidth={2} />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <AlertBanner kind="danger">{error}</AlertBanner>}

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
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[14px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                        placeholder="admin"
                      />
                    </div>
                  </div>

                  {/* 6-digit code */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                      Doğrulama kodu
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
                        size={16}
                        strokeWidth={2}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[16px] font-semibold tracking-[0.4em] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] placeholder:tracking-normal placeholder:font-medium focus:border-[#C6F24E] focus:bg-white"
                        placeholder="000000"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <p className="text-[11px] text-[#737373]">
                      Kod 15 dakika geçerli. 5+ yanlış denemede 1 saat kilitlenir.
                    </p>
                  </div>

                  {/* New password */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                      Yeni şifre
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
                        autoComplete="new-password"
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-12 text-[14px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                        placeholder="Min 8 karakter"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="bz-btn-icon absolute right-2 top-1/2 -translate-y-1/2"
                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                      Şifreyi tekrarla
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
                        autoComplete="new-password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full min-h-[48px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3.5 pl-11 pr-4 text-[14px] font-medium text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white"
                        placeholder="Tekrar gir"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bz-btn-primary min-h-[48px] w-full rounded-2xl text-[14px] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        Şifreyi sıfırla
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
