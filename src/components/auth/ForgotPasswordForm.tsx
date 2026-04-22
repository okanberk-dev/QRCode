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
        <div className="rounded-2xl border-2 border-green-500/20 bg-green-50 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white">
            <Check size={22} strokeWidth={3} />
          </div>
          <p className="text-[14px] font-black text-green-700">
            {locale === 'tr' ? 'Kod gönderildi!' : 'Code sent!'}
          </p>
          <p className="mt-2 text-[12px] font-bold text-green-600 leading-relaxed">
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
          className="w-full flex items-center justify-center gap-2 bg-[#F4B400] text-[#1A2332] font-black py-4 rounded-2xl border-[3px] border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all group"
        >
          {locale === 'tr' ? 'KODU GİR' : 'ENTER CODE'}
          <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setToken('');
            setEmail('');
          }}
          className="w-full text-[11px] font-black uppercase tracking-widest text-[#2A3444] hover:text-[#1A2332] transition-colors"
        >
          {locale === 'tr' ? 'Farklı bir e-posta dene' : 'Try a different email'}
        </button>
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

      <div className="space-y-2">
        <label htmlFor="forgot-email" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
          {locale === 'tr' ? 'E-posta Adresiniz' : 'Your Email'}
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} strokeWidth={2.5} />
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="can@sirket.com"
            className="w-full pl-11 pr-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#F4B400] text-[#1A2332] font-black py-4 rounded-2xl border-[3px] border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />}
        {loading
          ? (locale === 'tr' ? 'GÖNDERİLİYOR...' : 'SENDING...')
          : (locale === 'tr' ? 'SIFIRLAMA KODU GÖNDER' : 'SEND RESET CODE')}
      </button>
    </form>
  );
}
