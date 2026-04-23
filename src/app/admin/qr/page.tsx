'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, QrCode, Mail, RefreshCw, Copy, Check, Printer, Plus, Minus, Palette, Layers, AlertCircle } from 'lucide-react';
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
  platform: string | null;
  createdAt: string;
}

const PLATFORM_BADGE: Record<string, { label: string; bg: string }> = {
  google: { label: 'Google', bg: 'bg-[#4285F4]' },
  yemeksepeti: { label: 'Yemeksepeti', bg: 'bg-[#FA0050]' },
  getir: { label: 'Getir', bg: 'bg-[#5D3EBC]' },
  trendyol_go: { label: 'Trendyol GO', bg: 'bg-[#F27A1A]' },
};



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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<QrHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [qrError, setQrError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);

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

  // Platform selection
  const [selectedPlatform, setSelectedPlatform] = useState('');



  useEffect(() => {
    Promise.all([
      fetch('/api/restaurants').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/me').then(res => res.ok ? res.json() : null)
    ])
    .then(([restData, profileData]) => {
      const list = Array.isArray(restData) ? restData : (restData?.data || []);
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
    ? `${appUrl}/r/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}${selectedPlatform ? `&platform=${selectedPlatform}` : ''}`
    : '';

  const LS_KEY = (id: string) => `qr_history_${id}`;

  const readLocalHistory = (restaurantId: string): QrHistoryItem[] => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY(restaurantId)) || '[]');
    } catch {
      return [];
    }
  };

  const saveToLocalHistory = (restaurantId: string, item: QrHistoryItem) => {
    try {
      const existing = readLocalHistory(restaurantId);
      const updated = [item, ...existing.filter((e) => e.id !== item.id)].slice(0, 50);
      localStorage.setItem(LS_KEY(restaurantId), JSON.stringify(updated));
    } catch {}
  };

  const fetchHistory = async (restaurantId: string) => {
    if (!restaurantId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/qr/history`);
      const apiItems: QrHistoryItem[] = res.ok ? (await res.json()) : [];
      const localItems = readLocalHistory(restaurantId);

      const seen = new Set<string>();
      const merged: QrHistoryItem[] = [];
      for (const item of [...apiItems, ...localItems]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setHistory(merged.slice(0, 50));
    } catch {
      setHistory(readLocalHistory(restaurantId));
    } finally {
      setHistoryLoading(false);
    }
  };

  const buildQuery = (format: 'svg' | 'png') => {
    const query = new URLSearchParams({ format, width: String(size), dark: activeDark });
    if (tableNumber) query.append('table', tableNumber);
    if (selectedPlatform) query.append('platform', selectedPlatform);
    return query;
  };

  const generateQR = async () => {
    if (!selectedId) return;

    // Check for duplicate (same table + platform + service type) before generating
    const dup = history.find(h =>
      (h.tableNumber || '') === (tableNumber || '') &&
      (h.platform || '') === (selectedPlatform || '')
    );
    if (dup) {
      setDuplicateWarning(true);
      setTimeout(() => setDuplicateWarning(false), 4000);
    } else {
      setDuplicateWarning(false);
    }

    setGenerating(true);
    setQrError('');
    try {
      const res = await fetch(`/api/restaurants/${selectedId}/qr?${buildQuery('svg').toString()}`);
      if (res.ok) {
        const svg = await res.text();
        setQrSvg(svg);
        saveToLocalHistory(selectedId, {
          id: `local_${Date.now()}`,
          qrUrl: qrTargetUrl,
          tableNumber: tableNumber || null,
          platform: selectedPlatform || null,
          createdAt: new Date().toISOString(),
        });
        fetchHistory(selectedId);
      } else {
        const data = await res.json().catch(() => null);
        setQrSvg('');
        if (res.status === 401) {
          setQrError('Oturum süreniz sona erdi. Lütfen yeniden giriş yapın.');
        } else {
          setQrError(data?.error || `QR oluşturulamadı (HTTP ${res.status})`);
        }
      }
    } catch (e) {
      console.error(e);
      setQrError('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
    }
    setGenerating(false);
  };

  useEffect(() => {
    if (selectedId) {
      generateQR();
    }
  }, [selectedId, tableNumber, activeDark, size, selectedPlatform]);

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
        h3 { margin: 8px 0 2px; font-size: 14px; color: #0A0A0A; }
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
        h2 { font-size:18px; margin-bottom:4px; color:#0A0A0A; }
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

  const copyHistoryItem = (item: QrHistoryItem) => {
    if (!item.qrUrl) return;
    navigator.clipboard.writeText(item.qrUrl);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 2000);
  };

  const downloadHistoryItem = async (item: QrHistoryItem) => {
    if (!selectedId) return;
    const q = new URLSearchParams({ format: 'png', width: String(size), dark: activeDark });
    if (item.tableNumber) q.append('table', item.tableNumber);
    if (item.platform) q.append('platform', item.platform);
    try {
      const res = await fetch(`/api/restaurants/${selectedId}/qr?${q.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'QR indirilemedi.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${selectedRestaurant?.slug || 'code'}${item.tableNumber ? `-masa-${item.tableNumber}` : ''}${item.platform ? `-${item.platform}` : ''}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('QR indirilemedi.');
    }
  };

  const handleExportHistory = async () => {
    if (!selectedId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/restaurants/${selectedId}/qr/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Dışa aktarma başarısız.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const disposition = res.headers.get('Content-Disposition');
      let filename = `qr-gecmisi-${selectedId}.csv`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Bağlantı hatası.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8" />
      </div>
    );
  }

  const isSingleRestaurant = userProfile?.role === 'manager' || userProfile?.role === 'restaurant_owner';

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-6xl mx-auto space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 bg-white p-5 sm:p-8 rounded-[20px] sm:rounded-[24px] border border-[#EDEDED] shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#0A0A0A] tracking-tight uppercase">QR Kod Oluşturucu</h1>
          <p className="text-[#1A1A1A] text-[12px] sm:text-[15px] font-bold">İşletmenize özel, yüksek çözünürlüklü QR kodlar hazırlayın.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-10">

        {/* ─── Left: Settings ─── */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">

          {/* Settings Box */}
          <div className="bg-white rounded-[24px] border border-[#EDEDED] shadow-sm p-6 sm:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAF9B8] text-[#A8D62E] flex items-center justify-center">
                <QrCode size={20} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-extrabold text-[#0A0A0A] uppercase tracking-tighter">Ayarlar</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">İşletme Seçimi</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={isSingleRestaurant}
                  className={`w-full px-5 py-4 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-sm font-bold uppercase tracking-widest transition-all appearance-none cursor-pointer shadow-sm ${
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
                <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Masa / Konum Numarası</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t && Number(t) > 1 ? String(Number(t) - 1) : '')}
                    className="w-14 h-14 rounded-xl border border-[#EDEDED] bg-white text-[#1A1A1A] flex items-center justify-center shadow-sm hover:bg-[#FFFFFF] active:scale-95 transition-all"
                  >
                    <Minus size={20} strokeWidth={2} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="GENEL"
                    className="flex-1 px-5 py-4 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-[15px] font-bold text-center shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t ? String(Number(t) + 1) : '1')}
                    className="w-14 h-14 rounded-xl border border-[#EDEDED] bg-white text-[#1A1A1A] flex items-center justify-center shadow-sm hover:bg-[#FFFFFF] active:scale-95 transition-all"
                  >
                    <Plus size={20} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Platform Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] focus:ring-2 focus:ring-[#C6F24E] outline-none text-sm font-bold uppercase tracking-widest transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">GENEL (PLATFORM YOK)</option>
                  <option value="google">GOOGLE</option>
                  <option value="yemeksepeti">YEMEKSEPETİ</option>
                  <option value="getir">GETİR</option>
                  <option value="trendyol_go">TRENDYOL GO</option>
                </select>
                <p className="text-[10px] text-[#6B7280] font-bold pl-1">
                  Seçilen platforma özel QR oluşturulur. Gelen yorumlar bu platform altında listelenir.
                </p>
              </div>



              {/* QR Size Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Çözünürlük (PNG)</label>
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
                          ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-sm'
                          : 'bg-white text-[#1A1A1A] border-[#EDEDED] hover:bg-[#FFFFFF]'
                      }`}
                    >
                      {opt.label} · {opt.value}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour customisation */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Palette size={14} strokeWidth={2} /> Renk
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUseBrandColor((v) => !v)}
                    disabled={!selectedRestaurant?.primaryColor}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      useBrandColor
                        ? 'bg-[#C6F24E]/10 border-[#C6F24E] text-[#0A0A0A]'
                        : 'bg-white border-[#EDEDED] text-[#6B7280] hover:bg-[#FFFFFF]'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={selectedRestaurant?.primaryColor ? `Marka rengi: ${selectedRestaurant.primaryColor}` : 'Restoranda marka rengi tanımlı değil'}
                  >
                    <span
                      className="w-4 h-4 rounded border border-[#EDEDED]"
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
                      className="block w-14 h-12 rounded-xl border-2 border-[#EDEDED] shadow-sm"
                      style={{ backgroundColor: useBrandColor ? '#f9fafb' : customDark }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-[#6B7280] font-bold pl-1">
                  Koyu renkleri tercih edin. Tarama güvenilirliği için siyah önerilir.
                </p>
              </div>
            </div>
          </div>

          {/* Batch Generator */}
          {selectedRestaurant && (
            <div className="bg-white rounded-[24px] border border-[#EDEDED] shadow-sm p-6 sm:p-8 space-y-5">
              <button
                type="button"
                onClick={() => setBatchOpen((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <Layers size={20} strokeWidth={2} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-extrabold text-[#0A0A0A] uppercase tracking-widest">Toplu QR</h3>
                    <p className="text-[11px] text-[#1A1A1A] font-bold">Masa aralığı için tek tıkla oluşturun.</p>
                  </div>
                </div>
                <span className="text-[18px] font-black text-[#6B7280]">{batchOpen ? '−' : '+'}</span>
              </button>

              {batchOpen && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Başlangıç</label>
                      <input
                        type="text"
                        value={batchFrom}
                        onChange={(e) => setBatchFrom(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] outline-none text-sm font-bold text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Bitiş</label>
                      <input
                        type="text"
                        value={batchTo}
                        onChange={(e) => setBatchTo(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] outline-none text-sm font-bold text-center"
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
                    className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-[#1A1A1A] disabled:opacity-60 transition-all"
                  >
                    {batchLoading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} strokeWidth={2} />}
                    OLUŞTUR (Maks. 50)
                  </button>

                  {batchItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-auto p-1">
                        {batchItems.map((it) => (
                          <div key={it.table} className="border border-[#EDEDED] rounded-lg p-2 text-center bg-white">
                            <div className="w-full aspect-square [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: it.svg }} />
                            <p className="text-[10px] font-black text-[#0A0A0A] mt-1">Masa {it.table}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={printBatch}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-[#EDEDED] text-[#1A1A1A] py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-[#FFFFFF]"
                      >
                        <Printer size={16} strokeWidth={2} /> HEPSİNİ YAZDIR
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Restaurant info */}
          {selectedRestaurant && (
            <div className="bg-[#0A0A0A] rounded-[24px] border border-white/10 shadow-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-[#C6F24E] uppercase tracking-widest leading-none">Hedef Link</p>
                <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 border-2 border-white/10 rounded-2xl p-4">
                <p className="text-xs font-black text-white/70 font-mono flex-1 truncate">{qrTargetUrl}</p>
                <button
                  onClick={copyUrl}
                  className={`p-2 rounded-xl border-2 transition-all ${copied ? 'bg-green-500 border-green-400 text-white' : 'bg-white/10 border-white/10 text-white/50 hover:bg-white/20'}`}
                >
                  {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                </button>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest">İşletme</p>
                  <p className="text-xs font-black text-white truncate" title={selectedRestaurant.name}>{selectedRestaurant.name.toUpperCase()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-widest">Durum</p>
                  <p className="text-xs font-black text-[#10b981] whitespace-nowrap">AKTİF ✓</p>
                </div>
              </div>
            </div>
          )}

          {/* Last 50 QR history */}
          {selectedRestaurant && (
            <div className="bg-white rounded-[24px] border border-[#EDEDED] shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-extrabold text-[#0A0A0A] uppercase tracking-widest">Son 50 QR</h4>
                  <span className="text-[10px] font-black text-[#6B7280] px-2 py-0.5 bg-[#EDEDED] rounded-md">{history.length}/50</span>
                </div>
                <button
                  onClick={handleExportHistory}
                  disabled={exporting || history.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EDEDED] text-[#1A1A1A] rounded-lg hover:bg-[#FFFFFF] active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm disabled:opacity-50"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} strokeWidth={2} />}
                  DIŞA AKTAR
                </button>
              </div>
              <p className="text-[12px] text-[#1A1A1A] font-semibold">
                50 kayıt aşıldığında en eski QR otomatik silinir, en yeniler tutulur.
              </p>

              <div className="max-h-[280px] overflow-auto divide-y divide-[#EDEDED] border border-[#EDEDED] rounded-xl">
                {historyLoading ? (
                  <div className="p-4 text-[12px] font-bold text-[#1A1A1A]">Yükleniyor...</div>
                ) : history.length === 0 ? (
                  <div className="p-4 text-[12px] font-bold text-[#1A1A1A]">Henüz kayıtlı QR yok.</div>
                ) : (
                  history.map((item) => {
                    const badge = item.platform ? PLATFORM_BADGE[item.platform] : null;
                    return (
                      <div key={item.id} className="p-3 hover:bg-[#FFFFFF] transition-colors flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setTableNumber(item.tableNumber || '');
                              setSelectedPlatform(item.platform || '');
                            }}
                            className="shrink-0 rounded-lg bg-[#FFFFFF] border border-[#EDEDED] px-2 py-1.5 text-center min-w-[60px] hover:border-[#C9D0DB] active:scale-95 transition-all"
                          >
                            <p className="text-[9px] font-black uppercase tracking-wider text-[#6B7280] leading-tight">
                              {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-[11px] font-black text-[#0A0A0A] leading-tight">
                              {new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[12px] font-black text-[#0A0A0A]">
                                {item.tableNumber ? `Masa ${item.tableNumber}` : 'Genel'}
                              </span>
                              {badge ? (
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white ${badge.bg}`}>
                                  {badge.label}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#EDEDED] text-[#6B7280] border border-[#EDEDED]">
                                  Genel
                                </span>
                              )}

                            </div>
                            <p className="text-[11px] text-[#1A1A1A] font-mono truncate" title={item.qrUrl}>{item.qrUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap pl-[72px]">
                          <button
                            type="button"
                            onClick={() => copyHistoryItem(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
                              copiedId === item.id
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-white border-[#EDEDED] text-[#1A1A1A] hover:bg-[#FFFFFF]'
                            }`}
                          >
                            {copiedId === item.id ? <Check size={11} strokeWidth={2} /> : <Copy size={11} strokeWidth={2} />}
                            {copiedId === item.id ? 'Kopyalandı' : 'Linki Kopyala'}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadHistoryItem(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-[#EDEDED] bg-white text-[#1A1A1A] hover:bg-[#FFFFFF] active:scale-95 transition-all"
                          >
                            <Download size={11} strokeWidth={2} />
                            PNG İndir
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: QR Preview ─── */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#EDEDED] shadow-sm p-5 sm:p-8 flex flex-col items-center h-full">
            <div className="flex items-center justify-between w-full mb-6 sm:mb-10">
              <div className="flex items-center gap-3">
                <h3 className="text-lg sm:text-2xl font-extrabold text-[#0A0A0A] uppercase tracking-tighter">Önizleme</h3>
                {selectedPlatform && (
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-sm ${
                    selectedPlatform === 'google' ? 'bg-[#4285F4]' :
                    selectedPlatform === 'yemeksepeti' ? 'bg-[#FA0050]' :
                    selectedPlatform === 'getir' ? 'bg-[#5D3EBC]' :
                    selectedPlatform === 'trendyol_go' ? 'bg-[#F27A1A]' : 'bg-[#6B7280]'
                  }`}>
                    {selectedPlatform === 'google' ? 'Google' :
                     selectedPlatform === 'yemeksepeti' ? 'Yemeksepeti' :
                     selectedPlatform === 'getir' ? 'Getir' :
                     selectedPlatform === 'trendyol_go' ? 'Trendyol GO' : selectedPlatform}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {duplicateWarning && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle size={12} strokeWidth={2} />
                    Daha önce oluşturuldu
                  </div>
                )}
                <button
                  onClick={generateQR}
                  disabled={generating || !selectedId}
                  className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-[#1A1A1A] hover:text-[#0A0A0A] transition-all disabled:opacity-30 border border-[#EDEDED] px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white shadow-sm hover:bg-[#FFFFFF] active:scale-95 uppercase tracking-widest"
                >
                  <RefreshCw size={14} strokeWidth={2} className={generating ? 'animate-spin' : ''} />
                  YENİLE
                </button>
              </div>
            </div>
            {duplicateWarning && (
              <div className="sm:hidden w-full mb-4 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                <AlertCircle size={14} strokeWidth={2} />
                Bu kombinasyonla daha önce QR oluşturuldu.
              </div>
            )}

            {/* QR Box */}
            <div className="flex-1 flex items-center justify-center w-full min-h-[260px] sm:min-h-[300px]">
              {generating ? (
                <div className="flex items-center justify-center w-56 h-56 sm:w-72 sm:h-72">
                  <Loader2 className="animate-spin text-[#0A0A0A] w-12 h-12" strokeWidth={2} />
                </div>
              ) : qrSvg ? (
                <div
                  className="w-56 h-56 sm:w-72 sm:h-72 [&>svg]:w-full [&>svg]:h-full rounded-[20px] sm:rounded-[24px] overflow-hidden border border-[#EDEDED] shadow-xl p-3 sm:p-4 bg-white transition-transform hover:rotate-1"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-56 h-56 sm:w-72 sm:h-72 bg-[#FFFFFF] rounded-[20px] sm:rounded-[24px] flex flex-col items-center justify-center border-2 border-dashed border-[#EDEDED] text-center p-5 sm:p-8">
                  <QrCode size={48} strokeWidth={2} className={`${qrError ? 'text-red-300' : 'text-[#C9D0DB]'} mb-4`} />
                  <p className={`text-[11px] sm:text-[13px] font-black uppercase tracking-widest ${qrError ? 'text-red-500' : 'text-[#6B7280]'}`}>
                    {qrError
                      ? qrError
                      : selectedId
                      ? 'QR HAZIRLANIYOR / YENİLE İLE OLUŞTURUN'
                      : 'ÖNİZLEME İÇİN İŞLETME SEÇİN'}
                  </p>
                  {qrError && (
                    <button
                      onClick={generateQR}
                      className="mt-4 text-[11px] font-black text-[#0A0A0A] underline underline-offset-2 uppercase tracking-widest"
                    >
                      Tekrar Dene
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Instruction */}
            {qrSvg && (
              <div className="bg-[#FFFFFF] border border-[#EDEDED] rounded-2xl p-3 sm:p-4 mt-6 sm:mt-10 mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4 max-w-sm">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center flex-shrink-0">
                  <Check size={18} strokeWidth={2} />
                </div>
                <p className="text-[11px] sm:text-[12px] font-bold text-[#1A1A1A] leading-tight">
                  Bu QR kodu masalara, menülere veya girişe yerleştirerek müşteri geri bildirimi toplamaya başlayın.
                </p>
              </div>
            )}

            {/* Actions */}
            {selectedId && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full mt-6 sm:mt-auto">
                <button
                  onClick={() => downloadQR('png')}
                  className="col-span-2 flex items-center justify-center gap-3 bg-[#0A0A0A] text-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl text-[12px] sm:text-[13px] font-bold uppercase tracking-widest border border-white/10 shadow-md hover:bg-[#1A1A1A] active:scale-95 transition-all group"
                >
                  <Download size={20} strokeWidth={2} className="group-hover:translate-y-0.5 transition-transform" />
                  PNG OLARAK İNDİR (HD)
                </button>
                <button
                  onClick={() => downloadQR('svg')}
                  className="flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#1A1A1A] border border-[#EDEDED] px-3 sm:px-6 py-3 sm:py-4 rounded-2xl text-[11px] sm:text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#FFFFFF] active:scale-95 transition-all"
                >
                  <Download size={16} strokeWidth={2} />
                  SVG
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#1A1A1A] border border-[#EDEDED] px-3 sm:px-6 py-3 sm:py-4 rounded-2xl text-[11px] sm:text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#FFFFFF] active:scale-95 transition-all"
                >
                  <Printer size={16} strokeWidth={2} />
                  YAZDIR
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
        <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8" />
      </div>
    }>
      <QRPageContent />
    </Suspense>
  );
}
