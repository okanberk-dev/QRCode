'use client';

import { useState, useEffect, use } from 'react';
import { Loader2, User, Key, Check, ShieldCheck, AlertCircle, Palette, Plug, Cog, Users, CreditCard, Bell, Code, Globe } from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { PageHeader, Tabs, type TabItem } from '@/components/ui';

type SettingsTab = 'account' | 'brand' | 'integrations' | 'rules' | 'team' | 'billing' | 'notifications' | 'api';

export default function ProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
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

  const tabs: { k: SettingsTab; l: string; i: React.ReactNode }[] = [
    { k: 'account', l: isTr ? 'Hesap' : 'Account', i: <User size={13} strokeWidth={2} /> },
    { k: 'brand', l: isTr ? 'Marka kimliği' : 'Brand', i: <Palette size={13} strokeWidth={2} /> },
    { k: 'integrations', l: isTr ? 'Entegrasyonlar' : 'Integrations', i: <Plug size={13} strokeWidth={2} /> },
    { k: 'rules', l: isTr ? 'Otomatik kurallar' : 'Automations', i: <Cog size={13} strokeWidth={2} /> },
    { k: 'team', l: isTr ? 'Ekip & roller' : 'Team & roles', i: <Users size={13} strokeWidth={2} /> },
    { k: 'billing', l: isTr ? 'Faturalandırma' : 'Billing', i: <CreditCard size={13} strokeWidth={2} /> },
    { k: 'notifications', l: isTr ? 'Bildirimler' : 'Notifications', i: <Bell size={13} strokeWidth={2} /> },
    { k: 'api', l: isTr ? 'API & webhook' : 'API & webhooks', i: <Code size={13} strokeWidth={2} /> },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow={isTr ? 'AYARLAR' : 'SETTINGS'}
        title={isTr ? 'Hesap ve işletme ayarları' : 'Account & business settings'}
        description={
          isTr
            ? 'Kişisel bilgiler, marka kimliği, entegrasyonlar, ekip ve fatura ayarlarını tek yerden yönet.'
            : 'Manage personal info, brand identity, integrations, team, and billing settings in one place.'
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
        {/* Tab sidebar — vertical Tabs primitive (lg+); horizontal scroll fallback (<lg) */}
        <aside className="lg:sticky lg:top-4">
          <div className="hidden lg:block">
            <Tabs
              items={tabs.map((tab): TabItem => ({
                id: tab.k,
                label: (
                  <span className="flex items-center gap-2.5">
                    {tab.i}
                    {tab.l}
                  </span>
                ),
              }))}
              active={activeTab}
              onChange={(id) => setActiveTab(id as SettingsTab)}
              variant="vertical"
              ariaLabel={isTr ? 'Ayarlar sekmeleri' : 'Settings tabs'}
            />
          </div>
          {/* Mobile/tablet: horizontal scroll button row */}
          <div className="flex lg:hidden flex-row gap-1 overflow-x-auto -mx-1 px-1 pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.k;
              return (
                <button
                  key={tab.k}
                  type="button"
                  onClick={() => setActiveTab(tab.k)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-[13px] transition-colors ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white font-semibold'
                      : 'text-[#525252] hover:bg-[#F5F5F5] font-medium'
                  }`}
                >
                  {tab.i}
                  {tab.l}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Tab content */}
        <div className="min-w-0 space-y-4">
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

          {activeTab === 'account' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <section className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7">
                <h2
                  className="text-[20px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Kişisel bilgiler' : 'Personal info'}
                </h2>
                <p className="pulse-eyebrow text-[#737373] mt-1">
                  {isTr ? 'Panele giriş ve bildirim bilgilerin' : 'Login + notification identity'}
                </p>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </section>

              <section className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7">
                <div className="flex items-center gap-2">
                  <Key size={14} strokeWidth={2} className="text-[#0A0A0A]" />
                  <h2
                    className="text-[18px] font-semibold tracking-[-0.015em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isTr ? 'Şifre değiştir' : 'Change password'}
                  </h2>
                </div>
                <div className="mt-4 space-y-4">
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-60 transition-colors"
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
          )}

          {activeTab === 'brand' && (
            <section className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7">
              <h2
                className="text-[20px] font-semibold tracking-[-0.015em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'Marka kimliği' : 'Brand identity'}
              </h2>
              <p className="pulse-eyebrow text-[#737373] mt-1">
                {isTr ? 'QR kartlarında ve müşteri ekranlarında görünen tasarım' : 'Shown on QR cards and customer screens'}
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <span className="pulse-eyebrow text-[#737373]">LOGO</span>
                  <div className="mt-2 h-24 border border-dashed border-[#E5E5E5] rounded-lg bg-[#FAFAFA] flex items-center justify-center px-4">
                    <span
                      className="text-[22px] font-semibold tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {(formData.name || 'buaze').split(' ')[0].toLowerCase()}
                      <span className="bg-[#C6F24E] px-1 rounded">·</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#737373]">
                    {isTr ? 'PNG/SVG · max 500KB · yakında' : 'PNG/SVG · max 500KB · soon'}
                  </p>
                </div>
                <div>
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'MARKA RENGİ' : 'BRAND COLOR'}
                  </span>
                  <div className="mt-2 flex gap-2">
                    {['#C6F24E', '#0A0A0A', '#FFFFFF', '#FF6B35', '#2563EB'].map((c, i) => (
                      <div
                        key={c}
                        className="h-9 w-9 rounded-md"
                        style={{
                          background: c,
                          border: i === 0 ? '2px solid #0A0A0A' : '1px solid #E5E5E5',
                        }}
                      />
                    ))}
                    <div className="h-9 w-9 rounded-md border border-dashed border-[#A3A3A3] flex items-center justify-center text-[#A3A3A3]">
                      +
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'AKSAN FONTU' : 'ACCENT FONT'}
                    </span>
                    <div className="mt-2 px-4 py-2.5 border border-[#EDEDED] rounded-lg flex justify-between items-center">
                      <span
                        className="text-[15px] font-medium"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        Space Grotesk
                      </span>
                      <span className="text-[#A3A3A3]">⌄</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-[12px] text-[#737373] italic">
                {isTr ? 'Frontend hazır — backend ayarları yakında.' : 'Frontend ready — backend wiring coming soon.'}
              </p>
            </section>
          )}

          {activeTab === 'integrations' && (
            <section className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7">
              <h2
                className="text-[20px] font-semibold tracking-[-0.015em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'Google Business Profile' : 'Google Business Profile'}
              </h2>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[13px] text-[#737373]">
                  {isTr ? 'hello@buaze.com · 0 konum eşleşti' : 'hello@buaze.com · 0 locations matched'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#A3A3A3]" />
                  <span className="text-[12px] font-medium">{isTr ? 'Bağlanmadı' : 'Not connected'}</span>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-[#EAF9B8] p-3 text-[12px] leading-[1.5]">
                ✓ {isTr ? 'Google politikalarına uyumlu. Bağlandığında otomatik denetim başlar.' : 'Google-policy compliant. Auto-audit starts once connected.'}
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#1A1A1A] transition-colors"
              >
                {isTr ? 'Google ile bağlan' : 'Connect Google'}
              </button>
              <p className="mt-5 text-[12px] text-[#737373] italic">
                {isTr ? 'Frontend hazır — OAuth backend yakında.' : 'Frontend ready — OAuth backend coming soon.'}
              </p>
            </section>
          )}

          {activeTab === 'billing' && (
            <section className="rounded-2xl bg-[#0A0A0A] p-6 sm:p-8 text-white">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <span className="pulse-eyebrow text-[#C6F24E]">
                    {isTr ? 'AKTİF PLAN' : 'ACTIVE PLAN'}
                  </span>
                  <div
                    className="mt-2 text-[28px] sm:text-[32px] font-medium tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isTr ? 'Trial · 14 gün ücretsiz' : 'Trial · 14-day free'}
                  </div>
                  <p className="mt-1 text-[12px] text-white/60">
                    {isTr ? 'Trial süresince tüm özellikler açık' : 'Full access during trial'}
                  </p>
                </div>
                <a
                  href={`/${locale}/pricing`}
                  className="self-start inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
                >
                  {isTr ? 'Planı yükselt →' : 'Upgrade plan →'}
                </a>
              </div>
            </section>
          )}

          {(activeTab === 'rules' ||
            activeTab === 'team' ||
            activeTab === 'notifications' ||
            activeTab === 'api') && (
            <section className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#EDEDED]">
                <Cog size={22} className="text-[#737373]" strokeWidth={2} />
              </div>
              <h3
                className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {tabs.find((t) => t.k === activeTab)?.l}
              </h3>
              <p className="mt-2 text-[14px] text-[#525252] max-w-[440px] mx-auto">
                {isTr
                  ? 'Bu bölüm hazır, backend bağlantısı yakında. Stay tuned.'
                  : 'This section is ready — backend wiring coming soon.'}
              </p>
              <span className="pulse-eyebrow text-[#A8D62E] mt-3 inline-block">
                {isTr ? 'YAKINDA · FRONTEND HAZIR' : 'SOON · FRONTEND READY'}
              </span>
            </section>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[12px] text-[#737373]">
        <Globe size={12} strokeWidth={2} />
        <span>
          {isTr
            ? 'Bu sayfadaki ayarlar Pulse tasarımına göre hazırlandı. Yakında arka uç bağlantıları etkinleştirilecek.'
            : 'These settings follow the Pulse design. Backend wiring will go live shortly.'}
        </span>
      </div>
    </div>
  );
}
