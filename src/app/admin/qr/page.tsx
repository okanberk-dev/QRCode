'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, QrCode, Mail, RefreshCw, Copy, Check, Printer, Plus, Minus, Palette, Layers, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';
import { AlertBanner, Eyebrow, PageHeader } from '@/components/ui';

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
  const [actionNotice, setActionNotice] = useState<{ kind: 'danger' | 'warn'; text: string } | null>(null);

  const showActionNotice = (text: string, kind: 'danger' | 'warn' = 'danger') => {
    setActionNotice({ kind, text });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setActionNotice(null), 5000);
    }
  };

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
      showActionNotice(err?.error || 'QR indirilemedi.');
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
        showActionNotice(err?.error || 'QR indirilemedi.');
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
      showActionNotice('QR indirilemedi.');
    }
  };

  const handleExportHistory = async () => {
    if (!selectedId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/restaurants/${selectedId}/qr/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showActionNotice(err?.error || 'Dışa aktarma başarısız.');
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
      showActionNotice('Bağlantı hatası.');
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
  const platformLabel = selectedPlatform ? PLATFORM_BADGE[selectedPlatform]?.label || selectedPlatform : 'Genel';
  const placementLabel = tableNumber ? `M${tableNumber.padStart(2, '0')}` : 'GENEL';

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow="QR YÖNETİMİ"
        title="QR kodu oluştur"
        description="İşletmenize özel QR kartları hazırlayın, platform bazında ölçümleyin ve masa aralıklarını tek yerden yönetin."
      />

      {actionNotice && (
        <AlertBanner kind={actionNotice.kind} onDismiss={() => setActionNotice(null)}>
          {actionNotice.text}
        </AlertBanner>
      )}

      {/* Live preview pills (3-up summary of current selection) */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'İşletme', value: selectedRestaurant?.name || 'Seçilmedi' },
          { label: 'Yerleşim', value: tableNumber ? `Masa ${tableNumber}` : 'Genel' },
          { label: 'Platform', value: platformLabel },
        ].map((item) => (
          <div key={item.label} className="bz-card-soft p-3">
            <Eyebrow>{item.label}</Eyebrow>
            <p
              className="mt-1 truncate text-[13px] font-semibold text-[#0A0A0A]"
              title={item.value}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.85fr)] gap-6">

        {/* ─── Left: Settings ─── */}
        <div className="space-y-6 order-2 lg:order-1">

          {/* ─── Step rail — 4-step progress guide (adm QRBuilder spec,
              .design/site/site-admin.jsx:381). Visual only; form state
              stays in one submit. ─── */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#EDEDED] bg-white p-3 shadow-sm sm:grid-cols-4">
            {[
              { n: 1, label: 'Kampanya', sub: 'İşletme + platform' },
              { n: 2, label: 'Akış', sub: 'Müşteri yolu' },
              { n: 3, label: 'Tasarım', sub: 'Boyut + renk' },
              { n: 4, label: 'Yayına al', sub: 'QR üret + indir' },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E] font-heading text-[11px] font-semibold text-[#0A0A0A]"
                >
                  {s.n}
                </span>
                <p className="mt-3 text-[13px] font-semibold text-[#0A0A0A]">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-[#737373]">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ─── Step 1: Kampanya Detayları ─── */}
          <div className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] font-heading text-[13px] font-semibold text-[#0A0A0A]"
              >
                1
              </span>
              <div>
                <p className="pulse-eyebrow text-[#737373]">ADIM 01</p>
                <h3 className="text-[18px] font-semibold text-[#0A0A0A] tracking-tight">
                  Kampanya Detayları
                </h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="pulse-eyebrow text-[#737373]">KAMPANYA ADI</label>
                <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-[13px] font-semibold text-[#0A0A0A]">
                  {selectedRestaurant?.name || 'İşletme'} QR {tableNumber ? `- Masa ${tableNumber}` : '- Genel'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="pulse-eyebrow text-[#737373]">KONUM</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={isSingleRestaurant}
                  className={`w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] font-semibold text-[#0A0A0A] outline-none transition-all focus:ring-2 focus:ring-[#C6F24E] ${
                    isSingleRestaurant
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                  }`}
                >
                  <option value="">İşletme seç...</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="pulse-eyebrow text-[#737373]">YERLEŞİM</label>
                <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t && Number(t) > 1 ? String(Number(t) - 1) : '')}
                    className="flex h-11 items-center justify-center rounded-lg border border-[#EDEDED] bg-white text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-95"
                    aria-label="Masa numarasını azalt"
                  >
                    <Minus size={16} strokeWidth={2} />
                  </button>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="GENEL"
                    className="h-11 rounded-lg border border-[#EDEDED] bg-white px-4 text-center text-[13px] font-semibold text-[#0A0A0A] outline-none transition-all focus:ring-2 focus:ring-[#C6F24E]"
                  />
                  <button
                    type="button"
                    onClick={() => setTableNumber(t => t ? String(Number(t) + 1) : '1')}
                    className="flex h-11 items-center justify-center rounded-lg border border-[#EDEDED] bg-white text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-95"
                    aria-label="Masa numarasını artır"
                  >
                    <Plus size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Platform Selector */}
              <div className="space-y-2">
                <label className="pulse-eyebrow text-[#737373]">HEDEF PLATFORM</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="h-11 w-full cursor-pointer rounded-lg border border-[#EDEDED] bg-white px-4 text-[13px] font-semibold text-[#0A0A0A] outline-none transition-all focus:ring-2 focus:ring-[#C6F24E]"
                >
                  <option value="">Genel</option>
                  <option value="google">Google</option>
                  <option value="yemeksepeti">Yemeksepeti</option>
                  <option value="getir">Getir</option>
                  <option value="trendyol_go">Trendyol GO</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─── Step 2: Akış — visual only, explains the customer journey ─── */}
          <div className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] font-heading text-[13px] font-semibold text-[#0A0A0A]"
              >
                2
              </span>
              <div>
                <p className="pulse-eyebrow text-[#737373]">ADIM 02</p>
                <h3 className="text-[18px] font-semibold text-[#0A0A0A] tracking-tight">
                  Akış
                </h3>
              </div>
            </div>
            <p className="text-[13px] text-[#525252] mb-4">
              Müşterinin QR'ı tarattıktan sonra izlediği yol — her adım tek panelden yönetilir.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { n: 1, t: 'QR tara', d: 'Masadan veya faturadan' },
                { n: 2, t: 'Yıldız', d: '1-5 arası puan' },
                { n: 3, t: 'Not', d: 'Detay + platform' },
                { n: 4, t: 'Yönlendir', d: 'Google / Yemeksepeti / Getir' },
              ].map((step) => (
                <div key={step.n} className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                  <p className="pulse-eyebrow text-[#C6F24E] bg-[#0A0A0A] inline-block rounded px-1.5 py-0.5">
                    ADIM {step.n}
                  </p>
                  <p className="mt-2 font-heading text-[14px] font-semibold text-[#0A0A0A]">
                    {step.t}
                  </p>
                  <p className="text-[11px] text-[#737373] mt-1 leading-snug">{step.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#EAF9B8] px-3 py-2 text-[12px] text-[#0A0A0A]">
              <span className="mt-0.5">ℹ</span>
              <span>
                Google politikalarına uyumlu: müşteri platforma yönlendirilmeden önce her zaman puan ve not bırakır.
              </span>
            </div>
          </div>

          {/* ─── Step 3: Tasarım — boyut + renk + varsa ek stil ─── */}
          <div className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] font-heading text-[13px] font-semibold text-[#0A0A0A]"
              >
                3
              </span>
              <div>
                <p className="pulse-eyebrow text-[#737373]">ADIM 03</p>
                <h3 className="text-[18px] font-semibold text-[#0A0A0A] tracking-tight">
                  Tasarım
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { bg: '#C6F24E', fg: '#0A0A0A', label: 'Lime', active: true },
                { bg: '#FFFFFF', fg: '#0A0A0A', label: 'Beyaz' },
                { bg: '#0A0A0A', fg: '#C6F24E', label: 'Koyu' },
                { bg: '#FAFAFA', fg: '#0A0A0A', label: 'Minimal' },
              ].map((style) => (
                <div
                  key={style.label}
                  className={`flex aspect-[3/4] flex-col items-center justify-between rounded-xl p-3 ${
                    style.active ? 'border-2 border-[#0A0A0A]' : 'border border-[#EDEDED]'
                  }`}
                  style={{ backgroundColor: style.bg }}
                >
                  <p className="text-center text-[12px] font-semibold leading-tight" style={{ color: style.fg }}>
                    Yorum bırak
                  </p>
                  <div className="rounded-md bg-white p-1.5 shadow-sm">
                    <QrCode size={34} style={{ color: style.fg }} strokeWidth={2.2} />
                  </div>
                  <p className="pulse-eyebrow" style={{ color: style.fg }}>{style.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {/* QR Size Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[#6B7280]  ml-1">Çözünürlük (PNG)</label>
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
                      className={`flex-1 py-3 rounded-xl border pulse-eyebrow transition-all ${
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
                <label className="text-[11px] font-semibold text-[#6B7280]  ml-1 flex items-center gap-2">
                  <Palette size={14} strokeWidth={2} /> Renk
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUseBrandColor((v) => !v)}
                    disabled={!selectedRestaurant?.primaryColor}
                    className={`flex-1 px-4 py-3 rounded-xl border pulse-eyebrow transition-all flex items-center justify-center gap-2 ${
                      useBrandColor
                        ? 'bg-[#EAF9B8] border-[#C6F24E] text-[#0A0A0A]'
                        : 'bg-white border-[#EDEDED] text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={
                      selectedRestaurant?.primaryColor
                        ? `Marka rengi: ${selectedRestaurant.primaryColor}`
                        : 'Önce bir işletme seçin veya restoran ayarlarında marka rengi tanımlayın.'
                    }
                  >
                    <span
                      className="w-4 h-4 rounded border border-[#EDEDED]"
                      style={{ backgroundColor: selectedRestaurant?.primaryColor || '#D4D4D4' }}
                    />
                    {selectedRestaurant?.primaryColor ? 'Marka Rengi' : 'Marka Rengi Tanımsız'}
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
            <div className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-8 space-y-5">
              <button
                type="button"
                onClick={() => setBatchOpen((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF9B8] text-[#0A0A0A] flex items-center justify-center">
                    <Layers size={20} strokeWidth={2} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-[#0A0A0A] ">Toplu QR</h3>
                    <p className="text-[11px] text-[#1A1A1A] font-bold">Masa aralığı için tek tıkla oluşturun.</p>
                  </div>
                </div>
                <span className="text-[18px] font-semibold text-[#6B7280]">{batchOpen ? '−' : '+'}</span>
              </button>

              {batchOpen && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#6B7280]  ml-1">Başlangıç</label>
                      <input
                        type="text"
                        value={batchFrom}
                        onChange={(e) => setBatchFrom(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] outline-none text-sm font-bold text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#6B7280]  ml-1">Bitiş</label>
                      <input
                        type="text"
                        value={batchTo}
                        onChange={(e) => setBatchTo(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-xl border border-[#EDEDED] bg-[#FFFFFF] outline-none text-sm font-bold text-center"
                      />
                    </div>
                  </div>

                  {batchError && (
                    <AlertBanner kind="danger">{batchError}</AlertBanner>
                  )}

                  <button
                    type="button"
                    onClick={runBatch}
                    disabled={batchLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white py-3 rounded-xl text-xs font-semibold hover:bg-[#1A1A1A] disabled:opacity-60 transition-all"
                  >
                    {batchLoading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} strokeWidth={2} />}
                    OLUŞTUR (Maks. 50)
                  </button>

                  {batchItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-auto p-1">
                        {batchItems.map((it) => (
                          <div key={it.table} className="border border-[#EDEDED] rounded-lg p-2 text-center bg-white">
                            <div className="w-full aspect-square [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: it.svg }} />
                            <p className="text-[10px] font-semibold text-[#0A0A0A] mt-1">Masa {it.table}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={printBatch}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-[#EDEDED] text-[#1A1A1A] py-3 rounded-xl text-xs font-semibold hover:bg-[#FFFFFF]"
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
            <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-xl p-6 sm:p-8 space-y-6 text-white">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#C6F24E]  leading-none">Hedef Link</p>
                <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 border-2 border-white/10 rounded-2xl p-4">
                <p className="text-xs font-semibold text-white/70 font-mono flex-1 truncate">{qrTargetUrl}</p>
                <button
                  onClick={copyUrl}
                  className={`p-2 rounded-xl border-2 transition-all ${copied ? 'bg-green-500 border-green-400 text-white' : 'bg-white/10 border-white/10 text-white/50 hover:bg-white/20'}`}
                >
                  {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                </button>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-[9px] font-semibold text-white/45 ">İşletme</p>
                  <p className="text-xs font-semibold text-white truncate" title={selectedRestaurant.name}>{selectedRestaurant.name.toUpperCase()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-semibold text-white/45 ">Durum</p>
                  <p className="text-xs font-semibold text-[#10b981] whitespace-nowrap">AKTİF ✓</p>
                </div>
              </div>
            </div>
          )}

          {/* Last 50 QR history */}
          {selectedRestaurant && (
            <div className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-semibold text-[#0A0A0A] ">Son 50 QR</h4>
                  <span className="text-[10px] font-semibold text-[#6B7280] px-2 py-0.5 bg-[#EDEDED] rounded-md">{history.length}/50</span>
                </div>
                <button
                  onClick={handleExportHistory}
                  disabled={exporting || history.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EDEDED] text-[#1A1A1A] rounded-lg hover:bg-[#FFFFFF] active:scale-95 transition-all pulse-eyebrow disabled:opacity-50"
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
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] leading-tight">
                              {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-[11px] font-semibold text-[#0A0A0A] leading-tight">
                              {new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[12px] font-semibold text-[#0A0A0A]">
                                {item.tableNumber ? `Masa ${item.tableNumber}` : 'Genel'}
                              </span>
                              {badge ? (
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider text-white ${badge.bg}`}>
                                  {badge.label}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-[#EDEDED] text-[#6B7280] border border-[#EDEDED]">
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
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-all active:scale-95 ${
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border border-[#EDEDED] bg-white text-[#1A1A1A] hover:bg-[#FFFFFF] active:scale-95 transition-all"
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
        <div className="order-1 lg:order-2">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="pulse-eyebrow text-[#737373]">CANLI ÖNİZLEME</p>
              <button
                onClick={generateQR}
                disabled={generating || !selectedId}
                className="inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[11px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-40"
              >
                <RefreshCw size={14} strokeWidth={2} className={generating ? 'animate-spin' : ''} />
                Yenile
              </button>
            </div>

            {duplicateWarning && (
              <AlertBanner
                kind="warn"
                icon={<AlertCircle size={14} strokeWidth={2} className="mt-0.5" />}
              >
                Bu kombinasyonla daha önce QR oluşturuldu.
              </AlertBanner>
            )}

            <div className="grid gap-3 min-[440px]:grid-cols-2">
              <div className="flex aspect-[3/4] flex-col items-center justify-between rounded-2xl bg-[#C6F24E] p-4 text-[#0A0A0A] shadow-sm">
                <div className="text-center">
                  <p className="pulse-eyebrow text-[#0A0A0A]/60">{selectedRestaurant?.name || 'BUAZE'}</p>
                  <h2 className="mt-2 text-[24px] font-medium leading-none tracking-[-0.025em]">
                    Deneyiminizi paylaşın.
                  </h2>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-md">
                  {generating ? (
                    <div className="flex h-32 w-32 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" strokeWidth={2} />
                    </div>
                  ) : qrSvg ? (
                    <div className="h-32 w-32 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  ) : (
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#EDEDED] text-center">
                      <QrCode size={38} className={qrError ? 'text-red-400' : 'text-[#C9D0DB]'} strokeWidth={2} />
                      <p className={`mt-2 px-2 text-[10px] font-semibold leading-tight ${qrError ? 'text-red-500' : 'text-[#737373]'}`}>
                        {qrError || (selectedId ? 'QR hazırlanıyor' : 'İşletme seçin')}
                      </p>
                    </div>
                  )}
                </div>
                <p className="pulse-eyebrow text-[#0A0A0A]">BUAZE · {placementLabel}</p>
              </div>

              <div className="hidden aspect-[9/19] rounded-[28px] bg-[#0A0A0A] p-2.5 min-[440px]:block">
                <div className="flex h-full flex-col gap-3 rounded-[20px] bg-white p-4">
                  <p className="pulse-eyebrow text-[#737373]">{selectedRestaurant?.name || 'İşletme'}</p>
                  <h3 className="text-[18px] font-medium leading-tight tracking-[-0.025em] text-[#0A0A0A]">
                    Deneyiminiz nasıldı?
                  </h3>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`flex aspect-square items-center justify-center rounded-full text-[12px] ${i <= 4 ? 'bg-[#C6F24E]' : 'bg-[#EDEDED]'}`}>
                        ★
                      </div>
                    ))}
                  </div>
                  <div className="min-h-[64px] rounded-lg bg-[#FAFAFA] p-3 text-[10px] text-[#A3A3A3]">
                    Kısa notunuz...
                  </div>
                  <div className="mt-auto rounded-full bg-[#0A0A0A] py-2 text-center text-[10px] font-semibold text-white">
                    Paylaş
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="pulse-eyebrow text-[#737373]">QR URL</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-[#0A0A0A]" title={qrTargetUrl}>{qrTargetUrl || 'İşletme seçin'}</p>
                </div>
                <button
                  onClick={copyUrl}
                  disabled={!qrTargetUrl}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                    copied ? 'border-green-500 bg-green-500 text-white' : 'border-[#EDEDED] bg-white text-[#1A1A1A] hover:bg-[#FAFAFA]'
                  }`}
                >
                  {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {qrError && (
              <button
                onClick={generateQR}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600"
              >
                Tekrar dene
              </button>
            )}

            {selectedId && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => downloadQR('png')}
                  className="col-span-2 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] px-6 py-4 text-[12px] font-semibold text-white transition-all hover:bg-[#1A1A1A] active:scale-95"
                >
                  <Download size={18} strokeWidth={2} />
                  PNG olarak indir
                </button>
                <button
                  onClick={() => downloadQR('svg')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[11px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-95"
                >
                  <Download size={15} strokeWidth={2} />
                  SVG
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[11px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#FAFAFA] active:scale-95"
                >
                  <Printer size={15} strokeWidth={2} />
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
        <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8" />
      </div>
    }>
      <QRPageContent />
    </Suspense>
  );
}
