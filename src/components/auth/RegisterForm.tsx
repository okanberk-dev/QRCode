'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 1 1-3.3-12.9l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/>
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3A19.4 19.4 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z"/>
    </svg>
  );
}

interface RegisterFormProps {
  locale: Locale;
  t: {
    auth_register_title: string;
    auth_register_subtitle: string;
    auth_trial_badge: string;
    auth_no_cc: string;
    auth_name: string;
    auth_email: string;
    auth_password: string;
    auth_kvkk_consent: string;
    auth_terms_consent_1: string;
    auth_terms_consent_2: string;
    auth_terms_consent_3: string;
    auth_terms_consent_4: string;
    auth_terms_consent_5: string;
    auth_register_btn: string;
    auth_register_loading: string;
    auth_has_account: string;
    auth_login_link: string;
    feedback_kvkk_text?: string;
  };
}

export default function RegisterForm({ locale, t }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', businessName: '', password: '', website: '' });

  const handleGoogleSignUp = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const { signInWithGoogleIdToken } = await import('@/lib/firebase-client');
      const idToken = await signInWithGoogleIdToken();
      if (!idToken) {
        setNotice(
          locale === 'tr'
            ? 'Google ile kayıt henüz aktif değil. Lütfen e-posta ile devam edin.'
            : 'Google sign-up is not active yet. Please continue with email.'
        );
        setLoading(false);
        return;
      }
      const recaptchaToken = await getRecaptchaToken('auth_google');
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, recaptchaToken, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Google ile kayıt başarısız oldu.' : 'Google sign-up failed.'));
        setLoading(false);
        return;
      }
      // Zaten onboarding'i bitirmiş kullanıcı kayıt butonuna basmışsa direkt dashboard'a.
      const target = data.onboardingCompleted && !data.isNewUser
        ? `/${locale}/dashboard`
        : `/${locale}/onboarding`;
      router.push(target);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'POPUP_CLOSED' || msg.includes('popup-closed-by-user')) {
        setNotice(
          locale === 'tr'
            ? 'Google penceresi kapatıldı. Tekrar denemek için butona basın.'
            : 'Google window was closed. Tap the button to try again.'
        );
        setLoading(false);
        return;
      }
      setError(locale === 'tr' ? 'Google ile kayıt başarısız oldu.' : 'Google sign-up failed.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken('auth_register');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken, locale }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'));
        setLoading(false);
        return;
      }

      router.push(`/${locale}/onboarding`);
      router.refresh();
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: locale === 'tr' ? 'AD SOYAD' : 'FULL NAME', placeholder: 'Emre Kaya', type: 'text', autoComplete: 'name', required: true },
    { key: 'email' as const, label: locale === 'tr' ? 'İŞ E-POSTASI' : 'WORK EMAIL', placeholder: 'emre@arkbistro.com', type: 'email', autoComplete: 'email', required: true },
    { key: 'businessName' as const, label: locale === 'tr' ? 'İŞLETME ADI' : 'BUSINESS NAME', placeholder: 'Ark Bistro', type: 'text', autoComplete: 'organization', required: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <div className="bg-[#FEF2F2] text-[#B91C1C] p-4 rounded-xl text-[13px] font-medium border border-[#FECACA] text-center">
          {error}
        </div>
      )}

      {notice && !error && (
        <div className="bg-[#EAF9B8] text-[#0A0A0A] p-3 rounded-xl text-[12px] font-medium border border-[#C6F24E] text-center">
          {notice}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="flex items-center gap-2.5 w-full min-h-[46px] px-4 py-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[14px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon size={16} />
        {locale === 'tr' ? 'Google ile kayıt ol' : 'Sign up with Google'}
      </button>

      <div className="flex items-center gap-2.5 my-1 text-[#A3A3A3]">
        <div className="flex-1 h-px bg-[#EDEDED]" />
        <span className="pulse-eyebrow text-[#A3A3A3]">{locale === 'tr' ? 'YA DA' : 'OR'}</span>
        <div className="flex-1 h-px bg-[#EDEDED]" />
      </div>

      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label htmlFor={`reg-${f.key}`} className="pulse-eyebrow text-[#737373] block">
            {f.label}
          </label>
          <input
            id={`reg-${f.key}`}
            type={f.type}
            required={f.required}
            autoComplete={f.autoComplete}
            value={form[f.key]}
            onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="min-h-[46px] w-full px-3.5 py-3 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="pulse-eyebrow text-[#737373] block">
          {locale === 'tr' ? 'ŞİFRE' : 'PASSWORD'}
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
            className="min-h-[46px] w-full px-3.5 py-3 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
            placeholder="••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-[#737373] hover:text-[#0A0A0A] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Honeypot field - invisible to humans */}
      <div className="opacity-0 absolute -z-10 pointer-events-none" aria-hidden="true">
        <label htmlFor="reg-website">Website</label>
        <input
          id="reg-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
        />
      </div>

      <p className="text-[12px] text-[#737373] leading-relaxed mt-1">
        {locale === 'tr' ? 'Kayıt olarak ' : 'By signing up, you accept our '}
        <Link href={`/${locale}/terms`} className="text-[#0A0A0A] font-semibold hover:text-[#A8D62E] transition-colors">
          {locale === 'tr' ? 'Kullanım Şartları' : 'Terms of Service'}
        </Link>
        {locale === 'tr' ? ' ve ' : ' and '}
        <Link href={`/${locale}/privacy`} className="text-[#0A0A0A] font-semibold hover:text-[#A8D62E] transition-colors">
          {locale === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
        </Link>
        {locale === 'tr' ? "'nı kabul etmiş olursunuz." : '.'}
      </p>

      <button
        type="submit"
        id="register-submit-btn"
        disabled={loading}
        className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading
          ? t.auth_register_loading
          : (locale === 'tr' ? 'Ücretsiz başla' : 'Start free')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <p className="text-center text-[13px] text-[#737373] mt-1">
        {locale === 'tr' ? 'Hesabın var mı?' : 'Already have an account?'}{' '}
        <Link href={`/${locale}/auth/login`} className="text-[#0A0A0A] font-semibold hover:text-[#A8D62E] transition-colors">
          {locale === 'tr' ? 'Giriş yap' : 'Sign in'}
        </Link>
      </p>
    </form>
  );
}
