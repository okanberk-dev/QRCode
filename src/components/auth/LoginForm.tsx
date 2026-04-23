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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-[20px] text-[13px] font-black border-2 border-red-500/20 shadow-sm text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
          {t.auth_email}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-5 py-4 bg-[#FFFFFF] rounded-xl border-2 border-[#0A0A0A] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198, 242, 78,0.1)] outline-none transition-all font-bold text-sm"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="login-password" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280]">
            {t.auth_password}
          </label>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="text-[11px] font-black text-[#1A1A1A] hover:text-[#C6F24E] transition-colors uppercase tracking-widest"
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
            className="w-full px-5 py-4 bg-[#FFFFFF] rounded-xl border-2 border-[#0A0A0A] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198, 242, 78,0.1)] outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A] hover:text-[#0A0A0A]"
          >
            {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <input
          type="checkbox"
          id="rememberMe"
          checked={form.rememberMe}
          onChange={(e) => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
          className="w-4 h-4 rounded border-2 border-[#0A0A0A] text-[#0A0A0A] focus:ring-[#C6F24E] accent-[#C6F24E]"
        />
        <label htmlFor="rememberMe" className="text-xs font-bold text-[#1A1A1A] cursor-pointer">
          {locale === 'tr' ? 'Beni hatırla' : 'Remember me'}
        </label>
      </div>

      <button
        type="submit"
        id="login-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] font-black py-4 rounded-2xl border border-[#0A0A0A] shadow-sm hover:bg-[#C6F24E] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={2} /> : <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={2} />}
        {loading ? t.auth_login_loading.toUpperCase() : t.auth_login_btn.toUpperCase()}
      </button>

      <p className="text-center text-sm font-bold text-[#1A1A1A]">
        {t.auth_no_account}{' '}
        <Link href={`/${locale}/auth/register`} className="text-[#C6F24E] font-black hover:underline decoration-2 underline-offset-4">
          {t.auth_register_link}
        </Link>
      </p>
    </form>
  );
}
