'use client';

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, Trash2, ExternalLink, Mail, UtensilsCrossed, Eye, EyeOff, Building2, MapPin, Globe, AlertTriangle, CheckCircle2, QrCode, MessageSquare, Link2, Users } from 'lucide-react';
import Link from 'next/link';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';

interface Owner {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  isActive: boolean;
}

interface RestaurantMeta {
  createdAt: string;
  updatedAt: string;
  user: Owner | null;
  _count: {
    feedbacks: number;
    menuItems: number;
    qrGenerations: number;
    adminUsers: number;
  };
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
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
    userId: '',
  });
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [menuPublished, setMenuPublished] = useState(false);
  const [menuSaving, setMenuSaving] = useState<null | 'enabled' | 'published'>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [meta, setMeta] = useState<RestaurantMeta | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (res.status === 403 || res.status === 401) {
          router.push('/admin/restaurants');
          return;
        }
        if (res.status === 404) {
          setError('İşletme bulunamadı');
          setLoading(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
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
            userId: data.userId || '',
          });
          setMeta({
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            user: data.user || null,
            _count: {
              feedbacks: data._count?.feedbacks ?? 0,
              menuItems: data._count?.menuItems ?? 0,
              qrGenerations: data._count?.qrGenerations ?? 0,
              adminUsers: data._count?.adminUsers ?? 0,
            },
          });
          setMenuEnabled(data.menuEnabled ?? true);
          setMenuPublished(data.menuPublished ?? false);
        } else {
          setError('Bir hata oluştu');
        }
      } catch (e) {
        console.error(e);
        setError('Bağlantı hatası');
      }
      setLoading(false);
    };
    fetchRestaurant();
  }, [id, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/members');
        if (res.ok) {
          const data = await res.json();
          setOwners(Array.isArray(data) ? data : []);
        }
      } catch {
        // Only superadmin can list owners; scoped users simply don't see the selector.
      }
    })();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { userId, ...rest } = formData;
      const payload = owners.length > 0 ? formData : rest;
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Güncelleme başarısız');
        setSaving(false);
        return;
      }

      setSuccess('İşletme başarıyla güncellendi.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Bağlantı hatası');
    }
    setSaving(false);
  };

  const saveMenuSetting = async (patch: { menuEnabled?: boolean; menuPublished?: boolean }) => {
    setMenuSaving(patch.menuEnabled !== undefined ? 'enabled' : 'published');
    setError('');
    // Optimistic update — revert on error.
    const prevEnabled = menuEnabled;
    const prevPublished = menuPublished;
    if (patch.menuEnabled !== undefined) {
      setMenuEnabled(patch.menuEnabled);
      if (patch.menuEnabled === false) setMenuPublished(false);
    }
    if (patch.menuPublished !== undefined) setMenuPublished(patch.menuPublished);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}/menu-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
      setMenuEnabled(data.restaurant.menuEnabled);
      setMenuPublished(data.restaurant.menuPublished);
      setSuccess('Menü ayarı güncellendi');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setMenuEnabled(prevEnabled);
      setMenuPublished(prevPublished);
      setError((e as Error).message);
    }
    setMenuSaving(null);
  };

  const handleDelete = async () => {
    if (!confirm('DİKKAT: Bu işletme kalıcı olarak silinecek ve geri alınamayacaktır. QR, yorum, menü ve analitik verileri de silinir. Onaylıyor musunuz?')) return;
    setDeleting(true);
    try {
      await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
      router.push('/admin/restaurants');
    } catch (e) {
      setError('Silme başarısız');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-7 w-7 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  const menuStateLabel = !menuEnabled ? 'Menü kapalı' : menuPublished ? 'Menü yayında' : 'Menü taslak';
  const menuStateTone = !menuEnabled
    ? { dot: 'bg-[#A3A3A3]', text: 'text-[#737373]' }
    : menuPublished
    ? { dot: 'bg-emerald-500', text: 'text-emerald-700' }
    : { dot: 'bg-amber-500', text: 'text-amber-700' };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const feedbackUrl = `${origin}/r/${formData.slug}`;
  const menuUrl = `${origin}/menu/${formData.slug}`;
  const qrUrl = `${origin}/admin/qr?restaurant=${id}`;
  const ownerLabel = meta?.user?.name || meta?.user?.email || 'Sahip atanmamış';

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: formData.primaryColor }} aria-hidden />
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <Link
            href="/admin/restaurants"
            className="pulse-eyebrow inline-flex w-fit items-center gap-1.5 text-[#737373] transition-colors hover:text-[#0A0A0A]"
          >
            <ArrowLeft size={12} strokeWidth={2.25} />
            Tüm İşletmeler
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[22px] font-semibold text-white shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: formData.primaryColor }}
              >
                {(formData.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[24px] font-medium tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]">
                  {formData.name || 'İşletme Düzenle'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#737373]">
                  <span className={`inline-flex items-center gap-1.5 ${formData.isActive ? 'text-emerald-700' : 'text-[#737373]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${formData.isActive ? 'bg-emerald-500' : 'bg-[#A3A3A3]'}`} aria-hidden />
                    <span className="font-medium">{formData.isActive ? 'Aktif' : 'Pasif'}</span>
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[#EDEDED]" aria-hidden />
                  <span className={`inline-flex items-center gap-1.5 ${menuStateTone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${menuStateTone.dot}`} aria-hidden />
                    <span className="font-medium">{menuStateLabel}</span>
                  </span>
                  {formData.slug && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[#EDEDED]" aria-hidden />
                      <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>/r/{formData.slug}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/r/${formData.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <ExternalLink size={14} strokeWidth={2} />
                Önizle
              </Link>
              <Link
                href={`/admin/restaurants/${id}/menu`}
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <UtensilsCrossed size={14} strokeWidth={2} />
                Menü
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <Link2 size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="pulse-eyebrow text-[#737373]">Detay URL'leri</p>
              <h2 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Müşteri ve yönetim bağlantıları</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <UrlTile label="Geri Bildirim" url={feedbackUrl} href={`/r/${formData.slug}`} />
            <UrlTile label="Menü" url={menuUrl} href={`/menu/${formData.slug}`} />
            <UrlTile label="QR Yönetimi" url={qrUrl} href={`/admin/qr?restaurant=${id}`} />
          </div>
        </section>

        <section className="rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <p className="pulse-eyebrow text-[#737373]">İşletme özeti</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric icon={<MessageSquare size={15} />} label="Yorum" value={String(meta?._count.feedbacks ?? 0)} />
            <Metric icon={<QrCode size={15} />} label="QR" value={String(meta?._count.qrGenerations ?? 0)} />
            <Metric icon={<UtensilsCrossed size={15} />} label="Menü Ürünü" value={String(meta?._count.menuItems ?? 0)} />
            <Metric icon={<Users size={15} />} label="Yetkili" value={String(meta?._count.adminUsers ?? 0)} />
          </div>
          <div className="mt-4 rounded-2xl bg-[#FAFAFA] p-3">
            <p className="pulse-eyebrow text-[#737373]">İşletme Sahibi</p>
            <p className="mt-1 truncate text-[13px] font-medium text-[#0A0A0A]">{ownerLabel}</p>
            {meta?.user?.email && <p className="truncate text-[11px] text-[#737373]">{meta.user.email}</p>}
          </div>
        </section>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-[13px] leading-relaxed text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[13px] leading-relaxed text-emerald-700">{success}</p>
        </div>
      )}

      {/* Menu management — outside the main form so its toggles don't submit the whole thing */}
      <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#EDEDED] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <UtensilsCrossed size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">Menü Yönetimi</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Menü Erişimi & Yayını</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">
                Yetki kapalıyken yayın otomatik durdurulur ve müşteriler menüyü göremez.
              </p>
            </div>
          </div>
          <Link
            href={`/tr/dashboard/restaurants/${id}/menu`}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95"
          >
            <UtensilsCrossed size={14} strokeWidth={2} />
            Menüyü Düzenle
          </Link>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => saveMenuSetting({ menuEnabled: !menuEnabled })}
            disabled={menuSaving !== null}
            className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60 disabled:hover:translate-y-0 ${
              menuEnabled ? 'border-emerald-200 bg-emerald-50/60' : 'border-[#EDEDED] bg-white'
            }`}
          >
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">Menü Yetkisi</p>
              <p className="mt-1 text-[15px] font-medium text-[#0A0A0A]">
                {menuSaving === 'enabled' ? 'Kaydediliyor…' : menuEnabled ? 'Açık' : 'Kapalı'}
              </p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
              menuEnabled ? 'bg-emerald-500 text-white' : 'bg-[#EDEDED] text-[#737373]'
            }`}>
              {menuEnabled ? <Eye size={15} strokeWidth={2.25} /> : <EyeOff size={15} strokeWidth={2.25} />}
            </div>
          </button>

          <button
            type="button"
            onClick={() => saveMenuSetting({ menuPublished: !menuPublished })}
            disabled={menuSaving !== null || !menuEnabled}
            className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
              menuPublished ? 'border-[#C6F24E] bg-[#EAF9B8]/60' : 'border-[#EDEDED] bg-white'
            }`}
            title={!menuEnabled ? 'Önce menü yetkisini açın' : undefined}
          >
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">Yayın Durumu</p>
              <p className="mt-1 text-[15px] font-medium text-[#0A0A0A]">
                {menuSaving === 'published' ? 'Kaydediliyor…' : menuPublished ? 'Yayında' : 'Taslak'}
              </p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
              menuPublished ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#EDEDED] text-[#737373]'
            }`}>
              {menuPublished ? <Eye size={15} strokeWidth={2.25} /> : <EyeOff size={15} strokeWidth={2.25} />}
            </div>
          </button>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic Info */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <Building2 size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">01 / Kimlik</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Temel Bilgiler</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">İşletme Adı</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">URL Slug</label>
                <div className="flex items-center overflow-hidden rounded-2xl border border-[#EDEDED] bg-white transition-all focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#C6F24E]/40">
                  <span className="select-none whitespace-nowrap border-r border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-3 font-mono text-[12px] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
                    buaze.com/r/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-3 font-mono text-[14px] text-[#0A0A0A] outline-none placeholder:text-[#A3A3A3]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {owners.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="pulse-eyebrow text-[#737373]">İşletme Sahibi</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full cursor-pointer rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  >
                    <option value="">Sahip atanmamış</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {(owner.name || owner.email)} · {owner.plan}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] leading-relaxed text-[#737373]">
                    Bu alan işletmenin hangi işletme sahibi hesabına bağlı olduğunu belirler.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full cursor-pointer rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                >
                  <option>Restoran</option>
                  <option>Kafe</option>
                  <option>Otel</option>
                  <option>Klinik</option>
                  <option>Güzellik Merkezi</option>
                  <option>Mağaza</option>
                  <option>Fast Food</option>
                  <option>Fine Dining</option>
                  <option>Meyhane</option>
                  <option>Pastane</option>
                  <option>Diğer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">Tema Rengi</label>
                <div className="flex items-center gap-3 rounded-2xl border border-[#EDEDED] bg-white px-3 py-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white [&::-webkit-color-swatch]:shadow-sm"
                  />
                  <span className="font-mono text-[13px] tabular-nums text-[#525252]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formData.primaryColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#0A0A0A]">İşletme Aktif</p>
                <p className="mt-0.5 text-[12px] text-[#737373]">
                  Pasifleştirildiğinde yeni QR taramaları cevap vermez.
                </p>
              </div>
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-[#EDEDED] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-[#0A0A0A] peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#C6F24E]/60" />
              </div>
            </label>
          </div>
        </section>

        {/* Contact Info */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <MapPin size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">02 / İletişim</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Adres ve Telefon</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373]">Adres</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Mahall Ankara, Çankaya/Ankara"
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373]">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0312 123 45 67"
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
            </div>
          </div>
        </section>

        {/* Notification & Google */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <Mail size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">03 / Bildirim & Yönlendirme</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">E-posta ve Google Bağlantısı</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373]">Bildirim E-postası</label>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                placeholder="isletme@email.com"
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
              <p className="text-[12px] leading-relaxed text-[#737373]">
                1-2-3 yıldız puanlarında bu e-posta adresine bildirim gönderilir.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="pulse-eyebrow text-[#737373]">Google Place ID veya Harita Linki</label>
                <PlatformUrlHelp platform="google" />
              </div>
              <input
                type="text"
                value={formData.googlePlaceId}
                onChange={(e) => setFormData(prev => ({ ...prev, googlePlaceId: e.target.value }))}
                placeholder="ChIJ... veya https://maps.app.goo.gl/..."
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 font-mono text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <p className="text-[12px] leading-relaxed text-[#737373]">
                Mekan kimliğini ya da Google Haritalar yorum linkini direkt ekleyebilirsiniz. Olumlu geri bildirimler buraya yönlendirilir.
              </p>
            </div>
          </div>
        </section>

        {/* Delivery Platforms */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <Globe size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">04 / Paket Servis</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Teslimat Platformları</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#5D3EBC]" aria-hidden />
                  Getir Yemek URL
                </label>
                <PlatformUrlHelp platform="getir" />
              </div>
              <input
                type="url"
                value={formData.getirYemekUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, getirYemekUrl: e.target.value }))}
                placeholder="https://getir.com/yemek/..."
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#5D3EBC] focus:ring-2 focus:ring-[#5D3EBC]/30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#FA0050]" aria-hidden />
                  Yemek Sepeti URL
                </label>
                <PlatformUrlHelp platform="yemeksepeti" />
              </div>
              <input
                type="url"
                value={formData.yemekSepetiUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, yemekSepetiUrl: e.target.value }))}
                placeholder="https://www.yemeksepeti.com/..."
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#FA0050] focus:ring-2 focus:ring-[#FA0050]/30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#F27A1A]" aria-hidden />
                  Trendyol Yemek URL
                </label>
                <PlatformUrlHelp platform="trendyol" />
              </div>
              <input
                type="url"
                value={formData.trendyolYemekUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, trendyolYemekUrl: e.target.value }))}
                placeholder="https://www.trendyol.com/..."
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#F27A1A] focus:ring-2 focus:ring-[#F27A1A]/30"
              />
            </div>
          </div>
        </section>

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-3xl border border-[#EDEDED] bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-[13px] font-medium text-red-600 transition-all hover:border-red-300 hover:bg-red-50 active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={2} />
            {deleting ? 'Siliniyor…' : 'İşletmeyi Sil'}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/r/${formData.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
            >
              <ExternalLink size={14} strokeWidth={2} />
              Önizle
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
              {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function UrlTile({ label, url, href }: { label: string; url: string; href: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="pulse-eyebrow text-[#737373]">{label}</p>
        <CopyUrlButton url={url} className="h-7 w-7" />
      </div>
      <p className="mt-2 truncate font-mono text-[12px] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-mono)' }}>
        {url}
      </p>
      <Link
        href={href}
        target={href.startsWith('/admin') ? undefined : '_blank'}
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
      >
        Aç
        <ExternalLink size={12} strokeWidth={2} />
      </Link>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-white p-3">
      <div className="flex items-center gap-2 text-[#737373]">
        {icon}
        <p className="pulse-eyebrow">{label}</p>
      </div>
      <p className="mt-2 text-[22px] font-medium text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </p>
    </div>
  );
}
