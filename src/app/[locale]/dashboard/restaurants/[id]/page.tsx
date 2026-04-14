'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Mail, Save, Trash2 } from 'lucide-react';

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
    notificationEmail: '',
    primaryColor: '#1a73e8',
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
          notificationEmail: data.notificationEmail || '',
          primaryColor: data.primaryColor || '#1a73e8',
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

  const handleDelete = async () => {
    if (!confirm(locale === 'tr' ? 'Bu işletme pasife alınacak. Devam edilsin mi?' : 'This location will be deactivated. Continue?')) {
      return;
    }

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
        <Loader2 className="h-10 w-10 animate-spin text-[#111827]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/dashboard/restaurants`} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#111827]">{formData.name || (locale === 'tr' ? 'İşletme' : 'Location')}</h1>
          <p className="text-sm font-bold text-[#6b6760]">/{formData.slug}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">{success}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-6 w-2 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
            <h2 className="text-lg font-black text-[#111827]">{locale === 'tr' ? 'Temel Bilgiler' : 'Basics'}</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'İşletme Adı' : 'Location Name'}</span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              />
            </label>

            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">URL Slug</span>
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4">
                <span className="shrink-0 text-xs font-black text-[#6b6760]">buaze.com/r/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="w-full bg-transparent py-4 text-sm font-bold text-[#111827] outline-none"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'Kategori' : 'Category'}</span>
              <input
                type="text"
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              />
            </label>

            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'Tema Rengi' : 'Theme Color'}</span>
              <div className="flex h-[56px] items-center gap-3 rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(event) => setFormData((prev) => ({ ...prev, primaryColor: event.target.value }))}
                  className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent"
                />
                <span className="text-sm font-black text-[#111827]">{formData.primaryColor}</span>
              </div>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'Adres' : 'Address'}</span>
              <input
                type="text"
                value={formData.address}
                onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              />
            </label>

            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'Telefon' : 'Phone'}</span>
              <input
                type="text"
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              />
            </label>

            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'Durum' : 'Status'}</span>
              <select
                value={formData.isActive ? '1' : '0'}
                onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.value === '1' }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              >
                <option value="1">{locale === 'tr' ? 'Aktif' : 'Active'}</option>
                <option value="0">{locale === 'tr' ? 'Pasif' : 'Inactive'}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Mail size={18} strokeWidth={2.75} className="text-[#111827]" />
            <h2 className="text-lg font-black text-[#111827]">{locale === 'tr' ? 'Bildirim ve Google Ayarları' : 'Notifications & Google'}</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{locale === 'tr' ? 'Bildirim E-postası' : 'Notification Email'}</span>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(event) => setFormData((prev) => ({ ...prev, notificationEmail: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              />
            </label>

            <label className="space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">Google Place ID / Link</span>
              <input
                type="text"
                value={formData.googlePlaceId}
                onChange={(event) => setFormData((prev) => ({ ...prev, googlePlaceId: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-600 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 size={18} strokeWidth={2.75} />}
            {locale === 'tr' ? 'Pasife Al' : 'Deactivate'}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/r/${formData.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-[#111827]"
            >
              <ExternalLink size={18} strokeWidth={2.75} />
              {locale === 'tr' ? 'Önizle' : 'Preview'}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save size={18} strokeWidth={2.75} />}
              {locale === 'tr' ? 'Kaydet' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
