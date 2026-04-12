'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, Trash2, ExternalLink, Mail } from 'lucide-react';
import Link from 'next/link';

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
    workingHours: '',
    googlePlaceId: '',
    googleReviewUrl: '',
    notificationEmail: '',
    primaryColor: '#1a73e8',
    isActive: true,
  });

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
            category: data.category || 'Restoran',
            address: data.address || '',
            phone: data.phone || '',
            workingHours: data.workingHours || '',
            googlePlaceId: data.googlePlaceId || '',
            googleReviewUrl: data.googleReviewUrl || '',
            notificationEmail: data.notificationEmail || '',
            primaryColor: data.primaryColor || '#1a73e8',
            isActive: data.isActive ?? true,
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchRestaurant();
  }, [id]);

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

  const handleDelete = async () => {
    if (!confirm('Bu restoranı pasifleştirmek istediğinize emin misiniz?')) return;
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
        <Loader2 className="animate-spin text-[#1a73e8] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/restaurants" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Restoran Düzenle</h1>
          <p className="text-gray-500 text-sm">{formData.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 border border-green-100">{success}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
            Temel Bilgiler
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restoran Adı</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tema Rengi</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm font-mono"
                  />
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#e8f0fe] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">Aktif</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">İletişim Bilgileri</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Mahall Ankara, Çankaya/Ankara"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çalışma Saatleri</label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingHours: e.target.value }))}
                  placeholder="10:00 - 22:00"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification & Google */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail size={16} className="text-[#1a73e8]" />
            Bildirim & Google Ayarları
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bildirim E-postası</label>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                placeholder="restoran@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">1-2-3 yıldız puanlarında bu e-posta adresine bildirim gönderilir.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Review URL</label>
              <input
                type="url"
                value={formData.googleReviewUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, googleReviewUrl: e.target.value }))}
                placeholder="https://search.google.com/local/writereview?placeid=..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">4-5 yıldız puanlarda müşteri bu URL&apos;ye yönlendirilir.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Place ID</label>
              <input
                type="text"
                value={formData.googlePlaceId}
                onChange={(e) => setFormData(prev => ({ ...prev, googlePlaceId: e.target.value }))}
                placeholder="ChIJlQUi..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm font-mono"
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
            {deleting ? 'Siliniyor...' : 'Pasifleştir'}
          </button>

          <div className="flex gap-3">
            <Link
              href={`/${formData.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
            >
              <ExternalLink size={16} />
              Önizle
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#185abc] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-sm"
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
