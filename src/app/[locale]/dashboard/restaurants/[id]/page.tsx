'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, ExternalLink, Loader2, Power, PowerOff, Save } from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, Badge, ConfirmDialog, PageHeader } from '@/components/ui';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';
import PlatformLogo from '@/components/marketing/PlatformLogo';

export default function DashboardRestaurantDetailPage() {
  const params = useParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const missing = locale === 'tr' ? 'Belirtilmemiş' : 'Not specified';
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${formData.slug}`;
  const integrationRows = [
    {
      id: 'google',
      label: 'Google',
      value: formData.googlePlaceId,
      logo: <PlatformLogo id="google" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="google" />,
    },
    {
      id: 'getir',
      label: 'Getir',
      value: formData.getirYemekUrl,
      logo: <PlatformLogo id="getir-yemek" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="getir" />,
    },
    {
      id: 'yemeksepeti',
      label: 'Yemeksepeti',
      value: formData.yemekSepetiUrl,
      logo: <PlatformLogo id="yemeksepeti" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="yemeksepeti" />,
    },
    {
      id: 'trendyol',
      label: 'Trendyol GO',
      value: formData.trendyolYemekUrl,
      logo: <PlatformLogo id="trendyol-go" size={18} rounded={5} />,
      help: <PlatformUrlHelp platform="trendyol" />,
    },
  ];

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

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bz-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
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
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniMetric label={locale === 'tr' ? 'Yorum' : 'Reviews'} value={String(meta.feedbacks)} />
            <MiniMetric label={locale === 'tr' ? 'Menü' : 'Menu'} value={String(meta.menuItems)} />
            <MiniMetric label="QR" value={String(meta.qrGenerations)} />
          </div>
        </section>

        <section className="bz-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'ENTEGRASYONLAR' : 'INTEGRATIONS'}</p>
              <h2 className="mt-1 text-[17px] font-medium tracking-[-0.015em] text-[#0A0A0A] bz-h-tight">
                {locale === 'tr' ? 'Platform bağlantıları' : 'Platform links'}
              </h2>
            </div>
            <Badge kind={integrationRows.some((row) => row.value.trim()) ? 'ok' : 'off'}>
              {integrationRows.filter((row) => row.value.trim()).length}/4
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {integrationRows.map((row) => {
              const value = row.value.trim();
              return (
                <div key={row.id} className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {row.logo}
                      <span className="truncate text-[13px] font-medium text-[#0A0A0A]">{row.label}</span>
                    </div>
                    <Badge kind={value ? 'ok' : 'off'}>{value ? 'Bağlı' : 'Boş'}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#525252]">
                      {value || missing}
                    </p>
                    {value && (
                      <a
                        href={value.startsWith('http') ? value : undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#0A0A0A] ${value.startsWith('http') ? 'hover:border-[#0A0A0A]' : 'pointer-events-none opacity-40'}`}
                        aria-label={`${row.label} ${locale === 'tr' ? 'bağlantısını aç' : 'open link'}`}
                      >
                        <ExternalLink size={12} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
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
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">URL Slug</span>
              <div className="flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 focus-within:border-[#C6F24E] transition-colors">
                <span className="pulse-eyebrow shrink-0 text-[#737373]">buaze.com/r/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="w-full bg-transparent py-3 text-[14px] text-[#0A0A0A] outline-none"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Kategori' : 'Category'}</span>
              <input
                type="text"
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Tema Rengi' : 'Theme Color'}</span>
              <div className="flex h-[48px] items-center gap-3 rounded-xl border border-[#EDEDED] bg-white px-4">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(event) => setFormData((prev) => ({ ...prev, primaryColor: event.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <span className="text-[13px] font-medium text-[#0A0A0A] font-mono">{formData.primaryColor}</span>
              </div>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Adres' : 'Address'}</span>
              <input
                type="text"
                value={formData.address}
                onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Telefon' : 'Phone'}</span>
              <input
                type="text"
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Durum' : 'Status'}</span>
              <select
                value={formData.isActive ? '1' : '0'}
                onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.value === '1' }))}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              >
                <option value="1">{locale === 'tr' ? 'Aktif' : 'Active'}</option>
                <option value="0">{locale === 'tr' ? 'Pasif' : 'Inactive'}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="bz-card p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <ExternalLink size={16} strokeWidth={2} className="text-[#0A0A0A]" />
            <h2
              className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
            >
              {locale === 'tr' ? 'Harici Bağlantılar ve Bildirimler' : 'External Links & Notifications'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'Bildirim E-postası' : 'Notification Email'}</span>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(event) => setFormData((prev) => ({ ...prev, notificationEmail: event.target.value }))}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                <PlatformLogo id="google" size={16} rounded={4} />
                Google Place ID / Link
                <PlatformUrlHelp platform="google" />
              </span>
              <input
                type="text"
                value={formData.googlePlaceId}
                onChange={(event) => setFormData((prev) => ({ ...prev, googlePlaceId: event.target.value }))}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                <PlatformLogo id="getir-yemek" size={16} rounded={4} />
                Getir Yemek URL
                <PlatformUrlHelp platform="getir" />
              </span>
              <input
                type="url"
                value={formData.getirYemekUrl}
                onChange={(event) => setFormData((prev) => ({ ...prev, getirYemekUrl: event.target.value }))}
                placeholder="https://getir.com/yemek/..."
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#5D3EBD]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                <PlatformLogo id="yemeksepeti" size={16} rounded={4} />
                Yemek Sepeti URL
                <PlatformUrlHelp platform="yemeksepeti" />
              </span>
              <input
                type="url"
                value={formData.yemekSepetiUrl}
                onChange={(event) => setFormData((prev) => ({ ...prev, yemekSepetiUrl: event.target.value }))}
                placeholder="https://www.yemeksepeti.com/..."
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#FA0050]"
              />
            </label>

            <label className="space-y-2">
              <span className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                <PlatformLogo id="trendyol-go" size={16} rounded={4} />
                Trendyol Yemek URL
                <PlatformUrlHelp platform="trendyol" />
              </span>
              <input
                type="url"
                value={formData.trendyolYemekUrl}
                onChange={(event) => setFormData((prev) => ({ ...prev, trendyolYemekUrl: event.target.value }))}
                placeholder="https://www.trendyol.com/..."
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#F27A1A]"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              if (formData.isActive) {
                setConfirmDelete(true);
              } else {
                updateStatus(true);
              }
            }}
            disabled={deleting}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium disabled:opacity-60 transition-colors ${
              formData.isActive
                ? 'border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
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
              ? locale === 'tr' ? 'Pasife al' : 'Deactivate'
              : locale === 'tr' ? 'Aktifleştir' : 'Reactivate'}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/r/${formData.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
            >
              <ExternalLink size={14} strokeWidth={2} />
              {locale === 'tr' ? 'Önizle' : 'Preview'}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} strokeWidth={2} />}
              {locale === 'tr' ? 'Kaydet' : 'Save'}
            </button>
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
