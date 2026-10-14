// Surveys Phase 0 — accent contrast protection for the public survey page
// (/s/[slug]).
//
// An owner can pick any accent colour (the wizard even offers #0A0A0A, and
// legacy rows may hold anything). The public page paints that colour as a
// *fill* on two different surfaces — the dark intro / thank-you screens
// (#0A0A0A) and the light question / contact screens (#FFFFFF) — and puts
// text on top of the fill. A hard-coded #0A0A0A label on a #0A0A0A fill made
// the intro CTA ("Başlayalım") invisible for ink-coloured surveys.
//
// `resolveSurveyAccent` returns, per surface, a fill that stays visible
// against that surface plus the text colour that stays readable on the fill.
// Pure + dependency-light (reuses the WCAG maths in qr-colors.ts), so it is
// safe in the client bundle and unit-testable.
//
// Rules (Buaze brand decision, CLAUDE.md §11 — the default lime stays lime):
//   • dark surface : keep the accent while it has ≥ 3:1 against #0A0A0A
//                    (non-text contrast floor), otherwise use white.
//   • light surface: keep the accent while it has ≥ 1.15:1 against white,
//                    otherwise use ink. The floor is intentionally LOW: the
//                    default lime is only 1.30:1 on white and must not turn
//                    black. Thin lime indicators (stars, progress bar,
//                    selected borders) never carry meaning by colour alone —
//                    each is paired with text (rating label, "n / N",
//                    aria-checked), and lime CTAs carry 15.3:1 ink text.
//                    Washed-out colours (#F5F5F5 1.09, #EAF9B8 1.12, white)
//                    would vanish, so they fall back to ink.
//   • text         : ink or white, whichever contrasts more with the fill.
//                    max(ink, white) is ≥ 4.45:1 for EVERY colour (worst case
//                    ≈ L 0.186), so text is never unreadable; reaching 4.5:1
//                    for every possible fill is mathematically impossible.
//
// The accent is NEVER used as text colour on the light surface.

import { contrastRatio, normaliseHex } from '@/lib/qr-colors';

/** Pulse lime — default when the stored colour is missing or invalid. */
export const DEFAULT_SURVEY_ACCENT = '#C6F24E';
/** Ink — the survey's dark surface and its default text colour. */
export const SURVEY_INK = '#0A0A0A';
/** White — the survey's light surface. */
export const SURVEY_WHITE = '#FFFFFF';

/** Minimum accent-vs-#0A0A0A contrast to keep the accent on the dark surface. */
export const MIN_FILL_CONTRAST_ON_DARK = 3;
/** Minimum accent-vs-white contrast to keep the accent on the light surface. */
export const MIN_FILL_CONTRAST_ON_LIGHT = 1.15;

export interface AccentPair {
  /** Background / indicator colour to paint (`#RRGGBB`, uppercase). */
  fill: string;
  /** Text / icon colour that stays readable on `fill`. */
  text: string;
}

export interface ResolvedSurveyAccent {
  /** Normalised `#RRGGBB`; invalid or empty input falls back to lime. */
  accent: string;
  /** Intro + thank-you screens (surface #0A0A0A): CTA, number dots, consent box, glow. */
  onDark: AccentPair;
  /** Question + contact screens (surface #FFFFFF): CTA, stars, progress bar, selected indicators. */
  onLight: AccentPair;
}

/** Ink or white — whichever reads better on `fill` (ties go to ink). */
function readableTextOn(fill: string): string {
  return contrastRatio(SURVEY_INK, fill) >= contrastRatio(SURVEY_WHITE, fill)
    ? SURVEY_INK
    : SURVEY_WHITE;
}

function pairFor(fill: string): AccentPair {
  return { fill, text: readableTextOn(fill) };
}

export function resolveSurveyAccent(raw: string | null | undefined): ResolvedSurveyAccent {
  const accent = (typeof raw === 'string' ? normaliseHex(raw) : null) ?? DEFAULT_SURVEY_ACCENT;
  const darkFill =
    contrastRatio(accent, SURVEY_INK) >= MIN_FILL_CONTRAST_ON_DARK ? accent : SURVEY_WHITE;
  const lightFill =
    contrastRatio(accent, SURVEY_WHITE) >= MIN_FILL_CONTRAST_ON_LIGHT ? accent : SURVEY_INK;
  return {
    accent,
    onDark: pairFor(darkFill),
    onLight: pairFor(lightFill),
  };
}
