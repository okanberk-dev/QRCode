'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bell, Building2, ExternalLink, Layers, Loader2, Power, PowerOff, Save, Settings as SettingsIcon } from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, Badge, ConfirmDialog, PageHeader, PlatformChip, Tabs, type TabItem } from '@/components/ui';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';
import PlatformLogo from '@/components/marketing/PlatformLogo';
import { detectSector, getSectorPlatforms } from '@/lib/sector-platforms';
import { SECTORS } from '@/lib/sectors';

type SettingsTab = 'general' | 'platforms' | 'notifications';

const VALID_TABS: SettingsTab[] = ['general', 'platforms', 'notifications'];

export default function DashboardRestaurantDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const id = params.id as string;
  // Deep-link target — the platforms page passes `?focus=<platformId>` so
  // the owner lands directly on the input they came to fill in.
  const focusField = searchParams.get('focus');
  // URL-synced tab. `?tab=general|platforms|notifications` — bookmarkable +
  // notification deep-link friendly. Focus deep-link auto-snaps to the
  // platforms tab when the matching field lives there.
  const initialTab = ((): SettingsTab => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl && (VALID_TABS as string[]).includes(fromUrl)) return fromUrl as SettingsTab;
    if (focusField) {
      // Notification email focus → notifications tab; everything else is a
      // platform URL → platforms tab.
      return focusField === 'notification-email' ? 'notifications' : 'platforms';
    }
    return 'general';
  })();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const handleTabChange = (next: string) => {
    if (!(VALID_TABS as string[]).includes(next)) return;
    setActiveTab(next as SettingsTab);
    // URL replace (not push) — back button shouldn't bounce through tabs.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', next);
      window.history.replaceState({}, '', url.toString());
    }
  };
  const [meta, setMeta] = useState<{
    createdAt?: string;
    updatedAt?: string;
    feedbacks: number;
    menuItems: number;
    qrGenerations: number;
  }>({ feedbacks: 0, menuItems: 0, qrGenerations: 0 });
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'Restoran',
    address: '',
    phone: '',
    googlePlaceId: '',
    getirYemekUrl: '',
    yemekSepetiUrl: '',
    trendyolYemekUrl: '',
    tripAdvisorUrl: '',
    airbnbUrl: '',
    notificationEmail: '',
    primaryColor: '#C6F24E',
    isActive: true,
  });

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await fetch(`/api/restaurants/${id}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || (locale === 'tr' ? 'İşletme bilgisi alınamadı.' : 'Location could not be loaded.'));
          return;
        }

        const data = await response.json();
        setFormData({
          name: data.name || '',
          slug: data.slug || '',
          category: data.category || 'Restoran',
          address: data.address || '',
          phone: data.phone || '',
          googlePlaceId: data.googlePlaceId || data.googleReviewUrl || '',
          getirYemekUrl: data.getirYemekUrl || '',
          yemekSepetiUrl: data.yemekSepetiUrl || '',
          trendyolYemekUrl: data.trendyolYemekUrl || '',
          tripAdvisorUrl: data.tripAdvisorUrl || '',
          airbnbUrl: data.airbnbUrl || '',
          notificationEmail: data.notificationEmail || '',
          primaryColor: data.primaryColor || '#C6F24E',
          isActive: data.isActive ?? true,
        });
        setMeta({
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          feedbacks: data._count?.feedbacks ?? 0,
          menuItems: data._count?.menuItems ?? 0,
          qrGenerations: data._count?.qrGenerations ?? 0,
        });
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, locale]);

  // Deep-link from `/dashboard/platforms` cards — scroll the matching
  // platform input into view and focus it once the form has hydrated.
  // `prefers-reduced-motion: reduce` (globals.css blanket) automatically
  // downgrades smooth scroll to instant — a11y-clean.
  useEffect(() => {
    if (loading || !focusField) return;
    const wrapper = document.getElementById(`platform-${focusField}`);
    if (!wrapper) return;
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Defer focus until the smooth scroll settles — calling focus() mid-
    // animation cancels the scroll on some browsers.
    const handle = window.setTimeout(() => {
      wrapper.querySelector('input')?.focus();
    }, 350);
    return () => window.clearTimeout(handle);
  }, [loading, focusField]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          googleReviewUrl: formData.googlePlaceId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Kaydetme işlemi başarısız.');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        slug: data.slug || prev.slug,
        category: data.category || prev.category,
        address: data.address || '',
        phone: data.phone || '',
        googlePlaceId: data.googlePlaceId || data.googleReviewUrl || '',
        getirYemekUrl: data.getirYemekUrl || '',
        yemekSepetiUrl: data.yemekSepetiUrl || '',
        trendyolYemekUrl: data.trendyolYemekUrl || '',
        tripAdvisorUrl: data.tripAdvisorUrl || '',
        airbnbUrl: data.airbnbUrl || '',
        notificationEmail: data.notificationEmail || '',
        primaryColor: data.primaryColor || prev.primaryColor,
        isActive: data.isActive ?? prev.isActive,
      }));
      setSuccess(locale === 'tr' ? 'İşletme güncellendi.' : 'Location updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (saveError) {
      console.error(saveError);
      setError(locale === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error.');
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateStatus = async (nextActive: boolean) => {
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || (locale === 'tr' ? 'Durum güncellenemedi.' : 'Status could not be updated.'));
        return;
      }

      setFormData((prev) => ({ ...prev, isActive: nextActive }));
      setSuccess(
        nextActive
          ? locale === 'tr' ? 'İşletme tekrar aktifleştirildi.' : 'Location reactivated.'
          : locale === 'tr' ? 'İşletme devre dışı bırakıldı.' : 'Location disabled.',
      );
      setTimeout(() => setSuccess(''), 2500);
    } catch (deleteError) {
      console.error(deleteError);
      setError(locale === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async () => {
    setConfirmDelete(false);
    await updateStatus(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${formData.slug}`;
  // Sector → platform whitelist. Hides input groups that don't make sense for
  // the owner's vertical. Live-recomputed on every render so changing the
  // category dropdown immediately reflects in the form. Hidden inputs keep
  // their value in state — refresh-after-toggle restores them.
  const allowedPlatforms = getSectorPlatforms(formData.category);

  const tabItems: TabItem[] = [
    {
      id: 'general',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <SettingsIcon size={13} strokeWidth={2} />
          {locale === 'tr' ? 'Genel' : 'General'}
        </span>
      ),
    },
    {
      id: 'platforms',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Layers size={13} strokeWidth={2} />
          {locale === 'tr' ? 'Platformlar' : 'Platforms'}
        </span>
      ),
    },
    {
      id: 'notifications',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Bell size={13} strokeWidth={2} />
          {locale === 'tr' ? 'Bildirimler' : 'Notifications'}
        </span>
      ),
    },
  ];

  const integrationRows = [
    {
      id: 'google' as const,
      label: 'Google',
      value: formData.googlePlaceId,
      logo: <PlatformLogo id="google" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="google" />,
    },
    {
      id: 'getir' as const,
      label: 'Getir',
      value: formData.getirYemekUrl,
      logo: <PlatformLogo id="getir-yemek" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="getir" />,
    },
    {
      id: 'yemeksepeti' as const,
      label: 'Yemeksepeti',
      value: formData.yemekSepetiUrl,
      logo: <PlatformLogo id="yemeksepeti" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="yemeksepeti" />,
    },
    {
      id: 'trendyol' as const,
      label: 'Trendyol GO',
      value: formData.trendyolYemekUrl,
      logo: <PlatformLogo id="trendyol-go" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="trendyol" />,
    },
    {
      id: 'tripadvisor' as const,
      label: 'Tripadvisor',
      value: formData.tripAdvisorUrl,
      logo: <PlatformLogo id="tripadvisor" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="tripadvisor" />,
    },
    {
      id: 'airbnb' as const,
      label: 'Airbnb',
      value: formData.airbnbUrl,
      logo: <PlatformLogo id="airbnb" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="airbnb" />,
    },
  ].filter((row) => allowedPlatforms.has(row.id));

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href={`/${locale}/dashboard/restaurants`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        {locale === 'tr' ? 'Konumlara dön' : 'Back to locations'}
      </Link>
      <PageHeader
        eyebrow={locale === 'tr' ? 'KONUM DETAYI' : 'LOCATION DETAIL'}
        title={formData.name || (locale === 'tr' ? 'İşletme' : 'Location')}
        description={
          <span className="inline-flex items-center gap-1.5">
            <span className="bz-mono" style={{ fontSize: 12 }}>/{formData.slug}</span>
            <CopyUrlButton
              url={publicUrl}
            />
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge kind={formData.isActive ? 'ok' : 'danger'}>
              {formData.isActive
                ? locale === 'tr' ? 'Aktif' : 'Active'
                : locale === 'tr' ? 'Devre dışı' : 'Disabled'}
            </Badge>
            {/* Faz 1 — yeni Business Settings hub'ına geçiş. Eski 3 tab burada
                kalır (Faz 4'te basitleşir); link kullanıcıyı keşfettirir. */}
            <Link
              href={`/${locale}/dashboard/restaurants/${id}/settings`}
              className="bz-btn-ghost inline-flex items-center gap-1.5"
            >
              <SettingsIcon size={14} strokeWidth={2} />
              {locale === 'tr' ? 'Ayarlar' : 'Settings'}
            </Link>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (formData.isActive) {
                  setConfirmDelete(true);
                } else {
                  updateStatus(true);
                }
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                formData.isActive
                  ? 'border border-[#FECACA] bg-white text-[#991B1B] hover:bg-[#FEF2F2]'
                  : 'border border-[#C6F24E] bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
              }`}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : formData.isActive ? (
                <PowerOff size={14} strokeWidth={2} />
              ) : (
                <Power size={14} strokeWidth={2} />
              )}
              {formData.isActive
                ? locale === 'tr' ? 'Devre dışı bırak' : 'Disable'
                : locale === 'tr' ? 'Aktifleştir' : 'Reactivate'}
            </button>
          </div>
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

      {/* Compact summary strip — collapses the legacy 2-card hero (Status +
          Integrations preview) into a single full-width card. The Integrations
          preview was a read-only mirror of the Platforms tab content; removed
          to dedupe. Connection count badge surfaces the same "X/Y" signal
          in one glance. */}
      <section className="bz-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <Building2 size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'DURUM ÖZETİ' : 'STATUS SUMMARY'}</p>
              <h2 className="mt-1 text-[17px] font-medium tracking-[-0.015em] text-[#0A0A0A] bz-h-tight">
                {formData.isActive
                  ? locale === 'tr' ? 'Müşteri akışı açık' : 'Customer flow is live'
                  : locale === 'tr' ? 'Müşteri akışı kapalı' : 'Customer flow is disabled'}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">
                {formData.isActive
                  ? locale === 'tr' ? 'QR sayfası ve yönlendirme akışları kullanılabilir.' : 'QR page and redirect flows are available.'
                  : locale === 'tr' ? 'QR sayfası aktif müşterilere kapalıdır; tekrar aktifleştirilebilir.' : 'QR page is closed to customers; it can be reactivated.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <Badge kind={integrationRows.some((row) => row.value.trim()) ? 'ok' : 'off'}>
              {locale === 'tr' ? 'Platform' : 'Platforms'}{' '}
              {integrationRows.filter((row) => row.value.trim()).length}/{integrationRows.length}
            </Badge>
            <button
              type="button"
              onClick={() => handleTabChange('platforms')}
              className="text-[12px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#A8D62E]"
            >
              {locale === 'tr' ? 'Yönet →' : 'Manage →'}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniMetric label={locale === 'tr' ? 'Yorum' : 'Reviews'} value={String(meta.feedbacks)} />
          <MiniMetric label={locale === 'tr' ? 'Menü' : 'Menu'} value={String(meta.menuItems)} />
          <MiniMetric label="QR" value={String(meta.qrGenerations)} />
        </div>
      </section>

      <Tabs
        items={tabItems}
        active={activeTab}
        onChange={handleTabChange}
        ariaLabel={locale === 'tr' ? 'İşletme ayarları' : 'Location settings'}
        className="!mt-2"
      />

      <form onSubmit={handleSave} className="space-y-6 pb-24 sm:pb-20">
        {activeTab === 'general' && (
        <div className="bz-card p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-5 w-1.5 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
            <h2
              className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
            >
              {locale === 'tr' ? 'Temel Bilgiler' : 'Basics'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'İşletme Adı' : 'Location Name'}</span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="bz-input"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">URL Slug</span>
              <div className="flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-3 sm:px-4 focus-within:border-[#0A0A0A] transition-colors">
                <span className="pulse-eyebrow shrink-0 text-[#737373] truncate">buaze.com/r/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="w-full bg-transparent py-3 text-[14px] text-[#0A0A0A] outline-none min-w-0"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Sektör' : 'Sector'}</span>
              <select
                value={(() => {
                  // Surface the canonical SECTOR label that matches the current
                  // (possibly free-form / legacy) category. Keeps the dropdown
                  // visually consistent without mutating state — original value
                  // persists until owner explicitly picks a different sector.
                  const exact = SECTORS.find((s) => s.label === formData.category);
                  if (exact) return exact.label;
                  const detected = detectSector(formData.category);
                  return SECTORS.find((s) => s.sectorKey === detected)?.label ?? SECTORS[0].label;
                })()}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className="bz-input"
              >
                {SECTORS.map((sector) => (
                  <option key={sector.id} value={sector.label}>
                    {sector.display[locale === 'tr' ? 'tr' : 'en']}
                  </option>
                ))}
              </select>
              <span className="block text-[11px] leading-relaxed text-[#737373]">
                {locale === 'tr'
                  ? 'Sektörünüz, yorum yönlendirmesinde gösterilecek platformları belirler.'
                  : 'Your sector decides which review platforms appear in the redirect.'}
              </span>
              <div aria-live="polite" className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5">
                <span className="pulse-eyebrow block text-[#737373]">
                  {locale === 'tr' ? 'Bu sektörde görünecek' : 'Visible in this sector'}
                </span>
                <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1.5">
                  {Array.from(allowedPlatforms).map((platform) => (
                    <PlatformChip key={platform} id={platform} size={18} withLabel />
                  ))}
                </div>
              </div>
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Tema Rengi' : 'Theme Color'}</span>
              <div className="flex h-[48px] items-center gap-3 rounded-xl border border-[#EDEDED] bg-white px-3 sm:px-4">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(event) => setFormData((prev) => ({ ...prev, primaryColor: event.target.value }))}
                  aria-label={locale === 'tr' ? 'Tema rengi seç' : 'Pick theme color'}
                  className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <span className="text-[13px] font-medium text-[#0A0A0A] font-mono truncate">{formData.primaryColor.toUpperCase()}</span>
              </div>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Adres' : 'Address'}</span>
              <input
                type="text"
                value={formData.address}
                onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                className="bz-input"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Telefon' : 'Phone'}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                className="bz-input"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Durum' : 'Status'}</span>
              <select
                value={formData.isActive ? '1' : '0'}
                onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.value === '1' }))}
                className="bz-input"
              >
                <option value="1">{locale === 'tr' ? 'Aktif' : 'Active'}</option>
                <option value="0">{locale === 'tr' ? 'Pasif' : 'Inactive'}</option>
              </select>
            </label>
          </div>
        </div>

        )}

        {activeTab === 'platforms' && (
        <div className="bz-card p-6 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <Layers size={16} strokeWidth={2} className="mt-0.5 text-[#0A0A0A]" />
            <div>
              <h2 className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight">
                {locale === 'tr' ? 'Platform Bağlantıları' : 'Platform Links'}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#737373]">
                {locale === 'tr'
                  ? 'Yüksek puan veren müşterilerin yönlendirileceği yorumların URL\'leri. Sektörünüze uygun platformlar burada görünür.'
                  : "URLs that high-rating customers are redirected to. Only platforms relevant to your sector appear here."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {allowedPlatforms.has('google') && (
              <label id="platform-google" className="space-y-2 sm:col-span-2 scroll-mt-24">
                <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <PlatformLogo id="google" size={16} rounded={4} />
                  Google Place ID / Link
                  <PlatformUrlHelp platform="google" />
                </span>
                <input
                  type="text"
                  inputMode="url"
                  value={formData.googlePlaceId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, googlePlaceId: event.target.value }))}
                  className="bz-input"
                />
              </label>
            )}

            {allowedPlatforms.has('getir') && (
              <label id="platform-getir" className="space-y-2 sm:col-span-2 scroll-mt-24">
                <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <PlatformLogo id="getir-yemek" size={16} rounded={4} />
                  Getir Yemek URL
                  <PlatformUrlHelp platform="getir" />
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={formData.getirYemekUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, getirYemekUrl: event.target.value }))}
                  placeholder="https://getir.com/yemek/..."
                  className="bz-input"
                />
              </label>
            )}

            {allowedPlatforms.has('yemeksepeti') && (
              <label id="platform-yemeksepeti" className="space-y-2 scroll-mt-24">
                <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <PlatformLogo id="yemeksepeti" size={16} rounded={4} />
                  Yemek Sepeti URL
                  <PlatformUrlHelp platform="yemeksepeti" />
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={formData.yemekSepetiUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, yemekSepetiUrl: event.target.value }))}
                  placeholder="https://www.yemeksepeti.com/..."
                  className="bz-input"
                />
              </label>
            )}

            {allowedPlatforms.has('trendyol') && (
              <label id="platform-trendyol" className="space-y-2 scroll-mt-24">
                <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <PlatformLogo id="trendyol-go" size={16} rounded={4} />
                  Trendyol Yemek URL
                  <PlatformUrlHelp platform="trendyol" />
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={formData.trendyolYemekUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, trendyolYemekUrl: event.target.value }))}
                  placeholder="https://www.trendyol.com/..."
                  className="bz-input"
                />
              </label>
            )}

            {allowedPlatforms.has('tripadvisor') && (
              <label id="platform-tripadvisor" className="space-y-2 scroll-mt-24">
                <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <PlatformLogo id="tripadvisor" size={16} rounded={4} />
                  Tripadvisor URL
                  <PlatformUrlHelp platform="tripadvisor" />
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={formData.tripAdvisorUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, tripAdvisorUrl: event.target.value }))}
                  placeholder="https://www.tripadvisor.com/..."
                  className="bz-input"
                />
              </label>
            )}

            {allowedPlatforms.has('airbnb') && (
              <label id="platform-airbnb" className="space-y-2 scroll-mt-24">
                <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <PlatformLogo id="airbnb" size={16} rounded={4} />
                  Airbnb URL
                  <PlatformUrlHelp platform="airbnb" />
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={formData.airbnbUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, airbnbUrl: event.target.value }))}
                  placeholder="https://www.airbnb.com/rooms/..."
                  className="bz-input"
                />
              </label>
            )}
          </div>
        </div>
        )}

        {activeTab === 'notifications' && (
        <div className="bz-card p-6 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <Bell size={16} strokeWidth={2} className="mt-0.5 text-[#0A0A0A]" />
            <div>
              <h2 className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight">
                {locale === 'tr' ? 'Bildirimler' : 'Notifications'}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#737373]">
                {locale === 'tr'
                  ? 'Düşük puanlı yorumlar, müşteri yanıtları ve haftalık özetlerin gönderileceği e-posta adresi.'
                  : 'Email address for low-rating alerts, customer replies and weekly digests.'}
              </p>
            </div>
          </div>

          <label id="platform-notification-email" className="block max-w-[420px] space-y-2 scroll-mt-24">
            <span className="pulse-eyebrow text-[#737373]">
              {locale === 'tr' ? 'Bildirim E-postası' : 'Notification Email'}
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={formData.notificationEmail}
              onChange={(event) => setFormData((prev) => ({ ...prev, notificationEmail: event.target.value }))}
              placeholder="ornek@isletme.com"
              className="bz-input"
            />
            <span className="block text-[11px] leading-relaxed text-[#737373]">
              {locale === 'tr'
                ? 'Boş bırakılırsa hesabın varsayılan e-postası kullanılır.'
                : 'Defaults to the account email if left empty.'}
            </span>
          </label>

          <div className="mt-6 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-3">
            <p className="text-[12px] leading-relaxed text-[#525252]">
              {locale === 'tr' ? (
                <>
                  Daha ayrıntılı bildirim tercihleri için{' '}
                  <Link href={`/${locale}/dashboard/notifications`} className="font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#A8D62E]">
                    Bildirim Ayarları
                  </Link>{' '}
                  sayfasına gidebilirsin.
                </>
              ) : (
                <>
                  For more detailed notification preferences, visit the{' '}
                  <Link href={`/${locale}/dashboard/notifications`} className="font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#A8D62E]">
                    Notification Settings
                  </Link>{' '}
                  page.
                </>
              )}
            </p>
          </div>
        </div>
        )}

        {/* Sticky save bar — replaces the legacy bottom action row. The
            "Pasife al" button used to be duplicated here and in PageHeader
            actions; it now lives only in PageHeader (one canonical action). */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EDEDED] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-7 py-3">
            <span className="hidden text-[12px] text-[#737373] sm:inline">
              {locale === 'tr'
                ? 'Değişiklikler sadece kaydet sonrasında uygulanır.'
                : 'Changes apply only after save.'}
            </span>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              <Link
                href={`/r/${formData.slug}`}
                target="_blank"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors sm:flex-none"
              >
                <ExternalLink size={14} strokeWidth={2} />
                {locale === 'tr' ? 'Önizle' : 'Preview'}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-60 transition-colors sm:flex-none"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} strokeWidth={2} />}
                {locale === 'tr' ? 'Kaydet' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title={locale === 'tr' ? 'İşletmeyi pasife al?' : 'Deactivate location?'}
        body={
          locale === 'tr'
            ? 'Bu işletme pasife alınacak. Müşteriler artık QR\'ı tarayamaz; istediğin zaman tekrar aktifleştirebilirsin.'
            : 'This location will be deactivated. Customers can no longer scan its QR; you can reactivate any time.'
        }
        confirmLabel={locale === 'tr' ? 'Pasife al' : 'Deactivate'}
        cancelLabel={locale === 'tr' ? 'İptal' : 'Cancel'}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
      <p className="pulse-eyebrow text-[#737373]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">{value}</p>
    </div>
  );
}
