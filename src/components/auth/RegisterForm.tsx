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
        <div className="bg-[#FEF2F2] text-[#B91C1C] p-4 rounded-xl text-[13px] font-medium border border-[#FECACA] text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reg-name" className="pulse-eyebrow text-[#737373] ml-1 block">
          {t.auth_name}
        </label>
        <input
          id="reg-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          placeholder="Can Demir"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-restaurant-name" className="pulse-eyebrow text-[#737373] ml-1 block">
          {locale === 'tr' ? 'RESTORAN ADI' : 'RESTAURANT NAME'}
        </label>
        <input
          id="reg-restaurant-name"
          type="text"
          required
          value={form.restaurantName}
          onChange={(e) => setForm(prev => ({ ...prev, restaurantName: e.target.value }))}
          className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          placeholder={locale === 'tr' ? 'Örn: Gourmet Eats' : 'e.g. Gourmet Eats'}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-email" className="pulse-eyebrow text-[#737373] ml-1 block">
          {t.auth_email}
        </label>
        <input
          id="reg-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]"
          placeholder="can@sirket.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-password" className="pulse-eyebrow text-[#737373] ml-1 block">
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

      <div className="space-y-2">
        <label htmlFor="reg-confirm-password" className="pulse-eyebrow text-[#737373] ml-1 block">
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
            className="w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3] pr-12"
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
          className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
            kvkkConsent
              ? 'bg-[#EAF9B8] border-[#C6F24E]'
              : 'bg-white border-[#EDEDED] hover:border-[#D4D4D4]'
          }`}
        >
          <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
            kvkkConsent ? 'bg-[#0A0A0A]' : 'bg-white border border-[#D4D4D4]'
          }`}>
            {kvkkConsent && <Check size={12} className="text-[#C6F24E]" strokeWidth={3.5} />}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-medium text-[#0A0A0A] leading-relaxed select-none">
              {locale === 'tr' ? 'Üye olarak' : 'By signing up,'} <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowKvkk(true); }} className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A] transition-colors">KVKK metnini</button> {locale === 'tr' ? 'okudum ve kabul ediyorum.' : 'I have read and accept the data processing policy.'}
            </p>
          </div>
        </div>

        <p className="text-[12px] text-[#737373] leading-relaxed px-1">
          {t.auth_terms_consent_1}{' '}
          <Link href={`/${locale}/terms`} className="text-[#0A0A0A] font-medium hover:text-[#A8D62E] underline underline-offset-2 decoration-[#0A0A0A]/30 hover:decoration-[#A8D62E]">
            {t.auth_terms_consent_2}
          </Link>
          {' '}{t.auth_terms_consent_3}{' '}
          <Link href={`/${locale}/privacy`} className="text-[#0A0A0A] font-medium hover:text-[#A8D62E] underline underline-offset-2 decoration-[#0A0A0A]/30 hover:decoration-[#A8D62E]">
            {t.auth_terms_consent_4}
          </Link>
          {t.auth_terms_consent_5}
        </p>
      </div>

      {/* KVKK Modal */}
      {showKvkk && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-[#0A0A0A]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_20px_60px_rgba(10,10,10,0.25)] border border-[#EDEDED] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-[#EDEDED] flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-[#EAF9B8] rounded-lg text-[#0A0A0A]">
                    <ShieldCheck size={18} />
                 </div>
                 <h3 className="text-[16px] font-medium text-[#0A0A0A]">
                   KVKK Aydınlatma Metni
                 </h3>
              </div>
              <button
                onClick={() => setShowKvkk(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#FAFAFA] text-[#737373] hover:text-[#0A0A0A] transition-colors"
                aria-label="Close"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="p-7 max-h-[50vh] overflow-y-auto no-scrollbar">
              <p className="text-[13px] text-[#525252] leading-relaxed whitespace-pre-wrap">
                {locale === 'tr'
                  ? '6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kayıt sırasında paylaştığınız kişisel verileriniz, hizmetlerimizin sunulması, kullanici hesabınızın yönetilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir. Verileriniz, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmayacaktır.'
                  : 'In accordance with the Personal Data Protection laws, your personal data shared during registration is processed for the purposes of providing our services, managing your user account, and fulfilling legal obligations. Your data will not be shared with third parties except for legal obligations.'}
              </p>
            </div>
            <div className="p-6 border-t border-[#EDEDED] flex justify-end">
              <button
                onClick={() => setShowKvkk(false)}
                className="w-full py-3.5 bg-[#0A0A0A] text-white rounded-full font-medium text-[14px] hover:bg-[#1A1A1A] transition-colors"
              >
                {locale === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        id="register-submit-btn"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : null}
        {loading ? t.auth_register_loading : t.auth_register_btn}
        {!loading && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      <p className="text-center text-[13px] text-[#525252]">
        {t.auth_has_account}{' '}
        <Link href={`/${locale}/auth/login`} className="text-[#0A0A0A] font-medium hover:text-[#A8D62E] transition-colors">
          {t.auth_login_link}
        </Link>
      </p>
    </form>
  );
}
