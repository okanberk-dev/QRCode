import type { Locale } from '@/lib/translations';

export interface HowToStep {
  /** Step heading — short, action-first. */
  name: string;
  /** Step body — single paragraph; Google validator rejects empty. */
  text: string;
  /** Optional in-page anchor for the rendered step (when DOM has h2 id). */
  url?: string;
}

interface HowToSchemaArgs {
  locale: Locale;
  /** HowTo display name — usually the page h1 (or a `${verb} ${object}` synthesis). */
  name: string;
  /** One-sentence purpose description. */
  description: string;
  /** Canonical URL of the page the HowTo lives on. */
  url: string;
  /** Ordered steps. Schema requires at least 2; helper returns null if fewer. */
  steps: HowToStep[];
  /** Optional ISO 8601 duration (e.g. "PT5M"). */
  totalTime?: string;
}

/**
 * Returns a HowTo JSON-LD node, or null if the step count is below Google's
 * validator threshold (≥2). Caller spreads or appends into the page's
 * existing `jsonLdSchemas` array; emission still goes through
 * `jsonLdString()` (CLAUDE.md §37.6).
 *
 * Used across 4 feature pages, 7 custom sector pages, 8 layout-using sector
 * pages and help-article slug pages — well past the §7 3+ repetition gate.
 */
export function buildHowToSchema({
  locale,
  name,
  description,
  url,
  steps,
  totalTime,
}: HowToSchemaArgs): object | null {
  if (!Array.isArray(steps) || steps.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    ...(totalTime ? { totalTime } : {}),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: step.url } : { url: `${url}#step-${index + 1}` }),
    })),
  };
}
