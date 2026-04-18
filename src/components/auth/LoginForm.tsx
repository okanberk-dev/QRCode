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
        <div className="bg-red-50 text-red-600 p-4 rounded-[20px] text-[13px] font-black border-2 border-red-500/20 shadow-[0_4px_0_0_#ef4444] text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">
          {t.auth_email}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="login-password" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f]">
            {t.auth_password}
          </label>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="text-[11px] font-black text-[#6b6760] hover:text-[#ea580c] transition-colors uppercase tracking-widest"
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
            className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6760] hover:text-[#1f1e1d]"
          >
            {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <input
          type="checkbox"
          id="rememberMe"
          checked={form.rememberMe}
          onChange={(e) => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
          className="w-4 h-4 rounded border-2 border-[#1f1e1d] text-[#1f1e1d] focus:ring-[#FDBF1D] accent-[#FDBF1D]"
        />
        <label htmlFor="rememberMe" className="text-xs font-bold text-[#6b6760] cursor-pointer">
          {locale === 'tr' ? 'Beni hatırla' : 'Remember me'}
        </label>
      </div>

      <button
        type="submit"
        id="login-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#FDBF1D] text-[#111827] font-black py-4 rounded-2xl border-[3px] border-[#1f1e1d] shadow-[0_6px_0_0_#1f1e1d] hover:bg-[#EAB308] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
        {loading ? t.auth_login_loading.toUpperCase() : t.auth_login_btn.toUpperCase()}
      </button>

      <p className="text-center text-sm font-bold text-[#6b6760]">
        {t.auth_no_account}{' '}
        <Link href={`/${locale}/auth/register`} className="text-[#ea580c] font-black hover:underline decoration-2 underline-offset-4">
          {t.auth_register_link}
        </Link>
      </p>
    </form>
  );
}
