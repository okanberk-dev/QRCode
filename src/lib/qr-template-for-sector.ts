/**
 * Map a restaurant's free-form sector to a default QR template id.
 *
 * Wave A ships with `classic` only — every sector falls back to it. Wave B
 * will extend this table once additional templates land in the registry
 * (TableTent, PremiumBlack, etc.). The mapping reuses `detectSector` for
 * keyword normalisation so adding new categories (e.g. "Kafe", "Fine
 * Dining") in onboarding doesn't require touching this file.
 *
 * Recipe lifted from `qaxx/HANDOFF.md §6` — kept here so the wizard +
 * upcoming admin restaurant detail page share one source of truth.
 */

import { detectSector, type SectorKey } from '@/lib/sector-platforms';
import { DEFAULT_TEMPLATE_ID, isValidTemplateId } from '@/components/panel/qr/templates/registry';

/**
 * Per-sector default. Values must be ids registered in the templates
 * registry — `isValidTemplateId` guards `defaultTemplateForCategory` so an
 * orphan id (template removed from registry) doesn't crash the wizard.
 */
const SECTOR_DEFAULTS: Record<SectorKey, string> = {
  food: 'classic',
  delivery: 'classic',
  hospitality: 'classic',
  clinic: 'classic',
  legal: 'classic',
  spa: 'classic',
  retail: 'classic',
  fitness: 'classic',
  education: 'classic',
  other: 'classic',
};

/** Pick the default templateId for a restaurant's category. Safe fallback. */
export function defaultTemplateForCategory(category: string | null | undefined): string {
  const candidate = SECTOR_DEFAULTS[detectSector(category)];
  return isValidTemplateId(candidate) ? candidate : DEFAULT_TEMPLATE_ID;
}
