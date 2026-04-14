'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, Check, Copy, Download, Loader2, Minus, Plus, Printer, QrCode, RefreshCw } from 'lucide-react';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
}

interface QrHistoryItem {
  id: string;
  qrUrl: string;
  tableNumber: string | null;
  createdAt: string;
}

function DashboardQrContent() {
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
  const [qrError, setQrError] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<QrHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const safeEnvAppUrl = envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
    ? envAppUrl
    : 'https://buaze.com';

  // Fetch restaurant list once on mount (and when preselected changes from URL)
  useEffect(() => {
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRestaurants(list);
        // Auto-select: preselected from URL takes priority, otherwise first restaurant
        setSelectedId((prev) => {
          if (prev) return prev; // already set
          return preselected || (list.length > 0 ? list[0].id : '');
        });
      })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [preselected]);

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedId);
  const appUrl = safeEnvAppUrl || (typeof window !== 'undefined'
    ? window.location.origin.replace(/\/+$/, '')
    : 'https://buaze.com');

  const qrTargetUrl = useMemo(() => {
    if (!selectedRestaurant) return '';
    return `${appUrl}/r/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}`;
  }, [appUrl, selectedRestaurant, tableNumber]);

  const copy = locale === 'tr'
    ? {
        title: 'QR Kod Yönetimi',
        subtitle: 'İşletmeleriniz için baskıya hazır ve mobil uyumlu QR kodlar üretin.',
        business: 'İşletme',
        table: 'Masa / Konum',
        target: 'Hedef Bağlantı',
        refresh: 'QR Oluştur',
        copy: 'Kopyala',
        copied: 'Kopyalandı',
        history: 'Son Üretilenler',
        downloadSvg: 'SVG İndir',
        downloadPng: 'PNG İndir',
        print: 'Yazdır',
        qrPreview: 'QR Önizleme',
        noHistory: 'Henüz QR üretim kaydı yok.',
        selectPrompt: 'İşletme seçin ve QR Oluştur\'a tıklayın.',
        generateBtn: 'QR Oluştur',
      }
    : {
        title: 'QR Management',
        subtitle: 'Generate print-ready, mobile-friendly QR codes for your locations.',
        business: 'Location',
        table: 'Table / Spot',
        target: 'Target URL',
        refresh: 'Generate QR',
        copy: 'Copy',
        copied: 'Copied',
        history: 'Recent QR Codes',
        downloadSvg: 'Download SVG',
        downloadPng: 'Download PNG',
        print: 'Print',
        qrPreview: 'QR Preview',
        noHistory: 'No QR history yet.',
        selectPrompt: 'Select a location and click Generate QR.',
        generateBtn: 'Generate QR',
      };

  const fetchHistory = useCallback(async (restaurantId: string) => {
    if (!restaurantId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/qr/history`);
      if (!response.ok) {
        setHistory([]);
        return;
      }
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const generateQr = useCallback(async (restaurantId: string, table: string) => {
    if (!restaurantId) return;

    setGenerating(true);
    setQrError('');
    try {
      const query = new URLSearchParams({ format: 'svg' });
      if (table) query.append('table', table);

      const response = await fetch(`/api/restaurants/${restaurantId}/qr?${query.toString()}`);
      if (!response.ok) {
        let errMsg = `Hata ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error) errMsg = errData.error;
        } catch { /* ignore */ }
        setQrError(errMsg);
        return;
      }

      const svg = await response.text();
      if (!svg || svg.trim().length === 0) {
        setQrError('QR kodu boş döndü. Lütfen tekrar deneyin.');
        return;
      }
      setQrSvg(svg);
      await fetchHistory(restaurantId);
    } catch (error) {
      console.error('QR generation error:', error);
      setQrError(locale === 'tr' ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [fetchHistory, locale]);

  // Auto-generate when selectedId changes
  useEffect(() => {
    if (selectedId) {
      setQrSvg('');
      setQrError('');
      generateQr(selectedId, tableNumber);
      fetchHistory(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Re-generate when tableNumber changes (debounced-ish via user action)
  useEffect(() => {
    if (selectedId && tableNumber !== undefined) {
      setQrSvg('');
      setQrError('');
      generateQr(selectedId, tableNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  const downloadQr = async (format: 'svg' | 'png') => {
    if (!selectedId) return;

    const query = new URLSearchParams({ format });
    if (tableNumber) query.append('table', tableNumber);

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
            h2 { margin: 16px 0 4px; color: #111827; }
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
    await navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#111827]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-bold text-[#6b6760] sm:text-base">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <QrCode size={20} strokeWidth={3} />
              </div>
              <h2 className="text-lg font-black text-[#111827] sm:text-xl">{copy.qrPreview}</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{copy.business}</span>
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
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
                <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{copy.table}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value && Number(value) > 1 ? String(Number(value) - 1) : ''))}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#111827] shadow-sm"
                  >
                    <Minus size={18} strokeWidth={2.75} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value.replace(/\D/g, ''))}
                    placeholder={locale === 'tr' ? 'Genel' : 'General'}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-[#FCFBF7] px-5 py-4 text-center text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value ? String(Number(value) + 1) : '1'))}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#111827] shadow-sm"
                  >
                    <Plus size={18} strokeWidth={2.75} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#111827]/10 bg-[#111827] p-5 text-white">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FDBF1D]">{copy.target}</span>
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

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => generateQr(selectedId, tableNumber)}
                disabled={generating || !selectedId}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-black text-white transition-all disabled:opacity-50 hover:bg-[#1f2937]"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} strokeWidth={2.75} />}
                {copy.refresh}
              </button>
              <button type="button" onClick={() => downloadQr('svg')} disabled={!qrSvg} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-[#111827] shadow-sm disabled:opacity-40">
                <Download size={18} strokeWidth={2.75} />
                {copy.downloadSvg}
              </button>
              <button type="button" onClick={() => downloadQr('png')} disabled={!qrSvg} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-[#111827] shadow-sm disabled:opacity-40">
                <Download size={18} strokeWidth={2.75} />
                {copy.downloadPng}
              </button>
              <button type="button" onClick={handlePrint} disabled={!qrSvg} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-[#111827] shadow-sm disabled:opacity-40">
                <Printer size={18} strokeWidth={2.75} />
                {copy.print}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#111827] sm:text-xl">{copy.history}</h2>
              {historyLoading && <Loader2 className="h-5 w-5 animate-spin text-[#111827]" />}
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FCFBF7] px-4 py-8 text-center text-sm font-bold text-[#6b6760]">
                  {copy.noHistory}
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-[#FCFBF7] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#111827]">{item.qrUrl}</p>
                      <p className="mt-1 text-xs font-bold text-[#6b6760]">
                        {item.tableNumber ? `${locale === 'tr' ? 'Masa' : 'Table'} ${item.tableNumber}` : (locale === 'tr' ? 'Genel QR' : 'General QR')}
                      </p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[#ada89f]">
                      {new Date(item.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* QR Preview Panel */}
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-[#FDBF1D]">
              <QrCode size={20} strokeWidth={3} />
            </div>
            <h2 className="text-lg font-black text-[#111827] sm:text-xl">{copy.qrPreview}</h2>
          </div>

          <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-gray-200 bg-[#FCFBF7] p-6">
            {generating ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#111827]" />
                <p className="text-xs font-bold text-[#6b6760]">{locale === 'tr' ? 'Oluşturuluyor...' : 'Generating...'}</p>
              </div>
            ) : qrError ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                  <AlertCircle size={28} className="text-red-500" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-red-600">{locale === 'tr' ? 'QR Oluşturulamadı' : 'Failed to Generate QR'}</p>
                  <p className="mt-1 text-xs font-bold text-[#6b6760]">{qrError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => generateQr(selectedId, tableNumber)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-black text-white"
                >
                  <RefreshCw size={16} strokeWidth={2.75} />
                  {locale === 'tr' ? 'Tekrar Dene' : 'Retry'}
                </button>
              </div>
            ) : qrSvg ? (
              <div className="w-full space-y-5 text-center">
                <div className="mx-auto max-w-[280px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <div>
                  <p className="text-lg font-black text-[#111827]">{selectedRestaurant?.name}</p>
                  {tableNumber && (
                    <p className="mt-1 text-sm font-bold text-[#6b6760]">
                      {locale === 'tr' ? 'Masa' : 'Table'} {tableNumber}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F4F0]">
                  <QrCode size={28} className="text-[#ada89f]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#6b6760]">{copy.selectPrompt}</p>
                </div>
                {selectedId && (
                  <button
                    type="button"
                    onClick={() => generateQr(selectedId, tableNumber)}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    <QrCode size={16} strokeWidth={2.75} />
                    {copy.generateBtn}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardQrPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#111827]" />
      </div>
    }>
      <DashboardQrContent />
    </Suspense>
  );
}
