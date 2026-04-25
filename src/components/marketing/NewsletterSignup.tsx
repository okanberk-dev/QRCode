'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

interface Props {
  locale: 'tr' | 'en';
}

/**
 * Footer newsletter capture. Posts to `/api/newsletter`, which stores the
 * subscriber locally. A future provider integration can consume saved rows.
 */
export default function NewsletterSignup({ locale }: Props) {
  const isTr = locale === 'tr';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setStatus('loading');
    try {
      const recaptchaToken = await getRecaptchaToken('newsletter_signup');
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale, recaptchaToken }),
      });
      if (res.ok) setStatus('done');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#EAF9B8] px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
          <Check size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#0A0A0A]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            {isTr ? 'Süper! Kayıt oldunuz.' : "You're in. Thanks!"}
          </p>
          <p className="mt-0.5 text-[12px] text-[#525252]">
            {isTr ? 'İlk e-posta pazartesi geliyor.' : "First email lands Monday."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={isTr ? 'e-posta@işletme.com' : 'your@email.com'}
        aria-label={isTr ? 'E-posta adresi' : 'Email address'}
        className="min-h-[44px] flex-1 rounded-full border border-[#333] bg-[#1A1A1A] px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#737373] focus:border-[#C6F24E] sm:px-5 sm:text-[14px]"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-3 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] disabled:opacity-60 sm:w-auto"
      >
        {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : null}
        {isTr ? 'Abone ol' : 'Subscribe'} →
      </button>
      {status === 'error' && (
        <p className="text-[11px] text-red-400 sm:hidden">
          {isTr ? 'Bir sorun oldu, tekrar dene.' : 'Something went wrong, try again.'}
        </p>
      )}
    </form>
  );
}
