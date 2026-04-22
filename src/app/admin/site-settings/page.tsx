'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, Save, Upload, Image as ImageIcon, Check, AlertCircle, X, Globe, Sparkles } from 'lucide-react';

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
}

const CARD = 'bg-white rounded-[24px] border border-[#E8ECF2] shadow-md p-6 sm:p-8';
const LABEL = 'block text-[12px] font-black text-[#2A3444] uppercase tracking-wider mb-2';
const INPUT = 'w-full px-4 py-3 bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl text-[14px] font-medium text-[#1A2332] focus:outline-none focus:border-[#F4B400] focus:bg-white transition-colors';
const HINT = 'text-[11px] font-medium text-[#6B7280] mt-1';

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('tr');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'favicon' | 'og' | null>(null);

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

  const handleUpload = async (file: File, kind: 'logo' | 'favicon' | 'og') => {
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
      if (kind === 'og') update('ogImageUrl', data.url);
      setSuccess('Dosya yüklendi. Değişikliği kalıcı yapmak için Kaydet butonuna basın.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme hatası');
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = (kind: 'logo' | 'favicon' | 'og') => {
    if (kind === 'logo') update('logoUrl', null);
    if (kind === 'favicon') update('faviconUrl', null);
    if (kind === 'og') update('ogImageUrl', null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-[#2A3444]">
        <Loader2 className="animate-spin" size={18} />
        <span className="font-bold">Yükleniyor…</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 font-bold flex items-center gap-3">
          <AlertCircle size={20} />
          {error || 'Ayarlar yüklenemedi.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto space-y-6 pb-32">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] sm:text-[36px] font-extrabold text-[#1A2332] tracking-tight">Site Ayarları</h1>
          <p className="text-[14px] text-[#2A3444] font-medium mt-1">
            SEO metadatası, Open Graph görseli, logo ve favicon — her değişiklik tüm site genelinde yansır.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F4B400]/10 border border-[#F4B400]/30 rounded-full">
          <Sparkles size={14} className="text-[#F4B400]" />
          <span className="text-[11px] font-black text-[#1A2332] uppercase tracking-widest">Superadmin</span>
        </div>
      </div>

      {/* ─── Notifications ─── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-bold text-[14px] flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 font-bold text-[14px] flex items-center gap-3">
          <Check size={18} />
          {success}
        </div>
      )}

      {/* ─── Kart 1: SEO Metadata ─── */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-[20px] font-extrabold text-[#1A2332] tracking-tight">SEO Metadata</h2>
            <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">Başlık, açıklama ve anahtar kelimeler — dil başına.</p>
          </div>
          <div className="flex gap-1 bg-[#F8F6F1] p-1 rounded-xl border border-[#E8ECF2]">
            {(['tr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-wider transition-colors ${
                  activeLang === l ? 'bg-[#1A2332] text-white' : 'text-[#2A3444] hover:bg-white'
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
              <code className="bg-[#F8F6F1] px-1.5 py-0.5 rounded text-[11px]">%s</code> yerine sayfa başlığı gelir. Her iki dilde ortak.
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

      {/* ─── Kart 2: Open Graph ─── */}
      <div className={CARD}>
        <div className="mb-6">
          <h2 className="text-[20px] font-extrabold text-[#1A2332] tracking-tight">Open Graph Görseli</h2>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            Link paylaşımlarında (Twitter, Facebook, WhatsApp) görünen görsel. Önerilen: 1200×630 PNG/JPG.
          </p>
        </div>

        <AssetUploader
          url={settings.ogImageUrl}
          label="OG Görseli"
          accept="image/png,image/jpeg,image/webp"
          aspect="1200 × 630"
          onUpload={(f) => handleUpload(f, 'og')}
          onRemove={() => handleRemove('og')}
          uploading={uploading === 'og'}
          previewClass="aspect-[1200/630] w-full max-w-md"
        />
      </div>

      {/* ─── Kart 3: Branding ─── */}
      <div className={CARD}>
        <div className="mb-6">
          <h2 className="text-[20px] font-extrabold text-[#1A2332] tracking-tight">Marka Kimliği</h2>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            Site genelinde (navbar, footer, auth sayfaları) görünen logo ve tarayıcı favicon'u.
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
            previewClass="aspect-square w-full max-w-[200px] bg-[#1A2332] rounded-xl p-4"
          />
          <AssetUploader
            url={settings.faviconUrl}
            label="Favicon"
            accept="image/svg+xml,image/png,image/x-icon"
            aspect="SVG veya 512×512 PNG"
            onUpload={(f) => handleUpload(f, 'favicon')}
            onRemove={() => handleRemove('favicon')}
            uploading={uploading === 'favicon'}
            previewClass="aspect-square w-full max-w-[128px] bg-[#F8F6F1] rounded-xl p-3 border border-[#E8ECF2]"
          />
        </div>
      </div>

      {/* ─── Sticky Save Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-[#E8ECF2] shadow-lg z-30 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#6B7280] font-medium hidden sm:block">
            Değişiklikler tüm site genelinde yansır.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto flex items-center gap-2 bg-[#F4B400] text-[#1A2332] font-black text-[14px] px-6 py-3 rounded-xl border-2 border-[#1A2332] hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className={`${previewClass} bg-[#F8F6F1] border-2 border-dashed border-[#E8ECF2] flex items-center justify-center`}>
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
            className="flex items-center gap-2 bg-[#1A2332] text-white font-bold text-[12px] px-4 py-2 rounded-xl hover:bg-[#2A3444] disabled:opacity-50 transition-colors"
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
