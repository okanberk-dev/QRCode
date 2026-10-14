import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Image as ImageIcon, Loader2, Plus, UtensilsCrossed, X } from 'lucide-react';
import { APSegmented, AlertBanner, Modal } from '@/components/ui';
import { contrastRatio, normaliseHex } from '@/lib/qr-colors';
import type { Locale } from '@/lib/translations';
import type { MenuTheme } from '@/lib/validations';
import { THEME_VIBES } from './menu-constants';
import type { MenuCopy, MenuFmt } from './menu-copy';
import { ACCENT_SWATCHES, findSwatch } from './menu-theme';
import type { CategoryShape, RestaurantShape } from './menu-types';
import { useMediaQuery } from './menu-ui';
import { MenuLivePreview } from './MenuLivePreview';
import { ThemeThumb } from './ThemeThumb';

type ThemePatch = { menuTheme?: MenuTheme; menuAccentColor?: string | null; menuLogoUrl?: string | null };

/** How long a dragged colour waits before it is saved (the picker fires on every pixel). */
const COLOR_SAVE_DELAY_MS = 500;

const FALLBACK_ACCENT = '#C6F24E';

/**
 * Theme, accent colour and logo — and the live preview next to them (a tab on
 * a phone). Every choice saves at once; there is no "Apply" button, the dialog
 * only says whether the last change is saved.
 */
