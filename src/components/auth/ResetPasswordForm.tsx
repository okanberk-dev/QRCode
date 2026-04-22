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
      <div className="rounded-2xl border-2 border-green-500/20 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 text-white">
          <Check size={26} strokeWidth={3} />
        </div>
        <p className="text-[15px] font-black text-green-700">
          {locale === 'tr' ? 'Şifreniz güncellendi!' : 'Password updated!'}
        </p>
        <p className="mt-2 text-[12px] font-bold text-green-600">
          {locale === 'tr' ? 'Giriş sayfasına yönlendiriliyorsunuz…' : 'Redirecting to login…'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-[16px] text-[13px] font-black border-2 border-red-500/20 text-center">
          {error}
        </div>
      )}

      {!urlToken && (
        <div className="space-y-2">
          <label htmlFor="reset-token" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
            {locale === 'tr' ? 'Sıfırlama Bağlantısı' : 'Reset Link'}
          </label>
          <input
            id="reset-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            placeholder={locale === 'tr' ? 'E-postanızdaki bağlantıyı kullanın' : 'Use the link from your email'}
            className="w-full px-5 py-3 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-mono text-[11px] truncate"
          />
          <p className="text-[11px] font-bold text-[#6B7280] ml-1">
            {locale === 'tr'
              ? 'E-postanızdaki "Şifreyi Sıfırla" butonuna tıklayarak bu alanın otomatik dolmasını sağlayabilirsiniz.'
              : 'Click "Reset Password" in your email to auto-fill this field.'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reset-code" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
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
          className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-black text-2xl text-center tracking-[0.5em] font-mono"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reset-password" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
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
            className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2A3444] hover:text-[#1A2332]"
          >
            {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#F4B400] text-[#1A2332] font-black py-4 rounded-2xl border-[3px] border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />}
        {loading
          ? (locale === 'tr' ? 'GÜNCELLENİYOR...' : 'UPDATING...')
          : (locale === 'tr' ? 'ŞİFREYİ GÜNCELLE' : 'UPDATE PASSWORD')}
      </button>

      <p className="text-center text-[12px] font-bold text-[#2A3444]">
        {locale === 'tr' ? 'Kod süresi doldu mu?' : 'Code expired?'}{' '}
        <Link
          href={`/${locale}/auth/forgot-password`}
          className="font-black text-[#F4B400] underline underline-offset-4"
        >
          {locale === 'tr' ? 'Yeni kod iste' : 'Request a new code'}
        </Link>
      </p>
    </form>
  );
}
