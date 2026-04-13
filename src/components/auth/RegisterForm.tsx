'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';

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
  };
}

export default function RegisterForm({ locale, t }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', restaurantName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== confirmPassword) {
      setError(locale === 'tr' ? 'Şifreler uyuşmuyor.' : 'Passwords do not match.');
      return;
    }
    if (!kvkkConsent) {
      setError(locale === 'tr' ? 'Lütfen KVKK onayını verin.' : 'Please accept the data processing consent.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (locale === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'));
        setLoading(false);
        return;
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
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
        <label htmlFor="reg-name" className="block text-xs font-black uppercase tracking-widest text-gray-500">
          {t.auth_name}
        </label>
        <input
          id="reg-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
          placeholder="Can Demir"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-restaurant-name" className="block text-xs font-black uppercase tracking-widest text-gray-500">
          {locale === 'tr' ? 'RESTORAN ADI' : 'RESTAURANT NAME'}
        </label>
        <input
          id="reg-restaurant-name"
          type="text"
          required
          value={form.restaurantName}
          onChange={(e) => setForm(prev => ({ ...prev, restaurantName: e.target.value }))}
          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
          placeholder={locale === 'tr' ? "Örn: Mamma's Burger" : "e.g. Mamma's Burger"}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-email" className="block text-xs font-black uppercase tracking-widest text-gray-500">
          {t.auth_email}
        </label>
        <input
          id="reg-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-password" className="block text-xs font-black uppercase tracking-widest text-gray-500">
          {t.auth_password}
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
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
        {form.password.length > 0 && (
          <div className="flex items-center gap-2">
            <div className={`h-1 flex-1 rounded-full transition-colors ${form.password.length >= 8 ? 'bg-green-400' : 'bg-red-300'}`} />
            <span className={`text-xs font-bold ${form.password.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
              {form.password.length >= 8
                ? (locale === 'tr' ? 'Güçlü' : 'Strong')
                : (locale === 'tr' ? 'Min. 8 karakter' : 'Min. 8 chars')}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-confirm-password" className="block text-xs font-black uppercase tracking-widest text-gray-500">
          {locale === 'tr' ? 'ŞİFRE TEKRAR' : 'CONFIRM PASSWORD'}
        </label>
        <div className="relative">
          <input
            id="reg-confirm-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-4 focus:ring-[#FDBF1D]/10 outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          id="kvkk-consent"
          type="checkbox"
          checked={kvkkConsent}
          onChange={(e) => setKvkkConsent(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#FDBF1D] cursor-pointer"
        />
        <span className="text-xs font-bold text-gray-500 leading-relaxed">
          {t.auth_kvkk_consent}
        </span>
      </label>

      <p className="text-xs text-gray-400 font-bold leading-relaxed">
        {t.auth_terms_consent_1}{' '}
        <Link href={`/${locale}/terms`} className="text-[#111827] underline hover:text-[#FDBF1D]">
          {t.auth_terms_consent_2}
        </Link>
        {' '}{t.auth_terms_consent_3}{' '}
        <Link href={`/${locale}/privacy`} className="text-[#111827] underline hover:text-[#FDBF1D]">
          {t.auth_terms_consent_4}
        </Link>
        {t.auth_terms_consent_5}
      </p>

      <button
        type="submit"
        id="register-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#111827] font-black py-4 rounded-xl transition-all shadow-lg shadow-yellow-200 disabled:opacity-70 active:scale-95"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
        {loading ? t.auth_register_loading : t.auth_register_btn}
      </button>

      <p className="text-center text-sm font-bold text-gray-500">
        {t.auth_has_account}{' '}
        <Link href={`/${locale}/auth/login`} className="text-[#111827] font-black hover:text-[#FDBF1D] transition-colors">
          {t.auth_login_link}
        </Link>
      </p>
    </form>
  );
}
