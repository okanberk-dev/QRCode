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
      <div className="flex h-screen items-center justify-center bg-[#F8F6F1]">
        <Loader2 className="animate-spin text-[#1A2332] w-12 h-12" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] font-sans selection:bg-[#F4B400]/30 p-4 sm:p-6 md:p-10 lg:p-16">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
        {/* Back Link */}
        <Link 
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-2 text-xs font-black text-[#2A3444] hover:text-[#1A2332] transition-all uppercase tracking-widest group"
        >
          <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#1A2332] flex items-center justify-center shadow-md group-hover:translate-y-0.5 group-hover:shadow-none transition-all">
            <ArrowLeft size={16} strokeWidth={2} />
          </div>
          {locale === 'tr' ? 'Dashboard\'a Dön' : 'Back to Dashboard'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {/* Sidebar Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl md:text-[40px] font-black text-[#1A2332] leading-[1.1] sm:leading-[0.9] tracking-tighter uppercase italic break-words">
                {t.profile_title}
              </h1>
              <p className="text-[15px] sm:text-[17px] text-[#2A3444] font-bold italic">
                {t.profile_subtitle}
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-[#1A2332] rounded-[32px] sm:rounded-[40px] border-2 border-[#1A2332] shadow-md sm:shadow-md space-y-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-[#F4B400] border-2 border-[#1A2332] flex items-center justify-center shadow-md">
                <ShieldCheck size={28} className="text-[#1A2332]" strokeWidth={2} />
              </div>
              <div className="space-y-2">
                <h4 className="text-white font-black uppercase text-sm tracking-widest">Güvenlik Önemlidir</h4>
                <p className="text-[#6B7280] text-xs font-bold leading-relaxed">
                  Şifrenizi düzenli aralıklarla değiştirmek hesabınızın güvenliğini artırır. Güçlü bir şifre en az 8 karakter, rakam ve sembol içermelidir.
                </p>
              </div>
            </div>
          </div>

          {/* Form Area */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-[24px] sm:rounded-[40px] border-2 border-[#1A2332] shadow-md sm:shadow-md p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10">
              {error && (
                <div className="flex items-center gap-4 p-5 bg-red-50 border-2 border-red-500/20 rounded-2xl text-red-600 text-[13px] font-black uppercase tracking-widest shadow-sm">
                  <AlertCircle size={20} strokeWidth={2} />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-4 p-5 bg-green-50 border-2 border-[#10b981]/20 rounded-2xl text-[#10b981] text-[13px] font-black uppercase tracking-widest shadow-sm">
                  <Check size={20} strokeWidth={2} />
                  {success}
                </div>
              )}

              {/* Personal Info */}
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F6F1] border-2 border-[#1A2332] flex items-center justify-center shadow-md">
                    <User size={16} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-black text-[#1A2332] uppercase tracking-tighter italic">Kişisel Bilgiler</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{t.profile_name}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1A2332] bg-[#F8F6F1] focus:border-[#F4B400] focus:shadow-md outline-none text-[15px] font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{t.profile_email}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1A2332] bg-[#F8F6F1] focus:border-[#F4B400] focus:shadow-md outline-none text-[15px] font-bold transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* System language Settings */}
              <div className="pt-6 sm:pt-10 border-t-4 border-[#F8F6F1] space-y-6 sm:space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F6F1] border-2 border-[#1A2332] flex items-center justify-center shadow-md">
                    <Globe size={16} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-black text-[#1A2332] uppercase tracking-tighter italic">Sistem Dili</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Panel Dili / Panel Language</label>
                  <select
                    value={locale}
                    onChange={(e) => handleLocaleChange(e.target.value)}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1A2332] bg-[#F8F6F1] focus:border-[#F4B400] focus:shadow-md outline-none text-[15px] font-bold transition-all cursor-pointer appearance-none"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              {/* Password Change */}
              <div className="pt-6 sm:pt-10 border-t-4 border-[#F8F6F1] space-y-6 sm:space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F6F1] border-2 border-[#1A2332] flex items-center justify-center shadow-md">
                    <Key size={16} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-black text-[#1A2332] uppercase tracking-tighter italic">Şifre Değiştir</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{t.profile_current_password}</label>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData(p => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1A2332] bg-[#F8F6F1] focus:border-[#F4B400] focus:shadow-md outline-none text-[15px] font-bold transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{t.profile_new_password}</label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Min 8 karakter"
                        className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1A2332] bg-[#F8F6F1] focus:border-[#F4B400] focus:shadow-md outline-none text-[15px] font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{t.profile_confirm_password}</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Şifreyi doğrula"
                        className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1A2332] bg-[#F8F6F1] focus:border-[#F4B400] focus:shadow-md outline-none text-[15px] font-bold transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-5 bg-[#1A2332] text-white font-black rounded-2xl border-2 border-[#1A2332] shadow-sm hover:bg-[#1A2332]/90 active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 text-[15px] tracking-widest uppercase"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} strokeWidth={2} />
                    GÜNCELLENİYOR...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} strokeWidth={2} />
                    {t.profile_update_btn}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
