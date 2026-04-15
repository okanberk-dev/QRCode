'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Copy, Download, Loader2, Minus, Plus, Printer, QrCode, RefreshCw } from 'lucide-react';

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
  const [history, setHistory] = useState<QrHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const safeEnvAppUrl = envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
    ? envAppUrl
    : 'https://buaze.com';

  useEffect(() => {
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
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

    return `${appUrl}/r/${selectedRestaurant.slug}?source=qr${tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : ''}`;
  }, [appUrl, selectedRestaurant, tableNumber]);

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
      };

  const fetchHistory = async (restaurantId: string) => {
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
  };

  const generateQr = async () => {
    if (!selectedId) return;

    setGenerating(true);
    try {
      const query = new URLSearchParams({ format: 'svg' });
      if (tableNumber) query.append('table', tableNumber);

      const response = await fetch(`/api/restaurants/${selectedId}/qr?${query.toString()}`);
      if (!response.ok) return;

      const svg = await response.text();
      setQrSvg(svg);
      await fetchHistory(selectedId);
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      generateQr();
    }
  }, [selectedId, tableNumber]);

  useEffect(() => {
    if (selectedId) {
      fetchHistory(selectedId);
    }
  }, [selectedId]);

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
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8 px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[#111827]">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-bold text-[#6b6760] sm:text-base">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 lg:order-1 space-y-4 sm:space-y-6">
          <div className="rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <QrCode size={20} strokeWidth={3} />
              </div>
              <h2 className="text-lg font-black text-[#111827] sm:text-xl">{copy.qrPreview}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
              <label className="space-y-2 block">
                <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{copy.business}</span>
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
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
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value && Number(value) > 1 ? String(Number(value) - 1) : ''))}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#111827] shadow-sm"
                  >
                    <Minus size={18} strokeWidth={2.75} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value.replace(/\D/g, ''))}
                    placeholder={locale === 'tr' ? 'Genel' : 'General'}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-[#FCFBF7] px-3 sm:px-5 py-3.5 sm:py-4 text-center text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value ? String(Number(value) + 1) : '1'))}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#111827] shadow-sm"
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

            <div className="mt-5 sm:mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={generateQr}
                disabled={generating || !selectedId}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 sm:px-5 py-3 text-xs sm:text-sm font-black text-white transition-all disabled:opacity-50"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} strokeWidth={2.75} />}
                {copy.refresh}
              </button>
              <button type="button" onClick={() => downloadQr('svg')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-black text-[#111827] shadow-sm">
                <Download size={18} strokeWidth={2.75} />
                SVG
              </button>
              <button type="button" onClick={() => downloadQr('png')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-black text-[#111827] shadow-sm">
                <Download size={18} strokeWidth={2.75} />
                PNG
              </button>
              <button type="button" onClick={handlePrint} className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-3 text-xs sm:text-sm font-black text-[#111827] shadow-sm">
                <Printer size={18} strokeWidth={2.75} />
                {copy.print}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
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

        <div className="order-1 lg:order-2 rounded-[24px] sm:rounded-[28px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
          <div className="mb-4 sm:mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#111827] text-[#FDBF1D]">
              <QrCode size={20} strokeWidth={3} />
            </div>
            <h2 className="text-lg font-black text-[#111827] sm:text-xl">{copy.qrPreview}</h2>
          </div>

          <div className="flex min-h-[260px] sm:min-h-[360px] items-center justify-center rounded-[24px] sm:rounded-[28px] border border-dashed border-gray-200 bg-[#FCFBF7] p-4 sm:p-6">
            {generating ? (
              <Loader2 className="h-10 w-10 animate-spin text-[#111827]" />
            ) : qrSvg ? (
              <div className="w-full space-y-4 sm:space-y-5 text-center">
                <div className="mx-auto max-w-[220px] sm:max-w-[280px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
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
              <p className="text-sm font-bold text-[#6b6760]">{locale === 'tr' ? 'QR oluşturmak için işletme seçin.' : 'Select a location to generate a QR code.'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
