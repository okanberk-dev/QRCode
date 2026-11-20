'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BedDouble, Check, ChevronDown, ChevronRight, Coffee, Croissant, ListPlus,
  Loader2, PartyPopper, PencilLine, Pizza, Plus, Trash2, Truck, UtensilsCrossed, Wine,
} from 'lucide-react';
import { AlertBanner, ProgressBar, WizardSteps, useConfirmDialog } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { MENU_BULK_MAX_ITEMS } from '@/lib/menu-bulk-parse';
import type { SectorKey } from '@/lib/sector-platforms';
import { useMenuCopy } from '../kit/useMenuCopy';
import { parsePasteBlock, setupCategoriesFromPaste } from '../menu-paste';
import {
  SETUP_CATEGORY_NAME_MAX, SETUP_MAX_CATEGORIES, buildSetupPlan, categoriesFromPreset, emptySetupCategory,
  moveSetupCategory, planTotals, previewSetupItems, validateSetupCategories,
  type SetupCategory, type SetupPlanCategory,
} from '../menu-setup';
import { STARTER_FEATURED_COUNT, orderStarterPresets, type StarterPreset } from '../menu-starter-data';
import { scrollBehavior } from '../menu-ui';
import type { SetupDraftState, SetupEntry } from './useSetupDraft';

type Step = 0 | 1 | 2;

// ── Preset cards (ported from the old wizard) ──

const PRESET_PALETTE: Record<StarterPreset['id'], { bg: string; fg: string }> = {
  restaurant: { bg: '#FEF3C7', fg: '#854D0E' },
  cafe: { bg: '#F5F3FF', fg: '#5B21B6' },
  fastfood: { bg: '#FEF2F2', fg: '#991B1B' },
  bakery: { bg: '#FFEDD5', fg: '#9A3412' },
  bar: { bg: '#ECFEFF', fg: '#155E75' },
  hotel: { bg: '#EFF6FF', fg: '#1E40AF' },
  winebar: { bg: '#FAE8FF', fg: '#86198F' },
  foodtruck: { bg: '#FEF3C7', fg: '#A16207' },
  catering: { bg: '#ECFDF5', fg: '#14532D' },
};

function PresetGlyph({ id }: { id: StarterPreset['id'] }) {
  const Icon =
    id === 'restaurant' ? UtensilsCrossed
    : id === 'cafe' ? Coffee
    : id === 'fastfood' ? Pizza
    : id === 'bakery' ? Croissant
    : id === 'hotel' ? BedDouble
    : id === 'foodtruck' ? Truck
    : id === 'catering' ? PartyPopper
    : Wine;
  const { bg, fg } = PRESET_PALETTE[id];
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: bg, color: fg }} aria-hidden="true">
      <Icon size={15} strokeWidth={2} />
    </span>
  );
}

/** Category chips shown on a template card. */
const CARD_CHIPS = 3;

