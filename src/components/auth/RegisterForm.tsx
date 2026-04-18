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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-[20px] text-[13px] font-black border-2 border-red-500/20 shadow-[0_4px_0_0_#ef4444] text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reg-name" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">
          {t.auth_name}
        </label>
        <input
          id="reg-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm"
          placeholder="Can Demir"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-restaurant-name" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">
          {locale === 'tr' ? 'RESTORAN ADI' : 'RESTAURANT NAME'}
        </label>
        <input
          id="reg-restaurant-name"
          type="text"
          required
          value={form.restaurantName}
          onChange={(e) => setForm(prev => ({ ...prev, restaurantName: e.target.value }))}
          className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm"
          placeholder={locale === 'tr' ? 'Örn: Gourmet Eats' : 'e.g. Gourmet Eats'}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-email" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">
          {t.auth_email}
        </label>
        <input
          id="reg-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-password" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">
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
        {form.password.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <div className={`h-1.5 flex-1 rounded-full transition-colors border border-[#1f1e1d]/10 ${form.password.length >= 8 ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${form.password.length >= 8 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {form.password.length >= 8
                ? (locale === 'tr' ? 'GÜÇLÜ' : 'STRONG')
                : (locale === 'tr' ? 'ZAYIF' : 'WEAK')}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-confirm-password" className="block text-[11px] font-black uppercase tracking-widest text-[#ada89f] ml-1">
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
            className="w-full px-5 py-4 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <label className="flex items-start gap-4 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              id="kvkk-consent"
              type="checkbox"
              checked={kvkkConsent}
              onChange={(e) => setKvkkConsent(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-5 h-5 bg-white border-2 border-[#1f1e1d] rounded shadow-[2px_2px_0_0_#1f1e1d] peer-checked:bg-[#FDBF1D] peer-checked:shadow-none peer-checked:translate-x-[1px] peer-checked:translate-y-[1px] transition-all"></div>
            <CheckCircle2 className="absolute inset-0 m-auto text-[#111827] opacity-0 peer-checked:opacity-100 transition-opacity" size={14} strokeWidth={3} />
          </div>
          <span className="text-[12px] font-bold text-[#6b6760] leading-relaxed select-none">
            {t.auth_kvkk_consent}
          </span>
        </label>

        <p className="text-[11px] text-[#ada89f] font-bold leading-relaxed px-1">
          {t.auth_terms_consent_1}{' '}
          <Link href={`/${locale}/terms`} className="text-[#1f1e1d] font-black hover:text-[#ea580c] underline decoration-2 underline-offset-2">
            {t.auth_terms_consent_2}
          </Link>
          {' '}{t.auth_terms_consent_3}{' '}
          <Link href={`/${locale}/privacy`} className="text-[#1f1e1d] font-black hover:text-[#ea580c] underline decoration-2 underline-offset-2">
            {t.auth_terms_consent_4}
          </Link>
          {t.auth_terms_consent_5}
        </p>
      </div>

      <button
        type="submit"
        id="register-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#FDBF1D] text-[#111827] font-black py-4 rounded-2xl border-[3px] border-[#1f1e1d] shadow-[0_6px_0_0_#1f1e1d] hover:bg-[#EAB308] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
        {loading ? t.auth_register_loading.toUpperCase() : t.auth_register_btn.toUpperCase()}
      </button>

      <p className="text-center text-sm font-bold text-[#6b6760]">
        {t.auth_has_account}{' '}
        <Link href={`/${locale}/auth/login`} className="text-[#ea580c] font-black hover:underline decoration-2 underline-offset-4">
          {t.auth_login_link}
        </Link>
      </p>
    </form>
  );
}
