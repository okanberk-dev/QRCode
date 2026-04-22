'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowRight, X, ShieldCheck, Check } from 'lucide-react';
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
    feedback_kvkk_text?: string;
  };
}

export default function RegisterForm({ locale, t }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', restaurantName: '', website: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showKvkk, setShowKvkk] = useState(false);

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
        <div className="bg-red-50 text-red-600 p-4 rounded-[20px] text-[13px] font-black border-2 border-red-500/20 shadow-sm text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reg-name" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
          {t.auth_name}
        </label>
        <input
          id="reg-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm"
          placeholder="Can Demir"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-restaurant-name" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
          {locale === 'tr' ? 'RESTORAN ADI' : 'RESTAURANT NAME'}
        </label>
        <input
          id="reg-restaurant-name"
          type="text"
          required
          value={form.restaurantName}
          onChange={(e) => setForm(prev => ({ ...prev, restaurantName: e.target.value }))}
          className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm"
          placeholder={locale === 'tr' ? 'Örn: Gourmet Eats' : 'e.g. Gourmet Eats'}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-email" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
          {t.auth_email}
        </label>
        <input
          id="reg-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-password" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
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
            className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2A3444] hover:text-[#1A2332]"
          >
            {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-confirm-password" className="block text-[11px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
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
            className="w-full px-5 py-4 bg-[#F8F6F1] rounded-xl border-2 border-[#1A2332] focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244, 180, 0,0.1)] outline-none transition-all font-bold text-sm pr-12"
            placeholder="••••••••"
          />
        </div>
      </div>

      {/* Honeypot field - Invisible to humans */}
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

      <div className="space-y-4 pt-2">
        <div 
          onClick={() => setKvkkConsent(!kvkkConsent)}
          className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            kvkkConsent 
              ? 'bg-[#F4B400]/10 border-[#F4B400]/20 shadow-sm' 
              : 'bg-white border-[#1A2332]/5 hover:border-[#1A2332]/10'
          }`}
        >
          <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${
            kvkkConsent ? 'bg-[#1A2332] border-[#1A2332]' : 'bg-white border-[#1A2332]'
          }`}>
            {kvkkConsent && <Check size={14} className="text-white" strokeWidth={4} />}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[#2A3444] leading-relaxed select-none">
              {locale === 'tr' ? 'Üye olarak' : 'By signing up,'} <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowKvkk(true); }} className="text-[#1A2332] underline decoration-[#F4B400] decoration-2 underline-offset-4 hover:bg-[#F4B400]/10 transition-colors">KVKK metnini</button> {locale === 'tr' ? 'okudum ve kabul ediyorum.' : 'I have read and accept the data processing policy.'}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[#6B7280] font-bold leading-relaxed px-1">
          {t.auth_terms_consent_1}{' '}
          <Link href={`/${locale}/terms`} className="text-[#1A2332] font-black hover:text-[#F4B400] underline decoration-2 underline-offset-2">
            {t.auth_terms_consent_2}
          </Link>
          {' '}{t.auth_terms_consent_3}{' '}
          <Link href={`/${locale}/privacy`} className="text-[#1A2332] font-black hover:text-[#F4B400] underline decoration-2 underline-offset-2">
            {t.auth_terms_consent_4}
          </Link>
          {t.auth_terms_consent_5}
        </p>
      </div>

      {/* KVKK Modal */}
      {showKvkk && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1A2332]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#F8F6F1] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border-2 border-[#1A2332] animate-in zoom-in-95 duration-300">
            <div className="p-7 border-b-2 border-[#1A2332] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-[#F4B400]/10 rounded-xl text-[#1A2332]">
                    <ShieldCheck size={20} />
                 </div>
                 <h3 className="font-black text-[#1A2332] uppercase tracking-tighter">
                   KVKK Aydınlatma Metni
                 </h3>
              </div>
              <button 
                onClick={() => setShowKvkk(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="p-8 max-h-[50vh] overflow-y-auto no-scrollbar">
              <p className="text-sm text-[#2A3444] leading-relaxed font-bold whitespace-pre-wrap">
                {locale === 'tr' 
                  ? '6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kayıt sırasında paylaştığınız kişisel verileriniz, hizmetlerimizin sunulması, kullanici hesabınızın yönetilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir. Verileriniz, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmayacaktır.'
                  : 'In accordance with the Personal Data Protection laws, your personal data shared during registration is processed for the purposes of providing our services, managing your user account, and fulfilling legal obligations. Your data will not be shared with third parties except for legal obligations.'}
              </p>
            </div>
            <div className="p-7 bg-white border-t-2 border-[#1A2332] flex justify-end">
              <button 
                onClick={() => setShowKvkk(false)}
                className="w-full py-4 bg-[#1A2332] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                KAPAT
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        id="register-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#F4B400] text-[#1A2332] font-black py-4 rounded-2xl border-[3px] border-[#1A2332] shadow-sm hover:bg-[#F4B400] hover:translate-y-[-2px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={2} /> : <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={2} />}
        {loading ? t.auth_register_loading.toUpperCase() : t.auth_register_btn.toUpperCase()}
      </button>

      <p className="text-center text-sm font-bold text-[#2A3444]">
        {t.auth_has_account}{' '}
        <Link href={`/${locale}/auth/login`} className="text-[#F4B400] font-black hover:underline decoration-2 underline-offset-4">
          {t.auth_login_link}
        </Link>
      </p>
    </form>
  );
}
