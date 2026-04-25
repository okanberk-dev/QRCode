'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

interface Props {
  locale: Locale;
}

export default function ForgotPasswordForm({ locale }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('auth_forgot_password');
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale, recaptchaToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'));
        setLoading(false);
        return;
      }

      setSent(true);
      if (data.token) {
        setToken(data.token);
      }
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="rounded-[14px] border border-[#C6F24E] bg-[#EAF9B8] p-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
            <Check size={20} strokeWidth={2.5} />
          </div>
          <p className="text-[14px] font-medium text-[#0A0A0A]">
            {locale === 'tr' ? 'Bağlantı gönderildi.' : 'Link sent.'}
          </p>
          <p className="mt-2 text-[12px] text-[#525252] leading-relaxed">
            {locale === 'tr'
              ? 'E-postanıza sıfırlama bağlantısını ve 6 haneli kodu gönderdik. Spam klasörünü de kontrol edin. 30 dakika geçerlidir.'
              : 'We sent a reset link and a 6-digit code to your email. Check your spam folder too. Valid for 30 minutes.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (token) {
              router.push(`/${locale}/auth/reset-password?token=${encodeURIComponent(token)}`);
            } else {
              router.push(`/${locale}/auth/reset-password`);
            }
          }}
          className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors"
        >
          {locale === 'tr' ? 'Kodu gir' : 'Enter code'}
          <ArrowRight size={18} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setToken('');
            setEmail('');
          }}
          className="pulse-eyebrow w-full text-[#737373] hover:text-[#0A0A0A] transition-colors py-1"
        >
          {locale === 'tr' ? 'FARKLI BİR E-POSTA DENE' : 'TRY A DIFFERENT EMAIL'}
        </button>

        <p className="text-center text-[13px] text-[#737373] mt-1">
          {locale === 'tr' ? 'Hatırladın mı?' : 'Remembered it?'}{' '}
          <Link
            href={`/${locale}/auth/login`}
            className="font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
          >
            {locale === 'tr' ? 'Giriş yap' : 'Sign in'}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && (
        <div className="bg-[#FEF2F2] text-[#B91C1C] p-4 rounded-xl text-[13px] font-medium border border-[#FECACA] text-center">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="forgot-email" className="pulse-eyebrow text-[#737373] block">
          {locale === 'tr' ? 'E-POSTA' : 'EMAIL'}
        </label>
        <input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="emre@arkbistro.com"
          className="min-h-[48px] w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading
          ? (locale === 'tr' ? 'Gönderiliyor…' : 'Sending…')
          : (locale === 'tr' ? 'Bağlantı gönder' : 'Send reset link')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <p className="text-center text-[13px] text-[#737373] mt-1">
        {locale === 'tr' ? 'Hatırladın mı?' : 'Remembered it?'}{' '}
        <Link
          href={`/${locale}/auth/login`}
          className="font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
        >
          {locale === 'tr' ? 'Giriş yap' : 'Sign in'}
        </Link>
      </p>
    </form>
  );
}
