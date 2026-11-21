'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { AlertTriangle, ImagePlus, Info, Loader2, Palette, RotateCcw, Sparkles, X } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import { MENU_FONT_VARIABLES } from '@/components/menu/menu-fonts';
import { normaliseHex } from '@/lib/qr-colors';
import {
  MENU_PRESET_ORDER, MENU_HEADERS, MENU_ITEM_LAYOUTS, MENU_NAVS, MENU_CARD_STYLES, MENU_DENSITIES, MENU_CORNERS,
  MENU_PRICE_STYLES, MENU_BADGE_STYLES, PRESETS,
  countOverrides, normalizeMenuDesign, resolveMenuDesign, styleKnobsOf,
  type MenuDesign, type MenuKnobKey, type MenuKnobs, type MenuPresetId, type ResolvedMenuDesign,
} from '@/lib/menu-design';
import type { ThemeDraft } from '../data/useThemeDraft';
import { Sheet } from '../kit/Sheet';
import { STORAGE_KEYS, safeLocalGet, safeLocalSet } from '../kit/storage';
import { useMenuCopy } from '../kit/useMenuCopy';
import { THEME_VIBES } from '../menu-constants';
import { draftPresetId, findSwatch, type ThemeValues } from '../menu-theme';
import { AccentPicker } from './AccentPicker';
import { ContrastNote } from './ContrastNote';
import { CoverField } from './CoverField';
import { LogoField } from './LogoField';
import { OptionGroup, rovingDelta } from './OptionGroup';
import { SurfacePicker } from './SurfacePicker';
import { TaglineField } from './TaglineField';
import { ThemeCard } from './ThemeCard';
import { TypefacePicker } from './TypefacePicker';

type TabId = 'style' | 'color' | 'type' | 'layout' | 'brand';
const TABS: TabId[] = ['style', 'color', 'type', 'layout', 'brand'];

/** The 8 enumerated layout knobs of the "Düzen" tab, in canonical order. */
const LAYOUT_KNOBS = [
  ['items', MENU_ITEM_LAYOUTS],
  ['header', MENU_HEADERS],
  ['nav', MENU_NAVS],
  ['cardStyle', MENU_CARD_STYLES],
  ['density', MENU_DENSITIES],
  ['corners', MENU_CORNERS],
  ['price', MENU_PRICE_STYLES],
  ['badges', MENU_BADGE_STYLES],
] as const;

const TAB_KNOBS: Record<'color' | 'type' | 'layout', readonly MenuKnobKey[]> = {
  color: ['surface'],
  type: ['typeface'],
  layout: LAYOUT_KNOBS.map(([key]) => key),
};

const accentOf = (v: string | null) => (v ? normaliseHex(v) ?? v : null);

/** Which tabs hold unapplied changes (a preset switch dots only "Stil"). */
function dirtyTabs(applied: ThemeValues, draft: ThemeValues): Record<TabId, boolean> {
  const a = normalizeMenuDesign(applied.menuTheme, applied.menuDesign);
  const d = normalizeMenuDesign(draft.menuTheme, draft.menuDesign);
  const ak = styleKnobsOf(a);
  const dk = styleKnobsOf(d);
  const knobs = (keys: readonly MenuKnobKey[]) => keys.some((key) => ak[key] !== dk[key]);
  return {
    style: applied.menuTheme !== draft.menuTheme || draftPresetId(applied) !== draftPresetId(draft),
    color: accentOf(applied.menuAccentColor) !== accentOf(draft.menuAccentColor) || knobs(TAB_KNOBS.color),
    type: knobs(TAB_KNOBS.type),
    layout: knobs(TAB_KNOBS.layout),
    brand:
      (applied.menuLogoUrl || null) !== (draft.menuLogoUrl || null) ||
      (applied.menuCoverUrl || null) !== (draft.menuCoverUrl || null) ||
      (a?.tagline ?? null) !== (d?.tagline ?? null),
  };
}

function SectionTitle({ id, children, aside }: { id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 id={id}>
        <span className="text-[14px] font-semibold text-[#0A0A0A]">{children}</span>
      </h3>
      {aside}
    </div>
  );
}

