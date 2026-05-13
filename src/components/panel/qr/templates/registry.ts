/**
 * QR template registry — single source of truth for the wizard picker +
 * PDF/PNG export pipeline. Wave A ships with `classic` only; Wave B adds
 * the remaining 12 templates (TableTent, WindowSticker, ReceiptFooter,
 * PremiumBlack, MenuInsert, CounterPlaque, WalletCard, SocialPost,
 * DoorHanger, MinimalSwiss, Brutalist, Coaster, Postcard, PhotoHero).
 *
 * Adding a new template = import the entry + push it to `TEMPLATES`. The
 * picker, fallback resolver, and `getTemplate(id)` lookup pick it up
 * automatically (CLAUDE.md §40.3 registry pattern parity).
 */

import { classicEntry } from './Classic';
import type { TemplateEntry } from './types';

export const TEMPLATES: readonly TemplateEntry[] = [classicEntry];

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
