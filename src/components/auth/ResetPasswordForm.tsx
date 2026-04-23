'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface Props {
  locale: Locale;
}

export default function ResetPasswordForm({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState(urlToken);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(locale === 'tr'
        ? 'Sıfırlama bağlantısı eksik. Lütfen e-postadaki bağlantıyı kullanın veya yeni bir kod talep edin.'
        : 'Reset link is missing. Please use the link from your email or request a new code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError(locale === 'tr' ? 'Kod 6 haneli olmalıdır.' : 'Code must be 6 digits.');
      return;
    }
    if (password.length < 8) {
      setError(locale === 'tr' ? 'Şifre en az 8 karakter olmalıdır.' : 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, code, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'));
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => router.push(`/${locale}/auth/login`), 2000);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <p className="text-[15px] font-medium text-[#0A0A0A]">
          {locale === 'tr' ? 'Şifreniz güncellendi.' : 'Password updated.'}
        </p>
        <p className="mt-2 text-[12px] text-[#525252]">
          {locale === 'tr' ? 'Giriş sayfasına yönlendiriliyorsunuz…' : 'Redirecting to login…'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-[#FEF2F2] text-[#B91C1C] p-4 rounded-xl text-[13px] font-medium border border-[#FECACA] text-center">
          {error}
        </div>
      )}

      {!urlToken && (
        <div className="space-y-2">
          <label htmlFor="reset-token" className="pulse-eyebrow text-[#737373] ml-1 block">
            {locale === 'tr' ? 'Sıfırlama Bağlantısı' : 'Reset Link'}
          </label>
          <input
            id="reset-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            placeholder={locale === 'tr' ? 'E-postanızdaki bağlantıyı kullanın' : 'Use the link from your email'}
            className="w-full px-4 py-3 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all font-mono text-[11px] text-[#0A0A0A] placeholder:text-[#A3A3A3] truncate"
          />
          <p className="text-[12px] text-[#737373] ml-1">
            {locale === 'tr'
              ? 'E-postanızdaki "Şifreyi Sıfırla" butonuna tıklayarak bu alanın otomatik dolmasını sağlayabilirsiniz.'
              : 'Click "Reset Password" in your email to auto-fill this field.'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reset-code" className="pulse-eyebrow text-[#737373] ml-1 block">
          {locale === 'tr' ? '6 Haneli Kod' : '6-Digit Code'}
        </label>
        <input
          id="reset-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          className="w-full px-4 py-4 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all font-medium text-2xl text-center tracking-[0.5em] font-mono text-[#0A0A0A] placeholder:text-[#A3A3A3]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reset-password" className="pulse-eyebrow text-[#737373] ml-1 block">
          {locale === 'tr' ? 'Yeni Şifre' : 'New Password'}
        </label>
        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={locale === 'tr' ? 'En az 8 karakter' : 'At least 8 characters'}
            className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#0A0A0A] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading
          ? (locale === 'tr' ? 'Güncelleniyor…' : 'Updating…')
          : (locale === 'tr' ? 'Şifreyi güncelle' : 'Update password')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <p className="text-center text-[12px] text-[#525252]">
        {locale === 'tr' ? 'Kod süresi doldu mu?' : 'Code expired?'}{' '}
        <Link
          href={`/${locale}/auth/forgot-password`}
          className="font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
        >
          {locale === 'tr' ? 'Yeni kod iste' : 'Request a new code'}
        </Link>
      </p>
    </form>
  );
}
