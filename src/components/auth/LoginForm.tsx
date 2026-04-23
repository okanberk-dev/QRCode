'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function LoginForm({ locale, t }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-[#FEF2F2] text-[#B91C1C] p-4 rounded-xl text-[13px] font-medium border border-[#FECACA] text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="login-email" className="pulse-eyebrow text-[#737373] ml-1 block">
          {t.auth_email}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="login-password" className="pulse-eyebrow text-[#737373] block">
            {t.auth_password}
          </label>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            {t.auth_forgot}
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
            className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#0A0A0A] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <input
          type="checkbox"
          id="rememberMe"
          checked={form.rememberMe}
          onChange={(e) => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
          className="w-4 h-4 rounded border border-[#D4D4D4] focus:ring-2 focus:ring-[#C6F24E] accent-[#0A0A0A]"
        />
        <label htmlFor="rememberMe" className="text-[13px] font-medium text-[#525252] cursor-pointer">
          {locale === 'tr' ? 'Beni hatırla' : 'Remember me'}
        </label>
      </div>

      <button
        type="submit"
        id="login-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading ? t.auth_login_loading : t.auth_login_btn}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <p className="text-center text-[13px] text-[#525252]">
        {t.auth_no_account}{' '}
        <Link href={`/${locale}/auth/register`} className="text-[#0A0A0A] font-medium hover:text-[#A8D62E] transition-colors">
          {t.auth_register_link}
        </Link>
      </p>
    </form>
  );
}
