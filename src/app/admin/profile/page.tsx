'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, User, Key, Check, Mail, ShieldCheck, AlertCircle, Globe } from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { adminRoleLabel } from '@/components/admin/admin-nav';
import ProfileSkeleton from './loading';

interface ProfileData {
  id: string;
  username: string;
  role: string;
  recoveryEmail: string | null;
}

export default function AdminProfilePage() {
  const { locale, setLocale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Where the current error/success message belongs. Form results render
  // inside their own card, next to the button that was clicked — the page
  // banner sits above the fold and was off-screen on phones.
  const [messageScope, setMessageScope] = useState<'page' | 'email' | 'password'>('page');
  const formMessageRef = useRef<HTMLDivElement>(null);
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

  // Bring an in-card form message fully into view: it renders under the
  // button, where the floating bottom nav (phones) can cover it. Only scroll
  // when it is not comfortably visible.
  useEffect(() => {
    if (messageScope === 'page' || (!error && !success)) return;
    const el = formMessageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top >= 80 && rect.bottom <= viewport - 120) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [error, success, messageScope]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('Profil bilgileri yüklenemedi. Sayfayı yenileyip tekrar dene.');
          return;
        }
        setProfile({
          id: data.id,
          username: data.username,
          role: data.role,
          recoveryEmail: data.recoveryEmail || null,
        });
        setEmail(data.recoveryEmail || '');
      })
      .catch(() => {
        if (!cancelled) setError('Bağlantı hatası. Profil bilgileri yüklenemedi.');
      })
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
    setMessageScope('email');
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
    setMessageScope('password');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    // Mirrors the server rule (isStrongPassword: 8+ chars, a letter and a digit).
    if (
      pwForm.newPassword.length < 8 ||
      !/[A-Za-z]/.test(pwForm.newPassword) ||
      !/\d/.test(pwForm.newPassword)
    ) {
      setError('Yeni şifre en az 8 karakter olmalı ve en az bir harf ile bir rakam içermeli.');
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

  // Same shape as loading.tsx, so the route skeleton hands over without a
  // second (spinner) loading state (CLAUDE.md §40.10).
  if (loading) return <ProfileSkeleton />;

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader eyebrow="PROFİL" title="Profilim" />

      {/* Kurtarma e-postası eksik uyarısı — şifremi unuttum akışı bunsuz
          çalışmaz. ENV admin için göstermeyiz (zaten profile düzenleyemez). */}
      {!isEnvAdmin && profile && !profile.recoveryEmail && (
        <AlertBanner kind="warn">
          Hesabında kurtarma e-postası yok. Şifreni unutursan kurtarma akışı çalışmaz.
          Aşağıdaki <strong>Kurtarma e-postası</strong> kartından bir adres ekle.
        </AlertBanner>
      )}

      {messageScope === 'page' && error && (
        <AlertBanner kind="danger" onDismiss={() => setError('')}>
          {error}
        </AlertBanner>
      )}
      {messageScope === 'page' && success && <AlertBanner kind="success">{success}</AlertBanner>}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 lg:gap-7">
        {/* Sidebar info */}
        <aside className="bz-card p-5 sm:p-6 self-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-pn-ink">
            <ShieldCheck size={26} className="text-pn-accent" strokeWidth={2} />
          </div>
          <div className="mt-4">
            <p className="text-[13px] font-medium text-[#737373]">HESAP</p>
            <div className="bz-h-tight mt-1 truncate" style={{ fontSize: 16 }}>
              {profile?.username}
            </div>
            <div className="mt-1 text-[12px] text-[#737373]">
              {profile?.role ? adminRoleLabel(profile.role, isTr ? 'tr' : 'en') : '—'}
              {isEnvAdmin && ' · Varsayılan hesap'}
            </div>
          </div>
          <div className="mt-5 rounded-[20px] bg-pn-canvas border border-pn-line p-3.5">
            <p className="text-[12px] font-medium text-pn-ink mb-1">
              Güvenlik ipucu
            </p>
            <p className="text-[12px] leading-[1.55] text-[#525252]">
              Şifreni düzenli aralıklarla değiştir. En az 8 karakter olsun; en az bir harf ve
              bir rakam içersin.
            </p>
          </div>
        </aside>

        {/* Form area */}
        <div className="space-y-4">
          {/* E-mail card */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-pn-accent-soft">
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
                <label
                  htmlFor="admin-recovery-email"
                  className="text-[12px] font-medium text-[#737373]"
                >
                  E-posta
                </label>
                <input
                  id="admin-recovery-email"
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
                <p className="text-[12px] text-[#737373]">
                  {profile?.recoveryEmail ? (
                    <>
                      Mevcut:{' '}
                      <span className="font-mono text-pn-ink">{profile.recoveryEmail}</span>
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

              {messageScope === 'email' && (error || success) && (
                <div ref={formMessageRef}>
                  {error ? (
                    <AlertBanner kind="danger" onDismiss={() => setError('')}>
                      {error}
                    </AlertBanner>
                  ) : (
                    <AlertBanner kind="success">{success}</AlertBanner>
                  )}
                </div>
              )}

              {isEnvAdmin && (
                <div className="flex items-start gap-2 rounded-[14px] bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2 text-[12px] text-[#92400E]">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" strokeWidth={2} />
                  <span>
                    Varsayılan sistem hesabının bilgileri buradan değiştirilemez. Kurtarma e-postası
                    eklemek için kendine ayrı bir yönetici hesabı oluştur.
                  </span>
                </div>
              )}
            </form>
          </section>

          {/* Account info card */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-pn-canvas border border-pn-line">
                <User size={16} strokeWidth={2} />
              </span>
              <h3 className="bz-h-tight" style={{ fontSize: 17 }}>
                Hesap bilgileri
              </h3>
            </div>
            <div className="space-y-1.5">
              <p className="text-[12px] font-medium text-[#737373]">
                Kullanıcı adı
              </p>
              <div
                className="rounded-[24px] border border-pn-line bg-pn-canvas px-4 py-3 text-[14px] font-medium text-pn-ink"
              >
                {profile?.username}
                {isEnvAdmin && ' (varsayılan — değiştirilemez)'}
              </div>
            </div>
          </section>

          {/* Language preference card — locale switcher moved here from
              sidebar bottom row. Per-admin preference (ADMIN_LOCALE cookie
              via AdminTranslationProvider); change reloads window so
              SSR-rendered chrome (sidebar, topbar, breadcrumbs) re-renders
              in the new language. Available to every admin role
              (superadmin / manager / restaurant_owner / staff). */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-pn-canvas border border-pn-line">
                <Globe size={16} strokeWidth={2} />
              </span>
              <h3 className="bz-h-tight" style={{ fontSize: 17 }}>
                {isTr ? 'Dil tercihi' : 'Language preference'}
              </h3>
            </div>
            <p className="text-[13px] text-[#525252] leading-[1.55] mb-4">
              {isTr
                ? 'Panel arayüzünün dili. Tercih bu cihaza özel saklanır; değişiklik sayfayı yeniler.'
                : 'Panel UI language. Preference is stored per device; switching reloads the page.'}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <label
                  htmlFor="admin-locale-select"
                  className="text-[12px] font-medium text-[#737373]"
                >
                  {isTr ? 'Arayüz dili' : 'Interface language'}
                </label>
                <select
                  id="admin-locale-select"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
                  className="bz-input cursor-pointer"
                  aria-label={isTr ? 'Arayüz dili' : 'Interface language'}
                >
                  <option value="tr">Türkçe (TR)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>
              <div className="rounded-[20px] bg-pn-canvas border border-pn-line px-3 py-2 text-[12px] text-[#525252] sm:max-w-[200px]">
                <span>{isTr ? 'Şu anki dil:' : 'Current:'}</span>{' '}
                <span className="font-mono font-medium text-pn-ink">
                  {locale.toUpperCase()}
                </span>
              </div>
            </div>
          </section>

          {/* Password change card */}
          <section className="bz-card p-5 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-pn-canvas border border-pn-line">
                <Key size={16} strokeWidth={2} />
              </span>
              <h3 className="bz-h-tight" style={{ fontSize: 17 }}>
                Şifre değiştir
              </h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-current-password"
                  className="text-[12px] font-medium text-[#737373]"
                >
                  Mevcut şifre
                </label>
                <input
                  id="admin-current-password"
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
                  <label
                    htmlFor="admin-new-password"
                    className="text-[12px] font-medium text-[#737373]"
                  >
                    Yeni şifre
                  </label>
                  <input
                    id="admin-new-password"
                    type="password"
                    required
                    disabled={isEnvAdmin}
                    minLength={8}
                    value={pwForm.newPassword}
                    onChange={(e) =>
                      setPwForm((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    placeholder="En az 8 karakter"
                    className="bz-input"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-confirm-password"
                    className="text-[12px] font-medium text-[#737373]"
                  >
                    Şifreyi tekrarla
                  </label>
                  <input
                    id="admin-confirm-password"
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

              {messageScope === 'password' && (error || success) && (
                <div ref={formMessageRef}>
                  {error ? (
                    <AlertBanner kind="danger" onDismiss={() => setError('')}>
                      {error}
                    </AlertBanner>
                  ) : (
                    <AlertBanner kind="success">{success}</AlertBanner>
                  )}
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
