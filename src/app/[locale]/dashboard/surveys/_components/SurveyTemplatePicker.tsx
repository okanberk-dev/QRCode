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

const CARD =
  'group flex h-full w-full flex-col gap-2 rounded-2xl border border-[#EDEDED] bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-[0_12px_28px_-18px_rgba(10,10,10,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 active:scale-[0.99] min-h-[132px]';

function TemplateCard({
  template,
  locale,
  onPick,
}: {
  template: SurveyTemplate;
  locale: EditorLocale;
  onPick: (pick: TemplatePick) => void;
}) {
  const Icon = TEMPLATE_ICONS[template.icon] ?? Sparkles;
  const count = template.questions.length;
  const duration = formatSurveyDuration(estimateSurveySeconds(count), locale);
  return (
    <button type="button" className={CARD} onClick={() => onPick(template.id)}>
      <span className="flex items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]"
        >
          <Icon size={19} />
        </span>
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="mt-1 text-[#A3A3A3] transition-all group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
        />
      </span>
      <span className="bz-h-tight block text-[16px] leading-tight text-[#0A0A0A]">
        {template.title[locale]}
      </span>
      <span className="block text-[13px] leading-[1.45] text-[#525252]">
        {template.description[locale]}
      </span>
      <span className="mt-auto block pt-1 text-[12px] font-medium text-[#737373]">
        {locale === 'tr' ? `${count} soru · ${duration}` : `${count} ${count === 1 ? 'question' : 'questions'} · ${duration}`}
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
          <h2 id="survey-tpl-recommended" className="bz-h-tight text-[16px]">
            {isTr ? 'Senin için önerilenler' : 'Recommended for you'}
          </h2>
          <span className="inline-flex items-center rounded-full bg-[#EAF9B8] px-2.5 py-1 text-[11.5px] font-medium text-[#0A0A0A]">
            {sectorLabel}
          </span>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((template) => (
            <li key={template.id}>
              <TemplateCard template={template} locale={locale} onPick={onPick} />
            </li>
          ))}
          <li>
            <button type="button" className={`${CARD} border-dashed`} onClick={() => onPick('blank')}>
              <span className="flex items-start justify-between gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#0A0A0A]"
                >
                  <PencilLine size={19} />
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="mt-1 text-[#A3A3A3] transition-all group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
                />
              </span>
              <span className="bz-h-tight block text-[16px] leading-tight text-[#0A0A0A]">
                {isTr ? 'Boş anketle başla' : 'Start from blank'}
              </span>
              <span className="block text-[13px] leading-[1.45] text-[#525252]">
                {isTr ? 'Kendi sorularını sen yaz.' : 'Write your own questions.'}
              </span>
            </button>
          </li>
        </ul>
      </section>

      {others.length > 0 && (
        <details className="group/more rounded-2xl border border-[#EDEDED] bg-white open:bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-2 text-[14px] font-medium text-[#0A0A0A] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span>{isTr ? `Diğer şablonlar (${others.length})` : `More templates (${others.length})`}</span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="text-[#737373] transition-transform group-open/more:rotate-180"
            />
          </summary>
          <ul className="grid gap-3 border-t border-[#EDEDED] p-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} locale={locale} onPick={onPick} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