function PresetCard({
  preset, isTr, selected, disabled, onPick,
}: {
  preset: StarterPreset;
  isTr: boolean;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const localized = preset[isTr ? 'tr' : 'en'];
  const extra = localized.categories.length - CARD_CHIPS;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      className={`group relative flex min-h-[44px] w-full flex-col items-start gap-2 rounded-xl border bg-white p-3.5 text-left transition-[border-color,box-shadow] duration-[120ms] hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? 'border-[#0A0A0A] shadow-[0_0_0_1px_#0A0A0A]' : 'border-[#E5E5E5]'
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <PresetGlyph id={preset.id} />
          <span className="truncate text-[14px] font-semibold text-[#0A0A0A]">{localized.label}</span>
        </span>
        {selected ? (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]" aria-hidden="true">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : (
          <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-[#A3A3A3] group-hover:text-[#0A0A0A]" aria-hidden="true" />
        )}
      </span>
      <span className="text-[12.5px] text-[#737373]">{localized.hint}</span>
      <span className="flex flex-wrap gap-1">
        {localized.categories.slice(0, CARD_CHIPS).map((c) => (
          <span key={c} className="inline-flex items-center rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2 py-0.5 text-[11.5px] font-medium text-[#525252]">
            {c}
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center rounded-full border border-dashed border-[#E5E5E5] px-2 py-0.5 text-[11.5px] font-medium text-[#737373]">
            +{extra}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Setup wizard for an empty menu (spec §10, must-keep #11): [Tür | Yapıştır]
 * → Kategoriler → Ürünler (isteğe bağlı), then one "Menüyü oluştur". Template
 * entry: presets ordered for the business's sector (first four shown).
 * Paste entry: the owner's own list; lines without a price become categories.
 * Steps stay mounted (hidden) so nothing typed is lost; the state is kept in
 * the tab's session (`onChange` → `useSetupDraft`) and mirrored to the
 * right-column preview.
 */
export function SetupWizard({
  entry, initial, sector, isTr, restored, onStartOver, onExit, onChange, onCreate,
}: {
  entry: SetupEntry;
  initial: SetupDraftState | null;
  sector: SectorKey | null;
  isTr: boolean;
  /** The state came back from this tab's session: say so, offer "Baştan başla". */
  restored: boolean;
  onStartOver: () => void;
  /** "Geri" on the first step: back to the three ways in. */
  onExit: () => void;
  /** Every change: the session draft and the plan the preview shows. */
  onChange: (state: SetupDraftState, plan: SetupPlanCategory[]) => void;
  onCreate: (
    plan: SetupPlanCategory[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<{ categories: number; failed: string | null }>;
}) {
  const copy = useMenuCopy();
  const s = copy.setup;
  const f = copy.fmt.setup;
  const [step, setStep] = useState<Step>(initial?.step ?? 0);
  const [reached, setReached] = useState<Step>(initial?.reached ?? 0);
  const [choice, setChoice] = useState<string | null>(initial?.choice ?? null);
  const [categories, setCategories] = useState<SetupCategory[]>(initial?.list ?? []);
  const [pasteText, setPasteText] = useState(initial?.pasteText ?? '');
  const [listFromPaste, setListFromPaste] = useState<string | null>(initial?.listFromPaste ?? null);
  const [showMore, setShowMore] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();

  const topRef = useRef<HTMLElement | null>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | 'heading' | null>(null);

  const ordered = useMemo(() => orderStarterPresets(sector), [sector]);
  const featured = ordered.slice(0, STARTER_FEATURED_COUNT);
  const others = ordered.slice(STARTER_FEATURED_COUNT);
  const otherPicked = others.some((p) => p.id === choice);

  const pasteCategories = useMemo(
    () => (entry === 'paste' ? setupCategoriesFromPaste(parsePasteBlock(pasteText, isTr).sections, isTr) : []),
    [entry, pasteText, isTr],
  );
  const pasteTotals = planTotals(buildSetupPlan(pasteCategories));

  const validation = useMemo(() => validateSetupCategories(categories, isTr), [categories, isTr]);
  const plan = useMemo(() => buildSetupPlan(categories), [categories]);
  const totals = planTotals(plan);
  const locked = creating !== null;
  const money = (cents: number) => formatPrice(cents, 'TRY', isTr ? 'tr-TR' : 'en-US');

  // Session draft + right-column preview (before "İleri" the preview follows the pasted text).
  const previewPlan = useMemo(
    () => (entry === 'paste' && step === 0 ? buildSetupPlan(pasteCategories) : plan),
    [entry, step, pasteCategories, plan],
  );
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  useEffect(() => {
    changeRef.current({ entry, step, reached, choice, list: categories, pasteText, listFromPaste }, previewPlan);
  }, [entry, step, reached, choice, categories, pasteText, listFromPaste, previewPlan]);

  // After a step change: focus the requested input, else the step heading.
  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending) return;
    if (pending === 'heading') {
      const top = topRef.current;
      if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      headingRefs.current[step]?.focus({ preventScroll: true });
      return;
    }
    inputRefs.current.get(pending)?.focus();
  }, [step, categories]);

  const show = (next: Step) => {
    pendingFocus.current = 'heading';
    setStep(next);
    setReached((r) => (next > r ? next : r));
  };

  const fromPaste = () => {
    const apply = () => {
      const rows = pasteCategories.length ? pasteCategories : [emptySetupCategory()];
      setCategories(rows);
      setListFromPaste(pasteText);
      setAttempted(false);
      setOpenKey(null);
      show(1);
    };
    if (listFromPaste !== null && listFromPaste !== pasteText && categories.length > 0) {
      askConfirm({ title: s.replaceTitle, body: s.replacePasteBody, confirmLabel: s.replace, cancelLabel: s.keep, variant: 'danger', onConfirm: apply });
      return;
    }
    if (listFromPaste === pasteText && categories.length > 0) return show(1);
    apply();
  };

  const goTo = (next: Step) => {
    if (locked) return;
    if (next <= step) return show(next);
    if (step === 0) {
      if (entry === 'paste') {
        if (pasteCategories.length === 0) return;
        if (next === 1) return fromPaste();
      } else if (choice === null) return;
    }
    if (next === 2 || step === 1) {
      if (!validation.ok) {
        setAttempted(true);
        if (step !== 1) show(1);
        const firstBad = categories.find((c) => validation.errors[c.key]);
        if (firstBad) inputRefs.current.get(firstBad.key)?.focus();
        return;
      }
      if (next === 2 && openKey === null) setOpenKey(categories.find((c) => c.name.trim())?.key ?? null);
    }
    show(next);
  };

  const pick = (next: string) => {
    const apply = () => {
      const preset = ordered.find((p) => p.id === next);
      const rows = preset ? categoriesFromPreset(preset, isTr) : [emptySetupCategory()];
      setChoice(next);
      setCategories(rows);
      setAttempted(false);
      setOpenKey(null);
      pendingFocus.current = preset ? 'heading' : rows[0].key;
      setStep(1);
      setReached(1);
    };
    const edited = categories.some((c) => c.itemsText.trim()) || (choice !== null && choice !== next && reached > 1);
    if (edited && next !== choice) {
      askConfirm({ title: s.replaceTitle, body: s.replaceBody, confirmLabel: s.replace, cancelLabel: s.keep, variant: 'danger', onConfirm: apply });
      return;
    }
    if (next === choice && categories.length > 0) return show(1);
    apply();
  };

  const updateCategory = (key: string, patch: Partial<SetupCategory>) =>
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const addCategory = (afterIndex?: number) => {
    const row = emptySetupCategory();
    pendingFocus.current = row.key;
    setCategories((prev) => {
      const next = prev.slice();
      next.splice(afterIndex === undefined ? next.length : afterIndex + 1, 0, row);
      return next;
    });
  };

  const removeCategory = (key: string) => setCategories((prev) => prev.filter((c) => c.key !== key));

  const create = async () => {
    if (locked) return;
    if (!validation.ok) {
      setAttempted(true);
      show(1);
      return;
    }
    setError(null);
    setCreating({ done: 0, total: plan.length });
    const result = await onCreate(plan, (done, total) => setCreating({ done, total }));
    // Something was created: the page swaps this wizard for the studio.
    // Nothing was: the wizard stays as it was, with the reason.
    if (result.categories === 0) {
      setCreating(null);
      if (result.failed) setError(result.failed);
    }
  };

  const heading = (index: Step, title: string, body: string) => (
    <div className="space-y-1">
      <h3
        ref={(el) => {
          headingRefs.current[index] = el;
        }}
        tabIndex={-1}
        className="outline-none"
      >
        <span className="sr-only">{f.stepOf(index + 1)}: </span>
        <span className="bz-h-tight text-[18px] text-[#0A0A0A] sm:text-[20px]">{title}</span>
      </h3>
      <p className="text-[13px] leading-[1.55] text-[#525252]">{body}</p>
    </div>
  );

  const presetGrid = (list: StarterPreset[]) => (
    <div className="grid gap-2.5 @min-[560px]:grid-cols-2">
      {list.map((p) => (
        <PresetCard key={p.id} preset={p} isTr={isTr} selected={choice === p.id} disabled={locked} onPick={() => pick(p.id)} />
      ))}
    </div>
  );

  const steps = [
    entry === 'template' ? { label: s.stepType, short: s.stepTypeShort } : { label: s.stepPaste },
    { label: s.stepCategories },
    { label: s.stepItems, short: s.stepItemsShort },
  ];
  const canNext = step === 0 ? (entry === 'paste' ? pasteCategories.length > 0 : choice !== null) : true;

  return (
    <section
      ref={topRef}
      aria-labelledby="menu-setup-wizard-title"
      className="@container scroll-mt-[124px] sm:rounded-xl sm:border sm:border-[#E8E8E8] sm:bg-white sm:px-6 sm:py-6 sm:shadow-[0_1px_2px_rgba(10,10,10,0.05)] lg:scroll-mt-[72px] lg:px-8 lg:py-8"
    >
      <div className="space-y-5">
        {restored && (
          <AlertBanner kind="info">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{s.draftRestored}</span>
              <button type="button" onClick={onStartOver} className="font-semibold underline underline-offset-2">
                {s.startOver}
              </button>
            </span>
          </AlertBanner>
        )}

        <div className="flex items-start gap-3.5">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A] sm:inline-flex" aria-hidden="true">
            <UtensilsCrossed size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 id="menu-setup-wizard-title">
              <span className="bz-h-tight text-[20px] text-[#0A0A0A] sm:text-[22px]">{s.title}</span>
            </h2>
            <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-[#525252]">{s.body}</p>
          </div>
        </div>

        <WizardSteps
          steps={steps}
          current={step}
          isComplete={(i) => i < reached && (i !== 1 || validation.ok)}
          canSelect={(i) => !locked && i <= reached}
          onSelect={(i) => goTo(i as Step)}
          ariaLabel={s.stepsAria}
        />

        {error && <AlertBanner kind="danger">{error}</AlertBanner>}

        {/* ── 1 · Business type / paste ── */}
        <div hidden={step !== 0} className="space-y-3">
          {entry === 'template' ? (
            <>
              {heading(0, s.s0Title, s.s0Body)}
              {presetGrid(featured)}
              {(showMore || otherPicked) && presetGrid(others)}
              {others.length > 0 && !otherPicked && (
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  aria-expanded={showMore}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#525252] hover:text-[#0A0A0A]"
                >
                  <ChevronDown size={14} strokeWidth={2} className={showMore ? 'rotate-180' : ''} aria-hidden="true" />
                  {showMore ? s.lessTemplates : `${s.moreTemplates} (${others.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => pick('custom')}
                disabled={locked}
                aria-pressed={choice === 'custom'}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-dashed bg-white p-3.5 text-left transition-colors hover:border-[#0A0A0A] disabled:opacity-60 ${
                  choice === 'custom' ? 'border-[#0A0A0A] shadow-[0_0_0_1px_#0A0A0A]' : 'border-[#D4D4D4]'
                }`}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#525252]" aria-hidden="true">
                  <PencilLine size={15} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[#0A0A0A]">{s.custom}</span>
                  <span className="block text-[12.5px] text-[#737373]">{s.customHint}</span>
                </span>
                <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-[#A3A3A3]" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              {heading(0, s.pasteStepTitle, s.pasteStepBody)}
              <label htmlFor="menu-setup-paste" className="sr-only">
                {s.pasteStepTitle}
              </label>
              <textarea
                id="menu-setup-paste"
                className="bz-input min-h-[200px] font-mono text-[16px] sm:text-[13.5px]"
                rows={10}
                value={pasteText}
                placeholder={s.pastePlaceholder}
                disabled={locked}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <p role="status" className="text-[12.5px] text-[#525252]">
                {pasteText.trim() ? f.pasteFound(pasteTotals.categories, pasteTotals.items) : ''}
              </p>
            </>
          )}
        </div>

        {/* ── 2 · Categories ── */}
        <div hidden={step !== 1} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            {heading(1, s.s1Title, s.s1Body)}
            <span className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[12px] font-semibold text-[#525252]">
              {copy.fmt.categoryCount(totals.categories)}
            </span>
          </div>
          {attempted && (validation.noCategories || validation.tooMany) && (
            <p role="alert" className="text-[12.5px] font-medium text-[#B91C1C]">
              {validation.noCategories ? s.noCategories : s.tooMany}
            </p>
          )}
          <ol className="space-y-2">
            {categories.map((c, i) => {
              const err = attempted ? validation.errors[c.key] : undefined;
              const errId = `setup-cat-err-${c.key}`;
              return (
                <li key={c.key} className="rounded-xl border border-[#EDEDED] bg-white p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setCategories((prev) => moveSetupCategory(prev, i, -1))}
                        disabled={locked || i === 0}
                        aria-label={`${s.moveUp}: ${c.name || f.categoryLabel(i + 1)}`}
                        className="bz-btn-icon h-11 w-9 disabled:opacity-30 pointer-fine:h-9"
                      >
                        <ArrowUp size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategories((prev) => moveSetupCategory(prev, i, 1))}
                        disabled={locked || i === categories.length - 1}
                        aria-label={`${s.moveDown}: ${c.name || f.categoryLabel(i + 1)}`}
                        className="bz-btn-icon h-11 w-9 disabled:opacity-30 pointer-fine:h-9"
                      >
                        <ArrowDown size={14} strokeWidth={2} />
                      </button>
                    </div>
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(c.key, el);
                        else inputRefs.current.delete(c.key);
                      }}
                      className={`bz-input min-w-0 flex-1 font-body ${err ? 'border-[#DC2626]' : ''}`}
                      value={c.name}
                      maxLength={SETUP_CATEGORY_NAME_MAX + 20}
                      placeholder={s.categoryPlaceholder}
                      aria-label={f.categoryLabel(i + 1)}
                      aria-invalid={err ? true : undefined}
                      aria-describedby={err ? errId : undefined}
                      enterKeyHint="next"
                      autoCapitalize="sentences"
                      disabled={locked}
                      onChange={(e) => updateCategory(c.key, { name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          const nextRow = categories[i + 1];
                          if (nextRow) inputRefs.current.get(nextRow.key)?.focus();
                          else addCategory(i);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeCategory(c.key)}
                      disabled={locked}
                      aria-label={`${s.remove}: ${c.name || f.categoryLabel(i + 1)}`}
                      className="bz-btn-icon h-11 w-9 text-[#B91C1C] disabled:opacity-30 pointer-fine:h-9"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                  {err && (
                    <p id={errId} className="mt-1.5 pl-[78px] text-[12px] font-medium text-[#B91C1C]">
                      {s.categoryErrors[err]}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={() => addCategory()}
            disabled={locked || categories.length >= SETUP_MAX_CATEGORIES + 5}
            className="bz-btn-ghost min-h-11 w-full justify-center sm:w-auto pointer-fine:min-h-9"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
            {s.addCategory}
          </button>
        </div>

        {/* ── 3 · Items (optional) ── */}
        <div hidden={step !== 2} className="space-y-3">
          {heading(2, s.s2Title, s.s2Body)}
          <ul className="space-y-2">
            {categories
              .filter((c) => c.name.trim())
              .map((c) => {
                const preview = previewSetupItems(c.itemsText);
                const open = openKey === c.key;
                const panelId = `setup-items-${c.key}`;
                return (
                  <li key={c.key} className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenKey(open ? null : c.key)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      className="flex min-h-[52px] w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[#FAFAFA]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-body text-[14px] font-semibold text-[#0A0A0A]">{c.name.trim()}</span>
                        <span className={`block text-[12px] ${preview.items.length > 0 ? 'text-[#166534]' : 'text-[#737373]'}`}>
                          {preview.items.length > 0 ? f.willAdd(Math.min(preview.items.length, MENU_BULK_MAX_ITEMS)) : s.noItemsYet}
                        </span>
                      </span>
                      <ChevronDown size={16} strokeWidth={2} className={`shrink-0 text-[#737373] ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    <div id={panelId} hidden={!open} className="space-y-2 border-t border-[#EDEDED] px-3.5 py-3">
                      <label className="sr-only" htmlFor={`${panelId}-text`}>
                        {f.itemsFor(c.name.trim())}
                      </label>
                      <textarea
                        id={`${panelId}-text`}
                        className="bz-input min-h-[120px] font-mono text-[16px] sm:text-[13px]"
                        value={c.itemsText}
                        placeholder={s.itemsPlaceholder}
                        disabled={locked}
                        onChange={(e) => updateCategory(c.key, { itemsText: e.target.value })}
                      />
                      {preview.items.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5" aria-label={f.willAdd(Math.min(preview.items.length, MENU_BULK_MAX_ITEMS))}>
                          {preview.items.slice(0, MENU_BULK_MAX_ITEMS).map((it, idx) => (
                            <li
                              key={`${it.name}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#EAF9B8] px-2 py-0.5 text-[12px] font-medium text-[#0A0A0A]"
                            >
                              {it.name}
                              <span className="text-[#525252]">· {money(it.priceCents)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {preview.unreadable > 0 && <p className="text-[12px] text-[#92400E]">{f.unreadable(preview.unreadable)}</p>}
                      {preview.overLimit && <p className="text-[12px] text-[#92400E]">{s.overLimit}</p>}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>

        {/* ── Actions — above the floating bottom nav on phones ── */}
        <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 space-y-2.5 rounded-xl border border-[#EDEDED] bg-white/95 px-3 py-3 shadow-[0_1px_2px_rgba(10,10,10,0.05)] backdrop-blur sm:px-4 lg:bottom-4">
          {creating && (
            <ProgressBar
              value={creating.done}
              max={Math.max(1, creating.total)}
              ariaLabel={f.creating(creating.done, creating.total)}
              color="#0A0A0A"
              height={4}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (step === 0 ? onExit() : goTo((step - 1) as Step))}
              disabled={locked}
              className="bz-btn-ghost min-h-11 justify-center pointer-fine:min-h-9"
            >
              <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
              {s.back}
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => goTo((step + 1) as Step)}
                disabled={locked || !canNext}
                className="bz-btn-primary ml-auto min-h-11 flex-1 justify-center sm:flex-none pointer-fine:min-h-9"
              >
                {s.next}
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void create()}
                disabled={locked || totals.categories === 0}
                aria-busy={creating !== null || undefined}
                className="bz-btn-lime ml-auto min-h-11 flex-1 justify-center sm:flex-none pointer-fine:min-h-9"
              >
                {creating ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ListPlus size={14} strokeWidth={2} aria-hidden="true" />}
                {creating ? f.creating(creating.done, creating.total) : f.create(totals.categories, totals.items)}
              </button>
            )}
          </div>
        </div>
      </div>
      {confirmEl}
    </section>
  );
}
