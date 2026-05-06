'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Save, Upload, Image as ImageIcon, Check, AlertCircle, X, Globe, Sparkles, ShieldCheck, Home } from 'lucide-react';
import { AlertBanner, Badge, PageHeader } from '@/components/ui';

type Lang = 'tr' | 'en';

interface SiteSettings {
  titleDefaultTr: string;
  titleDefaultEn: string;
  titleTemplate: string;
  descriptionTr: string;
  descriptionEn: string;
  keywordsTr: string[];
  keywordsEn: string[];
  ogImageUrl: string | null;
  faviconUrl: string | null;
  logoUrl: string | null;
  g2Url: string | null;
  wikidataUrl: string | null;
  crunchbaseUrl: string | null;
  capterraUrl: string | null;
}

// §38.75 — Pulse `bz-card` primitive reuse (CLAUDE.md §11 + §38.67). Inline
// `rounded-2xl border border-[#EDEDED]` permütasyonu yerine globals.css
// `bz-card` token (border + radius + bg + soft shadow).
const CARD = 'bz-card p-6 sm:p-8';
const LABEL = 'block text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2';
const INPUT = 'bz-input';
const HINT = 'text-[11px] font-medium text-[#6B7280] mt-1';

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('tr');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setSettings(data.settings))
      .catch(() => setError('Ayarlar yüklenemedi. Superadmin yetkisi gerekli.'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kaydetme başarısız');
      }
      setSuccess('Ayarlar başarıyla kaydedildi. Site metadatası birkaç saniye içinde güncellenir.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File, kind: 'logo' | 'favicon') => {
    setUploading(kind);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch('/api/admin/site-settings/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');
      if (kind === 'logo') update('logoUrl', data.url);
      if (kind === 'favicon') update('faviconUrl', data.url);
      setSuccess('Dosya yüklendi. Değişikliği kalıcı yapmak için Kaydet butonuna basın.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme hatası');
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = (kind: 'logo' | 'favicon') => {
    if (kind === 'logo') update('logoUrl', null);
    if (kind === 'favicon') update('faviconUrl', null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-[#1A1A1A]">
        <Loader2 className="animate-spin" size={18} />
        <span className="font-bold">Yükleniyor…</span>
      </div>
    );
  }

  if (!settings) {
    // §38.76 — Page-level 403/404 guard. Site-settings superadmin-only
    // (CLAUDE.md §4.5); manager/restaurant_owner direct URL ile geldiğinde
    // mevcut inline AlertBanner yerine branded full-page block + Dashboard
    // CTA. SuperadminBlock component'i (ters yönlü, workspace-only sayfalar
    // için tasarlandı) burada uygun değil; site-settings için bu inline
    // pattern yeterli — SuperadminRequired wrapper ileride 3+ callsite çıkar
    // ise extract edilir (CLAUDE.md §7).
    const isPermissionError = error.toLowerCase().includes('superadmin') || error.includes('Yetkisiz');
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="bz-card w-full max-w-md p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <h2 className="bz-h-tight mt-4 text-[20px] text-[#0A0A0A]">
            {isPermissionError ? 'Sadece Superadmin' : 'Ayarlar yüklenemedi'}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#525252]">
            {isPermissionError
              ? 'Site Ayarları sayfası sadece superadmin kullanıcıları içindir. İşletme veya yönetici hesabıyla bu sayfaya erişemezsin.'
              : error || 'Ayarlar getirilirken bir hata oluştu. Lütfen tekrar dene.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
            >
              <Home size={13} strokeWidth={2} />
              Dashboard&apos;a dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-5 pb-32">
      {/* §38.75 — Eyebrow'a SUPERADMIN scope prefix eklendi (CLAUDE.md §11.4
          dashboard SUPERADMIN eyebrow paterni reuse). Page-level scope net;
          actions slot'undaki lime badge ek visual cue. */}
      <PageHeader
        eyebrow="SUPERADMIN · SİTE AYARLARI"
        eyebrowPulse
        title="Site ayarları"
        description="SEO metadatası, logo ve favicon — her değişiklik tüm site genelinde yansır."
        actions={
          <Badge kind="lime">
            <Sparkles size={11} strokeWidth={2} />
            Superadmin
          </Badge>
        }
      />

      {/* ─── Notifications ─── */}
      {error && (
        <AlertBanner kind="danger" icon={<AlertCircle size={14} strokeWidth={2} className="mt-0.5" />}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" icon={<Check size={14} strokeWidth={2} className="mt-0.5" />}>
          {success}
        </AlertBanner>
      )}

      {/* ─── Kart 1: SEO Metadata ─── */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0A0A0A] tracking-tight">SEO Metadata</h2>
            <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">Başlık, açıklama ve anahtar kelimeler — dil başına.</p>
          </div>
          <div className="flex gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#EDEDED]">
            {(['tr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                  activeLang === l ? 'bg-[#0A0A0A] text-white' : 'text-[#1A1A1A] hover:bg-white'
                }`}
              >
                <Globe size={12} className="inline mr-1" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className={LABEL}>Varsayılan Başlık ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              className={INPUT}
              value={activeLang === 'tr' ? settings.titleDefaultTr : settings.titleDefaultEn}
              onChange={(e) =>
                activeLang === 'tr'
                  ? update('titleDefaultTr', e.target.value)
                  : update('titleDefaultEn', e.target.value)
              }
              placeholder="Buaze | Dijital İtibar ve Geri Bildirim Yönetimi"
            />
            <p className={HINT}>Alt sayfaların override etmediği durumlarda görünür.</p>
          </div>

          <div>
            <label className={LABEL}>Başlık Şablonu</label>
            <input
              type="text"
              className={INPUT}
              value={settings.titleTemplate}
              onChange={(e) => update('titleTemplate', e.target.value)}
              placeholder="%s | Buaze"
            />
            <p className={HINT}>
              <code className="bg-[#FFFFFF] px-1.5 py-0.5 rounded text-[11px]">%s</code> yerine sayfa başlığı gelir. Her iki dilde ortak.
            </p>
          </div>

          <div>
            <label className={LABEL}>Varsayılan Açıklama ({activeLang.toUpperCase()})</label>
            <textarea
              className={`${INPUT} min-h-[90px] resize-y`}
              value={activeLang === 'tr' ? settings.descriptionTr : settings.descriptionEn}
              onChange={(e) =>
                activeLang === 'tr'
                  ? update('descriptionTr', e.target.value)
                  : update('descriptionEn', e.target.value)
              }
              maxLength={320}
            />
            <p className={HINT}>
              {(activeLang === 'tr' ? settings.descriptionTr : settings.descriptionEn).length}/320 karakter — 150-160 arası önerilir.
            </p>
          </div>

          <div>
            <label className={LABEL}>Anahtar Kelimeler ({activeLang.toUpperCase()})</label>
            <textarea
              className={`${INPUT} min-h-[90px] resize-y`}
              value={(activeLang === 'tr' ? settings.keywordsTr : settings.keywordsEn).join(', ')}
              onChange={(e) => {
                const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                if (activeLang === 'tr') update('keywordsTr', list);
                else update('keywordsEn', list);
              }}
              placeholder="dijital itibar, qr yorum, restoran..."
            />
            <p className={HINT}>Virgülle ayırın. Boşluklar otomatik temizlenir.</p>
          </div>
        </div>
      </div>

      {/* ─── Kart 2: Branding ─── */}
      <div className={CARD}>
        <div className="mb-6">
          <h2 className="text-[20px] font-semibold text-[#0A0A0A] tracking-tight">Marka Kimliği</h2>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            Site genelinde (navbar, footer, auth sayfaları) görünen logo ve tarayıcı favicon&apos;u.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssetUploader
            url={settings.logoUrl}
            label="Logo"
            accept="image/png,image/svg+xml,image/webp"
            aspect="Transparent PNG/SVG — max 2MB"
            onUpload={(f) => handleUpload(f, 'logo')}
            onRemove={() => handleRemove('logo')}
            uploading={uploading === 'logo'}
            previewClass="aspect-square w-full max-w-[200px] bg-[#0A0A0A] rounded-xl p-4"
          />
          <AssetUploader
            url={settings.faviconUrl}
            label="Favicon"
            accept="image/svg+xml,image/png,image/x-icon"
            aspect="SVG veya 512×512 PNG"
            onUpload={(f) => handleUpload(f, 'favicon')}
            onRemove={() => handleRemove('favicon')}
            uploading={uploading === 'favicon'}
            previewClass="aspect-square w-full max-w-[128px] bg-[#FFFFFF] rounded-xl p-3 border border-[#EDEDED]"
          />
        </div>
      </div>

      {/* ─── Kart 3: Entity Profile URLs ─── */}
      <div className={CARD}>
        <div className="mb-6">
          <h2 className="text-[20px] font-semibold text-[#0A0A0A] tracking-tight">
            Varlık Profili URL&apos;leri
          </h2>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            Buaze&apos;in dış kaynak profillerine bağlantı. Doluysa ana sayfadaki Organization JSON-LD&apos;ye <code className="bg-[#FAFAFA] px-1 rounded text-[11px]">sameAs</code> olarak girer ve <Link className="underline" href="/tr/press">basın kiti</Link> sayfasında gösterilir. Boş alanlar atlanır.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL}>G2 Listing</label>
            <input
              type="url"
              className={INPUT}
              value={settings.g2Url ?? ''}
              onChange={(e) => update('g2Url', e.target.value || null)}
              placeholder="https://www.g2.com/products/buaze"
            />
            <p className={HINT}>SaaS karşılaştırma sayfaları + AI search.</p>
          </div>

          <div>
            <label className={LABEL}>Wikidata Q-ID URL</label>
            <input
              type="url"
              className={INPUT}
              value={settings.wikidataUrl ?? ''}
              onChange={(e) => update('wikidataUrl', e.target.value || null)}
              placeholder="https://www.wikidata.org/wiki/Q123456789"
            />
            <p className={HINT}>Knowledge Graph + LLM eğitim datası.</p>
          </div>

          <div>
            <label className={LABEL}>Crunchbase</label>
            <input
              type="url"
              className={INPUT}
              value={settings.crunchbaseUrl ?? ''}
              onChange={(e) => update('crunchbaseUrl', e.target.value || null)}
              placeholder="https://www.crunchbase.com/organization/buaze"
            />
            <p className={HINT}>Şirket entity sinyali.</p>
          </div>

          <div>
            <label className={LABEL}>Capterra</label>
            <input
              type="url"
              className={INPUT}
              value={settings.capterraUrl ?? ''}
              onChange={(e) => update('capterraUrl', e.target.value || null)}
              placeholder="https://www.capterra.com/p/123456/Buaze"
            />
            <p className={HINT}>SaaS yazılım dizini.</p>
          </div>
        </div>
      </div>

      {/* ─── Sticky Save Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-[#EDEDED] shadow-lg z-30 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#6B7280] font-medium hidden sm:block">
            Değişiklikler tüm site genelinde yansır.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto flex items-center gap-2 bg-[#C6F24E] text-[#0A0A0A] font-semibold text-[14px] px-6 py-3 rounded-xl border border-[#EDEDED] hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Asset Uploader ───
interface AssetUploaderProps {
  url: string | null;
  label: string;
  accept: string;
  aspect: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
  previewClass: string;
}

const AssetUploader = ({ url, label, accept, aspect, onUpload, onRemove, uploading, previewClass }: AssetUploaderProps) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex flex-col gap-3">
        {url ? (
          <div className={`${previewClass} flex items-center justify-center overflow-hidden relative group`}>
            { }
            <img src={url} alt={label} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className={`${previewClass} bg-[#FFFFFF] border-2 border-dashed border-[#EDEDED] flex items-center justify-center`}>
            <ImageIcon size={32} className="text-[#6B7280]/40" />
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={ref}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              if (ref.current) ref.current.value = '';
            }}
          />
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-[#0A0A0A] text-white font-bold text-[12px] px-4 py-2 rounded-xl hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            {uploading ? 'Yükleniyor…' : url ? 'Değiştir' : 'Yükle'}
          </button>
          {url && (
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 bg-white text-red-600 border border-red-200 font-bold text-[12px] px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              <X size={13} />
              Kaldır
            </button>
          )}
        </div>
        <p className="text-[11px] font-medium text-[#6B7280]">{aspect}</p>
      </div>
    </div>
  );
};
