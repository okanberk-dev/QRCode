'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2, Mail } from 'lucide-react';
import type { Locale } from '@/lib/translations';

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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
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
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
            <Check size={20} strokeWidth={2.5} />
          </div>
          <p className="text-[14px] font-medium text-[#0A0A0A]">
            {locale === 'tr' ? 'Kod gönderildi.' : 'Code sent.'}
          </p>
          <p className="mt-2 text-[12px] text-[#525252] leading-relaxed">
            {locale === 'tr'
              ? 'E-postanıza 6 haneli bir kod gönderdik. Spam klasörünüzü de kontrol edin. Kod 30 dakika geçerlidir.'
              : 'We sent a 6-digit code to your email. Check your spam folder too. The code is valid for 30 minutes.'}
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
          className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors"
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
          className="pulse-eyebrow w-full text-[#737373] hover:text-[#0A0A0A] transition-colors"
        >
          {locale === 'tr' ? 'FARKLI BİR E-POSTA DENE' : 'TRY A DIFFERENT EMAIL'}
        </button>
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

      <div className="space-y-2">
        <label htmlFor="forgot-email" className="pulse-eyebrow text-[#737373] ml-1 block">
          {locale === 'tr' ? 'E-posta Adresiniz' : 'Your Email'}
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" size={16} strokeWidth={2} />
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="can@sirket.com"
            className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading
          ? (locale === 'tr' ? 'Gönderiliyor…' : 'Sending…')
          : (locale === 'tr' ? 'Sıfırlama kodu gönder' : 'Send reset code')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>
    </form>
  );
}
