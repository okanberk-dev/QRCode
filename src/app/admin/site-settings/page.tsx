'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Save, Upload, Image as ImageIcon, Check, AlertCircle, X, Globe, Sparkles, ShieldCheck, Home } from 'lucide-react';
import { AlertBanner, Badge, PageHeader } from '@/components/ui';
import SiteSettingsSkeleton from './loading';

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
// `rounded-[24px] border border-pn-line` permütasyonu yerine globals.css
// `bz-card` token (border + radius + bg + soft shadow).
const CARD = 'bz-card p-6 sm:p-8';
const LABEL = 'block text-[12px] font-medium text-pn-ink-2 mb-2';
const INPUT = 'bz-input';
const HINT = 'text-[12px] font-medium text-[#6B7280] mt-1';

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('tr');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    // Only 401/403 is a permission problem; a 500 or network error used to
    // be reported as "Sadece Superadmin" too.
    fetch('/api/admin/site-settings')
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setForbidden(true);
          return;
        }
        if (!r.ok) {
          setError('Ayarlar yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.');
          return;
        }
        const data = await r.json();
        setSettings(data.settings);
      })
      .catch(() => setError('Bağlantı hatası. Ayarlar yüklenemedi.'))
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
      const data = await res.json().catch(() => ({}));
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

  // Same shape as loading.tsx — no second (spinner) loading state after the
  // route skeleton (CLAUDE.md §40.10).
  if (loading) return <SiteSettingsSkeleton />;

  if (!settings) {
    // §38.76 — Page-level 403/404 guard. Site-settings superadmin-only
    // (CLAUDE.md §4.5); manager/restaurant_owner direct URL ile geldiğinde
    // mevcut inline AlertBanner yerine branded full-page block + Dashboard
    // CTA. SuperadminBlock component'i (ters yönlü, workspace-only sayfalar
    // için tasarlandı) burada uygun değil; site-settings için bu inline
    // pattern yeterli — SuperadminRequired wrapper ileride 3+ callsite çıkar
    // ise extract edilir (CLAUDE.md §7).
    const isPermissionError = forbidden;
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="bz-card w-full max-w-md p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pn-accent-soft text-pn-ink">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <h2 className="bz-h-tight mt-4 text-[20px] text-pn-ink">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-pn-accent px-4 py-2 text-[12px] font-medium text-pn-ink hover:bg-pn-accent-hover"
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
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      {/* §38.75 — Eyebrow'a SUPERADMIN scope prefix eklendi (CLAUDE.md §11.4
          dashboard SUPERADMIN eyebrow paterni reuse). Page-level scope net;
          actions slot'undaki lime badge ek visual cue. */}
      <PageHeader
        eyebrow="SUPERADMIN · SİTE AYARLARI"
        eyebrowPulse
        title="Site ayarları"
        description="Arama motoru bilgileri, logo ve favicon — her değişiklik tüm siteye yansır."
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
            <h2 className="text-[20px] font-medium text-pn-ink tracking-tight">SEO bilgileri</h2>
            <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">Başlık, açıklama ve anahtar kelimeler — dil başına.</p>
          </div>
          <div className="flex gap-1 bg-[#FFFFFF] p-1 rounded-[20px] border border-pn-line" role="group" aria-label="Düzenlenen dil">
            {(['tr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={activeLang === l}
                onClick={() => setActiveLang(l)}
                className={`px-4 py-1.5 rounded-[14px] text-[12px] font-medium transition-colors ${
                  activeLang === l ? 'bg-pn-ink text-white' : 'text-pn-ink-2 hover:bg-white'
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
            <label htmlFor="ss-title-default" className={LABEL}>Varsayılan Başlık ({activeLang.toUpperCase()})</label>
            <input
              id="ss-title-default"
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
            <p className={HINT}>Kendi başlığı tanımlanmamış sayfalarda görünür.</p>
          </div>

          <div>
            <label htmlFor="ss-title-template" className={LABEL}>Başlık Şablonu</label>
            <input
              id="ss-title-template"
              type="text"
              className={INPUT}
              value={settings.titleTemplate}
              onChange={(e) => update('titleTemplate', e.target.value)}
              placeholder="%s | Buaze"
            />
            <p className={HINT}>
              <code className="bg-[#FFFFFF] px-1.5 py-0.5 rounded text-[12px]">%s</code> yerine sayfa başlığı gelir. Her iki dilde ortak.
            </p>
          </div>

          <div>
            <label htmlFor="ss-description" className={LABEL}>Varsayılan Açıklama ({activeLang.toUpperCase()})</label>
            <textarea
              id="ss-description"
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
            <label htmlFor="ss-keywords" className={LABEL}>Anahtar Kelimeler ({activeLang.toUpperCase()})</label>
            <textarea
              id="ss-keywords"
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
          <h2 className="text-[20px] font-medium text-pn-ink tracking-tight">Marka Kimliği</h2>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            Site genelinde (navbar, footer, auth sayfaları) görünen logo ve tarayıcı favicon&apos;u.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssetUploader
            url={settings.logoUrl}
            label="Logo"
            accept="image/png,image/svg+xml,image/webp"
            aspect="Şeffaf arka planlı PNG/SVG — en fazla 2 MB"
            onUpload={(f) => handleUpload(f, 'logo')}
            onRemove={() => handleRemove('logo')}
            uploading={uploading === 'logo'}
            previewClass="aspect-square w-full max-w-[200px] bg-pn-ink rounded-[20px] p-4"
          />
          <AssetUploader
            url={settings.faviconUrl}
            label="Favicon"
            accept="image/svg+xml,image/png,image/x-icon"
            aspect="SVG veya 512×512 PNG"
            onUpload={(f) => handleUpload(f, 'favicon')}
            onRemove={() => handleRemove('favicon')}
            uploading={uploading === 'favicon'}
            previewClass="aspect-square w-full max-w-[128px] bg-[#FFFFFF] rounded-[20px] p-3 border border-pn-line"
          />
        </div>
      </div>

      {/* ─── Kart 3: Entity Profile URLs ─── */}
      <div className={CARD}>
        <div className="mb-6">
          <h2 className="text-[20px] font-medium text-pn-ink tracking-tight">
            Varlık Profili URL&apos;leri
          </h2>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            Buaze&apos;in dış platformlardaki profillerine bağlantılar. Doldurulan bağlantılar arama motorlarına şirket profili olarak bildirilir ve <Link className="underline" href="/tr/press">basın kiti</Link> sayfasında gösterilir. Boş alanlar atlanır.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="ss-g2" className={LABEL}>G2 sayfası</label>
            <input
              id="ss-g2"
              type="url"
              className={INPUT}
              value={settings.g2Url ?? ''}
              onChange={(e) => update('g2Url', e.target.value || null)}
              placeholder="https://www.g2.com/products/buaze"
            />
            <p className={HINT}>Yazılım karşılaştırma siteleri ve yapay zekâ aramaları için.</p>
          </div>

          <div>
            <label htmlFor="ss-wikidata" className={LABEL}>Wikidata Q-ID URL</label>
            <input
              id="ss-wikidata"
              type="url"
              className={INPUT}
              value={settings.wikidataUrl ?? ''}
              onChange={(e) => update('wikidataUrl', e.target.value || null)}
              placeholder="https://www.wikidata.org/wiki/Q123456789"
            />
            <p className={HINT}>Arama motorlarının şirket bilgi kartı için.</p>
          </div>

          <div>
            <label htmlFor="ss-crunchbase" className={LABEL}>Crunchbase</label>
            <input
              id="ss-crunchbase"
              type="url"
              className={INPUT}
              value={settings.crunchbaseUrl ?? ''}
              onChange={(e) => update('crunchbaseUrl', e.target.value || null)}
              placeholder="https://www.crunchbase.com/organization/buaze"
            />
            <p className={HINT}>Şirket profili bağlantısı.</p>
          </div>

          <div>
            <label htmlFor="ss-capterra" className={LABEL}>Capterra</label>
            <input
              id="ss-capterra"
              type="url"
              className={INPUT}
              value={settings.capterraUrl ?? ''}
              onChange={(e) => update('capterraUrl', e.target.value || null)}
              placeholder="https://www.capterra.com/p/123456/Buaze"
            />
            <p className={HINT}>Yazılım dizini profili.</p>
          </div>
        </div>
      </div>

      {/* ─── Sticky Save Bar ───
          In-flow sticky instead of `fixed bottom-0 lg:left-64`: on mobile the
          fixed bar sat under the floating bottom nav (Save was not
          clickable), and on desktop its hard-coded 256px offset ignored the
          248px / collapsed sidebar. Below lg it parks above the nav pill. */}
      <div className="sticky bottom-[calc(96px+env(safe-area-inset-bottom,0px))] z-20 rounded-[24px] border border-pn-line bg-white/95 p-4 shadow-lg backdrop-blur lg:bottom-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#6B7280] font-medium hidden sm:block">
            Değişiklikler tüm site genelinde yansır.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bz-btn-lime ml-auto disabled:opacity-60"
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
          <div className={`${previewClass} bg-[#FFFFFF] border-2 border-dashed border-pn-line flex items-center justify-center`}>
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
            className="bz-btn-primary bz-btn-sm disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            {uploading ? 'Yükleniyor…' : url ? 'Değiştir' : 'Yükle'}
          </button>
          {url && (
            <button
              onClick={onRemove}
              className="bz-btn-danger bz-btn-sm"
            >
              <X size={13} />
              Kaldır
            </button>
          )}
        </div>
        <p className="text-[12px] font-medium text-[#6B7280]">{aspect}</p>
      </div>
    </div>
  );
};
