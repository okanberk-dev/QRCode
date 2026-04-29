'use client';

import { useState, useEffect, use, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Bell,
  Bot,
  Book,
  Check,
  ChevronRight,
  CreditCard,
  Image as ImageIcon,
  Key,
  Link2,
  Loader2,
  MapPin,
  Menu as MenuIcon,
  Palette,
  QrCode,
  ShieldCheck,
  Store,
  Upload,
} from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { AlertBanner, Badge, Eyebrow, PageHeader, PlatformChip } from '@/components/ui';
import BrandIdentityCard from '@/components/dashboard/BrandIdentityCard';
import BillingReadOnlyCard from '@/components/dashboard/BillingReadOnlyCard';
import { SECTORS } from '@/lib/sectors';
import { detectSector, getSectorPlatforms } from '@/lib/sector-platforms';

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

  // İşletme profili (design 1:1 OwnerSettings Card 1) — owner'ın ilk
  // restoranının kimliği. Owner birden çok restorana sahipse `restaurants`
  // sayfasından her birinin detayı yönetilir.
  const [businessData, setBusinessData] = useState({
    id: '' as string,
    name: '',
    category: 'Restoran',
    address: '',
    phone: '',
  });
  const [savingBusiness, setSavingBusiness] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, restRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/restaurants'),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setFormData((prev) => ({ ...prev, name: data.name || '', email: data.email || '' }));
        }
        if (restRes.ok) {
          const restJson = await restRes.json();
          const list = Array.isArray(restJson) ? restJson : restJson?.data || [];
          if (list.length > 0) {
            const first = list[0];
            setBusinessData({
              id: first.id || '',
              name: first.name || '',
              category: first.category || 'Restoran',
              address: first.address || '',
              phone: first.phone || '',
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessData.id) return;
    setSavingBusiness(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/restaurants/${businessData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessData.name,
          category: businessData.category,
          address: businessData.address,
          phone: businessData.phone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || (isTr ? 'İşletme bilgileri güncellenemedi.' : 'Failed to update business.'));
      } else {
        setSuccess(isTr ? 'İşletme bilgileri güncellendi.' : 'Business info updated.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError(isTr ? 'Bir hata oluştu.' : 'An error occurred.');
    } finally {
      setSavingBusiness(false);
    }
  };

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

      {/* Faz 4 — Yeni Settings hub'ları yer aldı. /profile sayfası user-level
          ayarlar (ad/email/şifre/dil) için kalıyor; ekip/billing/bildirim
          /account'a, marka/işletme bilgileri /restaurants/[id]/settings'e taşındı. */}
      <AlertBanner kind="info">
        <strong>{isTr ? 'Yeni:' : 'New:'}</strong>{' '}
        {isTr
          ? 'Bildirim, faturalandırma ve ekip ayarları artık'
          : 'Notification, billing and team settings now live in'}{' '}
        <Link href={`/${isTr ? 'tr' : 'en'}/dashboard/account`} className="underline">
          {isTr ? 'Hesabım' : 'Account'}
        </Link>
        {isTr ? '’da. İşletme ayarları için' : '. For business settings see'}{' '}
        <Link
          href={`/${isTr ? 'tr' : 'en'}/dashboard/restaurants`}
          className="underline"
        >
          {isTr ? 'işletmeler' : 'Businesses'}
        </Link>
        {isTr ? ' sayfasından bir işletme seç ve "Ayarlar"a gir.' : ' page.'}
      </AlertBanner>

      {/* Mobile-only — design's MOwnerSettings 4-group nav list (md+ uses full
          forms below). Each row deep-links to the relevant page or scrolls
          the user to the in-page form section. */}
      <div className="md:hidden space-y-4">
        <SettingsGroup label={isTr ? 'İŞLETME' : 'BUSINESS'}>
          <SettingsRow
            icon={<Store size={16} strokeWidth={2} />}
            title={isTr ? 'İşletme bilgileri' : 'Business info'}
            value={businessData.name || (isTr ? '—' : '—')}
            href="#business-profile"
          />
          <SettingsRow
            icon={<MapPin size={16} strokeWidth={2} />}
            title={isTr ? 'Şubeler' : 'Branches'}
            href={`/${locale}/dashboard/restaurants`}
          />
          <SettingsRow
            icon={<ImageIcon size={16} strokeWidth={2} />}
            title={isTr ? 'Logo & marka' : 'Logo & brand'}
            href={`#brand`}
          />
          <SettingsRow
            icon={<MenuIcon size={16} strokeWidth={2} />}
            title={isTr ? 'Menü' : 'Menu'}
            href={`/${locale}/dashboard/menu`}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup label={isTr ? 'YORUM AKIŞI' : 'REVIEW FLOW'}>
          <SettingsRow
            icon={<Link2 size={16} strokeWidth={2} />}
            title={isTr ? 'Platform bağlantıları' : 'Platform links'}
            href={`/${locale}/dashboard/platforms`}
          />
          <SettingsRow
            icon={<QrCode size={16} strokeWidth={2} />}
            title={isTr ? 'QR kodları' : 'QR codes'}
            href={`/${locale}/dashboard/qr`}
          />
          <SettingsRow
            icon={<Bot size={16} strokeWidth={2} />}
            title={isTr ? 'AI yanıt asistanı' : 'AI reply assistant'}
            value={isTr ? 'Açık' : 'On'}
            href={`/${locale}/dashboard/feedbacks`}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup label={isTr ? 'YASAL' : 'LEGAL'}>
          <SettingsRow
            icon={<ShieldCheck size={16} strokeWidth={2} />}
            title={isTr ? 'KVKK & rıza' : 'KVKK & consent'}
            badge={<Badge kind="ok">{isTr ? 'Tam' : 'OK'}</Badge>}
            href="#legal"
          />
          <SettingsRow
            icon={<Book size={16} strokeWidth={2} />}
            title={isTr ? 'Aydınlatma metni' : 'Privacy disclosure'}
            value="v2.0"
            href="#legal"
            isLast
          />
        </SettingsGroup>

        <SettingsGroup label={isTr ? 'HESAP' : 'ACCOUNT'}>
          <SettingsRow
            icon={<CreditCard size={16} strokeWidth={2} />}
            title={isTr ? 'Plan & faturalandırma' : 'Plan & billing'}
            href="#billing"
          />
          <SettingsRow
            icon={<Bell size={16} strokeWidth={2} />}
            title={isTr ? 'Bildirimler' : 'Notifications'}
            href="#account"
            isLast
          />
        </SettingsGroup>
      </div>

      {/* Card 1 — İŞLETME PROFİLİ (1:1 design OwnerSettings Card 1) */}
      {businessData.id && (
        <form onSubmit={handleBusinessSubmit} className="space-y-3.5">
          <section id="business-profile" className="bz-card p-6 sm:p-7 scroll-mt-20">
            <Eyebrow>{isTr ? 'İŞLETME PROFİLİ' : 'BUSINESS PROFILE'}</Eyebrow>
            <div className="bz-h-tight mt-1 mb-5" style={{ fontSize: 18 }}>
              {isTr ? 'Genel bilgiler' : 'General info'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <label className="space-y-1.5 block">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'İŞLETME ADI' : 'BUSINESS NAME'}
                </span>
                <input
                  type="text"
                  required
                  value={businessData.name}
                  onChange={(e) => setBusinessData((p) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'SEKTÖR' : 'SECTOR'}
                </span>
                <select
                  value={(() => {
                    // Surface the canonical SECTOR label that matches the
                    // current category. Legacy values ('Mağaza', 'Güzellik
                    // salonu', 'Kafe') fuzzy-match to the right option for
                    // display without mutating state — original value is
                    // preserved in DB until the owner explicitly picks.
                    const exact = SECTORS.find((s) => s.label === businessData.category);
                    if (exact) return exact.label;
                    const detected = detectSector(businessData.category);
                    return SECTORS.find((s) => s.sectorKey === detected)?.label ?? SECTORS[0].label;
                  })()}
                  onChange={(e) => setBusinessData((p) => ({ ...p, category: e.target.value }))}
                  className={`${inputCls} cursor-pointer`}
                >
                  {SECTORS.map((sector) => (
                    <option key={sector.id} value={sector.label}>
                      {sector.display[isTr ? 'tr' : 'en']}
                    </option>
                  ))}
                </select>
                <span className="block text-[11px] text-[#A3A3A3]">
                  {isTr
                    ? 'Sektörünüz, yorum yönlendirmesinde gösterilecek platformları belirler.'
                    : 'Your sector decides which review platforms appear in the redirect.'}
                </span>
                <div aria-live="polite">
                  <span className="pulse-eyebrow block text-[#737373]">
                    {isTr ? 'Bu sektörde görünecek' : 'Visible in this sector'}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Array.from(getSectorPlatforms(businessData.category)).map((platform) => (
                      <PlatformChip key={platform} id={platform} size={20} withLabel />
                    ))}
                  </div>
                </div>
              </label>
              <label className="space-y-1.5 block">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'ADRES' : 'ADDRESS'}
                </span>
                <input
                  type="text"
                  value={businessData.address}
                  onChange={(e) => setBusinessData((p) => ({ ...p, address: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'TELEFON' : 'PHONE'}
                </span>
                <input
                  type="tel"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData((p) => ({ ...p, phone: e.target.value }))}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={savingBusiness}
                className="bz-btn-primary disabled:opacity-40"
              >
                {savingBusiness ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {isTr ? 'Kaydediliyor…' : 'Saving…'}
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2} />
                    {isTr ? 'İşletmeyi kaydet' : 'Save business'}
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Card 2 — HESAP (existing user identity + password change) */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <section id="account" className="bz-card p-6 sm:p-7 scroll-mt-20">
          <Eyebrow>{isTr ? 'HESAP' : 'ACCOUNT'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-5" style={{ fontSize: 18 }}>
            {isTr ? 'Kullanıcı kimliği' : 'User identity'}
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

      {/* Card 2 — Marka kimliği. Edit surface for logo / favicon / 3 colors /
          accent font / slogan. Backed by /api/settings/brand (BrandSettings
          model + Restaurant.menuLogoUrl/menuAccentColor mirror). Owner can
          only edit their first restaurant here; multi-location operators
          manage per-location brands on the restaurant detail page (link
          above). Saving is gated by IDOR (canAccessRestaurant). */}
      {businessData.id ? (
        <BrandIdentityCard
          restaurantId={businessData.id}
          restaurantName={businessData.name}
          isTr={isTr}
        />
      ) : (
        <section id="brand" className="bz-card p-6 sm:p-7 scroll-mt-20">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={14} strokeWidth={2} className="text-[#0A0A0A]" />
            <Eyebrow>{isTr ? 'MARKA KİMLİĞİ' : 'BRAND IDENTITY'}</Eyebrow>
          </div>
          <div className="bz-h-tight mt-1 mb-3" style={{ fontSize: 18 }}>
            {isTr ? 'Marka kimliği' : 'Brand identity'}
          </div>
          <p className="text-[13px] text-[#737373] leading-[1.55]">
            {isTr
              ? 'Marka kimliğini düzenlemek için önce bir işletme oluştur.'
              : 'Create a business first to edit your brand identity.'}
          </p>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="bz-btn-ghost mt-3 inline-flex"
          >
            <Upload size={14} strokeWidth={2} />
            {isTr ? 'İşletme oluştur' : 'Create business'}
          </Link>
        </section>
      )}

      {/* Card 3 — Faturalandırma (Faz 2). Read-only mirror of admin-managed
          subscription state. Sources: /api/billing/summary + /invoices.
          Edit CTAs disabled with banner; Iyzico provider wiring deferred. */}
      <BillingReadOnlyCard isTr={isTr} />

      {/* Card 4 — KVKK & Rıza Yönetimi (1:1 design). Read-only display of
          the active legal posture. Pulse mail templates render these
          documents per locale; admins manage versions via /admin/mail-templates. */}
      <section id="legal" className="bz-card p-6 sm:p-7 scroll-mt-20">
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

/* ───── Mobile-only settings helpers (1:1 design's MOwnerSettings) ───── */

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="bz-card mt-2 overflow-hidden p-0">{children}</div>
    </div>
  );
}

function SettingsRow({
  icon,
  title,
  value,
  badge,
  href,
  isLast,
}: {
  icon: ReactNode;
  title: string;
  value?: string;
  badge?: ReactNode;
  href: string;
  isLast?: boolean;
}) {
  // Anchor links keep mobile users in-page; deep links route to other panel pages.
  const isAnchor = href.startsWith('#');
  const Component: React.ElementType = isAnchor ? 'a' : Link;
  const linkProps = isAnchor ? { href } : { href };

  return (
    <Component
      {...linkProps}
      className={`flex items-center gap-3 px-4 py-3.5 active:bg-[#FAFAFA] transition-colors ${
        isLast ? '' : 'border-b border-[#F5F5F5]'
      }`}
    >
      <div
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[#525252]"
        style={{ background: '#FAFAFA' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[#0A0A0A] truncate">{title}</div>
      </div>
      {badge}
      {value && (
        <div className="text-[12px] text-[#737373] whitespace-nowrap">{value}</div>
      )}
      <ChevronRight size={14} className="shrink-0 text-[#A3A3A3]" strokeWidth={2} />
    </Component>
  );
}
