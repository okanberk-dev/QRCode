'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, Key, Check, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';

interface ProfileData {
  id: string;
  username: string;
  role: string;
  recoveryEmail: string | null;
}

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // E-mail
  const [email, setEmail] = useState('');

  // Password change
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const isEnvAdmin = profile?.id === 'env-admin';

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setProfile({
          id: data.id,
          username: data.username,
          role: data.role,
          recoveryEmail: data.recoveryEmail || null,
        });
        setEmail(data.recoveryEmail || '');
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingEmail(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'E-posta güncellenemedi.');
      } else {
        setSuccess('Kurtarma e-postası güncellendi.');
        setProfile((prev) =>
          prev ? { ...prev, recoveryEmail: email.trim() || null } : prev,
        );
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Şifren başarıyla güncellendi.');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Güncelleme sırasında hata oluştu.');
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#0A0A0A] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader eyebrow="PROFİL" title="Profilim" />

      {/* Kurtarma e-postası eksik uyarısı — şifremi unuttum akışı bunsuz
          çalışmaz. ENV admin için göstermeyiz (zaten profile düzenleyemez). */}
      {!isEnvAdmin && profile && !profile.recoveryEmail && (
        <AlertBanner kind="warn">
          Hesabında kurtarma e-postası yok. Şifreni unutursan kurtarma akışı çalışmaz.
          Aşağıdaki <strong>Kurtarma e-postası</strong> kartından bir adres ekle.
        </AlertBanner>
      )}

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError('')}>
          {error}
        </AlertBanner>
      )}
      {success && <AlertBanner kind="success">{success}</AlertBanner>}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 lg:gap-7">
        {/* Sidebar info */}
        <aside className="bz-card p-5 sm:p-6 self-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A0A0A]">
            <ShieldCheck size={26} className="text-[#C6F24E]" strokeWidth={2} />
          </div>
          <div className="mt-4">
            <p className="pulse-eyebrow text-[#737373]">HESAP</p>
            <div className="bz-h-tight mt-1 truncate" style={{ fontSize: 16 }}>
              {profile?.username}
            </div>
            <div className="mt-1 text-[12px] text-[#737373] uppercase tracking-wide">
              {profile?.role || 'superadmin'}
              {isEnvAdmin && ' · ENV'}
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-[#FAFAFA] border border-[#EDEDED] p-3.5">
            <p className="text-[11px] font-semibold text-[#0A0A0A] mb-1">
              Güvenlik ipucu
            </p>
            <p className="text-[11px] leading-[1.55] text-[#525252]">
              Şifreni düzenli aralıklarla değiştir. En az 8 karakter, bir büyük harf ve bir
              rakam içersin.
            </p>
          </div>
        </aside>

        {/* Form area */}
        <div className="space-y-4">
          {/* E-mail card */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF9B8]">
                <Mail size={16} strokeWidth={2} />
              </span>
              <h3 className="bz-h-tight" style={{ fontSize: 17 }}>
                Kurtarma e-postası
              </h3>
            </div>
            <p className="text-[13px] text-[#525252] leading-[1.55] mb-5">
              Şifreni unuttuğunda 6 haneli doğrulama kodu bu adrese gelir. Kayıtlı bir e-posta
              yoksa kurtarma akışı çalışmaz.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEnvAdmin}
                  placeholder="ornek@buaze.com"
                  className="bz-input"
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                <p className="text-[11px] text-[#737373]">
                  {profile?.recoveryEmail ? (
                    <>
                      Mevcut:{' '}
                      <span className="font-mono text-[#0A0A0A]">{profile.recoveryEmail}</span>
                    </>
                  ) : (
                    'Henüz e-posta kayıtlı değil.'
                  )}
                </p>
                <button
                  type="submit"
                  disabled={savingEmail || isEnvAdmin}
                  className="bz-btn-primary inline-flex items-center justify-center gap-1.5 sm:self-end disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingEmail ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} strokeWidth={2} />
                  )}
                  E-postayı kaydet
                </button>
              </div>

              {isEnvAdmin && (
                <div className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2 text-[12px] text-[#92400E]">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" strokeWidth={2} />
                  <span>
                    Çevre (env) admin&apos;i için e-posta veritabanına yazılamaz. DB üzerinden bir
                    AdminUser oluşturup ona e-posta ekle.
                  </span>
                </div>
              )}
            </form>
          </section>

          {/* Account info card */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAFA] border border-[#EDEDED]">
                <User size={16} strokeWidth={2} />
              </span>
              <h3 className="bz-h-tight" style={{ fontSize: 17 }}>
                Hesap bilgileri
              </h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                Kullanıcı adı
              </label>
              <div
                className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-[14px] font-medium text-[#0A0A0A]"
              >
                {profile?.username}
                {isEnvAdmin && ' (varsayılan — değiştirilemez)'}
              </div>
            </div>
          </section>

          {/* Password change card */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAFA] border border-[#EDEDED]">
                <Key size={16} strokeWidth={2} />
              </span>
              <h3 className="bz-h-tight" style={{ fontSize: 17 }}>
                Şifre değiştir
              </h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                  Mevcut şifre
                </label>
                <input
                  type="password"
                  required
                  disabled={isEnvAdmin}
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="bz-input"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                    Yeni şifre
                  </label>
                  <input
                    type="password"
                    required
                    disabled={isEnvAdmin}
                    minLength={8}
                    value={pwForm.newPassword}
                    onChange={(e) =>
                      setPwForm((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    placeholder="Min 8 karakter"
                    className="bz-input"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
                    Şifreyi tekrarla
                  </label>
                  <input
                    type="password"
                    required
                    disabled={isEnvAdmin}
                    minLength={8}
                    value={pwForm.confirmPassword}
                    onChange={(e) =>
                      setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))
                    }
                    placeholder="Tekrar gir"
                    className="bz-input"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword || isEnvAdmin}
                className="bz-btn-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPassword ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} strokeWidth={2} />
                )}
                Şifreyi güncelle
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
