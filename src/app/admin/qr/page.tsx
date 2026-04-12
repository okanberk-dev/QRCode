'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, QrCode, Mail, RefreshCw } from 'lucide-react';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  notificationEmail: string | null;
  primaryColor: string;
}

export default function QRPage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('restaurant') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState(preselected);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/restaurants').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/me').then(res => res.ok ? res.json() : null)
    ])
    .then(([restData, profileData]) => {
      const list = Array.isArray(restData) ? restData : [];
      setRestaurants(list);
      setUserProfile(profileData);
      
      if (profileData && profileData.role === 'manager' && profileData.restaurantId) {
        setSelectedId(profileData.restaurantId);
      } else if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const selectedRestaurant = restaurants.find(r => r.id === selectedId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const qrTargetUrl = selectedRestaurant
    ? `${appUrl}/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${tableNumber}` : ''}`
    : '';

  const generateQR = async () => {
    if (!selectedId) return;
    setGenerating(true);

    try {
      const query = new URLSearchParams({ format: 'svg' });
      if (tableNumber) query.append('table', tableNumber);

      const res = await fetch(`/api/restaurants/${selectedId}/qr?${query.toString()}`);
      if (res.ok) {
        const svg = await res.text();
        setQrSvg(svg);
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  useEffect(() => {
    if (selectedId) generateQR();
  }, [selectedId, tableNumber]);

  const downloadQR = async (format: 'svg' | 'png') => {
    const query = new URLSearchParams({ format });
    if (tableNumber) query.append('table', tableNumber);

    const res = await fetch(`/api/restaurants/${selectedId}/qr?${query.toString()}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${selectedRestaurant?.slug || 'code'}${tableNumber ? `-masa-${tableNumber}` : ''}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#1a73e8] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">QR Kod Oluşturucu</h1>
        <p className="text-gray-500 text-sm">Restoranınız için QR kodları oluşturun ve indirin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Settings Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Ayarlar</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restoran</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={userProfile?.role === 'manager'}
                  className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm ${
                    userProfile?.role === 'manager' 
                    ? 'bg-gray-50 cursor-not-allowed' 
                    : 'focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe]'
                  }`}
                >
                  <option value="">Seçiniz...</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Masa Numarası (Opsiyonel)</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Örn: 5"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          {selectedRestaurant && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <h3 className="font-semibold text-gray-800">Restoran Bilgileri</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ad</span>
                  <span className="font-medium text-gray-800">{selectedRestaurant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug</span>
                  <span className="font-mono text-gray-800">/{selectedRestaurant.slug}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Mail size={12} />
                    Bildirim E-postası
                  </span>
                  <span className={`font-medium ${selectedRestaurant.notificationEmail ? 'text-green-600' : 'text-red-500'}`}>
                    {selectedRestaurant.notificationEmail || 'Ayarlanmadı'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400">QR Hedef URL:</p>
                <p className="text-xs font-mono text-[#1a73e8] break-all mt-1">{qrTargetUrl}</p>
              </div>
            </div>
          )}
        </div>

        {/* QR Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
          <h3 className="font-semibold text-gray-800 mb-4 self-start">QR Kod Önizleme</h3>

          {generating ? (
            <div className="flex items-center justify-center w-64 h-64">
              <Loader2 className="animate-spin text-[#1a73e8] w-8 h-8" />
            </div>
          ) : qrSvg ? (
            <div
              className="w-64 h-64 mb-6"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="w-64 h-64 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
              <QrCode size={64} className="text-gray-200" />
            </div>
          )}

          {selectedId && (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => downloadQR('png')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#185abc] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                <Download size={16} />
                PNG İndir
              </button>
              <button
                onClick={() => downloadQR('svg')}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-[#1a73e8] hover:text-[#1a73e8] px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <Download size={16} />
                SVG İndir
              </button>
            </div>
          )}

          <button
            onClick={generateQR}
            disabled={generating || !selectedId}
            className="mt-3 flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a73e8] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Yenile
          </button>
        </div>
      </div>
    </div>
  );
}