export function MenuDesignModal({
  restaurant, categories, isTr, locale, copy, fmt, status, error, onDismissError,
  onPreview, onSave, onUploadLogo, onClose,
}: {
  restaurant: RestaurantShape;
  categories: CategoryShape[];
  isTr: boolean;
  locale: Locale;
  copy: MenuCopy;
  fmt: MenuFmt;
  status: 'idle' | 'saving' | 'saved';
  error: string | null;
  onDismissError: () => void;
  /** Show a change in the preview without saving it. */
  onPreview: (patch: ThemePatch) => void;
  onSave: (patch: ThemePatch) => Promise<void> | void;
  onUploadLogo: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const [tab, setTab] = useState<'settings' | 'preview'>('settings');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const logoPreviewUrl = useRef<string | null>(null);

  const themes: { id: MenuTheme; label: string }[] = [
    { id: 'classic', label: copy.themeClassic },
    { id: 'modern', label: copy.themeModern },
    { id: 'elegant', label: copy.themeElegant },
    { id: 'gastronomy', label: copy.themeGastronomy },
    { id: 'minimal', label: copy.themeMinimal },
    { id: 'bistro', label: copy.themeBistro },
    { id: 'pulse', label: copy.themePulse },
  ];

  // What the menu actually shows: the chosen accent, else the business colour.
  const effectiveAccent = normaliseHex(restaurant.menuAccentColor ?? restaurant.primaryColor ?? '') ?? FALLBACK_ACCENT;
  const savedAccent = restaurant.menuAccentColor ? normaliseHex(restaurant.menuAccentColor) : null;
  const savedIsCustom = savedAccent !== null && findSwatch(savedAccent) === null;

  // ── custom colour: instant preview, saved after a pause or when the picker closes ──
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingColor = useRef<string | null>(null);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  const flushColor = useCallback(() => {
    if (colorTimer.current) {
      clearTimeout(colorTimer.current);
      colorTimer.current = null;
    }
    const color = pendingColor.current;
    pendingColor.current = null;
    if (color) void saveRef.current({ menuAccentColor: color });
  }, []);

  // Closing the dialog right after a drag must not lose the last colour.
  useEffect(() => () => flushColor(), [flushColor]);

  const dropPendingColor = () => {
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = null;
    pendingColor.current = null;
  };

  const onCustomColor = (hex: string) => {
    pendingColor.current = hex;
    onPreview({ menuAccentColor: hex });
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(flushColor, COLOR_SAVE_DELAY_MS);
  };

  const pickTheme = (menuTheme: MenuTheme) => {
    if (menuTheme !== restaurant.menuTheme) void onSave({ menuTheme });
  };
  const pickSwatch = (hex: string) => {
    dropPendingColor();
    if (hex !== savedAccent) void onSave({ menuAccentColor: hex });
    else onPreview({ menuAccentColor: hex });
  };
  const resetAccent = () => {
    dropPendingColor();
    void onSave({ menuAccentColor: null });
  };

  // ── logo ──
  useEffect(
    () => () => {
      if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current);
    },
    [],
  );
  const pickLogo = async (file: File) => {
    if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current);
    logoPreviewUrl.current = URL.createObjectURL(file);
    setLogoPreview(logoPreviewUrl.current);
    setLogoBusy(true);
    try {
      await onUploadLogo(file);
    } finally {
      setLogoBusy(false);
      if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current);
      logoPreviewUrl.current = null;
      setLogoPreview(null);
    }
  };

  const shownLogo = logoPreview ?? restaurant.menuLogoUrl;
  const customInputValue = effectiveAccent.toLowerCase();
  const busy = status === 'saving' || logoBusy;

  const settings = (
    <div className="space-y-7">
      {error && (
        <AlertBanner
          kind="danger"
          icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}
          onDismiss={onDismissError}
        >
          {error}
        </AlertBanner>
      )}

      {/* Theme */}
      <section aria-labelledby="menu-design-theme">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 id="menu-design-theme" className="pulse-eyebrow text-[#737373]">{copy.themeLabel}</h3>
          <span className="text-[11px] text-[#737373]">
            {themes.find((t) => t.id === restaurant.menuTheme)?.label ?? ''}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {themes.map((t) => {
            const active = restaurant.menuTheme === t.id;
            const vibe = THEME_VIBES[t.id];
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                aria-label={fmt.themeCardLabel(t.label)}
                onClick={() => pickTheme(t.id)}
                className={`group relative flex flex-col items-stretch gap-2.5 rounded-2xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
                  active
                    ? 'border-[#0A0A0A] bg-white shadow-[0_8px_20px_-8px_rgba(10,10,10,0.18)] ring-2 ring-[#C6F24E]'
                    : 'border-[#EDEDED] bg-white hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md'
                }`}
              >
                <ThemeThumb theme={t.id} accent={effectiveAccent} />
                <div className="flex items-start justify-between gap-2 px-0.5">
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-medium leading-tight ${active ? 'text-[#0A0A0A]' : 'text-[#525252]'}`}>
                      {t.label}
                    </p>
                    <p
                      className="mt-0.5 truncate text-[9.5px] uppercase tracking-[0.16em] text-[#737373]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {isTr ? vibe.tr : vibe.en}
                    </p>
                  </div>
                  {active && (
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] shadow-sm">
                      <Check size={11} strokeWidth={3} className="text-[#0A0A0A]" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent colour */}
      <section aria-labelledby="menu-design-accent">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 id="menu-design-accent" className="pulse-eyebrow text-[#737373]">{copy.accentColor}</h3>
          <span className="text-[11px] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
            {effectiveAccent}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_SWATCHES.map((swatch) => {
            const active = savedAccent === swatch.hex;
            const name = isTr ? swatch.tr : swatch.en;
            return (
              <SwatchButton
                key={swatch.hex}
                hex={swatch.hex}
                name={name}
                active={active}
                onClick={() => pickSwatch(swatch.hex)}
              />
            );
          })}
          {savedIsCustom && savedAccent && (
            <SwatchButton hex={savedAccent} name={copy.customColorChip} active onClick={() => pickSwatch(savedAccent)} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative inline-flex min-h-[44px] cursor-pointer items-center gap-2 overflow-hidden rounded-full border-2 border-dashed border-[#A3A3A3] px-4 text-[12px] font-medium text-[#525252] transition-colors focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#C6F24E] hover:border-[#0A0A0A] hover:text-[#0A0A0A] sm:min-h-[36px]">
            <input
              type="color"
              value={customInputValue}
              aria-label={copy.customColor}
              onChange={(e) => onCustomColor(e.target.value)}
              onBlur={flushColor}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <Plus size={12} strokeWidth={2.25} aria-hidden="true" />
            {copy.customColor}
          </label>
          {restaurant.menuAccentColor && (
            <button
              type="button"
              onClick={resetAccent}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 text-[12px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] sm:min-h-[36px]"
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
              {copy.resetAccent}
            </button>
          )}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#737373]">{copy.accentHint}</p>
      </section>

      {/* Logo */}
      <section aria-labelledby="menu-design-logo">
        <h3 id="menu-design-logo" className="pulse-eyebrow mb-3 text-[#737373]">{copy.logo}</h3>
        <div className="flex items-start gap-4 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-[#EDEDED]">
            {shownLogo ? (
              <img src={shownLogo} alt="" decoding="async" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center" style={{ color: effectiveAccent }}>
                <UtensilsCrossed size={26} strokeWidth={1.75} aria-hidden="true" />
              </div>
            )}
            {logoBusy && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/75" aria-hidden="true">
                <Loader2 size={18} className="animate-spin text-[#0A0A0A]" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                disabled={logoBusy}
                className="bz-btn-primary"
              >
                <ImageIcon size={13} strokeWidth={2} aria-hidden="true" />
                {restaurant.menuLogoUrl ? copy.changeLogo : copy.uploadLogo}
              </button>
              {restaurant.menuLogoUrl && !logoBusy && (
                <button type="button" onClick={() => void onSave({ menuLogoUrl: null })} className="bz-btn-ghost">
                  <X size={12} strokeWidth={2} aria-hidden="true" />
                  {copy.removeLogo}
                </button>
              )}
            </div>
            <p className="text-[12px] leading-relaxed text-[#737373]">{copy.logoHint}</p>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void pickLogo(file);
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );

  const showPreview = wide || tab === 'preview';
  const showSettings = wide || tab === 'settings';

  return (
    <Modal
      size={1040}
      title={copy.menuDesign}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={onClose} className="bz-btn-primary">
            {copy.done}
          </button>
          {/* Always rendered so screen readers announce the state change. */}
          <p
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#525252] empty:hidden sm:mr-auto"
          >
            {busy ? (
              <>
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                {copy.saving}
              </>
            ) : status === 'saved' ? (
              <span className="inline-flex items-center gap-1.5 text-[#166534]">
                <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                {copy.saved}
              </span>
            ) : null}
          </p>
        </div>
      }
    >
      {!wide && (
        <div className="mb-5 flex justify-center">
          <APSegmented
            options={[
              { value: 'settings', label: copy.tabSettings },
              { value: 'preview', label: copy.tabPreview },
            ]}
            value={tab}
            onChange={setTab}
            ariaLabel={copy.menuDesign}
          />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {showSettings && settings}
        {showPreview && (
          <MenuLivePreview
            variant="inline"
            restaurant={restaurant}
            categories={categories}
            locale={locale}
            published={restaurant.menuEnabled && restaurant.menuPublished}
          />
        )}
      </div>
    </Modal>
  );
}

function SwatchButton({
  hex, name, active, onClick,
}: {
  hex: string;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  // A tick must stay visible on pale colours (lime) and on dark ones.
  const tick = contrastRatio('#FFFFFF', hex) < 3 ? '#0A0A0A' : '#FFFFFF';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      aria-pressed={active}
      title={name}
      style={{ backgroundColor: hex }}
      className={`relative h-11 w-11 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 active:scale-90 sm:h-9 sm:w-9 ${
        active ? 'ring-2 ring-[#0A0A0A] ring-offset-2' : 'shadow-sm ring-1 ring-black/10 hover:scale-110'
      }`}
    >
      {active && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check size={14} strokeWidth={3} style={{ color: tick }} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
