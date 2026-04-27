'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Copy, Download, Loader2, Minus, Palette, Plus, Printer, QrCode, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';
import { copyToClipboard } from '@/lib/clipboard';
import PlatformLogo, { type PlatformId } from '@/components/marketing/PlatformLogo';

const PLATFORM_LOGO_ID: Record<string, PlatformId> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir-yemek',
  trendyol_go: 'trendyol-go',
};

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
            h2 { margin: 16px 0 4px; color: #0A0A0A; }
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
        <Loader2 className="h-10 w-10 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'QR YÖNETİMİ' : 'QR MANAGEMENT'}
        title={copy.title}
        description={copy.subtitle}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="order-2 lg:order-1 space-y-4">
          {/* ═════ Step 1 — Kampanya detayları ═════ */}
          <section className="bz-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A] text-[13px] font-semibold bz-h-tight"
              >
                1
              </div>
              <h2
                className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
              >
                {locale === 'tr' ? 'Kampanya detayları' : 'Campaign details'}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2 block">
                <span className="pulse-eyebrow text-[#737373]">{copy.business}</span>
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                >
                  <option value="">{locale === 'tr' ? 'İşletme seçin' : 'Select a location'}</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 block">
                <span className="pulse-eyebrow text-[#737373]">{copy.platform}</span>
                <div className="relative">
                  <select
                    value={selectedPlatform}
                    onChange={(event) => setSelectedPlatform(event.target.value)}
                    className={`w-full rounded-xl border border-[#EDEDED] bg-white py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E] ${
                      selectedPlatform && PLATFORM_LOGO_ID[selectedPlatform] ? 'pl-11' : 'pl-4'
                    } pr-4`}
                  >
                    <option value="">{copy.genel}</option>
                    <option value="google">Google</option>
                    <option value="yemeksepeti">Yemeksepeti</option>
                    <option value="getir">Getir</option>
                    <option value="trendyol_go">Trendyol GO</option>
                  </select>
                  {selectedPlatform && PLATFORM_LOGO_ID[selectedPlatform] && (
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                      <PlatformLogo id={PLATFORM_LOGO_ID[selectedPlatform]} size={20} rounded={5} />
                    </span>
                  )}
                </div>
              </label>

              {/* Removed: dead "Yerleşim" pills (Masa/Fatura/Kapı/Paket).
                  No backend support; the pills had no onClick and confused
                  users into thinking they were selecting a template. The
                  Masa/Konum input below already covers the meaningful
                  placement decision per the QR URL contract. */}

              <div className="space-y-2">
                <span className="pulse-eyebrow text-[#737373]">{copy.table}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value && Number(value) > 1 ? String(Number(value) - 1) : ''))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#EDEDED] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                  >
                    <Minus size={14} strokeWidth={2} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value.replace(/\D/g, ''))}
                    placeholder={locale === 'tr' ? 'Genel' : 'General'}
                    className="min-w-0 flex-1 rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 text-center text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber((value) => (value ? String(Number(value) + 1) : '1'))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#EDEDED] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                  >
                    <Plus size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="pulse-eyebrow text-[#737373]">
                  {locale === 'tr' ? 'ADET' : 'QTY'}
                </span>
                <div className="rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#525252]">
                  {tableNumber
                    ? `${locale === 'tr' ? 'Tek QR' : '1 QR'}${tableNumber ? ` (M${tableNumber})` : ''}`
                    : locale === 'tr' ? '1 adet (genel)' : '1 QR (general)'}
                </div>
              </div>
            </div>
          </section>

          {/* ═════ Step 2 — Akış ═════ */}
          <section className="bz-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A] text-[13px] font-semibold bz-h-tight"
              >
                2
              </div>
              <h2
                className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
              >
                {locale === 'tr' ? 'Akış' : 'Flow'}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(
                locale === 'tr'
                  ? [
                      { n: '1', t: 'Tarama', d: 'Müşteri QR okur' },
                      { n: '2', t: 'Puan verir', d: '1-5 yıldız ekran' },
                      { n: '3', t: 'Not bırakır', d: 'Opsiyonel metin' },
                      { n: '4', t: 'Yönlendirme', d: '≥4 → Google\n<4 → Özel form' },
                    ]
                  : [
                      { n: '1', t: 'Scan', d: 'Customer scans QR' },
                      { n: '2', t: 'Rate', d: '1-5 star screen' },
                      { n: '3', t: 'Note', d: 'Optional text' },
                      { n: '4', t: 'Route', d: '≥4 → Google\n<4 → Private form' },
                    ]
              ).map((s) => (
                <div key={s.n} className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3.5">
                  <div className="pulse-eyebrow text-[#A8D62E]">
                    {locale === 'tr' ? 'ADIM' : 'STEP'} {s.n}
                  </div>
                  <div
                    className="mt-1.5 text-[14px] font-semibold text-[#0A0A0A] bz-h-tight"
                  >
                    {s.t}
                  </div>
                  <p className="mt-1 text-[11px] text-[#737373] leading-[1.45] whitespace-pre-line">
                    {s.d}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#EAF9B8] p-3 text-[12px] leading-[1.5]">
              <span className="text-[13px]">✓</span>
              <span>
                {locale === 'tr' ? (
                  <>
                    Google politikalarına <b>%100 uyumlu</b>. Olumsuz yorumlar gizlenmez; süzülmez — sadece iç yönetime atanır.
                  </>
                ) : (
                  <>
                    <b>100% compliant</b> with Google policy. Negative reviews are never hidden or filtered — only routed to internal management.
                  </>
                )}
              </span>
            </div>
          </section>

          {/* ═════ Step 3 — Tasarım ═════ */}
          <section className="bz-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A] text-[13px] font-semibold bz-h-tight"
              >
                3
              </div>
              <h2
                className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
              >
                {locale === 'tr' ? 'Tasarım' : 'Design'}
              </h2>
            </div>

            {/* Color pills (brand / custom) */}
            <div className="mb-4">
              <span className="pulse-eyebrow text-[#737373]">
                <Palette size={11} className="inline -mt-0.5 mr-1" />
                {copy.colorLabel}
              </span>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {selectedRestaurant?.primaryColor && (
                  <button
                    type="button"
                    onClick={() => setUseBrandColor(true)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 pulse-eyebrow transition-all ${
                      useBrandColor
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                        : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
                    }`}
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-md"
                      style={{ background: selectedRestaurant.primaryColor }}
                    />
                    {copy.brandColor}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUseBrandColor(false)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 pulse-eyebrow transition-all ${
                    !useBrandColor
                      ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                      : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
                  }`}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-md border border-[#EDEDED]"
                    style={{ background: customDark }}
                  />
                  {copy.customColor}
                </button>
                {!useBrandColor && (
                  <input
                    type="color"
                    value={customDark}
                    onChange={(e) => setCustomDark(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-[#EDEDED] bg-transparent p-0.5"
                  />
                )}
              </div>
            </div>

            {/* Removed: dead "Şablon" thumbnail grid (Lime/Beyaz/Koyu/Minimal).
                These cards looked clickable but had no onClick + no backend
                template field on the QR generation endpoint. Real renk
                kontrolü zaten yukarıdaki "Marka Rengi / Özel Renk" toggle'ı
                üzerinden çalışıyor. UX-açısı: kullanıcı şablon seçtiğini
                sandığında preview değişmiyordu → kafa karışıklığı. */}
          </section>

          {/* Target URL + Actions row */}
          <div className="rounded-xl bg-[#0A0A0A] p-5 text-white">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="pulse-eyebrow text-[#C6F24E]">{copy.target}</span>
              <button
                type="button"
                onClick={copyUrl}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5 pulse-eyebrow text-white transition-colors"
              >
                {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
                {copied ? copy.copied : copy.copy}
              </button>
            </div>
            <p className="truncate text-[12px] text-white/60 font-mono">{qrTargetUrl || 'https://buaze.com/r/...'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => downloadQr('svg')}
              disabled={generating || !selectedId}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-5 py-3 text-[13px] font-medium text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
              {locale === 'tr' ? 'SVG indir' : 'Download SVG'}
            </button>
            <button
              type="button"
              onClick={() => downloadQr('png')}
              disabled={generating || !selectedId}
              className="pulse-btn-dark inline-flex items-center justify-center gap-1.5 rounded-full disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
              {locale === 'tr' ? 'PNG indir' : 'Download PNG'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateQr}
              disabled={generating || !selectedId}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
              {copy.refresh}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors"
            >
              <Printer size={14} strokeWidth={2} />
              {copy.print}
            </button>
          </div>

          <div className="bz-card p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">{copy.history}</h2>
              {historyLoading && <Loader2 className="h-5 w-5 animate-spin text-[#0A0A0A]" />}
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-4 py-10 text-center">
                <div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#EDEDED] text-[#737373]"
                  aria-hidden="true"
                >
                  <QrCode size={18} strokeWidth={2} />
                </div>
                <p className="text-[13px] text-[#525252]">{copy.noHistory}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((item) => {
                  const platformMeta = item.platform ? PLATFORM_BADGE[item.platform] : null;
                  const dateStr = new Date(item.createdAt).toLocaleDateString(
                    locale === 'tr' ? 'tr-TR' : 'en-US',
                    { day: '2-digit', month: 'short', year: '2-digit' },
                  );
                  return (
                    <div
                      key={item.id}
                      className="bz-card p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="bz-h-tight" style={{ fontSize: 14 }}>
                            {item.tableNumber
                              ? `${locale === 'tr' ? 'Masa' : 'Table'} ${item.tableNumber}`
                              : (locale === 'tr' ? 'Genel QR' : 'General QR')}
                          </div>
                          <div className="pulse-eyebrow text-[#737373] mt-0.5">{dateStr}</div>
                        </div>
                        {platformMeta && (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold text-white ${platformMeta.bg}`}
                            style={{ letterSpacing: '0.04em' }}
                          >
                            {platformMeta.label}
                          </span>
                        )}
                      </div>
                      <div
                        className="rounded-lg bg-[#FAFAFA] border border-[#EDEDED] px-3 py-2.5 truncate text-[11px] font-mono text-[#525252]"
                        title={item.qrUrl}
                      >
                        {item.qrUrl}
                      </div>
                      <div
                        className="grid grid-cols-2 gap-2 pt-2"
                        style={{ borderTop: '1px solid #EDEDED' }}
                      >
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.qrUrl)}
                          className="bz-btn-ghost"
                          style={{ padding: '6px 10px', fontSize: 11 }}
                        >
                          <Copy size={12} strokeWidth={2} />
                          {copy.copy}
                        </button>
                        <a
                          href={item.qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bz-btn-ghost"
                          style={{ padding: '6px 10px', fontSize: 11 }}
                        >
                          <Download size={12} strokeWidth={2} />
                          {locale === 'tr' ? 'Aç' : 'Open'}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2 space-y-3">
          <div className="flex items-center justify-between sticky top-0">
            <span className="pulse-eyebrow text-[#737373]">
              {locale === 'tr' ? 'CANLI ÖNİZLEME' : 'LIVE PREVIEW'}
            </span>
            {duplicateWarning && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 pulse-eyebrow">
                <AlertCircle size={11} strokeWidth={2} />
                {locale === 'tr' ? 'ZATEN MEVCUT' : 'ALREADY EXISTS'}
              </div>
            )}
          </div>

          {/* Two-up preview: QR card + phone screen mockup (stacks on narrow viewports) */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
            {/* QR card mock */}
            <div
              className="rounded-2xl p-4 aspect-[3/4] min-[420px]:aspect-[3/4] flex flex-col items-center justify-between max-w-[280px] w-full mx-auto min-[420px]:max-w-none min-[420px]:mx-0"
              style={{ background: activeDark === '#C6F24E' ? '#C6F24E' : '#C6F24E' }}
            >
              <div className="text-center">
                <div className="pulse-eyebrow text-[#0A0A0A]/60">
                  {(selectedRestaurant?.name || (locale === 'tr' ? 'İŞLETME' : 'BUSINESS'))
                    .toUpperCase()
                    .slice(0, 22)}
                </div>
                <div
                  className="mt-2 text-[20px] font-medium leading-[1] tracking-[-0.02em] text-[#0A0A0A] bz-h-tight"
                >
                  {locale === 'tr' ? 'Deneyiminizi paylaşın.' : 'Share your experience.'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2">
                {generating ? (
                  <div className="h-[80px] w-[80px] flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#0A0A0A]" />
                  </div>
                ) : qrSvg ? (
                  <div
                    className="h-[80px] w-[80px] [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="h-[80px] w-[80px] bg-[#F5F5F5] rounded" />
                )}
              </div>
              <div className="pulse-eyebrow text-[#0A0A0A]/80">
                BUAZE · {tableNumber ? `M${tableNumber.padStart(2, '0')}` : locale === 'tr' ? 'GENEL' : 'GENERAL'}
              </div>
            </div>

            {/* Phone screen mockup — hide on < 420px to avoid cramped layout */}
            <div className="hidden min-[420px]:block bg-[#0A0A0A] rounded-[28px] p-2.5 aspect-[9/19]">
              <div className="bg-white rounded-[20px] h-full p-3 flex flex-col gap-2.5">
                <div className="pulse-eyebrow text-[#737373] text-[9px]">
                  {(selectedRestaurant?.name || 'BUAZE').toUpperCase().slice(0, 18)}
                </div>
                <div
                  className="text-[14px] font-medium text-[#0A0A0A] tracking-[-0.015em] leading-[1.15] bz-h-tight"
                >
                  {locale === 'tr' ? 'Deneyiminiz nasıldı?' : 'How was your experience?'}
                </div>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                        i <= 4 ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#EDEDED] text-[#0A0A0A]'
                      }`}
                    >
                      ★
                    </div>
                  ))}
                </div>
                <div className="bg-[#FAFAFA] rounded p-2 text-[9px] text-[#A3A3A3] min-h-[40px]">
                  {locale === 'tr' ? 'Kısa notunuz...' : 'Your note...'}
                </div>
                <div className="mt-auto bg-[#0A0A0A] text-white rounded-full text-center text-[10px] font-medium py-1.5">
                  {locale === 'tr' ? 'Paylaş →' : 'Share →'}
                </div>
              </div>
            </div>
          </div>

          {/* QR URL + active platform logo */}
          <div className="rounded-xl bg-[#FAFAFA] border border-[#EDEDED] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="pulse-eyebrow text-[#737373]">QR URL</span>
              {selectedPlatform && PLATFORM_LOGO_ID[selectedPlatform] && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#EDEDED] pl-1 pr-2.5 py-0.5">
                  <PlatformLogo
                    id={PLATFORM_LOGO_ID[selectedPlatform]}
                    size={18}
                    rounded={4}
                  />
                  <span className="pulse-eyebrow text-[#525252]">
                    {PLATFORM_BADGE[selectedPlatform]?.label || selectedPlatform}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[11px] font-mono text-[#0A0A0A] break-all leading-[1.4]">
              {qrTargetUrl ? qrTargetUrl.replace(/^https?:\/\//, '') : 'buaze.com/r/...'}
            </p>
          </div>

          {/* Error state fallback */}
          {qrError && !qrSvg && (
            <AlertBanner kind="danger">
              <div className="flex flex-col gap-1">
                <span>{qrError}</span>
                <button
                  type="button"
                  onClick={generateQr}
                  className="pulse-eyebrow self-start text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E] transition-colors"
                >
                  {locale === 'tr' ? 'TEKRAR DENE' : 'RETRY'}
                </button>
              </div>
            </AlertBanner>
          )}

          {!selectedId && !qrError && (
            <p className="text-[12px] text-[#737373] text-center py-3">
              {locale === 'tr' ? 'QR oluşturmak için işletme seçin.' : 'Select a location to generate a QR code.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
