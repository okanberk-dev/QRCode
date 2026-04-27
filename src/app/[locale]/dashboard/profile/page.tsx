'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Check,
  Image as ImageIcon,
  Key,
  Loader2,
  Palette,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { AlertBanner, Badge, Eyebrow, PageHeader } from '@/components/ui';

export default function ProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

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
          setFormData((prev) => ({ ...prev, name: data.name || '', email: data.email || '' }));
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
      if (res.ok) window.location.href = `/${newLocale}/dashboard/profile`;
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
        setFormData((p) => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        setError(data.error || t.profile_error || 'Güncelleme sırasında hata oluştu.');
      }
    } catch {
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

  const inputCls =
    'w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]';

  // KVKK & legal docs — display-only list per design's `OwnerSettings`
  // (restaurant-level legal posture; "Active" implies the latest version
  // is in effect for new feedback flows).
  const legalDocs: { k: string; s: string; ok: boolean }[] = [
    {
      k: isTr ? 'Aydınlatma metni' : 'KVKK disclosure',
      s: isTr ? 'v2.0 · Pulse şablonundan' : 'v2.0 · from Pulse template',
      ok: true,
    },
    {
      k: isTr ? 'Açık rıza metni' : 'Explicit consent',
      s: isTr ? 'v2.0 · Pulse şablonundan' : 'v2.0 · from Pulse template',
      ok: true,
    },
    {
      k: isTr ? 'Ticari elektronik ileti izni' : 'Commercial email consent',
      s: isTr ? 'Public review formunda toplanır' : 'Captured in the public review form',
      ok: true,
    },
  ];

  return (
    <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow={isTr ? 'AYARLAR' : 'SETTINGS'}
        title={isTr ? 'Hesap & ayarlar' : 'Account & settings'}
        description={
          isTr
            ? 'Kimlik bilgilerin, marka kimliğin ve yasal metinler.'
            : 'Your identity, brand identity and legal documents.'
        }
      />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError('')}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess('')}>
          {success}
        </AlertBanner>
      )}

      {/* Card 1 — Hesap (design's "İŞLETME PROFİLİ" reframed for user-level
          identity). Holds login + notification identity + password change. */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <section className="bz-card p-6 sm:p-7">
          <Eyebrow>{isTr ? 'HESAP' : 'ACCOUNT'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-5" style={{ fontSize: 18 }}>
            {isTr ? 'Genel bilgiler' : 'General info'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
            <label className="space-y-1.5 block md:col-span-2">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'PANEL DİLİ' : 'PANEL LANGUAGE'}
              </span>
              <select
                value={locale}
                onChange={(e) => handleLocaleChange(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div
            className="mt-6 pt-5"
            style={{ borderTop: '1px solid #EDEDED' }}
          >
            <div className="flex items-center gap-2 mb-3.5">
              <Key size={14} strokeWidth={2} className="text-[#0A0A0A]" />
              <div className="bz-h-tight" style={{ fontSize: 15 }}>
                {isTr ? 'Şifre değiştir' : 'Change password'}
              </div>
            </div>
            <div className="space-y-3.5">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bz-btn-primary disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" strokeWidth={2} />
              ) : (
                <Check size={14} strokeWidth={2} />
              )}
              {isTr ? 'Değişiklikleri kaydet' : 'Save changes'}
            </button>
          </div>
        </section>
      </form>

      {/* Card 2 — Görsel Kimlik (design's "GÖRSEL KİMLİK"). Logo + accent
          color are restaurant-scoped, so the form lives on the per-restaurant
          page; this card surfaces the entry point. */}
      <section className="bz-card p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={14} strokeWidth={2} className="text-[#0A0A0A]" />
          <Eyebrow>{isTr ? 'GÖRSEL KİMLİK' : 'BRAND'}</Eyebrow>
        </div>
        <div className="bz-h-tight mt-1 mb-5" style={{ fontSize: 18 }}>
          {isTr ? 'Logo ve renk' : 'Logo & color'}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div
            className="flex flex-col items-center justify-center gap-1 shrink-0"
            style={{
              width: 88,
              height: 88,
              borderRadius: 16,
              background: '#FAFAFA',
              border: '1px dashed #D4D4D4',
            }}
          >
            <ImageIcon size={20} className="text-[#A3A3A3]" strokeWidth={2} />
            <span className="pulse-eyebrow text-[#A3A3A3]">LOGO</span>
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/${locale}/dashboard/restaurants`}
              className="bz-btn-ghost"
            >
              <Upload size={14} strokeWidth={2} />
              {isTr ? 'İşletme markasını yönet' : 'Manage business brand'}
            </Link>
            <p className="mt-2.5 text-[12px] text-[#737373] leading-[1.55]">
              {isTr
                ? 'Logo, marka rengi ve menü teması işletme detay sayfasından düzenlenir. Birden fazla konumun varsa her biri kendi markasını taşır.'
                : 'Logo, brand color and menu theme are managed on the restaurant detail page. Each location keeps its own brand.'}
            </p>
          </div>
        </div>
      </section>

      {/* Card 3 — KVKK & Rıza Yönetimi (1:1 design). Read-only display of
          the active legal posture. Pulse mail templates render these
          documents per locale; admins manage versions via /admin/mail-templates. */}
      <section className="bz-card p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={14} strokeWidth={2} className="text-[#0A0A0A]" />
          <Eyebrow>{isTr ? 'KVKK & RIZA YÖNETİMİ' : 'KVKK & CONSENT'}</Eyebrow>
        </div>
        <div className="bz-h-tight mt-1 mb-5" style={{ fontSize: 18 }}>
          {isTr ? 'Yasal metinler' : 'Legal documents'}
        </div>
        <div className="flex flex-col gap-2.5">
          {legalDocs.map((d, i) => (
            <div
              key={i}
              className="flex justify-between items-center"
              style={{
                padding: 14,
                border: '1px solid #EDEDED',
                borderRadius: 10,
              }}
            >
              <div>
                <div className="text-[13px] font-semibold text-[#0A0A0A]">{d.k}</div>
                <div className="text-[11px] text-[#737373] mt-0.5">{d.s}</div>
              </div>
              <Badge kind="ok">{isTr ? 'Aktif' : 'Active'}</Badge>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
