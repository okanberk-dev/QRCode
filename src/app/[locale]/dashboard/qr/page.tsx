'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Copy, Download, Loader2, Minus, Palette, Plus, Printer, QrCode, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  primaryColor?: string;
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

export default function DashboardQrPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const preselected = searchParams.get('restaurant') || searchParams.get('restaurantId') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState(preselected);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<QrHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [useBrandColor, setUseBrandColor] = useState(true);
  const [customDark, setCustomDark] = useState('#000000');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const safeEnvAppUrl = envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
    ? envAppUrl
    : 'https://buaze.com';

  useEffect(() => {
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setRestaurants(list);

        if (!selectedId && list.length > 0) {
          setSelectedId(preselected || list[0].id);
        }
      })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [preselected, selectedId]);

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedId);
  const appUrl = safeEnvAppUrl || (typeof window !== 'undefined'
    ? window.location.origin.replace(/\/+$/, '')
    : 'https://buaze.com');

  const qrTargetUrl = useMemo(() => {
    if (!selectedRestaurant) return '';

    return `${appUrl}/r/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}${selectedPlatform ? `&platform=${selectedPlatform}` : ''}`;
  }, [appUrl, selectedRestaurant, tableNumber, selectedPlatform]);

  const activeDark = useBrandColor && selectedRestaurant?.primaryColor
    ? selectedRestaurant.primaryColor
    : customDark;

  const copy = locale === 'tr'
    ? {
        title: 'QR Kod Yönetimi',
        subtitle: 'İşletmeleriniz için baskıya hazır ve mobil uyumlu QR kodlar üretin.',
        business: 'İşletme',
        table: 'Masa / Konum',
        target: 'Hedef Bağlantı',
        refresh: 'Yenile',
        copy: 'Kopyala',
        copied: 'Kopyalandı',
        history: 'Son Üretilenler',
        downloadSvg: 'SVG İndir',
        downloadPng: 'PNG İndir',
        print: 'Yazdır',
        qrPreview: 'QR Önizleme',
        noHistory: 'Henüz QR üretim kaydı yok.',
        brandColor: 'Marka Rengi',
        customColor: 'Özel Renk',
        colorLabel: 'QR Renk',
        platform: 'Platform',
        genel: 'Genel (Platform Yok)',
      }
    : {
        title: 'QR Management',
        subtitle: 'Generate print-ready, mobile-friendly QR codes for your locations.',
        business: 'Location',
        table: 'Table / Spot',
        target: 'Target URL',
        refresh: 'Refresh',
        copy: 'Copy',
        copied: 'Copied',
        history: 'Recent QR Codes',
        downloadSvg: 'Download SVG',
        downloadPng: 'Download PNG',
        print: 'Print',
        qrPreview: 'QR Preview',
        noHistory: 'No QR history yet.',
        brandColor: 'Brand Color',
        customColor: 'Custom Color',
        colorLabel: 'QR Color',
        platform: 'Platform',
        genel: 'General (No Platform)',
      };

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
      const response = await fetch(`/api/restaurants/${restaurantId}/qr/history`);
      const apiItems: QrHistoryItem[] = response.ok ? (await response.json()) : [];
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

  const generateQr = async () => {
    if (!selectedId) return;

    // Check for duplicate
    const dup = history.find(h =>
      (h.tableNumber || '') === (tableNumber || '') &&
      (h.platform || '') === (selectedPlatform || '')
    );
    if (dup) {
      setDuplicateWarning(true);
      setTimeout(() => setDuplicateWarning(false), 4000);
    }

    setGenerating(true);
    setQrError('');
    try {
      const query = new URLSearchParams({ format: 'svg', dark: activeDark });
      if (tableNumber) query.append('table', tableNumber);
      if (selectedPlatform) query.append('platform', selectedPlatform);

      const response = await fetch(`/api/restaurants/${selectedId}/qr?${query.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setQrSvg('');
        if (response.status === 401) {
          setQrError('Oturum süreniz dolmuş. Lütfen yeniden giriş yapın.');
        } else if (response.status === 409) {
          setQrError('Bu işletme pasif durumda. QR oluşturmak için aktifleştirin.');
        } else {
          setQrError(data?.error || `QR oluşturulamadı (HTTP ${response.status})`);
        }
        return;
      }

      const svg = await response.text();
      setQrSvg(svg);

      const newItem: QrHistoryItem = {
        id: `local_${Date.now()}`,
        qrUrl: qrTargetUrl,
        tableNumber: tableNumber || null,
        platform: selectedPlatform || null,
        createdAt: new Date().toISOString(),
      };
      saveToLocalHistory(selectedId, newItem);
      setTimeout(() => fetchHistory(selectedId), 200);
    } catch (error) {
      console.error(error);
      setQrError('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      generateQr();
    }
  }, [selectedId, tableNumber, activeDark, selectedPlatform]);

  useEffect(() => {
    if (selectedId) {
      fetchHistory(selectedId);
    }
  }, [selectedId]);

  const downloadQr = async (format: 'svg' | 'png') => {
    if (!selectedId) return;

    const query = new URLSearchParams({ format, dark: activeDark });
    if (tableNumber) query.append('table', tableNumber);
    if (selectedPlatform) query.append('platform', selectedPlatform);

    const response = await fetch(`/api/restaurants/${selectedId}/qr?${query.toString()}`);
    if (!response.ok) return;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${selectedRestaurant?.slug || 'code'}${tableNumber ? `-table-${tableNumber}` : ''}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrSvg) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedRestaurant?.name || 'Buaze'} QR</title>
          <style>
            body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
            .wrap { text-align: center; }
            svg { width: 280px; height: 280px; }
            h2 { margin: 16px 0 4px; color: #0F2348; }
            p { margin: 0; color: #6b7280; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            ${qrSvg}
            <h2>${selectedRestaurant?.name || ''}</h2>
            ${tableNumber ? `<p>${locale === 'tr' ? 'Masa' : 'Table'} ${tableNumber}</p>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const copyUrl = async () => {
    if (!qrTargetUrl) return;

    const success = await copyToClipboard(qrTargetUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const copyHistoryItem = (item: QrHistoryItem) => {
    if (!item.qrUrl) return;
    copyToClipboard(item.qrUrl);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0F2348]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8 px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[#0F2348]">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-bold text-[#243554] sm:text-base">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 lg:order-1 space-y-4 sm:space-y-6">
          <div className="rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <QrCode size={20} strokeWidth={3} />
              </div>
              <h2 className="text-lg font-black text-[#0F2348] sm:text-xl">{copy.qrPreview}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
              <label className="space-y-2 block">
                <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7B93]">{copy.business}</span>
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F5F4F1] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#0F2348] outline-none transition-all focus:ring-2 focus:ring-[#FF9A14]"
                >
                  <option value="">{locale === 'tr' ? 'İşletme seçin' : 'Select a location'}</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7B93]">{copy.table}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value && Number(value) > 1 ? String(Number(value) - 1) : ''))}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#0F2348] shadow-sm"
                  >
                    <Minus size={18} strokeWidth={2.75} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value.replace(/\D/g, ''))}
                    placeholder={locale === 'tr' ? 'Genel' : 'General'}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-[#F5F4F1] px-3 sm:px-5 py-3.5 sm:py-4 text-center text-sm font-bold text-[#0F2348] outline-none transition-all focus:ring-2 focus:ring-[#FF9A14]"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value ? String(Number(value) + 1) : '1'))}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#0F2348] shadow-sm"
                  >
                    <Plus size={18} strokeWidth={2.75} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7B93]">{copy.platform}</span>
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-[#F5F4F1] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#0F2348] outline-none transition-all focus:ring-2 focus:ring-[#FF9A14]"
              >
                <option value="">{copy.genel}</option>
                <option value="google">GOOGLE</option>
                <option value="yemeksepeti">YEMEKSEPETİ</option>
                <option value="getir">GETİR</option>
                <option value="trendyol_go">TRENDYOL GO</option>
              </select>
            </div>

            {/* ─── Color Picker ─── */}
            <div className="mt-5 space-y-2">
              <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7B93]">
                <Palette size={12} className="inline -mt-0.5 mr-1" />{copy.colorLabel}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedRestaurant?.primaryColor && (
                  <button
                    type="button"
                    onClick={() => setUseBrandColor(true)}
                    className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                      useBrandColor
                        ? 'border-[#0F2348] bg-[#0F2348] text-white shadow-md'
                        : 'border-gray-200 bg-white text-[#243554] hover:border-gray-300'
                    }`}
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-md border border-white/30"
                      style={{ background: selectedRestaurant.primaryColor }}
                    />
                    {copy.brandColor}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUseBrandColor(false)}
                  className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                    !useBrandColor
                      ? 'border-[#0F2348] bg-[#0F2348] text-white shadow-md'
                      : 'border-gray-200 bg-white text-[#243554] hover:border-gray-300'
                  }`}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-md border border-gray-300"
                    style={{ background: customDark }}
                  />
                  {copy.customColor}
                </button>
                {!useBrandColor && (
                  <input
                    type="color"
                    value={customDark}
                    onChange={(e) => setCustomDark(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-xl border border-gray-200 bg-transparent p-0.5"
                  />
                )}
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#0F2348]/10 bg-[#0F2348] p-5 text-white">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF9A14]">{copy.target}</span>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white"
                >
                  {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                  {copied ? copy.copied : copy.copy}
                </button>
              </div>
              <p className="truncate text-xs font-bold text-white/70">{qrTargetUrl || 'https://buaze.com/r/...'}</p>
            </div>

            <div className="mt-5 sm:mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={generateQr}
                disabled={generating || !selectedId}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F2348] px-4 sm:px-5 py-3 text-xs sm:text-sm font-black text-white transition-all disabled:opacity-50"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} strokeWidth={2.75} />}
                {copy.refresh}
              </button>
              <button type="button" onClick={() => downloadQr('svg')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-black text-[#0F2348] shadow-sm">
                <Download size={18} strokeWidth={2.75} />
                SVG
              </button>
              <button type="button" onClick={() => downloadQr('png')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-black text-[#0F2348] shadow-sm">
                <Download size={18} strokeWidth={2.75} />
                PNG
              </button>
              <button type="button" onClick={handlePrint} className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-black text-[#0F2348] shadow-sm">
                <Printer size={18} strokeWidth={2.75} />
                {copy.print}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#0F2348] sm:text-xl">{copy.history}</h2>
              {historyLoading && <Loader2 className="h-5 w-5 animate-spin text-[#0F2348]" />}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-[#F5F4F1] px-4 py-8 text-center text-sm font-bold text-[#243554]">
                  {copy.noHistory}
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-[#F5F4F1] px-4 py-3">
                    <div className="shrink-0 rounded-xl bg-white border border-gray-200 px-2.5 py-2 text-center min-w-[64px]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7B93]">
                        {new Date(item.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-xs font-black text-[#0F2348]">
                        {new Date(item.createdAt).toLocaleTimeString(locale === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black text-[#0F2348]">{item.qrUrl}</p>
                        <CopyUrlButton url={item.qrUrl} className="h-6 w-6 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-bold text-[#243554]">
                          {item.tableNumber ? `${locale === 'tr' ? 'Masa' : 'Table'} ${item.tableNumber}` : (locale === 'tr' ? 'Genel QR' : 'General QR')}
                        </p>
                        {item.platform && PLATFORM_BADGE[item.platform] && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white ${PLATFORM_BADGE[item.platform].bg}`}>
                            {PLATFORM_BADGE[item.platform].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2 rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
          <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#0F2348] text-[#FF9A14]">
                   <QrCode size={20} strokeWidth={3} />
                </div>
                <h2 className="text-lg font-black text-[#0F2348] sm:text-xl">{copy.qrPreview}</h2>
                {selectedPlatform && PLATFORM_BADGE[selectedPlatform] && (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-sm ${PLATFORM_BADGE[selectedPlatform].bg}`}>
                    {PLATFORM_BADGE[selectedPlatform].label}
                  </span>
                )}
             </div>
             {duplicateWarning && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                   <AlertCircle size={12} strokeWidth={2.5} />
                   Zaten Mevcut
                </div>
             )}
          </div>

          <div className="flex min-h-[260px] sm:min-h-[360px] items-center justify-center rounded-[24px] sm:rounded-[28px] border border-dashed border-gray-200 bg-[#F5F4F1] p-4 sm:p-6">
            {generating ? (
              <Loader2 className="h-10 w-10 animate-spin text-[#0F2348]" />
            ) : qrSvg ? (
              <div className="w-full space-y-4 sm:space-y-5 text-center">
                <div className="mx-auto w-full max-w-[220px] overflow-hidden sm:max-w-[280px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <div>
                  <p className="text-lg font-black text-[#0F2348]">{selectedRestaurant?.name}</p>
                  {tableNumber && (
                    <p className="mt-1 text-sm font-bold text-[#243554]">
                      {locale === 'tr' ? 'Masa' : 'Table'} {tableNumber}
                    </p>
                  )}
                </div>
              </div>
            ) : qrError ? (
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <QrCode size={24} strokeWidth={2.5} className="text-red-400" />
                </div>
                <p className="text-sm font-black text-red-500 uppercase tracking-wide">{qrError}</p>
                <button
                  type="button"
                  onClick={generateQr}
                  className="text-xs font-black text-[#0F2348] underline underline-offset-2 uppercase tracking-widest"
                >
                  {locale === 'tr' ? 'Tekrar Dene' : 'Retry'}
                </button>
              </div>
            ) : (
              <p className="text-sm font-bold text-[#243554]">{locale === 'tr' ? 'QR oluşturmak için işletme seçin.' : 'Select a location to generate a QR code.'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
