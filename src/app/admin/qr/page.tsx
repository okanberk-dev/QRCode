'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, QrCode, Mail, RefreshCw, Copy, Check, Printer, Plus, Minus, Palette, Layers } from 'lucide-react';
import { Suspense } from 'react';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  notificationEmail: string | null;
  primaryColor: string;
}

interface QrHistoryItem {
  id: string;
  qrUrl: string;
  tableNumber: string | null;
  createdAt: string;
}

function QRPageContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('restaurant') || searchParams.get('restaurantId') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState(preselected);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<QrHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Customisation
  const [useBrandColor, setUseBrandColor] = useState(false);
  const [customDark, setCustomDark] = useState('#000000');
  const [size, setSize] = useState<512 | 800 | 1200>(800);

  // Batch generation
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchFrom, setBatchFrom] = useState('1');
  const [batchTo, setBatchTo] = useState('10');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [batchItems, setBatchItems] = useState<{ table: string; qrUrl: string; svg: string }[]>([]);

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
  const activeDark = useBrandColor && selectedRestaurant?.primaryColor
    ? selectedRestaurant.primaryColor
    : customDark;
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const safeEnvAppUrl = envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
    ? envAppUrl
    : 'https://buaze.com';
  const appUrl = safeEnvAppUrl || (typeof window !== 'undefined'
    ? window.location.origin.replace(/\/+$/, '')
    : 'https://buaze.com');
  const qrTargetUrl = selectedRestaurant
    ? `${appUrl}/r/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}`
    : '';

  const fetchHistory = async (restaurantId: string) => {
    if (!restaurantId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/qr/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const buildQuery = (format: 'svg' | 'png') => {
    const query = new URLSearchParams({ format, width: String(size), dark: activeDark });
    if (tableNumber) query.append('table', tableNumber);
    return query;
  };

  const generateQR = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/restaurants/${selectedId}/qr?${buildQuery('svg').toString()}`);
      if (res.ok) {
        const svg = await res.text();
        setQrSvg(svg);
        fetchHistory(selectedId);
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  useEffect(() => {
    if (selectedId) {
      generateQR();
    }
  }, [selectedId, tableNumber, activeDark, size]);

  useEffect(() => {
    if (selectedId) {
      fetchHistory(selectedId);
    }
  }, [selectedId]);

  const downloadQR = async (format: 'svg' | 'png') => {
    const res = await fetch(`/api/restaurants/${selectedId}/qr?${buildQuery(format).toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      alert(err?.error || 'QR indirilemedi.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${selectedRestaurant?.slug || 'code'}${tableNumber ? `-masa-${tableNumber}` : ''}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runBatch = async () => {
    if (!selectedId) return;
    setBatchError('');
    setBatchItems([]);
    const fromN = Number(batchFrom);
    const toN = Number(batchTo);
    if (!Number.isInteger(fromN) || !Number.isInteger(toN) || fromN < 1 || toN < fromN) {
      setBatchError('Başlangıç en az 1 olmalı ve bitiş başlangıçtan küçük olmamalıdır.');
      return;
    }
    if (toN - fromN + 1 > 50) {
      setBatchError('Tek seferde en fazla 50 masa oluşturabilirsiniz.');
      return;
    }
    setBatchLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${selectedId}/qr/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromN, to: toN, dark: activeDark, width: size }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchError(data?.error || 'Toplu QR oluşturulamadı.');
      } else {
        setBatchItems(data.items || []);
        fetchHistory(selectedId);
      }
    } catch (e) {
      setBatchError('Bağlantı hatası.');
    }
    setBatchLoading(false);
  };

  const printBatch = () => {
    if (batchItems.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const cards = batchItems.map((it) => `
      <div class="card">
        <div class="qr">${it.svg}</div>
        <h3>${selectedRestaurant?.name || ''}</h3>
        <p>Masa ${it.table}</p>
      </div>
    `).join('');
    printWindow.document.write(`
      <html><head><title>Toplu QR — ${selectedRestaurant?.name}</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; text-align: center; page-break-inside: avoid; }
        .qr svg { width: 180px; height: 180px; }
        h3 { margin: 8px 0 2px; font-size: 14px; color: #111827; }
        p { margin: 0; font-size: 12px; color: #6b7280; }
        @media print { body { padding: 0; } .grid { gap: 8px; } }
      </style>
      </head><body>
        <div class="grid">${cards}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
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
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto space-y-8 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[24px] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">QR Kod Oluşturucu</h1>
          <p className="text-[#6b6760] text-[13px] sm:text-[15px] font-bold">İşletmenize özel, yüksek çözünürlüklü QR kodlar hazırlayın.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-10">

        {/* ─── Left: Settings ─── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Settings Box */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <QrCode size={20} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Ayarlar</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">İşletme Seçimi</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={isSingleRestaurant}
                  className={`w-full px-5 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold uppercase tracking-widest transition-all appearance-none cursor-pointer shadow-sm ${
                    isSingleRestaurant
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                  }`}
                >
                  <option value="">İşletme Seç...</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Masa / Konum Numarası</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t && Number(t) > 1 ? String(Number(t) - 1) : '')}
                    className="w-14 h-14 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Minus size={20} strokeWidth={2.5} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="GENEL"
                    className="flex-1 px-5 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold text-center shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t ? String(Number(t) + 1) : '1')}
                    className="w-14 h-14 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* QR Size Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Çözünürlük (PNG)</label>
                <div className="flex gap-2">
                  {[
                    { label: 'Küçük', value: 512 },
                    { label: 'HD', value: 800 },
                    { label: 'XL', value: 1200 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSize(opt.value as 512 | 800 | 1200)}
                      className={`flex-1 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                        size === opt.value
                          ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label} · {opt.value}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour customisation */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Palette size={14} strokeWidth={3} /> Renk
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUseBrandColor((v) => !v)}
                    disabled={!selectedRestaurant?.primaryColor}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      useBrandColor
                        ? 'bg-[#FDBF1D]/10 border-[#FDBF1D] text-[#111827]'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={selectedRestaurant?.primaryColor ? `Marka rengi: ${selectedRestaurant.primaryColor}` : 'Restoranda marka rengi tanımlı değil'}
                  >
                    <span
                      className="w-4 h-4 rounded border border-gray-200"
                      style={{ backgroundColor: selectedRestaurant?.primaryColor || '#000' }}
                    />
                    Marka Rengi
                  </button>
                  <label className="relative cursor-pointer">
                    <input
                      type="color"
                      value={customDark}
                      onChange={(e) => { setCustomDark(e.target.value); setUseBrandColor(false); }}
                      className="sr-only"
                    />
                    <span
                      className="block w-14 h-12 rounded-xl border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: useBrandColor ? '#f9fafb' : customDark }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-[#ada89f] font-bold pl-1">
                  Koyu renkleri tercih edin. Tarama güvenilirliği için siyah önerilir.
                </p>
              </div>
            </div>
          </div>

          {/* Batch Generator */}
          {selectedRestaurant && (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
              <button
                type="button"
                onClick={() => setBatchOpen((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <Layers size={20} strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-[#111827] uppercase tracking-widest">Toplu QR</h3>
                    <p className="text-[11px] text-[#6b6760] font-bold">Masa aralığı için tek tıkla oluşturun.</p>
                  </div>
                </div>
                <span className="text-[18px] font-black text-[#ada89f]">{batchOpen ? '−' : '+'}</span>
              </button>

              {batchOpen && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Başlangıç</label>
                      <input
                        type="text"
                        value={batchFrom}
                        onChange={(e) => setBatchFrom(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FCFBF7] outline-none text-sm font-bold text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Bitiş</label>
                      <input
                        type="text"
                        value={batchTo}
                        onChange={(e) => setBatchTo(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FCFBF7] outline-none text-sm font-bold text-center"
                      />
                    </div>
                  </div>

                  {batchError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-black text-center uppercase tracking-widest border border-red-200">
                      {batchError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={runBatch}
                    disabled={batchLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#111827] text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-800 disabled:opacity-60 transition-all"
                  >
                    {batchLoading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} strokeWidth={3} />}
                    OLUŞTUR (Maks. 50)
                  </button>

                  {batchItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-auto p-1">
                        {batchItems.map((it) => (
                          <div key={it.table} className="border border-gray-100 rounded-lg p-2 text-center bg-white">
                            <div className="w-full aspect-square [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: it.svg }} />
                            <p className="text-[10px] font-black text-[#111827] mt-1">Masa {it.table}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={printBatch}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-50"
                      >
                        <Printer size={16} strokeWidth={2.5} /> HEPSİNİ YAZDIR
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Restaurant info */}
          {selectedRestaurant && (
            <div className="bg-[#111827] rounded-[24px] border border-gray-800 shadow-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-[#FDBF1D] uppercase tracking-widest leading-none">Hedef Link</p>
                <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 border-2 border-white/10 rounded-2xl p-4">
                <p className="text-xs font-black text-white/70 font-mono flex-1 truncate">{qrTargetUrl}</p>
                <button
                  onClick={copyUrl}
                  className={`p-2 rounded-xl border-2 transition-all ${copied ? 'bg-green-500 border-green-400 text-white' : 'bg-white/10 border-white/10 text-white/50 hover:bg-white/20'}`}
                >
                  {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[#ada89f] uppercase tracking-widest">İşletme</p>
                  <p className="text-xs font-black text-white">{selectedRestaurant.name.toUpperCase()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[#ada89f] uppercase tracking-widest">Durum</p>
                  <p className="text-xs font-black text-[#10b981]">AKTİF ✓</p>
                </div>
              </div>
            </div>
          )}

          {/* Last 50 QR history */}
          {selectedRestaurant && (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-[#111827] uppercase tracking-widest">Son 50 QR</h4>
                <span className="text-[10px] font-black text-[#ada89f]">{history.length}/50</span>
              </div>
              <p className="text-[12px] text-[#6b6760] font-semibold">
                50 kayıt aşıldığında en eski QR otomatik silinir, en yeniler tutulur.
              </p>

              <div className="max-h-[280px] overflow-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {historyLoading ? (
                  <div className="p-4 text-[12px] font-bold text-[#6b6760]">Yükleniyor...</div>
                ) : history.length === 0 ? (
                  <div className="p-4 text-[12px] font-bold text-[#6b6760]">Henüz kayıtlı QR yok.</div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTableNumber(item.tableNumber || '')}
                      className="w-full text-left p-3 hover:bg-[#FCFBF7] transition-colors"
                    >
                      <p className="text-[12px] font-black text-[#111827]">
                        {item.tableNumber ? `Masa ${item.tableNumber}` : 'Genel QR'}
                      </p>
                      <p className="text-[11px] text-[#6b6760] font-mono truncate">{item.qrUrl}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: QR Preview ─── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col items-center h-full">
            <div className="flex items-center justify-between w-full mb-10">
              <h3 className="text-2xl font-black text-[#111827] uppercase tracking-tighter">Önizleme</h3>
              <button
                onClick={generateQR}
                disabled={generating || !selectedId}
                className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-all disabled:opacity-30 border border-gray-200 px-5 py-2.5 rounded-xl bg-white shadow-sm hover:bg-gray-50 active:scale-95 uppercase tracking-widest"
              >
                <RefreshCw size={14} strokeWidth={2.5} className={generating ? 'animate-spin' : ''} />
                YENİLE
              </button>
            </div>

            {/* QR Box */}
            <div className="flex-1 flex items-center justify-center w-full min-h-[300px]">
              {generating ? (
                <div className="flex items-center justify-center w-72 h-72">
                  <Loader2 className="animate-spin text-[#111827] w-12 h-12" strokeWidth={3} />
                </div>
              ) : qrSvg ? (
                <div
                  className="w-64 h-64 sm:w-72 sm:h-72 [&>svg]:w-full [&>svg]:h-full rounded-[24px] overflow-hidden border border-gray-100 shadow-xl p-4 bg-white transition-transform hover:rotate-1"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-64 h-64 sm:w-72 sm:h-72 bg-gray-50 rounded-[24px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-center p-8">
                  <QrCode size={48} strokeWidth={2.5} className="text-gray-300 mb-4" />
                  <p className="text-[13px] font-black text-[#ada89f] uppercase tracking-widest">
                    {selectedId ? 'QR HAZIRLANIYOR / YENİLE İLE OLUŞTURUN' : 'ÖNİZLEME İÇİN İŞLETME SEÇİN'}
                  </p>
                </div>
              )}
            </div>

            {/* Instruction */}
            {qrSvg && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-10 mb-10 flex items-center gap-4 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center flex-shrink-0">
                  <Check size={20} strokeWidth={3} />
                </div>
                <p className="text-[12px] font-bold text-[#6b6760] leading-tight">
                  Bu QR kodu masalara, menülere veya girişe yerleştirerek müşteri geri bildirimi toplamaya başlayın.
                </p>
              </div>
            )}

            {/* Actions */}
            {selectedId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-auto">
                <button
                  onClick={() => downloadQR('png')}
                  className="flex items-center justify-center gap-3 bg-[#111827] text-white px-8 py-4 sm:py-5 rounded-2xl text-[13px] font-bold uppercase tracking-widest border border-gray-800 shadow-md hover:bg-gray-800 active:scale-95 transition-all sm:col-span-2 group"
                >
                  <Download size={20} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
                  PNG OLARAK İNDİR (HD)
                </button>
                <button
                  onClick={() => downloadQR('svg')}
                  className="flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-200 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Download size={18} strokeWidth={2.5} />
                  SVG İNDİR
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-200 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Printer size={18} strokeWidth={2.5} />
                  HEMEN YAZDIR
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
