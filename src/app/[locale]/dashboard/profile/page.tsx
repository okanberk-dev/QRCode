'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, User, Key, Check, ShieldCheck, AlertCircle, Globe } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export default function ProfilePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const t = getTranslations(locale);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            name: data.name || '',
            email: data.email || '',
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLocaleChange = async (newLocale: string) => {
    try {
      const res = await fetch('/api/user/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
      if (res.ok) {
        // Redirection to reload translations
        window.location.href = `/${newLocale}/dashboard/profile`;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError(t.profile_pass_match || 'Şifreler eşleşmiyor.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(t.profile_success || 'Profiliniz başarıyla güncellendi.');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        setError(data.error || t.profile_error || 'Güncelleme sırasında hata oluştu.');
      }
    } catch (err) {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8" strokeWidth={2} />
      </div>
    );
  }

  const isTr = locale === 'tr';
  const inputCls =
    'w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]';

  return (
    <div
      className="mx-auto max-w-[1100px] space-y-6 px-4 py-8 sm:px-8 lg:py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <Link
        href={`/${locale}/dashboard`}
        className="inline-flex items-center gap-1.5 pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        {isTr ? 'PANEL' : 'PANEL'}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-10">
        {/* Left: intro + security note */}
        <aside className="space-y-6">
          <div>
            <p className="pulse-eyebrow text-[#737373]">
              {isTr ? 'HESAP / PROFİL' : 'ACCOUNT / PROFILE'}
            </p>
            <h1
              className="mt-2 text-[28px] sm:text-[32px] font-medium text-[#0A0A0A] tracking-[-0.025em] leading-[1.05]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {t.profile_title}
            </h1>
            <p className="mt-3 text-[14px] text-[#525252] leading-[1.6]">
              {t.profile_subtitle}
            </p>
          </div>

          <div className="rounded-2xl bg-[#0A0A0A] p-6 text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} strokeWidth={2} className="text-[#C6F24E]" />
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'GÜVENLİK' : 'SECURITY'}
              </span>
            </div>
            <h4
              className="mt-3 text-[16px] font-semibold tracking-[-0.015em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? 'Hesabını güçlü tut.' : 'Keep your account strong.'}
            </h4>
            <p className="mt-2 text-[13px] text-white/60 leading-[1.6]">
              {isTr
                ? 'Şifrenizi düzenli değiştirmek hesap güvenliğinizi artırır. Güçlü bir şifre en az 8 karakter, rakam ve sembol içermelidir.'
                : 'Changing your password regularly improves security. A strong password has at least 8 characters with digits and symbols.'}
            </p>
          </div>
        </aside>

        {/* Right: form */}
        <div>
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-8 space-y-8"
          >
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[13px] font-medium">
                <AlertCircle size={16} strokeWidth={2} />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[13px] font-medium">
                <Check size={16} strokeWidth={2} />
                {success}
              </div>
            )}

            {/* Personal info */}
            <section className="space-y-5">
              <div className="flex items-center gap-2">
                <User size={14} strokeWidth={2} className="text-[#0A0A0A]" />
                <h3
                  className="text-[16px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Kişisel bilgiler' : 'Personal info'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <span className="pulse-eyebrow text-[#737373]">{t.profile_name}</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="pulse-eyebrow text-[#737373]">{t.profile_email}</span>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className={inputCls}
                  />
                </label>
              </div>
            </section>

            {/* Locale */}
            <section className="space-y-5 pt-2 border-t border-[#EDEDED]">
              <div className="flex items-center gap-2 pt-6">
                <Globe size={14} strokeWidth={2} className="text-[#0A0A0A]" />
                <h3
                  className="text-[16px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Sistem dili' : 'Interface language'}
                </h3>
              </div>
              <label className="space-y-1.5 block">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'PANEL DİLİ' : 'PANEL LANGUAGE'}
                </span>
                <select
                  value={locale}
                  onChange={(e) => handleLocaleChange(e.target.value)}
                  className={`${inputCls} cursor-pointer appearance-none`}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </label>
            </section>

            {/* Password */}
            <section className="space-y-5 pt-2 border-t border-[#EDEDED]">
              <div className="flex items-center gap-2 pt-6">
                <Key size={14} strokeWidth={2} className="text-[#0A0A0A]" />
                <h3
                  className="text-[16px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Şifre değiştir' : 'Change password'}
                </h3>
              </div>
              <div className="space-y-4">
                <label className="space-y-1.5 block">
                  <span className="pulse-eyebrow text-[#737373]">{t.profile_current_password}</span>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className="pulse-eyebrow text-[#737373]">{t.profile_new_password}</span>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder={isTr ? 'En az 8 karakter' : 'At least 8 chars'}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className="pulse-eyebrow text-[#737373]">{t.profile_confirm_password}</span>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder={isTr ? 'Şifreyi doğrula' : 'Confirm password'}
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-3 text-[14px] font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={14} strokeWidth={2} />
                  {isTr ? 'Güncelleniyor' : 'Updating'}
                </>
              ) : (
                <>
                  <ShieldCheck size={14} strokeWidth={2} />
                  {t.profile_update_btn}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
