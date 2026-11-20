'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AlertTriangle, Loader2, Palette, X } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import { MENU_THEMES } from '@/lib/validations';
import type { ThemeDraft } from '../data/useThemeDraft';
import { Sheet } from '../kit/Sheet';
import { useMenuCopy } from '../kit/useMenuCopy';
import { THEME_VIBES } from '../menu-constants';
import { AccentPicker } from './AccentPicker';
import { LogoField } from './LogoField';
import { ThemeCard } from './ThemeCard';

/**
 * "Görünüm" (spec §7.11, §8.10): theme, accent colour and logo. Every choice
 * changes only the preview; "Uygula" saves the changed fields at once (one
 * PATCH) and the page toasts "Görünüm uygulandı" with "Geri al".
 *
 * - `docked` (≥1024): replaces the outline in the workspace column; the right
 *   column shows the draft preview. The apply bar sticks to the bottom.
 * - `sheet` (<1024): a bottom sheet — phone: a bare preview strip on top,
 *   settings below; tablet: settings | preview side by side.
 *
 * Every close path (X, Vazgeç, Esc, backdrop, the header button) goes through
 * the page, which asks first while there are unapplied changes; inside the
 * sheet the question renders in place (`leaveConfirm`) because nothing outside
 * a Radix modal is clickable while it is open.
 */
