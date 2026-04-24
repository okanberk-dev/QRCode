'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface LoginFormProps {
  locale: Locale;
  t: {
    auth_email: string;
    auth_password: string;
    auth_login_btn: string;
    auth_login_loading: string;
    auth_no_account: string;
    auth_register_link: string;
    auth_forgot: string;
  };
}

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

function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.6 12.7a4.7 4.7 0 0 1 2.3-4 4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9a5 5 0 0 0-4.3 2.6c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.7 1.3-.1 1.8-.9 3.4-.9s2 .9 3.4.8c1.4 0 2.3-1.3 3.2-2.6a11.6 11.6 0 0 0 1.4-3 4.6 4.6 0 0 1-2.9-4.1ZM15.2 4.9a4.3 4.3 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1c1.1.1 2.2-.5 2.9-1.4Z" />
    </svg>
  );
}

export default function LoginForm({ locale, t }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });

  const handleSsoPending = (provider: 'Google' | 'Apple') => {
    setError('');
    setNotice(
      locale === 'tr'
        ? `${provider} ile giriş yakında aktif olacak. Şimdilik e-posta ile devam edin.`
        : `Sign-in with ${provider} is coming soon. Please continue with email for now.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.trialExpired) {
          setError(
            locale === 'tr'
              ? 'Ücretsiz deneme süreniz sona ermiştir. Devam etmek için plan yükseltin.'
              : 'Your free trial has expired. Please upgrade to continue.'
          );
        } else {
          setError(data.error || (locale === 'tr' ? 'Giriş yapılamadı.' : 'Login failed.'));
        }
        setLoading(false);
        return;
      }

      const redirectPath = searchParams.get('redirect') || `/${locale}/dashboard`;
      window.location.href = redirectPath;
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
        onClick={() => handleSsoPending('Google')}
        className="flex items-center gap-2.5 w-full min-h-[48px] px-4 py-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[14px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
      >
        <GoogleIcon size={16} />
        {locale === 'tr' ? 'Google ile devam et' : 'Continue with Google'}
      </button>

      <button
        type="button"
        onClick={() => handleSsoPending('Apple')}
        className="flex items-center gap-2.5 w-full min-h-[48px] px-4 py-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[14px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
      >
        <AppleIcon size={16} />
        {locale === 'tr' ? 'Apple ile devam et' : 'Continue with Apple'}
      </button>

      <div className="flex items-center gap-2.5 my-1 text-[#A3A3A3]">
        <div className="flex-1 h-px bg-[#EDEDED]" />
        <span className="pulse-eyebrow text-[#A3A3A3]">{locale === 'tr' ? 'YA DA' : 'OR'}</span>
        <div className="flex-1 h-px bg-[#EDEDED]" />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-email" className="pulse-eyebrow text-[#737373] block">
          {t.auth_email}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="min-h-[48px] w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          placeholder="emre@arkbistro.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="pulse-eyebrow text-[#737373] block">
            {t.auth_password}
          </label>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="text-[11px] text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            {locale === 'tr' ? 'Unuttum?' : 'Forgot?'}
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
            className="min-h-[48px] w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
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

      <label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          id="rememberMe"
          checked={form.rememberMe}
          onChange={(e) => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
          className="w-4 h-4 rounded border border-[#D4D4D4] focus:ring-2 focus:ring-[#C6F24E] accent-[#0A0A0A]"
        />
        <span className="text-[13px] text-[#525252]">
          {locale === 'tr' ? 'Beni hatırla' : 'Remember me'}
        </span>
      </label>

      <button
        type="submit"
        id="login-submit-btn"
        disabled={loading}
        className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading ? t.auth_login_loading : (locale === 'tr' ? 'Giriş yap' : 'Sign in')}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <p className="text-center text-[13px] text-[#737373] mt-2">
        {locale === 'tr' ? 'Hesabın yok mu?' : "Don't have an account?"}{' '}
        <Link href={`/${locale}/auth/register`} className="text-[#0A0A0A] font-semibold hover:text-[#A8D62E] transition-colors">
          {locale === 'tr' ? 'Kayıt ol' : 'Sign up'}
        </Link>
      </p>
    </form>
  );
}