/**
 * "Menü görünümü" (menu-design-final §11): five tabs — Stil (12 presets with
 * live mini menus), Renk (accent + surface), Yazı (typeface), Düzen (8 layout
 * knobs), Marka (logo, cover, tagline). Every choice changes only the preview;
 * "Uygula" saves the changed fields at once (one PATCH) and the page toasts
 * "Görünüm uygulandı" with "Geri al".
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
  presentation, design, restaurantName, fallbackAccent, isTr, isPublished, readOnly, onRequestClose, onApplied,
  onPreviewTop, leaveConfirm, preview,
}: {
  presentation: 'docked' | 'sheet';
  design: ThemeDraft;
  /** Drawn in the style thumbnails. */
  restaurantName: string;
  /** The business colour (what "Varsayılan" shows), normalised. */
  fallbackAccent: string;
  isTr: boolean;
  isPublished: boolean;
  /** Viewer or module off: everything stays visible but disabled. */
  readOnly?: boolean;
  onRequestClose: () => void;
  /** Apply succeeded; the page toasts (after closing the sheet). */
  onApplied: (undo: (() => Promise<{ ok: boolean; message?: string }>) | undefined) => void;
  /** The preview should jump to its top (header, logo, cover, tagline or surface changed). */
  onPreviewTop?: () => void;
  leaveConfirm?: { onConfirm: () => void; onCancel: () => void } | null;
  /** Sheet only: the bare preview (owns the preview slot while the sheet is open). */
  preview?: ReactNode;
}) {
  const copy = useMenuCopy();
  const { draft, applied, dirty, applying, uploading } = design;
  const locked = applying || Boolean(readOnly);
  const [tab, setTab] = useState<TabId>('style');
  const [droppedFor, setDroppedFor] = useState<MenuPresetId | null>(null);
  const [refreshNote, setRefreshNote] = useState(false);
  const themeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const coverButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const accent = draft.menuAccentColor ?? fallbackAccent;
  const presetId = draftPresetId(draft);
  const hasCover = Boolean(draft.menuCoverUrl);

  const resolved = useMemo(
    () =>
      resolveMenuDesign({
        menuTheme: draft.menuTheme,
        menuAccentColor: draft.menuAccentColor,
        primaryColor: fallbackAccent,
        menuDesign: draft.menuDesign,
        hasCover,
      }),
    [draft.menuTheme, draft.menuAccentColor, draft.menuDesign, fallbackAccent, hasCover],
  );
  const stored = useMemo(() => normalizeMenuDesign(draft.menuTheme, draft.menuDesign), [draft.menuTheme, draft.menuDesign]);
  const overrides = countOverrides(stored);
  const presetKnobs = PRESETS[presetId].knobs;

  // One mini menu per preset: the draft design on the selected card, the pure preset elsewhere.
  const thumbs = useMemo(() => {
    const out = {} as Record<MenuPresetId, ResolvedMenuDesign>;
    for (const id of MENU_PRESET_ORDER) {
      const own: MenuDesign = { v: 1, preset: id, ...(draft.menuDesign?.tagline ? { tagline: draft.menuDesign.tagline } : {}) };
      out[id] = resolveMenuDesign({
        menuTheme: PRESETS[id].family,
        menuAccentColor: draft.menuAccentColor,
        primaryColor: fallbackAccent,
        menuDesign: id === presetId ? draft.menuDesign : own,
        hasCover,
      });
    }
    return out;
  }, [draft.menuDesign, draft.menuAccentColor, fallbackAccent, presetId, hasCover]);

  const dirtyByTab = useMemo(() => dirtyTabs(applied, draft), [applied, draft]);

  // Docked: the panel takes the outline's place — bring its top into view (the
  // page may have been scrolled far down the outline) and focus its title.
  useEffect(() => {
    if (presentation !== 'docked') return;
    const section = sectionRef.current;
    if (section && section.getBoundingClientRect().top < 56) section.scrollIntoView({ block: 'start', behavior: 'auto' });
    titleRef.current?.focus({ preventScroll: true });
  }, [presentation]);

  // One-time "styles were refreshed" note (per browser).
  useEffect(() => {
    setRefreshNote(safeLocalGet(STORAGE_KEYS.designRefresh) !== '1');
  }, []);
  const dismissRefresh = () => {
    safeLocalSet(STORAGE_KEYS.designRefresh, '1');
    setRefreshNote(false);
  };

  // The preview jumps to its top when something at the top of the menu changes.
  const previewTop = useRef(onPreviewTop);
  previewTop.current = onPreviewTop;
  const topSignal = [resolved.structure.header, resolved.knobs.surface, draft.menuLogoUrl, draft.menuCoverUrl, resolved.tagline];
  const firstTop = useRef(true);
  useEffect(() => {
    if (firstTop.current) {
      firstTop.current = false;
      return;
    }
    previewTop.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, topSignal);
  // Opening Marka also shows the top (where logo, cover and tagline live), but
  // leaving it keeps the owner's scroll position (spec §11.1).
  const prevTab = useRef(tab);
  useEffect(() => {
    if (tab === 'brand' && prevTab.current !== 'brand') previewTop.current?.();
    prevTab.current = tab;
  }, [tab]);

  const pickPreset = (id: MenuPresetId) => {
    if (id === presetId) return;
    const dropped = design.setPreset(id);
    setDroppedFor(dropped ? id : null);
  };
  const restorePreset = () => {
    design.restorePreset();
    setDroppedFor(null);
  };
  const setKnob = <K extends MenuKnobKey>(key: K, value: MenuKnobs[K]) => {
    setDroppedFor(null);
    design.setKnob(key, value);
  };

  const onThemeKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = rovingDelta(e);
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + MENU_PRESET_ORDER.length) % MENU_PRESET_ORDER.length;
    pickPreset(MENU_PRESET_ORDER[next]);
    themeRefs.current[next]?.focus();
  };

  const goToCover = () => {
    setTab('brand');
    requestAnimationFrame(() => requestAnimationFrame(() => coverButtonRef.current?.focus()));
  };

  const apply = async () => {
    if (!dirty || applying || uploading || readOnly) return;
    const r = await design.apply();
    if (r.ok) onApplied(r.undo);
  };

  const suggested = PRESETS[presetId].suggestedAccent;
  const suggestedSwatch = findSwatch(suggested);
  const showSuggested = Boolean(suggested && suggestedSwatch && accentOf(draft.menuAccentColor) !== suggested);
  const presetName = (id: MenuPresetId) => copy.design.themes[id];
  const surfaceName = copy.design.surfaces[resolved.knobs.surface];

  // ── tab bodies ──
  const styleTab = (
    <div className="space-y-4">
      {refreshNote && (
        <div role="note" className="flex items-start gap-2.5 rounded-xl bg-[#F4FBDF] p-3 ring-1 ring-[#DDEFA6]">
          <Sparkles size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-[#3F4A00]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[#2F3600]">{copy.design.refreshNote}</p>
          <button type="button" onClick={dismissRefresh} className="bz-btn-ghost min-h-11 shrink-0 px-3 pointer-fine:min-h-8">
            {copy.design.refreshDismiss}
          </button>
        </div>
      )}
      <section aria-labelledby="menu-design-theme">
        <SectionTitle id="menu-design-theme">{copy.design.theme}</SectionTitle>
        <div role="radiogroup" aria-labelledby="menu-design-theme" className="grid grid-cols-2 gap-3 @min-[520px]:grid-cols-3">
          {MENU_PRESET_ORDER.map((id, index) => {
            const label = presetName(id);
            const checked = id === presetId;
            return (
              <ThemeCard
                key={id}
                buttonRef={(el) => {
                  themeRefs.current[index] = el;
                }}
                resolved={thumbs[id]}
                restaurantName={restaurantName}
                label={label}
                vibe={isTr ? THEME_VIBES[id].tr : THEME_VIBES[id].en}
                ariaLabel={copy.design.themeCardLabel(label)}
                customizedLabel={copy.design.customized}
                customized={checked && overrides > 0}
                checked={checked}
                disabled={locked}
                onSelect={() => pickPreset(id)}
                onKeyDown={(e) => onThemeKey(e, index)}
              />
            );
          })}
        </div>
      </section>
      {droppedFor === presetId && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-[#FAFAFA] px-3 py-2 ring-1 ring-[#EDEDED]">
          <p className="min-w-0 flex-1 text-[12.5px] text-[#404040]">{copy.design.knobsReset}</p>
          <button type="button" onClick={restorePreset} disabled={locked} className="bz-btn-ghost min-h-11 px-3 pointer-fine:min-h-8">
            <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
            {copy.design.restoreKnobs}
          </button>
        </div>
      )}
      {showSuggested && suggested && suggestedSwatch && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 ring-1 ring-[#EDEDED]">
          <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: suggested }} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[12.5px] text-[#404040]">
            {copy.design.suggestedAccent(isTr ? suggestedSwatch.tr : suggestedSwatch.en)}
          </p>
          <button
            type="button"
            onClick={() => design.setAccent(suggested)}
            disabled={locked}
            className="bz-btn min-h-11 px-3 pointer-fine:min-h-8"
          >
            {copy.design.useSuggested}
          </button>
        </div>
      )}
      {overrides > 0 && (
        <button type="button" onClick={() => { setDroppedFor(null); design.resetKnobs(); }} disabled={locked} className="bz-btn-ghost min-h-11 pointer-fine:min-h-9">
          <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
          {copy.design.resetAll}
        </button>
      )}
    </div>
  );

  const colorTab = (
    <div className="space-y-7">
      <section aria-labelledby="menu-design-accent" className="space-y-3">
        <SectionTitle id="menu-design-accent">{copy.design.accent}</SectionTitle>
        <AccentPicker value={draft.menuAccentColor} fallback={fallbackAccent} isTr={isTr} disabled={locked} onChange={design.setAccent} />
        <ContrastNote resolved={resolved} surfaceName={surfaceName} />
      </section>
      <section aria-labelledby="menu-design-surface">
        <SectionTitle id="menu-design-surface">{copy.design.surface}</SectionTitle>
        <SurfacePicker
          labelId="menu-design-surface"
          value={resolved.knobs.surface}
          defaultValue={presetKnobs.surface}
          names={copy.design.surfaces}
          defaultLabel={copy.design.presetDefault}
          displayFont={resolved.typeface.display}
          disabled={locked}
          onChange={(v) => setKnob('surface', v)}
        />
      </section>
    </div>
  );

  const typeTab = (
    <section aria-labelledby="menu-design-typeface">
      <SectionTitle id="menu-design-typeface">{copy.design.typeface}</SectionTitle>
      <TypefacePicker
        labelId="menu-design-typeface"
        value={resolved.knobs.typeface}
        defaultValue={presetKnobs.typeface}
        names={copy.design.typefaces}
        sample={copy.design.typefaceSample}
        defaultLabel={copy.design.presetDefault}
        disabled={locked}
        onChange={(v) => setKnob('typeface', v)}
      />
    </section>
  );

  const layoutTab = (
    <div className="grid grid-cols-1 gap-x-5 gap-y-5 @min-[560px]:grid-cols-2">
      {LAYOUT_KNOBS.map(([key, values]) => {
        const knob = copy.design.knobs[key];
        const labels = knob.values as Record<string, string>;
        return (
          <OptionGroup<string>
            key={key}
            label={knob.label}
            options={values.map((v) => ({ value: v, label: labels[v] }))}
            value={resolved.knobs[key]}
            defaultValue={presetKnobs[key]}
            defaultLabel={copy.design.presetDefault}
            disabled={locked}
            onChange={(v) => setKnob(key, v as MenuKnobs[typeof key])}
          >
            {key === 'header' && resolved.knobs.header === 'cover' && !hasCover && (
              <div role="note" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-[#FAFAFA] px-3 py-2 ring-1 ring-[#EDEDED]">
                <Info size={14} strokeWidth={2} className="shrink-0 text-[#525252]" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-[12.5px] text-[#404040]">{copy.design.coverNeeded}</p>
                <button type="button" onClick={goToCover} disabled={locked} className="bz-btn min-h-11 px-3 pointer-fine:min-h-8">
                  <ImagePlus size={13} strokeWidth={2} aria-hidden="true" />
                  {copy.design.addCover}
                </button>
              </div>
            )}
          </OptionGroup>
        );
      })}
    </div>
  );

  const brandTab = (
    <div className="space-y-7">
      <section aria-labelledby="menu-design-logo">
        <SectionTitle id="menu-design-logo">{copy.design.logo}</SectionTitle>
        <LogoField
          value={draft.menuLogoUrl}
          accent={accent}
          uploading={design.logoUploading}
          disabled={locked}
          onFile={(file) => void design.setLogoFile(file)}
          onRemove={design.removeLogo}
        />
      </section>
      <section aria-labelledby="menu-design-cover">
        <SectionTitle id="menu-design-cover">{copy.design.cover}</SectionTitle>
        <CoverField
          buttonRef={coverButtonRef}
          value={draft.menuCoverUrl}
          uploading={design.coverUploading}
          disabled={locked}
          onFile={(file) => void design.setCoverFile(file)}
          onRemove={design.removeCover}
          onShowInHeader={resolved.knobs.header === 'cover' ? undefined : () => setKnob('header', 'cover')}
        />
      </section>
      <section aria-labelledby="menu-design-tagline">
        <SectionTitle id="menu-design-tagline">{copy.design.tagline}</SectionTitle>
        <TaglineField value={resolved.tagline} disabled={locked} onChange={design.setTagline} />
      </section>
    </div>
  );

  const bodies: Record<TabId, ReactNode> = { style: styleTab, color: colorTab, type: typeTab, layout: layoutTab, brand: brandTab };

  const settings = (
    <TabsPrimitive.Root value={tab} onValueChange={(v) => setTab(v as TabId)} className={MENU_FONT_VARIABLES}>
      <div
        className={`sticky z-10 -mx-4 bg-white px-4 pb-3 pt-1 sm:-mx-5 sm:px-5 ${
          presentation === 'docked' ? 'top-[56px]' : 'top-[-16px] pt-4'
        }`}
      >
        <TabsPrimitive.List
          aria-label={copy.design.title}
          className="flex gap-1 overflow-x-auto rounded-xl bg-[#F4F4F4] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((id) => {
            const name = copy.design.tabs[id];
            const isDirty = dirtyByTab[id];
            return (
              <TabsPrimitive.Trigger
                key={id}
                value={id}
                aria-label={isDirty ? copy.design.tabDirty(name) : name}
                className="relative inline-flex h-11 min-w-fit flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[13px] font-medium text-[#525252] transition-colors duration-[160ms] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] data-[state=active]:bg-white data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-[0_1px_3px_rgba(10,10,10,0.12)] pointer-fine:h-9"
              >
                {name}
                {isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#65A30D]" aria-hidden="true" />}
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>
      </div>
      {TABS.map((id) => (
        <TabsPrimitive.Content key={id} value={id} className="pt-2 focus-visible:outline-none">
          {bodies[id]}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
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
              disabled={applying || uploading || Boolean(readOnly)}
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
          <p id="design-leave-title" className="bz-h-tight [word-spacing:0.1em] text-[16px] text-[#0A0A0A]">
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
        bodyClassName="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
      >
        <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_280px] sm:items-start sm:gap-5">
          {preview && (
            <div className="mb-5 h-[38dvh] overflow-y-auto overscroll-contain rounded-xl sm:sticky sm:top-0 sm:order-2 sm:mb-0 sm:h-auto sm:max-h-[64dvh]">
              {preview}
            </div>
          )}
          {/* The container is the settings column, not the sheet body: on a tablet the
              280 px preview sits beside it, so the grids must measure the column. */}
          <div className="@container min-w-0 sm:order-1">{settings}</div>
        </div>
      </Sheet>
    );
  }

  return (
    <section ref={sectionRef} role="region" aria-labelledby="design-panel-title" className="bz-card relative scroll-mt-[72px] p-0">
      <div className="flex items-center gap-2 border-b border-[#EDEDED] px-4 py-3 sm:px-5">
        <Palette size={16} strokeWidth={2} className="shrink-0 text-[#525252]" aria-hidden="true" />
        <h2 id="design-panel-title" ref={titleRef} tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <span className="bz-h-tight [word-spacing:0.1em] text-[18px] text-[#0A0A0A]">{copy.design.title}</span>
        </h2>
        <button type="button" onClick={onRequestClose} aria-label={copy.design.close} className="bz-btn-icon h-8 w-8 shrink-0">
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      <div className="@container px-4 pb-6 pt-3 sm:px-5">{settings}</div>
      <div className="sticky bottom-0 z-10 rounded-b-xl border-t border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        {applyBar}
      </div>
    </section>
  );
}
