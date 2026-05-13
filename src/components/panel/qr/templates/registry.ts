/**
 * QR template registry — single source of truth for the wizard picker +
 * PDF/PNG export pipeline. 15 templates ship in Wave B (Classic + 14 from
 * qaxx handoff). Wave C wires html-to-image + jspdf so the wizard's
 * "Şablonu indir" actions render any of these as PNG/PDF without server
 * round-trips.
 *
 * Adding a new template = import the entry + push it to `TEMPLATES`. The
 * picker, fallback resolver, and `getTemplate(id)` lookup pick it up
 * automatically (CLAUDE.md §40.3 registry pattern parity).
 */

import { classicEntry } from './Classic';
import { tableTentEntry } from './TableTent';
import { windowStickerEntry } from './WindowSticker';
import { receiptFooterEntry } from './ReceiptFooter';
import { premiumBlackEntry } from './PremiumBlack';
import { menuInsertEntry } from './MenuInsert';
import { counterPlaqueEntry } from './CounterPlaque';
import { walletCardEntry } from './WalletCard';
import { socialPostEntry } from './SocialPost';
import { doorHangerEntry } from './DoorHanger';
import { minimalSwissEntry } from './MinimalSwiss';
import { brutalistEntry } from './Brutalist';
import { coasterEntry } from './Coaster';
import { postcardEntry } from './Postcard';
import { photoHeroEntry } from './PhotoHero';
import type { TemplateEntry } from './types';

export const TEMPLATES: readonly TemplateEntry[] = [
  classicEntry,
  tableTentEntry,
  windowStickerEntry,
  receiptFooterEntry,
  premiumBlackEntry,
  menuInsertEntry,
  counterPlaqueEntry,
  walletCardEntry,
  socialPostEntry,
  doorHangerEntry,
  minimalSwissEntry,
  brutalistEntry,
  coasterEntry,
  postcardEntry,
  photoHeroEntry,
];

export const DEFAULT_TEMPLATE_ID = 'classic' as const;

/** Resolve a templateId to its entry, falling back to `classic`. */
export function getTemplate(id: string | null | undefined): TemplateEntry {
  if (!id) return TEMPLATES[0];
  return TEMPLATES.find((t) => t.meta.id === id) ?? TEMPLATES[0];
}

/** All template IDs registered — useful for server-side validation. */
export function getTemplateIds(): string[] {
  return TEMPLATES.map((t) => t.meta.id);
}

/** Is the provided string a valid template id in the registry? */
export function isValidTemplateId(id: unknown): id is string {
  return typeof id === 'string' && TEMPLATES.some((t) => t.meta.id === id);
}

export type { TemplateEntry, TemplateMeta, TemplateProps, TemplateBusiness } from './types';
