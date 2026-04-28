'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, ConfirmDialog, PageHeader } from '@/components/ui';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';
import PlatformLogo from '@/components/marketing/PlatformLogo';

export default function DashboardRestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
        if (!response.ok) return;

        const data = await response.json();
        setFormData({
          name: data.name || '',
          slug: data.slug || '',
          category: data.category || 'Restoran',
          address: data.address || '',
          phone: data.phone || '',
          googlePlaceId: data.googlePlaceId || '',
          getirYemekUrl: data.getirYemekUrl || '',
          yemekSepetiUrl: data.yemekSepetiUrl || '',
          trendyolYemekUrl: data.trendyolYemekUrl || '',
          notificationEmail: data.notificationEmail || '',
          primaryColor: data.primaryColor || '#C6F24E',
          isActive: data.isActive ?? true,
        });
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Kaydetme işlemi başarısız.');
        return;
      }

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

  const handleDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      const response = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError(locale === 'tr' ? 'Pasife alma başarısız.' : 'Failed to deactivate.');
        return;
      }

      router.push(`/${locale}/dashboard/restaurants`);
    } catch (deleteError) {
      console.error(deleteError);
      setError(locale === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

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
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${formData.slug}`}
            />
          </span>
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
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-5 py-2.5 text-[13px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-60 transition-colors"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={14} strokeWidth={2} />}
            {locale === 'tr' ? 'Pasife al' : 'Deactivate'}
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
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
