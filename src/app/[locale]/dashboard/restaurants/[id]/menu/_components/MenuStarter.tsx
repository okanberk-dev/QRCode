import { BedDouble, ChevronRight, Coffee, Croissant, Loader2, PartyPopper, Pizza, Plus, UtensilsCrossed, Wine, Truck } from 'lucide-react';
import { STARTER_PRESETS, type StarterPreset } from './menu-starter-data';

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

/** Quick-start block shown when the menu has no categories yet. */
export function MenuStarter({
  isTr, presetBusy, menuEnabled, onApplyPreset, onStartEmpty,
}: {
  isTr: boolean;
  presetBusy: StarterPreset['id'] | null;
  menuEnabled: boolean;
  onApplyPreset: (preset: StarterPreset) => void;
  onStartEmpty: () => void;
}) {
  return (
    <div className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF9B8] to-[#C6F24E] text-[#0A0A0A] shadow-sm">
          <UtensilsCrossed size={24} strokeWidth={2} />
        </span>
        <div>
          <h3 className="bz-h-tight text-[18px] text-[#0A0A0A]">
            {isTr ? 'Hızlı başla' : 'Quick start'}
          </h3>
          <p className="mt-1 max-w-[420px] text-[13px] leading-relaxed text-[#525252]">
            {isTr
              ? 'İşletmene en yakın şablonu seç — kategorileri biz oluşturalım, sen ürünlerini ekle. Sonradan istediğini yeniden adlandırabilir veya silebilirsin.'
              : 'Pick the template that fits your venue — we create the categories, you add the items. Rename or delete anything you want later.'}
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {STARTER_PRESETS.map((p) => {
          const localized = p[isTr ? 'tr' : 'en'];
          const busy = presetBusy === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p)}
              disabled={presetBusy !== null}
              className="group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[#EDEDED] bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex w-full items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <PresetGlyph id={p.id} />
                  <span className="text-[14px] font-medium text-[#0A0A0A]">{localized.label}</span>
                </span>
                {busy ? (
                  <Loader2 size={14} className="animate-spin text-[#0A0A0A]" />
                ) : (
                  <ChevronRight size={14} strokeWidth={2} className="text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]" />
                )}
              </div>
              <p className="text-[11px] text-[#737373]">{localized.hint}</p>
              <div className="flex flex-wrap gap-1">
                {localized.categories.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-[#525252]"
                  >
                    {c}
                  </span>
                ))}
                <span className="inline-flex items-center rounded-full border border-dashed border-[#EDEDED] px-2 py-0.5 text-[10px] font-medium text-[#A3A3A3]">
                  +{localized.categories.length - 4}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-dashed border-[#EDEDED] pt-4">
        <span className="h-px flex-1 bg-[#EDEDED]" aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#A3A3A3]">
          {isTr ? 'veya' : 'or'}
        </span>
        <span className="h-px flex-1 bg-[#EDEDED]" aria-hidden />
      </div>
      <button
        onClick={onStartEmpty}
        disabled={presetBusy !== null || !menuEnabled}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[12px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={13} strokeWidth={2.25} />
        {isTr ? 'Boş kategoriyle başla' : 'Start with an empty category'}
      </button>
    </div>
  );
}
