import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BedDouble, Check, ChevronDown, ChevronRight, Coffee, Croissant,
  ListPlus, Loader2, PartyPopper, PencilLine, Pizza, Plus, Trash2, Truck, UtensilsCrossed, Wine,
} from 'lucide-react';
import { WizardSteps, useConfirmDialog } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { MENU_BULK_MAX_ITEMS } from '@/lib/menu-bulk-parse';
import type { SectorKey } from '@/lib/sector-platforms';
import type { MenuCopy } from './menu-copy';
import {
  SETUP_CATEGORY_NAME_MAX,
  SETUP_MAX_CATEGORIES,
  buildSetupPlan,
  categoriesFromPreset,
  emptySetupCategory,
  moveSetupCategory,
  planTotals,
  previewSetupItems,
  validateSetupCategories,
  type SetupCategory,
  type SetupCategoryError,
  type SetupPlanCategory,
} from './menu-setup';
import { STARTER_FEATURED_COUNT, orderStarterPresets, type StarterPreset } from './menu-starter-data';

// ─── Copy ───────────────────────────────────────────────────────────────

function setupCopy(isTr: boolean) {
  return {
    title: isTr ? 'Menünü 3 adımda hazırla' : 'Set up your menu in 3 steps',
    body: isTr
      ? 'İşletme türünü seç, kategorileri düzenle, istersen ürünleri liste olarak yapıştır. Hepsi tek tıkla oluşur; sonra her şeyi değiştirebilirsin.'
      : 'Pick your business type, adjust the categories, optionally paste your items as a list. Everything is created in one click; you can change it all later.',
    steps: [
      { label: isTr ? 'İşletme türü' : 'Business type', short: isTr ? 'Tür' : 'Type' },
      { label: isTr ? 'Kategoriler' : 'Categories' },
      { label: isTr ? 'Ürünler (isteğe bağlı)' : 'Items (optional)', short: isTr ? 'Ürünler' : 'Items' },
    ],
    stepsAria: isTr ? 'Menü kurulum adımları' : 'Menu setup steps',
    stepOf: (n: number) => (isTr ? `Adım ${n} / 3` : `Step ${n} of 3`),
    s0Title: isTr ? 'Nasıl bir işletmesin?' : 'What kind of business are you?',
    s0Body: isTr
      ? 'Seçtiğin türe göre kategorileri hazırlarız. Bir sonraki adımda değiştirebilirsin.'
      : "We prepare the categories for the type you pick. You can change them in the next step.",
    custom: isTr ? 'Kendi kategorilerimi yazacağım' : "I'll write my own categories",
    customHint: isTr ? 'Boş bir listeyle başla' : 'Start with an empty list',
    skipWizard: isTr ? 'Sihirbazı kullanmadan tek tek ekle' : 'Skip the wizard and add one by one',
    s1Title: isTr ? 'Kategorileri düzenle' : 'Adjust the categories',
    s1Body: isTr
      ? 'Adını değiştir, sil ya da sırasını değiştir. Müşteriler menüde bu sırayla görür.'
      : 'Rename, delete or reorder. Customers see them in this order.',
    categoryLabel: (n: number) => (isTr ? `${n}. kategori adı` : `Category ${n} name`),
    categoryPlaceholder: isTr ? 'Örn. Tatlılar' : 'e.g. Desserts',
    addCategory: isTr ? 'Kategori ekle' : 'Add category',
    moveUp: isTr ? 'Yukarı taşı' : 'Move up',
    moveDown: isTr ? 'Aşağı taşı' : 'Move down',
    remove: isTr ? 'Kaldır' : 'Remove',
    categoryCount: (n: number) => (isTr ? `${n} kategori` : `${n} ${n === 1 ? 'category' : 'categories'}`),
    errors: {
      empty: isTr ? 'Bu kategorinin adını yaz ya da altındaki ürünleri sil.' : 'Name this category or remove its items.',
      too_long: isTr ? `En fazla ${SETUP_CATEGORY_NAME_MAX} karakter.` : `At most ${SETUP_CATEGORY_NAME_MAX} characters.`,
      duplicate: isTr ? 'Bu ad listede zaten var.' : 'This name is already in the list.',
    } satisfies Record<SetupCategoryError, string>,
    noCategories: isTr ? 'En az bir kategori adı yaz.' : 'Write at least one category name.',
    tooMany: isTr
      ? `Sihirbaz en fazla ${SETUP_MAX_CATEGORIES} kategori oluşturur; fazlasını sonra ekleyebilirsin.`
      : `The wizard creates at most ${SETUP_MAX_CATEGORIES} categories; add more later.`,
    s2Title: isTr ? 'Ürünleri ekle (isteğe bağlı)' : 'Add items (optional)',
    s2Body: isTr
      ? 'Her satıra bir ürün: önce adı, sonra fiyatı. Fotoğraf ve açıklamayı sonra eklersin. İstersen bu adımı boş geç.'
      : 'One item per line: name first, then price. Add photos and descriptions later. You can leave this step empty.',
    itemsPlaceholder: isTr ? 'Klasik Burger 185\nCheeseburger 215,50\nAyran 35' : 'Classic Burger 185\nCheeseburger 215.50\nAyran 35',
    itemsFor: (name: string) => (isTr ? `${name} ürünleri` : `${name} items`),
    willAdd: (n: number) => (isTr ? `${n} ürün eklenecek` : `${n} ${n === 1 ? 'item' : 'items'} will be added`),
    noItemsYet: isTr ? 'Ürün yok — sonra eklersin' : 'No items — add them later',
    unreadable: (n: number) =>
      isTr ? `${n} satır okunamadı (fiyat eksik ya da hatalı); eklenmez.` : `${n} ${n === 1 ? 'line' : 'lines'} couldn't be read (missing or wrong price); skipped.`,
    overLimit: isTr
      ? `Bir kategoriye bir seferde en fazla ${MENU_BULK_MAX_ITEMS} ürün eklenir.`
      : `At most ${MENU_BULK_MAX_ITEMS} items per category at once.`,
    back: isTr ? 'Geri' : 'Back',
    next: isTr ? 'İleri' : 'Next',
    create: (c: number, i: number) =>
      isTr
        ? i > 0
          ? `Menüyü oluştur (${c} kategori, ${i} ürün)`
          : `Menüyü oluştur (${c} kategori)`
        : i > 0
          ? `Create menu (${c} ${c === 1 ? 'category' : 'categories'}, ${i} ${i === 1 ? 'item' : 'items'})`
          : `Create menu (${c} ${c === 1 ? 'category' : 'categories'})`,
    creating: (done: number, total: number) =>
      isTr ? `Oluşturuluyor… ${done}/${total} kategori` : `Creating… ${done}/${total} categories`,
    replaceTitle: isTr ? 'Kategoriler değişsin mi?' : 'Replace the categories?',
    replaceBody: isTr
      ? 'Yeni tür seçersen yazdığın kategori ve ürün listesi silinir.'
      : 'Picking a new type replaces the categories and items you wrote.',
    replace: isTr ? 'Değiştir' : 'Replace',
    keep: isTr ? 'Vazgeç' : 'Cancel',
  };
}

