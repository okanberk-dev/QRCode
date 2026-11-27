'use client';

// Surveys editor — phase A: pick a starting point.
//
// "Recommended for you" = the business sector's own template (when it has one)
// plus the three universal ones, then "Start from blank". Everything else sits
// in a closed "More templates" list. Choosing a card moves the page to the
// editor (phase B) — the owner can still change every question there.

import {
  ArrowRight,
  BedDouble,
  ChevronDown,
  Gauge,
  PencilLine,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { SectorKey } from '@/lib/sector-platforms';
import { estimateSurveySeconds, formatSurveyDuration } from '@/lib/surveys';
import {
  otherTemplatesForSector,
  templatesForSector,
  type SurveyTemplate,
  type SurveyTemplateIcon,
  type SurveyTemplateId,
} from '@/lib/survey-templates';
import type { EditorLocale } from './survey-editor-state';

const TEMPLATE_ICONS: Record<SurveyTemplateIcon, LucideIcon> = {
  Smile,
  Gauge,
  Star,
  UtensilsCrossed,
  BedDouble,
  Stethoscope,
  Sparkles,
  Store,
};

export type TemplatePick = SurveyTemplateId | 'blank';

interface Props {
  locale: EditorLocale;
  sector: SectorKey;
  /** Localised sector name for the chip, e.g. "Restoran & Kafe". */
  sectorLabel: string;
  onPick: (pick: TemplatePick) => void;
}

// Fintora template tile: white card on the canvas (grey on phones), a soft
// preview strip, a black "Kullan" pill.
const CARD =
  'group flex h-full min-h-[132px] w-full flex-col gap-3 rounded-[24px] bg-white p-4 text-left transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 max-sm:bg-[#F6F6F6] sm:p-5';

function TemplateCard({
  template,
  locale,
  onPick,
  inset = false,
}: {
  template: SurveyTemplate;
  locale: EditorLocale;
  onPick: (pick: TemplatePick) => void;
  /** Inside a white panel: the tile turns grey (white on phones). */
  inset?: boolean;
}) {
  const Icon = TEMPLATE_ICONS[template.icon] ?? Sparkles;
  const count = template.questions.length;
  const duration = formatSurveyDuration(estimateSurveySeconds(count), locale);
  return (
    <button
      type="button"
      className={inset ? `${CARD} !bg-[#F6F6F6] max-sm:!bg-white` : CARD}
      onClick={() => onPick(template.id)}
    >
      {/* Soft preview: question lines */}
      <span
        aria-hidden="true"
        className={`flex items-center gap-3 rounded-[16px] p-3 ${inset ? 'bg-white max-sm:bg-[#F6F6F6]' : 'bg-[#F6F6F6] max-sm:bg-white'}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="h-1.5 w-3/4 rounded-full bg-pn-line" />
          <span className="h-1.5 w-1/2 rounded-full bg-pn-line" />
        </span>
      </span>
      <span className="block text-[16px] font-medium leading-tight text-pn-ink">{template.title[locale]}</span>
      <span className="block text-[13px] leading-[1.45] text-[#737373]">{template.description[locale]}</span>
      <span className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-[13px] text-[#737373]">
          {locale === 'tr' ? `${count} soru · ${duration}` : `${count} ${count === 1 ? 'question' : 'questions'} · ${duration}`}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-pn-accent px-3.5 text-[13px] font-medium text-white transition-colors group-hover:bg-pn-accent-hover"
        >
          {locale === 'tr' ? 'Kullan' : 'Use'}
          <ArrowRight size={14} />
        </span>
      </span>
    </button>
  );
}

export default function SurveyTemplatePicker({ locale, sector, sectorLabel, onPick }: Props) {
  const isTr = locale === 'tr';
  const recommended = templatesForSector(sector);
  const others = otherTemplatesForSector(sector);

  return (
    <div className="space-y-6">
      <section aria-labelledby="survey-tpl-recommended" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="survey-tpl-recommended" className="text-[20px] font-medium leading-[26px] tracking-[-0.015em] text-pn-ink">
            {isTr ? 'Senin için önerilenler' : 'Recommended for you'}
          </h2>
          <span className="inline-flex h-7 items-center rounded-full bg-pn-accent-soft px-3 text-[12px] font-medium text-pn-accent">
            {sectorLabel}
          </span>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((template) => (
            <li key={template.id}>
              <TemplateCard template={template} locale={locale} onPick={onPick} />
            </li>
          ))}
          <li>
            <button
              type="button"
              className="group flex h-full min-h-[132px] w-full flex-col justify-between gap-3 rounded-[24px] border border-dashed border-pn-line-strong p-4 text-left transition-[background-color,border-color,transform] duration-200 hover:border-pn-accent hover:bg-pn-accent-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 sm:p-5"
              onClick={() => onPick('blank')}
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-colors group-hover:bg-pn-accent group-hover:text-white max-sm:bg-[#F6F6F6]"
              >
                <PencilLine size={18} strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-[16px] font-medium leading-tight text-pn-ink">
                  {isTr ? 'Boş anketle başla' : 'Start from blank'}
                </span>
                <span className="mt-1 block text-[13px] leading-[1.45] text-[#737373]">
                  {isTr ? 'Kendi sorularını sen yaz.' : 'Write your own questions.'}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      {others.length > 0 && (
        <details className="group/more rounded-[24px] bg-white max-sm:bg-[#F6F6F6]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 rounded-[24px] px-5 py-2 text-[15px] font-medium text-pn-ink marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span>{isTr ? `Diğer şablonlar (${others.length})` : `More templates (${others.length})`}</span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="text-[#737373] transition-transform group-open/more:rotate-180"
            />
          </summary>
          <ul className="grid gap-2.5 border-t border-pn-line p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {others.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} locale={locale} onPick={onPick} inset />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
