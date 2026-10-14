import { useRef } from 'react';
import { Check, Image as ImageIcon, Loader2, Plus, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import type { MenuTheme } from '@/lib/validations';
import type { Locale } from '@/lib/translations';
import { THEME_SWATCH_GROUPS, THEME_VIBES } from './menu-constants';
import type { RestaurantShape } from './menu-types';
import { ThemeThumb } from './ThemeThumb';

export function ThemePanel({
  restaurant, copy, locale, saving, onChange, onUploadLogo,
}: {
  restaurant: RestaurantShape;
  copy: Record<string, string>;
  locale: Locale;
  saving: boolean;
  onChange: (patch: { menuTheme?: MenuTheme; menuAccentColor?: string | null; menuLogoUrl?: string | null }) => void;
  onUploadLogo: (file: File) => void;
}) {
  const themes: { id: MenuTheme; label: string }[] = [
    { id: 'classic', label: copy.themeClassic },
    { id: 'modern', label: copy.themeModern },
    { id: 'elegant', label: copy.themeElegant },
    { id: 'gastronomy', label: copy.themeGastronomy },
    { id: 'minimal', label: copy.themeMinimal },
    { id: 'bistro', label: copy.themeBistro },
    { id: 'pulse', label: copy.themePulse },
  ];
  const currentAccent = restaurant.menuAccentColor ?? restaurant.primaryColor ?? '#C6F24E';
  const logoFileRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#EDEDED] px-6 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
            <Sparkles size={14} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">{copy.menuDesign}</p>
            <p className="mt-0.5 text-[12px] text-[#737373]">
              {copy.themeLabel} · {copy.accentColor} · {copy.logo}
            </p>
          </div>
        </div>
        {saving && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#737373]">
            <Loader2 size={12} className="animate-spin" />
            {copy.saving}
          </span>
        )}
      </div>

      <div className="space-y-7 p-6">
        {/* Themes */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="pulse-eyebrow text-[#737373]">{copy.themeLabel}</p>
            <p className="text-[11px] text-[#A3A3A3]">
              {themes.find((t) => t.id === restaurant.menuTheme)?.label ?? ''}
            </p>
          </div>
          <div /* §38.238 — lg'de bu panel 345px; 3 sütun tema adlarını okunamaz
                    kılıyordu. xl'e ertelendi. */
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {themes.map((t) => {
              const active = restaurant.menuTheme === t.id;
              const vibe = THEME_VIBES[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => onChange({ menuTheme: t.id })}
                  className={`group relative flex flex-col items-stretch gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                    active
                      ? 'border-[#0A0A0A] bg-white shadow-[0_8px_20px_-8px_rgba(10,10,10,0.18)] ring-2 ring-[#C6F24E]'
                      : 'border-[#EDEDED] bg-white hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md'
                  }`}
                >
                  <ThemeThumb theme={t.id} accent={currentAccent} />
                  <div className="flex items-start justify-between gap-2 px-0.5">
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-medium leading-tight ${active ? 'text-[#0A0A0A]' : 'text-[#525252]'}`}>
                        {t.label}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[9.5px] uppercase tracking-[0.16em] text-[#A3A3A3]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {locale === 'tr' ? vibe.tr : vibe.en}
                      </p>
                    </div>
                    {active && (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] shadow-sm">
                        <Check size={11} strokeWidth={3} className="text-[#0A0A0A]" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="pulse-eyebrow text-[#737373]">{copy.accentColor}</p>
            <span className="font-mono text-[11px] text-[#A3A3A3]" style={{ fontFamily: 'var(--font-mono)' }}>
              {currentAccent.toUpperCase()}
            </span>
          </div>
          <div className="space-y-3">
            {THEME_SWATCH_GROUPS.map((group) => (
              <div key={group.tr} className="flex items-center gap-3">
                <p className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#A3A3A3]">
                  {locale === 'tr' ? group.tr : group.en}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {group.colors.map((c) => {
                    const active = currentAccent.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        onClick={() => onChange({ menuAccentColor: c })}
                        style={{ backgroundColor: c }}
                        className={`relative h-9 w-9 rounded-full transition-all active:scale-90 ${
                          active
                            ? 'ring-2 ring-[#0A0A0A] ring-offset-2'
                            : 'shadow-sm ring-1 ring-black/5 hover:scale-110'
                        }`}
                        title={c}
                        aria-label={c}
                      >
                        {active && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check size={13} strokeWidth={3} className="text-white drop-shadow" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#F5F5F5] pt-3">
              <label className="relative inline-flex h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-full border-2 border-dashed border-[#A3A3A3] px-3 text-[11px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]">
                <input
                  type="color"
                  value={currentAccent}
                  onChange={(e) => onChange({ menuAccentColor: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <Plus size={12} strokeWidth={2.25} />
                {locale === 'tr' ? 'Özel renk' : 'Custom'}
              </label>
              {restaurant.menuAccentColor && (
                <button
                  onClick={() => onChange({ menuAccentColor: null })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                >
                  <X size={11} strokeWidth={2} />
                  {copy.resetAccent}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <p className="pulse-eyebrow mb-3 text-[#737373]">{copy.logo}</p>
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-[#EDEDED]">
              {restaurant.menuLogoUrl ? (
                 
                <img src={restaurant.menuLogoUrl} alt="logo" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ color: currentAccent }}>
                  <UtensilsCrossed size={26} strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={saving}
                  className="bz-btn-primary bz-btn-sm disabled:opacity-50"
                >
                  <ImageIcon size={13} strokeWidth={2} />
                  {copy.uploadImage}
                </button>
                {restaurant.menuLogoUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ menuLogoUrl: null })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] active:scale-95"
                  >
                    <X size={12} strokeWidth={2} />
                    {copy.removeImage}
                  </button>
                )}
              </div>
              <p className="text-[12px] leading-relaxed text-[#737373]">{copy.logoHint}</p>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadLogo(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
