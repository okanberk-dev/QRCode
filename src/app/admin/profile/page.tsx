'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, Key, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';

export default function AdminProfilePage() {
  const { t } = useAdminTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profile, setProfile] = useState<{ id: string, username: string, role: string } | null>(null);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Şifreniz başarıyla güncellendi.');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(data.error || 'Güncelleme sırasında hata oluştu.');
      }
    } catch (err) {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto space-y-6 sm:space-y-10">
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-black text-[#111827] leading-[1.1] sm:leading-[0.9] tracking-tighter uppercase italic break-words">
          Profilim
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#6b6760] font-bold italic">
          Hesap bilgilerinizi ve parolanızı güncelleyin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="p-6 sm:p-8 bg-[#111827] rounded-[32px] sm:rounded-[40px] border-2 border-[#1f1e1d] shadow-[6px_8px_0_0_#FDBF1D] sm:shadow-[8px_10px_0_0_#FDBF1D] space-y-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-[#FDBF1D] border-2 border-[#1f1e1d] flex items-center justify-center shadow-[4px_4px_0_0_#1f1e1d]">
              <ShieldCheck size={28} className="text-[#111827]" strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h4 className="text-white font-black uppercase text-sm tracking-widest">Güvenlik Önemlidir</h4>
              <p className="text-[#ada89f] text-xs font-bold leading-relaxed">
                Şifrenizi düzenli aralıklarla değiştirmek hesabınızın güvenliğini artırır. Güçlü bir şifre en az 8 karakter, rakam ve sembol içermelidir.
              </p>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-[24px] sm:rounded-[40px] border-2 border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] sm:shadow-[8px_10px_0_0_#1f1e1d] p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10">
            {error && (
              <div className="flex items-center gap-4 p-5 bg-red-50 border-2 border-red-500/20 rounded-2xl text-red-600 text-[13px] font-black uppercase tracking-widest shadow-[0_4px_0_0_#ef4444]">
                <AlertCircle size={20} strokeWidth={3} className="flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-4 p-5 bg-green-50 border-2 border-[#10b981]/20 rounded-2xl text-[#10b981] text-[13px] font-black uppercase tracking-widest shadow-[0_4px_0_0_#10b981]">
                <Check size={20} strokeWidth={3} className="flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Account Info */}
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FCFBF7] border-2 border-[#1f1e1d] flex items-center justify-center shadow-[2px_2px_0_0_#1f1e1d]">
                  <User size={16} strokeWidth={3} />
                </div>
                <h3 className="text-lg font-black text-[#111827] uppercase tracking-tighter italic">Hesap Bilgileri</h3>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Kullanıcı Adı</label>
                <div className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#f3f4f6] text-[#6b6760] font-bold">
                  {profile?.username}
                  {profile?.id === 'env-admin' && " (Varsayılan Admin - Değiştirilemez)"}
                </div>
              </div>
            </div>

            {/* Password Change */}
            <div className="pt-6 sm:pt-10 border-t-4 border-[#F7F4F0] space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FCFBF7] border-2 border-[#1f1e1d] flex items-center justify-center shadow-[2px_2px_0_0_#1f1e1d]">
                  <Key size={16} strokeWidth={3} />
                </div>
                <h3 className="text-lg font-black text-[#111827] uppercase tracking-tighter italic">Şifre Değiştir</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Mevcut Şifre</label>
                  <input
                    type="password"
                    required
                    disabled={profile?.id === 'env-admin'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] focus:border-[#ea580c] focus:shadow-[2px_2px_0_0_#ea580c] outline-none text-[15px] font-bold transition-all disabled:opacity-50 disabled:bg-gray-100"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Yeni Şifre</label>
                    <input
                      type="password"
                      required
                      disabled={profile?.id === 'env-admin'}
                      value={formData.newPassword}
                      onChange={(e) => setFormData(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Min 8 karakter"
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] focus:border-[#ea580c] focus:shadow-[2px_2px_0_0_#ea580c] outline-none text-[15px] font-bold transition-all disabled:opacity-50 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Şifre Tekrar</label>
                    <input
                      type="password"
                      required
                      disabled={profile?.id === 'env-admin'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Şifreyi doğrula"
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] focus:border-[#ea580c] focus:shadow-[2px_2px_0_0_#ea580c] outline-none text-[15px] font-bold transition-all disabled:opacity-50 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || profile?.id === 'env-admin'}
              className="w-full py-5 bg-[#111827] text-white font-black rounded-2xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#000] hover:bg-[#111827]/90 active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 text-[15px] tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} strokeWidth={3} />
                  GÜNCELLENİYOR...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} strokeWidth={3} />
                  ŞİFREYİ GÜNCELLE
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
