'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, Trash2, ExternalLink, Mail, Store, UtensilsCrossed, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';

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
  });
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [menuPublished, setMenuPublished] = useState(false);
  const [menuSaving, setMenuSaving] = useState<null | 'enabled' | 'published'>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (res.status === 403 || res.status === 401) {
          router.push('/admin/restaurants');
          return;
        }
        if (res.status === 404) {
          setError('Restoran bulunamadı');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Güncelleme başarısız');
        setSaving(false);
        return;
      }

      setSuccess('Restoran başarıyla güncellendi!');
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
    if (!confirm('DİKKAT: Bu restoran kalıcı olarak silinecek ve geri alınamayacaktır! Tüm verileri (qr, feedback vb.) YOK OLACAKTIR. Onaylıyor musunuz?')) return;
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
        <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Link href="/admin/restaurants" className="p-2 hover:bg-[#EDEDED] rounded-lg transition-colors border border-[#EDEDED] bg-white shrink-0">
          <ArrowLeft size={20} className="text-[#0A0A0A]" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] tracking-tight">Restoran Düzenle</h1>
          <p className="text-[#6B7280] text-sm font-medium truncate">{formData.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 border border-green-100">{success}</div>
      )}

      {/* Menu management — outside the main form so its toggles don't submit the whole thing */}
      <div className="mb-6 bg-white rounded-2xl border border-[#EDEDED] shadow-sm p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C6F24E]/10 text-[#0A0A0A]">
              <UtensilsCrossed size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0A0A0A]">Menü Yönetimi</h3>
              <p className="mt-0.5 text-xs font-medium text-[#6B7280]">
                Bu restoranın menüsünü düzenle, yetkisini aç/kapat, yayın durumunu kontrol et.
              </p>
            </div>
          </div>
          <Link
            href={`/tr/dashboard/restaurants/${id}/menu`}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0A0A0A] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#1A1A1A] active:scale-95"
          >
            <UtensilsCrossed size={14} strokeWidth={2} />
            Menüyü Yönet
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => saveMenuSetting({ menuEnabled: !menuEnabled })}
            disabled={menuSaving !== null}
            className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-all active:scale-[0.99] disabled:opacity-60 ${
              menuEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-[#EDEDED] bg-[#FFFFFF]'
            }`}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#6B7280]">Menü Yetkisi</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0A0A0A]">
                {menuSaving === 'enabled' ? 'Kaydediliyor…' : menuEnabled ? 'Açık' : 'Kapalı'}
              </p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${menuEnabled ? 'bg-emerald-500 text-white' : 'bg-[#EDEDED] text-[#6B7280]'}`}>
              {menuEnabled ? <Eye size={14} strokeWidth={2.4} /> : <EyeOff size={14} strokeWidth={2.4} />}
            </div>
          </button>

          <button
            type="button"
            onClick={() => saveMenuSetting({ menuPublished: !menuPublished })}
            disabled={menuSaving !== null || !menuEnabled}
            className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-all active:scale-[0.99] disabled:opacity-60 ${
              menuPublished ? 'border-[#C6F24E] bg-[#C6F24E]/10' : 'border-[#EDEDED] bg-[#FFFFFF]'
            }`}
            title={!menuEnabled ? 'Önce menü yetkisini açın' : undefined}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#6B7280]">Yayın Durumu</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0A0A0A]">
                {menuSaving === 'published' ? 'Kaydediliyor…' : menuPublished ? 'Yayında' : 'Taslak'}
              </p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${menuPublished ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#EDEDED] text-[#6B7280]'}`}>
              {menuPublished ? <Eye size={14} strokeWidth={2.4} /> : <EyeOff size={14} strokeWidth={2.4} />}
            </div>
          </button>
        </div>
        <p className="mt-3 text-[11px] font-medium text-[#6B7280]">
          Menü yetkisi kapatıldığında yayın otomatik durdurulur. Müşteriler menüyü göremez.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-[#EDEDED] shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
            Temel Bilgiler
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Restoran Adı</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm shadow-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">URL Slug</label>
                <div className="flex items-center">
                  <span className="text-sm text-[#6B7280] mr-1">buaze.com/r/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm font-mono shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm shadow-sm transition-all"
                >
                  <option>Restoran</option>
                  <option>Hamburger Restoranı</option>
                  <option>Pizza Restoranı</option>
                  <option>Kebap Restoranı</option>
                  <option>Kafe</option>
                  <option>Fast Food</option>
                  <option>Fine Dining</option>
                  <option>Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Tema Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-16 h-12 rounded-lg border border-[#EDEDED] cursor-pointer p-1"
                  />
                  <span className="text-sm text-[#6B7280] font-mono">{formData.primaryColor}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#EDEDED] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0A0A0A] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A0A0A]"></div>
              </label>
              <span className="text-sm font-medium text-[#1A1A1A]">Aktif</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-[#EDEDED] shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-[#0A0A0A] mb-4">İletişim Bilgileri</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Adres</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Mahall Ankara, Çankaya/Ankara"
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm shadow-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm shadow-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* Notification & Google */}
        <div className="bg-white rounded-2xl border border-[#EDEDED] shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
            <Mail size={16} className="text-[#0A0A0A]" />
            Bildirim & Google Ayarları
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Bildirim E-postası</label>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                placeholder="restoran@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm shadow-sm transition-all"
              />
              <p className="text-xs text-[#6B7280] mt-1">1-2-3 yıldız puanlarında bu e-posta adresine bildirim gönderilir.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1 inline-flex items-center gap-2">
                Google Place ID veya Harita Linki
                <PlatformUrlHelp platform="google" />
              </label>
              <input
                type="text"
                value={formData.googlePlaceId}
                onChange={(e) => setFormData(prev => ({ ...prev, googlePlaceId: e.target.value }))}
                placeholder="ChIJ... veya https://maps.app.goo.gl/..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A] outline-none text-sm font-mono shadow-sm transition-all"
              />
              <p className="text-xs text-[#6B7280] mt-1">Mekan kimliğini ya da Google Haritalar Yorum linkini direkt ekleyebilirsiniz. Olumlu geri bildirimler buraya yönlendirilecek.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1 inline-flex items-center gap-2">
                Getir Yemek URL
                <PlatformUrlHelp platform="getir" />
              </label>
              <input
                type="url"
                value={formData.getirYemekUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, getirYemekUrl: e.target.value }))}
                placeholder="https://getir.com/yemek/..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#5D3EBC] focus:ring-2 focus:ring-[#5D3EBC] outline-none text-sm shadow-sm transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1 inline-flex items-center gap-2">
                Yemek Sepeti URL
                <PlatformUrlHelp platform="yemeksepeti" />
              </label>
              <input
                type="url"
                value={formData.yemekSepetiUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, yemekSepetiUrl: e.target.value }))}
                placeholder="https://www.yemeksepeti.com/..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#FA0050] focus:ring-2 focus:ring-[#FA0050] outline-none text-sm shadow-sm transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1 inline-flex items-center gap-2">
                Trendyol Yemek URL
                <PlatformUrlHelp platform="trendyol" />
              </label>
              <input
                type="url"
                value={formData.trendyolYemekUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, trendyolYemekUrl: e.target.value }))}
                placeholder="https://www.trendyol.com/..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDEDED] focus:border-[#F27A1A] focus:ring-2 focus:ring-[#F27A1A] outline-none text-sm shadow-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? 'Siliniyor...' : 'Restoranı Kalıcı Olarak Sil'}
          </button>

          <div className="flex gap-3">
            <Link
              href={`/r/${formData.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#0A0A0A] bg-white hover:bg-[#FFFFFF] border border-[#EDEDED] rounded-xl transition-colors shadow-sm"
            >
              <ExternalLink size={16} />
              Önizle
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#1f2937] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Kaydet
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
