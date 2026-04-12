'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, QrCode, Mail, RefreshCw, Copy, Check, Printer, Plus, Minus } from 'lucide-react';
import { Suspense } from 'react';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  notificationEmail: string | null;
  primaryColor: string;
}

function QRPageContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('restaurant') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState(preselected);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/restaurants').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/me').then(res => res.ok ? res.json() : null)
    ])
    .then(([restData, profileData]) => {
      const list = Array.isArray(restData) ? restData : [];
      setRestaurants(list);
      setUserProfile(profileData);

      if (profileData && (profileData.role === 'manager' || profileData.role === 'restaurant_owner') && profileData.restaurantId) {
        setSelectedId(profileData.restaurantId);
      } else if (!selectedId && list.length > 0) {
        setSelectedId(preselected || list[0].id);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const selectedRestaurant = restaurants.find(r => r.id === selectedId);
  const appUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : '';
  const qrTargetUrl = selectedRestaurant
    ? `${appUrl}/r/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}`
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrSvg) return;
    printWindow.document.write(`
      <html><head><title>QR Kod — ${selectedRestaurant?.name}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; font-family:sans-serif; }
        .qr-wrap { text-align:center; }
        .qr-wrap svg { width:280px; height:280px; }
        h2 { font-size:18px; margin-bottom:4px; color:#111827; }
        p { font-size:13px; color:#6b7280; margin:0; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>
        <div class="qr-wrap">
          ${qrSvg}
          <h2>${selectedRestaurant?.name || ''}</h2>
          ${tableNumber ? `<p>Masa ${tableNumber}</p>` : ''}
          <p style="margin-top:8px;font-size:11px;color:#9ca3af;">buaze.com ile güçlendirilmiştir</p>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const copyUrl = () => {
    if (!qrTargetUrl) return;
    navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-8 h-8" />
      </div>
    );
  }

  const isSingleRestaurant = userProfile?.role === 'manager' || userProfile?.role === 'restaurant_owner';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111827] tracking-tight">QR Kod Oluşturucu</h1>
        <p className="text-gray-500 text-sm font-medium mt-1">Restoranınız için kişiselleştirilmiş QR kodlar oluşturun ve indirin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ─── Left: Settings ─── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Restaurant selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#111827] text-sm mb-4 uppercase tracking-wide">Ayarlar</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Restoran</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={isSingleRestaurant}
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none text-sm transition-all ${
                    isSingleRestaurant
                    ? 'bg-gray-50 cursor-not-allowed text-gray-500'
                    : 'focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/5 bg-white'
                  }`}
                >
                  <option value="">Seçiniz...</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Masa Numarası</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t && Number(t) > 1 ? String(Number(t) - 1) : '')}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Opsiyonel"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/5 outline-none text-sm text-center transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t ? String(Number(t) + 1) : '1')}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Restaurant info */}
          {selectedRestaurant && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-[#111827] text-sm uppercase tracking-wide">Restoran Bilgileri</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Ad</span>
                  <span className="font-semibold text-gray-800 text-xs">{selectedRestaurant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">URL</span>
                  <span className="font-mono text-gray-700 text-xs">/r/{selectedRestaurant.slug}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs flex items-center gap-1"><Mail size={10} />E-posta</span>
                  <span className={`text-xs font-semibold ${selectedRestaurant.notificationEmail ? 'text-green-600' : 'text-red-400'}`}>
                    {selectedRestaurant.notificationEmail ? 'Ayarlandı ✓' : 'Ayarlanmadı'}
                  </span>
                </div>
              </div>

              {/* Copy URL */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                  <p className="text-xs font-mono text-gray-600 flex-1 truncate">{qrTargetUrl}</p>
                  <button
                    onClick={copyUrl}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    title="URL'yi kopyala"
                  >
                    {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-gray-500" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: QR Preview ─── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center h-full">
            <div className="flex items-center justify-between w-full mb-5">
              <h3 className="font-bold text-[#111827] text-sm uppercase tracking-wide">Önizleme</h3>
              <button
                onClick={generateQR}
                disabled={generating || !selectedId}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#111827] transition-colors disabled:opacity-40 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
                Yenile
              </button>
            </div>

            {/* QR Box — fixed size to prevent huge render */}
            <div className="flex-1 flex items-center justify-center w-full">
              {generating ? (
                <div className="flex items-center justify-center w-52 h-52">
                  <Loader2 className="animate-spin text-[#111827] w-7 h-7" />
                </div>
              ) : qrSvg ? (
                <div
                  className="w-52 h-52 [&>svg]:w-full [&>svg]:h-full rounded-xl overflow-hidden border border-gray-100 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-52 h-52 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-dashed border-gray-200">
                  <QrCode size={48} className="text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">Restoran seçin</p>
                </div>
              )}
            </div>

            {/* Instruction */}
            {qrSvg && (
              <p className="text-xs text-gray-400 text-center mt-3 mb-5 max-w-[220px] leading-relaxed">
                Bu QR kodu restoranınızdaki masalara, menülere veya girişe yerleştirin.
              </p>
            )}

            {/* Actions */}
            {selectedId && (
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  onClick={() => downloadQR('png')}
                  className="flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg col-span-2"
                >
                  <Download size={15} />
                  PNG İndir (Yüksek Çözünürlüklü)
                </button>
                <button
                  onClick={() => downloadQR('svg')}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#111827] hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  <Download size={15} />
                  SVG İndir
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-[#111827] hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  <Printer size={15} />
                  Yazdır
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-8 h-8" />
      </div>
    }>
      <QRPageContent />
    </Suspense>
  );
}
