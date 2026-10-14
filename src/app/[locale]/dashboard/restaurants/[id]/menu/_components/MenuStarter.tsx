import { useMemo, useState } from 'react';
import { BedDouble, ChevronDown, ChevronRight, Coffee, Croissant, Loader2, PartyPopper, Pizza, Plus, UtensilsCrossed, Wine, Truck } from 'lucide-react';
import type { SectorKey } from '@/lib/sector-platforms';
import type { MenuCopy } from './menu-copy';
import { STARTER_FEATURED_COUNT, orderStarterPresets, type StarterPreset } from './menu-starter-data';

export function PresetGlyph({ id }: { id: StarterPreset['id'] }) {
  const Icon =
    id === 'restaurant' ? UtensilsCrossed
    : id === 'cafe' ? Coffee
    : id === 'fastfood' ? Pizza
    : id === 'bakery' ? Croissant
    : id === 'hotel' ? BedDouble
    : id === 'foodtruck' ? Truck
    : id === 'catering' ? PartyPopper
    : Wine;
  const palette: Record<StarterPreset['id'], { bg: string; fg: string }> = {
    restaurant: { bg: '#FEF3C7', fg: '#854D0E' },
    cafe:       { bg: '#F5F3FF', fg: '#5B21B6' },
    fastfood:   { bg: '#FEF2F2', fg: '#991B1B' },
    bakery:     { bg: '#FFEDD5', fg: '#9A3412' },
    bar:        { bg: '#ECFEFF', fg: '#155E75' },
    hotel:      { bg: '#EFF6FF', fg: '#1E40AF' },
    winebar:    { bg: '#FAE8FF', fg: '#86198F' },
    foodtruck:  { bg: '#FEF3C7', fg: '#A16207' },
    catering:   { bg: '#ECFDF5', fg: '#14532D' },
  };
  const { bg, fg } = palette[id];
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-xl"
      style={{ backgroundColor: bg, color: fg }}
    >
      <Icon size={14} strokeWidth={2} />
    </span>
  );
}

/** Number of category chips shown on a template card. */
const CARD_CHIPS = 3;

function PresetCard({
  preset, isTr, busy, disabled, onPick,
}: {
  preset: StarterPreset;
  isTr: boolean;
  busy: boolean;
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
      className="group relative flex min-h-[44px] flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[#EDEDED] bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-[#EDEDED] disabled:hover:shadow-none"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <PresetGlyph id={preset.id} />
          <span className="truncate text-[14px] font-medium text-[#0A0A0A]">{localized.label}</span>
        </span>
        {busy ? (
          <Loader2 size={14} className="shrink-0 animate-spin text-[#0A0A0A]" />
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

/**
 * First-run block for a menu with no categories. Four templates — ordered for
 * the business's sector — create the categories in one go; the rest sit behind
 * "More templates". Nothing about design here: content first.
 */
export function MenuStarter({
  isTr, copy, sector, presetBusy, readOnly, onApplyPreset, onStartEmpty,
}: {
  isTr: boolean;
  copy: MenuCopy;
  sector: SectorKey | null;
  presetBusy: StarterPreset['id'] | null;
  readOnly: boolean;
  onApplyPreset: (preset: StarterPreset) => void;
  onStartEmpty: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const ordered = useMemo(() => orderStarterPresets(sector), [sector]);
  const featured = ordered.slice(0, STARTER_FEATURED_COUNT);
  const others = ordered.slice(STARTER_FEATURED_COUNT);
  const locked = readOnly || presetBusy !== null;

  const grid = (list: StarterPreset[]) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {list.map((p) => (
        <PresetCard
          key={p.id}
          preset={p}
          isTr={isTr}
          busy={presetBusy === p.id}
          disabled={locked}
          onPick={() => onApplyPreset(p)}
        />
      ))}
    </div>
  );

  return (
    <section className="rounded-3xl border border-[#EDEDED] bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[760px]">
        <div className="flex items-start gap-3.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF9B8] to-[#C6F24E] text-[#0A0A0A] shadow-sm sm:h-11 sm:w-11">
            <UtensilsCrossed size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="bz-h-tight text-[18px] text-[#0A0A0A] sm:text-[22px]">{copy.starterTitle}</h2>
            <p className="mt-1 max-w-[520px] text-[12px] leading-snug text-[#525252] sm:text-[13px] sm:leading-relaxed">{copy.starterBody}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 sm:mt-5">
          {grid(featured)}
          {showMore && grid(others)}
          {others.length > 0 && (
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

        <div className="mt-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#EDEDED]" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#737373]">{copy.or}</span>
          <span className="h-px flex-1 bg-[#EDEDED]" aria-hidden />
        </div>
        <button type="button" onClick={onStartEmpty} disabled={locked} className="bz-btn-ghost mt-3 w-full disabled:opacity-50">
          <Plus size={14} strokeWidth={2.25} />
          {copy.startEmpty}
        </button>
      </div>
    </section>
  );
}