// ─── Preset cards ───────────────────────────────────────────────────────

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
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: bg, color: fg }}>
      <Icon size={15} strokeWidth={2} />
    </span>
  );
}

/** Number of category chips shown on a template card. */
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
      className={`group relative flex min-h-[44px] w-full flex-col items-start gap-1.5 overflow-hidden rounded-2xl border bg-white p-3 text-left transition-all sm:gap-2 sm:p-3.5 hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
        selected ? 'border-[#0A0A0A] ring-2 ring-[#C6F24E]' : 'border-[#EDEDED]'
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <PresetGlyph id={preset.id} />
          <span className="truncate text-[14px] font-medium text-[#0A0A0A]">{localized.label}</span>
        </span>
        {selected ? (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : (
          <ChevronRight
            size={14}
            strokeWidth={2}
            className="shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
          />
        )}
      </div>
      <p className="text-[12px] text-[#737373]">{localized.hint}</p>
      <div className="flex flex-wrap gap-1">
        {localized.categories.slice(0, CARD_CHIPS).map((c) => (
          <span
            key={c}
            className="inline-flex items-center rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#525252]"
          >
            {c}
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center rounded-full border border-dashed border-[#EDEDED] px-2 py-0.5 text-[11px] font-medium text-[#A3A3A3]">
            +{extra}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Wizard ─────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2;
type Choice = StarterPreset['id'] | 'custom' | null;

/**
 * First-run wizard for a menu with no categories. Content first, no design:
 * the theme / logo dialog stays in the page header.
 */
export function MenuSetupWizard({
  isTr, copy, sector, readOnly, onCreate, onStartEmpty,
}: {
  isTr: boolean;
  copy: MenuCopy;
  sector: SectorKey | null;
  readOnly: boolean;
  onCreate: (
    plan: SetupPlanCategory[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<{ categories: number; failed: string | null }>;
  onStartEmpty: () => void;
}) {
  const t = useMemo(() => setupCopy(isTr), [isTr]);
  const [step, setStep] = useState<Step>(0);
  const [reached, setReached] = useState<Step>(0);
  const [choice, setChoice] = useState<Choice>(null);
  const [categories, setCategories] = useState<SetupCategory[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ done: number; total: number } | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();

  const topRef = useRef<HTMLDivElement>(null);
  const headingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | 'heading' | null>(null);

  const ordered = useMemo(() => orderStarterPresets(sector), [sector]);
  const featured = ordered.slice(0, STARTER_FEATURED_COUNT);
  const others = ordered.slice(STARTER_FEATURED_COUNT);
  // Keep a picked preset from the "more" list visible.
  const otherPicked = others.some((p) => p.id === choice);

  const validation = useMemo(() => validateSetupCategories(categories, isTr), [categories, isTr]);
  const plan = useMemo(() => buildSetupPlan(categories), [categories]);
  const totals = planTotals(plan);
  const locked = readOnly || creating !== null;
  const money = (cents: number) => formatPrice(cents, 'TRY', isTr ? 'tr-TR' : 'en-US');

  // After a step change: focus the requested input, else the step heading.
  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending) return;
    if (pending === 'heading') {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      topRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
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

  const goTo = (next: Step) => {
    if (next <= step) return show(next);
    if (step === 0 && choice === null) return;
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

  const pick = (next: Choice) => {
    const apply = () => {
      const preset = ordered.find((p) => p.id === next);
      const rows = preset ? categoriesFromPreset(preset, isTr) : [emptySetupCategory()];
      setChoice(next);
      setCategories(rows);
      setAttempted(false);
      setOpenKey(null);
      if (!preset) pendingFocus.current = rows[0].key;
      else pendingFocus.current = 'heading';
      setStep(1);
      setReached(1);
    };
    const edited = categories.some((c) => c.itemsText.trim()) || (choice !== null && choice !== next && reached > 1);
    if (edited && next !== choice) {
      askConfirm({
        title: t.replaceTitle,
        body: t.replaceBody,
        confirmLabel: t.replace,
        cancelLabel: t.keep,
        variant: 'danger',
        onConfirm: apply,
      });
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
    setCreating({ done: 0, total: plan.length });
    const result = await onCreate(plan, (done, total) => setCreating({ done, total }));
    // On success the page swaps this wizard for the builder; on failure the
    // wizard stays (nothing is lost) and the page shows the error.
    if (result.failed) setCreating(null);
  };

  const heading = (index: Step, title: string, body: string) => (
    <div className="space-y-1">
      {/* The step tracker above already shows "1 of 3" visually; the number
          stays in the heading for screen readers (focus moves here on each step). */}
      <h3
        ref={(el) => {
          headingRefs.current[index] = el;
        }}
        tabIndex={-1}
        className="bz-h-tight text-[18px] text-[#0A0A0A] outline-none sm:text-[20px]"
      >
        <span className="sr-only">{t.stepOf(index + 1)}: </span>
        {title}
      </h3>
      <p className="text-[13px] leading-[1.55] text-[#525252]">{body}</p>
    </div>
  );

  const presetGrid = (list: StarterPreset[]) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {list.map((p) => (
        <PresetCard key={p.id} preset={p} isTr={isTr} selected={choice === p.id} disabled={locked} onPick={() => pick(p.id)} />
      ))}
    </div>
  );

  return (
    // Phones: no card around the cards (card-in-card cost ~40 px of the first
    // screen) — the first template has to sit high above the bottom nav.
    <section
      ref={topRef}
      // ≥sm: the panel card look (bz-card: 12px radius, hairline border + shadow).
      className="scroll-mt-24 sm:rounded-xl sm:border sm:border-[#E8E8E8] sm:bg-white sm:px-8 sm:py-8 sm:shadow-[0_1px_2px_rgba(10,10,10,0.05)]"
    >
      <div className="mx-auto max-w-[760px] space-y-4 sm:space-y-5">
        <div className="flex items-start gap-3.5">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF9B8] to-[#C6F24E] text-[#0A0A0A] shadow-sm sm:inline-flex">
            <UtensilsCrossed size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="bz-h-tight text-[18px] text-[#0A0A0A] sm:text-[22px]">{t.title}</h2>
            <p className="mt-1 max-w-[560px] text-[12px] leading-snug text-[#525252] sm:text-[13px] sm:leading-relaxed">{t.body}</p>
          </div>
        </div>

        <WizardSteps
          steps={t.steps}
          current={step}
          isComplete={(i) => i < reached && (i !== 1 || validation.ok)}
          canSelect={(i) => !locked && i <= reached}
          onSelect={(i) => goTo(i as Step)}
          ariaLabel={t.stepsAria}
        />

        {/* ── 1 · Business type ── */}
        {step === 0 && (
          <div className="space-y-3">
            {heading(0, t.s0Title, t.s0Body)}
            {presetGrid(featured)}
            {(showMore || otherPicked) && presetGrid(others)}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {others.length > 0 && !otherPicked && (
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  aria-expanded={showMore}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-[#525252] hover:text-[#0A0A0A]"
                >
                  <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
                  {showMore ? copy.lessTemplates : `${copy.moreTemplates} (${others.length})`}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => pick('custom')}
              disabled={locked}
              aria-pressed={choice === 'custom'}
              className={`flex w-full min-h-[56px] items-center gap-3 rounded-2xl border border-dashed bg-white p-3 text-left transition-colors hover:border-[#0A0A0A] disabled:opacity-60 sm:p-3.5 ${
                choice === 'custom' ? 'border-[#0A0A0A] ring-2 ring-[#C6F24E]' : 'border-[#D4D4D4]'
              }`}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#525252]">
                <PencilLine size={15} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[#0A0A0A]">{t.custom}</span>
                <span className="block text-[12px] text-[#737373]">{t.customHint}</span>
              </span>
              <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-[#A3A3A3]" />
            </button>
            <button
              type="button"
              onClick={onStartEmpty}
              disabled={locked}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] font-medium text-[#737373] underline-offset-2 hover:text-[#0A0A0A] hover:underline disabled:opacity-50"
            >
              <Plus size={13} strokeWidth={2.25} />
              {t.skipWizard}
            </button>
          </div>
        )}

        {/* ── 2 · Categories ── */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              {heading(1, t.s1Title, t.s1Body)}
              <span className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[11.5px] font-semibold text-[#525252]">
                {t.categoryCount(totals.categories)}
              </span>
            </div>
            {attempted && (validation.noCategories || validation.tooMany) && (
              <p role="alert" className="text-[12.5px] font-medium text-[#B91C1C]">
                {validation.noCategories ? t.noCategories : t.tooMany}
              </p>
            )}
            <ol className="space-y-2">
              {categories.map((c, i) => {
                const err = attempted ? validation.errors[c.key] : undefined;
                const errId = `setup-cat-err-${c.key}`;
                return (
                  <li key={c.key} className="rounded-2xl border border-[#EDEDED] bg-white p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-center text-[12px] font-semibold tabular-nums text-[#A3A3A3]">{i + 1}</span>
                      <input
                        ref={(el) => {
                          if (el) inputRefs.current.set(c.key, el);
                          else inputRefs.current.delete(c.key);
                        }}
                        className={`bz-input min-w-0 flex-1 ${err ? 'border-[#DC2626]' : ''}`}
                        value={c.name}
                        maxLength={SETUP_CATEGORY_NAME_MAX + 20}
                        placeholder={t.categoryPlaceholder}
                        aria-label={t.categoryLabel(i + 1)}
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? errId : undefined}
                        enterKeyHint="next"
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
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => setCategories((prev) => moveSetupCategory(prev, i, -1))}
                          disabled={locked || i === 0}
                          aria-label={t.moveUp}
                          title={t.moveUp}
                          className="bz-btn-icon h-11 w-9 disabled:opacity-30 sm:h-9"
                        >
                          <ArrowUp size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategories((prev) => moveSetupCategory(prev, i, 1))}
                          disabled={locked || i === categories.length - 1}
                          aria-label={t.moveDown}
                          title={t.moveDown}
                          className="bz-btn-icon h-11 w-9 disabled:opacity-30 sm:h-9"
                        >
                          <ArrowDown size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(c.key)}
                          disabled={locked}
                          aria-label={`${t.remove}: ${c.name || t.categoryLabel(i + 1)}`}
                          title={t.remove}
                          className="bz-btn-icon h-11 w-9 text-[#B91C1C] disabled:opacity-30 sm:h-9"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    {err && (
                      <p id={errId} className="mt-1.5 pl-8 text-[12px] font-medium text-[#B91C1C]">
                        {t.errors[err]}
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
              className="bz-btn-ghost w-full justify-center sm:w-auto"
            >
              <Plus size={14} strokeWidth={2.25} />
              {t.addCategory}
            </button>
          </div>
        )}

        {/* ── 3 · Items (optional) ── */}
        {step === 2 && (
          <div className="space-y-3">
            {heading(2, t.s2Title, t.s2Body)}
            <ul className="space-y-2">
              {categories
                .filter((c) => c.name.trim())
                .map((c) => {
                  const preview = previewSetupItems(c.itemsText);
                  const open = openKey === c.key;
                  const panelId = `setup-items-${c.key}`;
                  return (
                    <li key={c.key} className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white">
                      <button
                        type="button"
                        onClick={() => setOpenKey(open ? null : c.key)}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[#FAFAFA]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-[#0A0A0A]">{c.name.trim()}</span>
                          <span className={`block text-[12px] ${preview.items.length > 0 ? 'text-[#166534]' : 'text-[#737373]'}`}>
                            {preview.items.length > 0 ? t.willAdd(preview.items.length) : t.noItemsYet}
                          </span>
                        </span>
                        <ChevronDown size={16} strokeWidth={2} className={`shrink-0 text-[#737373] transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <div id={panelId} className="space-y-2 border-t border-[#EDEDED] px-3.5 py-3">
                          <label className="sr-only" htmlFor={`${panelId}-text`}>
                            {t.itemsFor(c.name.trim())}
                          </label>
                          <textarea
                            id={`${panelId}-text`}
                            className="bz-input min-h-[120px] font-mono text-[16px] sm:text-[13px]"
                            value={c.itemsText}
                            placeholder={t.itemsPlaceholder}
                            disabled={locked}
                            onChange={(e) => updateCategory(c.key, { itemsText: e.target.value })}
                          />
                          {preview.items.length > 0 && (
                            <ul className="flex flex-wrap gap-1.5" aria-label={t.willAdd(preview.items.length)}>
                              {preview.items.slice(0, MENU_BULK_MAX_ITEMS).map((it, idx) => (
                                <li
                                  key={`${it.name}-${idx}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#EAF9B8]/70 px-2 py-0.5 text-[11.5px] font-medium text-[#0A0A0A]"
                                >
                                  {it.name}
                                  <span className="text-[#525252]">· {money(it.priceCents)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {preview.unreadable > 0 && <p className="text-[12px] text-[#92400E]">{t.unreadable(preview.unreadable)}</p>}
                          {preview.overLimit && <p className="text-[12px] text-[#92400E]">{t.overLimit}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {/* ── Actions — above the floating bottom nav on phones ── */}
        {step > 0 && (
          <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-20 -mx-4 flex flex-wrap items-center gap-2 border-t border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-1 sm:backdrop-blur-none">
            <button
              type="button"
              onClick={() => goTo((step - 1) as Step)}
              disabled={locked}
              className="bz-btn-ghost justify-center"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              {t.back}
            </button>
            {step === 1 ? (
              <button type="button" onClick={() => goTo(2)} disabled={locked} className="bz-btn-primary ml-auto flex-1 justify-center sm:flex-none">
                {t.next}
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void create()}
                disabled={locked || totals.categories === 0}
                aria-busy={creating !== null}
                className="bz-btn-lime ml-auto flex-1 justify-center sm:flex-none"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <ListPlus size={14} strokeWidth={2} />}
                {creating ? t.creating(creating.done, creating.total) : t.create(totals.categories, totals.items)}
              </button>
            )}
          </div>
        )}
      </div>
      {confirmEl}
    </section>
  );
}
