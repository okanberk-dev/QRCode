'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Mail, Save, Trash2, SlidersHorizontal } from 'lucide-react';
import {
  DEFAULT_FORM_CONFIG,
  FORM_FIELD_KEYS,
  resolveFormConfig,
  type FormFieldKey,
} from '@/lib/form-config';

type FieldRow = { enabled: boolean; required: boolean };
type FormConfigState = Record<FormFieldKey, FieldRow>;

const FIELD_LABELS: Record<FormFieldKey, { tr: string; en: string; hint?: { tr: string; en: string } }> = {
  comment:     { tr: 'Yorum', en: 'Comment', hint: { tr: 'Serbest metin alanı (her zaman görünür)', en: 'Free-text field (always shown)' } },
  name:        { tr: 'İsim', en: 'Name' },
  email:       { tr: 'E-posta', en: 'Email' },
  phone:       { tr: 'Telefon', en: 'Phone' },
  serviceType: { tr: 'Servis Tipi', en: 'Service Type', hint: { tr: 'Salon / Paket / Kurye', en: 'Dine-in / Takeaway / Delivery' } },
  aspects:     { tr: 'Detaylı Puanlar', en: 'Aspect Ratings', hint: { tr: 'Yemek • Servis • Atmosfer', en: 'Food • Service • Atmosphere' } },
  marketing:   { tr: 'Pazarlama Onayı', en: 'Marketing Consent', hint: { tr: 'Ticari elektronik ileti onayı', en: 'Marketing email opt-in' } },
};

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

  const [fieldConfig, setFieldConfig] = useState<FormConfigState>(() => ({ ...DEFAULT_FORM_CONFIG }));

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
        setFieldConfig(resolveFormConfig(data.formConfig ?? null));
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
        body: JSON.stringify({ ...formData, formConfig: fieldConfig }),
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

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-2 flex items-center gap-3">
            <SlidersHorizontal size={18} strokeWidth={2.75} className="text-[#111827]" />
            <h2 className="text-lg font-black text-[#111827]">
              {locale === 'tr' ? 'Geri Bildirim Formu Alanları' : 'Feedback Form Fields'}
            </h2>
          </div>
          <p className="mb-6 text-xs font-bold text-[#6b6760]">
            {locale === 'tr'
              ? 'Müşteri formunuzda hangi alanların görüneceğini ve zorunlu olacağını seçin.'
              : 'Choose which fields appear on your customer form and whether they are required.'}
          </p>

          <div className="space-y-3">
            {FORM_FIELD_KEYS.map((key) => {
              const row = fieldConfig[key];
              const labels = FIELD_LABELS[key];
              const label = locale === 'tr' ? labels.tr : labels.en;
              const hint = labels.hint ? (locale === 'tr' ? labels.hint.tr : labels.hint.en) : null;
              const isCommentRow = key === 'comment';

              return (
                <div
                  key={key}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#FCFBF7] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-black text-[#111827]">{label}</div>
                    {hint && <div className="text-[11px] font-bold text-[#6b6760]">{hint}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isCommentRow}
                      onClick={() =>
                        setFieldConfig((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], enabled: !prev[key].enabled },
                        }))
                      }
                      className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                        row.enabled
                          ? 'bg-[#111827] text-white'
                          : 'border border-gray-200 bg-white text-[#6b6760]'
                      } ${isCommentRow ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {row.enabled
                        ? locale === 'tr' ? 'Açık' : 'On'
                        : locale === 'tr' ? 'Kapalı' : 'Off'}
                    </button>
                    <button
                      type="button"
                      disabled={!row.enabled}
                      onClick={() =>
                        setFieldConfig((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], required: !prev[key].required },
                        }))
                      }
                      className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                        row.required && row.enabled
                          ? 'bg-red-500 text-white'
                          : 'border border-gray-200 bg-white text-[#6b6760]'
                      } ${!row.enabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {locale === 'tr' ? 'Zorunlu' : 'Required'}
                    </button>
                  </div>
                </div>
              );
            })}
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