export function DesignPanel({
  presentation, design, fallbackAccent, isTr, isPublished, onRequestClose, onApplied, leaveConfirm, preview,
}: {
  presentation: 'docked' | 'sheet';
  design: ThemeDraft;
  /** The business colour (what "Varsayılan" shows), normalised. */
  fallbackAccent: string;
  isTr: boolean;
  isPublished: boolean;
  onRequestClose: () => void;
  /** Apply succeeded; the page toasts (after closing the sheet). */
  onApplied: (undo: (() => Promise<{ ok: boolean; message?: string }>) | undefined) => void;
  leaveConfirm?: { onConfirm: () => void; onCancel: () => void } | null;
  /** Sheet only: the bare preview (owns the preview slot while the sheet is open). */
  preview?: ReactNode;
}) {
  const copy = useMenuCopy();
  const { draft, dirty, applying, logoUploading } = design;
  const themeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const accent = draft.menuAccentColor ?? fallbackAccent;

  // Docked: the panel takes the outline's place — bring its top into view (the
  // page may have been scrolled far down the outline) and focus its title.
  useEffect(() => {
    if (presentation !== 'docked') return;
    const section = sectionRef.current;
    if (section && section.getBoundingClientRect().top < 56) section.scrollIntoView({ block: 'start', behavior: 'auto' });
    titleRef.current?.focus({ preventScroll: true });
  }, [presentation]);

  const onThemeKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + MENU_THEMES.length) % MENU_THEMES.length;
    design.setTheme(MENU_THEMES[next]);
    themeRefs.current[next]?.focus();
  };

  const apply = async () => {
    if (!dirty || applying || logoUploading) return;
    const r = await design.apply();
    if (r.ok) onApplied(r.undo);
  };

  const settings = (
    <div className="space-y-7">
      <section aria-labelledby="menu-design-theme">
        <h3 id="menu-design-theme" className="mb-3">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">{copy.design.theme}</span>
        </h3>
        <div role="radiogroup" aria-labelledby="menu-design-theme" className="grid grid-cols-2 gap-3 @min-[520px]:grid-cols-3">
          {MENU_THEMES.map((theme, index) => {
            const label = copy.design.themes[theme];
            return (
              <ThemeCard
                key={theme}
                buttonRef={(el) => {
                  themeRefs.current[index] = el;
                }}
                theme={theme}
                label={label}
                vibe={isTr ? THEME_VIBES[theme].tr : THEME_VIBES[theme].en}
                ariaLabel={copy.design.themeCardLabel(label)}
                accent={accent}
                checked={draft.menuTheme === theme}
                disabled={applying}
                onSelect={() => design.setTheme(theme)}
                onKeyDown={(e) => onThemeKey(e, index)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="menu-design-accent">
        <h3 id="menu-design-accent" className="mb-3">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">{copy.design.accent}</span>
        </h3>
        <AccentPicker value={draft.menuAccentColor} fallback={fallbackAccent} isTr={isTr} disabled={applying} onChange={design.setAccent} />
      </section>

      <section aria-labelledby="menu-design-logo">
        <h3 id="menu-design-logo" className="mb-3">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">{copy.design.logo}</span>
        </h3>
        <LogoField
          value={draft.menuLogoUrl}
          accent={accent}
          uploading={logoUploading}
          disabled={applying}
          onFile={(file) => void design.setLogoFile(file)}
          onRemove={design.removeLogo}
        />
      </section>
    </div>
  );

  const applyBar = (
    <div className="space-y-2">
      {design.error && (
        <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />} onDismiss={design.clearError}>
          {design.error}
        </AlertBanner>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p role="status" className="text-[13px] font-semibold text-[#0A0A0A]">
            {dirty ? copy.design.dirty : copy.design.clean}
          </p>
          {dirty && isPublished && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#737373]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]" aria-hidden="true" />
              {copy.design.applyLiveHint}
            </p>
          )}
        </div>
        {dirty ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" onClick={onRequestClose} disabled={applying} className="bz-btn-ghost min-h-11 flex-1 sm:flex-none pointer-fine:min-h-9">
              {copy.design.discard}
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              disabled={applying || logoUploading}
              aria-busy={applying || undefined}
              className="bz-btn-lime min-h-11 flex-1 sm:flex-none pointer-fine:min-h-9"
            >
              {applying && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {applying ? copy.design.applying : copy.design.apply}
            </button>
          </div>
        ) : (
          <button type="button" onClick={onRequestClose} className="bz-btn-ghost min-h-11 pointer-fine:min-h-9">
            {copy.design.close}
          </button>
        )}
      </div>
    </div>
  );

  if (presentation === 'sheet') {
    const confirm = leaveConfirm ? (
      <div
        role="alertdialog"
        aria-labelledby="design-leave-title"
        aria-describedby="design-leave-body"
        className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm"
      >
        <div className="w-full max-w-[320px] text-center">
          <p id="design-leave-title" className="bz-h-tight text-[16px] text-[#0A0A0A]">
            {copy.design.closeDirtyTitle}
          </p>
          <p id="design-leave-body" className="mt-2 text-[13px] leading-relaxed text-[#525252]">
            {copy.design.closeDirtyBody}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" autoFocus onClick={leaveConfirm.onCancel} className="bz-btn-ghost min-h-11 flex-1">
              {copy.design.closeDirtyCancel}
            </button>
            <button type="button" onClick={leaveConfirm.onConfirm} className="bz-btn-danger min-h-11 flex-1">
              {copy.design.closeDirtyConfirm}
            </button>
          </div>
        </div>
      </div>
    ) : null;

    return (
      <Sheet
        open
        side="bottom"
        title={copy.design.title}
        onRequestClose={onRequestClose}
        footer={applyBar}
        overlay={confirm}
        bodyClassName="@container flex-1 overflow-y-auto px-4 py-4 sm:px-6"
      >
        <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_280px] sm:items-start sm:gap-5">
          {preview && (
            <div className="mb-5 h-[38dvh] overflow-y-auto overscroll-contain rounded-xl sm:sticky sm:top-0 sm:order-2 sm:mb-0 sm:h-auto sm:max-h-[64dvh]">
              {preview}
            </div>
          )}
          <div className="min-w-0 sm:order-1">{settings}</div>
        </div>
      </Sheet>
    );
  }

  return (
    <section ref={sectionRef} role="region" aria-labelledby="design-panel-title" className="bz-card relative scroll-mt-[72px] p-0">
      <div className="flex items-center gap-2 border-b border-[#EDEDED] px-4 py-3 sm:px-5">
        <Palette size={16} strokeWidth={2} className="shrink-0 text-[#525252]" aria-hidden="true" />
        <h2 id="design-panel-title" ref={titleRef} tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <span className="bz-h-tight text-[18px] text-[#0A0A0A]">{copy.design.title}</span>
        </h2>
        <button type="button" onClick={onRequestClose} aria-label={copy.design.close} className="bz-btn-icon h-8 w-8 shrink-0">
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      <div className="@container px-4 py-5 sm:px-5">{settings}</div>
      <div className="sticky bottom-0 z-10 rounded-b-xl border-t border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        {applyBar}
      </div>
    </section>
  );
}
