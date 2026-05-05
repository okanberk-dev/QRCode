'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { AlertBanner, ColorPicker, Eyebrow } from '@/components/ui';
import { compressImage } from '@/lib/client-image';

interface BrandIdentityCardProps {
  restaurantId: string;
  /** Current restaurant name (used in preview header). */
  restaurantName: string;
  isTr: boolean;
}

interface BrandFormState {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string;
  accentFont: string;
  slogan: string;
}

const DEFAULT_FORM: BrandFormState = {
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#0A0A0A',
  secondaryColor: null,
  accentColor: '#C6F24E',
  accentFont: 'Space Grotesk',
  slogan: '',
};

const FONT_OPTIONS = ['Space Grotesk', 'Inter', 'Manrope', 'system'];
const SLOGAN_MAX = 140;

const FONT_FAMILY_MAP: Record<string, string> = {
  'Space Grotesk': 'var(--font-heading), sans-serif',
  Inter: 'var(--font-body), sans-serif',
  Manrope: 'Manrope, var(--font-heading), sans-serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

/**
 * Owner panel "Marka kimliği" card — full edit surface for brand identity.
 * Mirrors `.design-pulse-2026/...OwnerSettings` reference: logo upload (left)
 * + color picker + accent font (right) + slogan + live preview + actions.
 *
 * Logos go through `compressImage` → POST `/api/restaurants/[id]/menu/upload`
 * (kind=logo|favicon) for client + server-side optimization (sharp + WebP).
 * Save persists to `BrandSettings` via PUT `/api/settings/brand`.
 */
export default function BrandIdentityCard({
  restaurantId,
  restaurantName,
  isTr,
}: BrandIdentityCardProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<BrandFormState>(DEFAULT_FORM);
  const [initial, setInitial] = useState<BrandFormState>(DEFAULT_FORM);

  // Load current brand settings
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/settings/brand?restaurantId=${restaurantId}`);
        if (!res.ok) throw new Error('load_failed');
        const data = await res.json();
        if (cancelled) return;
        const next: BrandFormState = {
          logoUrl: data.logoUrl ?? null,
          faviconUrl: data.faviconUrl ?? null,
          primaryColor: data.primaryColor ?? '#0A0A0A',
          secondaryColor: data.secondaryColor ?? null,
          accentColor: data.accentColor ?? '#C6F24E',
          accentFont: data.accentFont ?? 'Space Grotesk',
          slogan: data.slogan ?? '',
        };
        setForm(next);
        setInitial(next);
      } catch {
        if (!cancelled) {
          setError(isTr ? 'Marka ayarları yüklenemedi.' : 'Could not load brand settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, isTr]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

  const handleUpload = async (kind: 'logo' | 'favicon', file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(isTr ? 'Sadece görsel dosyası yükleyebilirsiniz.' : 'Only image files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(isTr ? 'Görsel 5 MB\'dan büyük olamaz.' : 'Image must be smaller than 5 MB.');
      return;
    }
    setError(null);
    setSuccess(null);
    if (kind === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);
    try {
      const compressed = await compressImage(file, {
        maxDim: kind === 'favicon' ? 256 : 1024,
        quality: 0.85,
      });
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('kind', kind);
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'upload_failed');
      setForm((prev) =>
        kind === 'logo' ? { ...prev, logoUrl: data.url } : { ...prev, faviconUrl: data.url },
      );
    } catch (e) {
      setError((e as Error).message || (isTr ? 'Yükleme başarısız.' : 'Upload failed.'));
    } finally {
      if (kind === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const sloganTrim = form.slogan.trim();
      if (sloganTrim.length > SLOGAN_MAX) {
        throw new Error(isTr ? 'Slogan çok uzun.' : 'Slogan is too long.');
      }
      const res = await fetch('/api/settings/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          logoUrl: form.logoUrl,
          faviconUrl: form.faviconUrl,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          accentFont: form.accentFont,
          slogan: sloganTrim || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save_failed');
      const saved: BrandFormState = {
        logoUrl: data.logoUrl ?? null,
        faviconUrl: data.faviconUrl ?? null,
        primaryColor: data.primaryColor ?? '#0A0A0A',
        secondaryColor: data.secondaryColor ?? null,
        accentColor: data.accentColor ?? '#C6F24E',
        accentFont: data.accentFont ?? 'Space Grotesk',
        slogan: data.slogan ?? '',
      };
      setForm(saved);
      setInitial(saved);
      setSuccess(isTr ? 'Marka kimliği güncellendi.' : 'Brand identity updated.');
    } catch (e) {
      setError((e as Error).message || (isTr ? 'Kaydetme başarısız.' : 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    setError(null);
    setSuccess(null);
  };

  const handleRestoreDefaults = () => {
    setForm({ ...DEFAULT_FORM, logoUrl: form.logoUrl, faviconUrl: form.faviconUrl });
    setError(null);
    setSuccess(null);
  };

  const removeLogo = () => setForm((prev) => ({ ...prev, logoUrl: null }));
  const removeFavicon = () => setForm((prev) => ({ ...prev, faviconUrl: null }));

  const initial1 = (restaurantName?.charAt(0) || 'B').toUpperCase();
  const previewFontFamily = FONT_FAMILY_MAP[form.accentFont] || FONT_FAMILY_MAP['Space Grotesk'];

  if (loading) {
    return (
      <section id="brand" className="bz-card p-6 sm:p-7 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={14} strokeWidth={2} className="text-[#0A0A0A]" />
          <Eyebrow>{isTr ? 'MARKA KİMLİĞİ' : 'BRAND IDENTITY'}</Eyebrow>
        </div>
        <div className="bz-h-tight mt-1 mb-5" style={{ fontSize: 18 }}>
          {isTr ? 'Marka kimliği' : 'Brand identity'}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      </section>
    );
  }

  return (
    <section id="brand" className="bz-card p-6 sm:p-7 scroll-mt-20">
      <div className="flex items-center gap-2 mb-1">
        <Palette size={14} strokeWidth={2} className="text-[#0A0A0A]" />
        <Eyebrow>{isTr ? 'MARKA KİMLİĞİ' : 'BRAND IDENTITY'}</Eyebrow>
      </div>
      <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
        {isTr ? 'Marka kimliği' : 'Brand identity'}
      </div>
      <p className="mt-1 text-[13px] text-[#737373] leading-[1.55]">
        {isTr
          ? 'QR kartlarında, menüde ve müşteri ekranlarında görünen tasarım.'
          : 'Design that appears on QR cards, menu, and customer screens.'}
      </p>

      {error && (
        <div className="mt-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>
            {success}
          </AlertBanner>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* ─── Logo ─── */}
        <div>
          <Eyebrow>{isTr ? 'LOGO' : 'LOGO'}</Eyebrow>
          <div className="mt-2 flex items-center gap-4">
            <div
              className="relative flex shrink-0 items-center justify-center overflow-hidden"
              style={{
                width: 96,
                height: 96,
                borderRadius: 16,
                background: '#FAFAFA',
                border: form.logoUrl ? '1px solid #EDEDED' : '1px dashed #D4D4D4',
              }}
            >
              {uploadingLogo ? (
                <Loader2 size={20} className="animate-spin text-[#737373]" />
              ) : form.logoUrl ? (
                 
                <img
                  src={form.logoUrl}
                  alt="logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon size={22} className="text-[#A3A3A3]" strokeWidth={2} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="bz-btn-ghost"
              >
                <Upload size={14} strokeWidth={2} />
                {form.logoUrl
                  ? isTr ? 'Logoyu değiştir' : 'Replace logo'
                  : isTr ? 'Logo yükle' : 'Upload logo'}
              </button>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="text-[12px] text-[#737373] hover:text-[#DC2626] transition-colors flex items-center gap-1 self-start"
                >
                  <X size={12} strokeWidth={2} />
                  {isTr ? 'Logoyu kaldır' : 'Remove logo'}
                </button>
              )}
              <p className="text-[11px] text-[#A3A3A3] leading-[1.55]">
                {isTr ? 'PNG / JPG / SVG · max 5 MB' : 'PNG / JPG / SVG · max 5 MB'}
              </p>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload('logo', f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* ─── Favicon ─── */}
        <div>
          <Eyebrow>{isTr ? 'FAVICON' : 'FAVICON'}</Eyebrow>
          <div className="mt-2 flex items-center gap-4">
            <div
              className="relative flex shrink-0 items-center justify-center overflow-hidden"
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: '#FAFAFA',
                border: form.faviconUrl ? '1px solid #EDEDED' : '1px dashed #D4D4D4',
              }}
            >
              {uploadingFavicon ? (
                <Loader2 size={14} className="animate-spin text-[#737373]" />
              ) : form.faviconUrl ? (
                 
                <img
                  src={form.faviconUrl}
                  alt="favicon"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon size={16} className="text-[#A3A3A3]" strokeWidth={2} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploadingFavicon}
                className="bz-btn-ghost"
              >
                <Upload size={14} strokeWidth={2} />
                {form.faviconUrl
                  ? isTr ? 'Faviconu değiştir' : 'Replace favicon'
                  : isTr ? 'Favicon yükle' : 'Upload favicon'}
              </button>
              {form.faviconUrl && (
                <button
                  type="button"
                  onClick={removeFavicon}
                  className="text-[12px] text-[#737373] hover:text-[#DC2626] transition-colors flex items-center gap-1 self-start"
                >
                  <X size={12} strokeWidth={2} />
                  {isTr ? 'Faviconu kaldır' : 'Remove favicon'}
                </button>
              )}
              <p className="text-[11px] text-[#A3A3A3] leading-[1.55]">
                {isTr ? 'Tarayıcı sekmesinde görünür · 256×256' : 'Browser tab icon · 256×256'}
              </p>
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload('favicon', f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* ─── Primary color ─── */}
        <div>
          <Eyebrow>{isTr ? 'ANA RENK' : 'PRIMARY COLOR'}</Eyebrow>
          <div className="mt-2">
            <ColorPicker
              value={form.primaryColor}
              onChange={(hex) => setForm((p) => ({ ...p, primaryColor: hex }))}
              ariaLabel={isTr ? 'Ana renk' : 'Primary color'}
            />
          </div>
        </div>

        {/* ─── Secondary color ─── */}
        <div>
          <Eyebrow>{isTr ? 'İKİNCİL RENK' : 'SECONDARY COLOR'}</Eyebrow>
          <div className="mt-2">
            <ColorPicker
              value={form.secondaryColor || ''}
              onChange={(hex) => setForm((p) => ({ ...p, secondaryColor: hex }))}
              ariaLabel={isTr ? 'İkincil renk' : 'Secondary color'}
            />
          </div>
        </div>

        {/* ─── Accent color ─── */}
        <div>
          <Eyebrow>{isTr ? 'AKSAN RENGİ' : 'ACCENT COLOR'}</Eyebrow>
          <div className="mt-2">
            <ColorPicker
              value={form.accentColor}
              onChange={(hex) => setForm((p) => ({ ...p, accentColor: hex }))}
              ariaLabel={isTr ? 'Aksan rengi' : 'Accent color'}
            />
          </div>
        </div>

        {/* ─── Accent font ─── */}
        <div>
          <Eyebrow>{isTr ? 'AKSAN FONTU' : 'ACCENT FONT'}</Eyebrow>
          <div className="mt-2">
            <select
              value={form.accentFont}
              onChange={(e) => setForm((p) => ({ ...p, accentFont: e.target.value }))}
              className="bz-input"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Slogan ─── */}
      <div className="mt-6">
        <Eyebrow>{isTr ? 'SLOGAN / KISA AÇIKLAMA' : 'SLOGAN / TAGLINE'}</Eyebrow>
        <div className="mt-2">
          <input
            type="text"
            value={form.slogan}
            onChange={(e) => setForm((p) => ({ ...p, slogan: e.target.value.slice(0, SLOGAN_MAX) }))}
            placeholder={isTr ? 'Örn. "Senin damağına özel."' : 'e.g. "Crafted for your taste."'}
            maxLength={SLOGAN_MAX}
            className="bz-input"
          />
          <div className="mt-1 flex justify-between text-[11px] text-[#A3A3A3]">
            <span>
              {isTr
                ? 'QR kartında ve müşteri ekranlarında işletme adının altında görünür.'
                : 'Appears under the business name on QR cards and customer screens.'}
            </span>
            <span>
              {form.slogan.length}/{SLOGAN_MAX}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Live preview ─── */}
      <div className="mt-7">
        <Eyebrow>{isTr ? 'ÖN İZLEME' : 'PREVIEW'}</Eyebrow>
        <div
          className="mt-3 rounded-[18px] p-6 sm:p-8 flex flex-col items-center text-center"
          style={{
            background: form.accentColor || '#C6F24E',
            color: form.primaryColor || '#0A0A0A',
            border: `1px solid ${form.secondaryColor || '#EDEDED'}`,
          }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden"
            style={{
              background: form.secondaryColor || '#FFFFFF',
              color: form.primaryColor || '#0A0A0A',
              fontFamily: previewFontFamily,
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            {form.logoUrl ? (
               
              <img src={form.logoUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
            ) : (
              initial1
            )}
          </div>
          <div
            className="mt-3"
            style={{
              fontFamily: previewFontFamily,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: form.primaryColor || '#0A0A0A',
            }}
          >
            {restaurantName || (isTr ? 'İşletme adı' : 'Business name')}
          </div>
          {form.slogan && (
            <div
              className="mt-1.5 text-[13px] opacity-80"
              style={{ color: form.primaryColor || '#0A0A0A' }}
            >
              {form.slogan}
            </div>
          )}
          <div
            className="mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium"
            style={{
              background: form.primaryColor || '#0A0A0A',
              color: form.accentColor || '#C6F24E',
            }}
          >
            {isTr ? 'Deneyimini paylaş' : 'Share your experience'}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#A3A3A3] leading-[1.55] flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" strokeWidth={2} />
          {isTr
            ? 'Önizleme renklerin ve fontun gerçek müşteri akışındaki yansımasını gösterir; tam tasarım menü/QR sayfalarında uygulanır.'
            : "Preview shows how colors and font apply to customer-facing surfaces; full design renders on menu/QR pages."}
        </p>
      </div>

      {/* ─── Actions ─── */}
      <div className="mt-7 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="bz-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} strokeWidth={2} />
          )}
          {isTr ? 'Değişiklikleri kaydet' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty || saving}
          className="bz-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTr ? 'Vazgeç' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={handleRestoreDefaults}
          disabled={saving}
          className="bz-btn-ghost ml-auto"
        >
          <RotateCcw size={14} strokeWidth={2} />
          {isTr ? 'Varsayılana sıfırla' : 'Restore defaults'}
        </button>
      </div>
    </section>
  );
}
