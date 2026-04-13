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
  const [form, setForm] = useState({ email: '', password: '' });

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

      const redirect = searchParams.get('redirect') || `/${locale}/dashboard`;
      router.push(redirect);
      router.refresh();
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-xs font-black uppercase tracking-widest text-gray-500">
          {t.auth_email}
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="block text-xs font-black uppercase tracking-widest text-gray-500">
            {t.auth_password}
          </label>
          <button type="button" className="text-xs font-bold text-gray-400 hover:text-[#111827] transition-colors">
            {t.auth_forgot}
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        id="login-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#1f1e1d] text-white font-extrabold py-3.5 rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-black transition-all disabled:opacity-70 active:translate-y-[4px] active:shadow-none"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
        {loading ? t.auth_login_loading : t.auth_login_btn}
      </button>

      <p className="text-center text-sm font-bold text-gray-500">
        {t.auth_no_account}{' '}
        <Link href={`/${locale}/auth/register`} className="text-[#FDBF1D] font-black hover:text-[#EAB308] transition-colors">
          {t.auth_register_link}
        </Link>
      </p>
    </form>
  );
}
