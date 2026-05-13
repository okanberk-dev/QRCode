/**
 * Map a restaurant's free-form sector to a default QR template id.
 *
 * Wave B ships 15 templates, so each sector now gets a sensible default
 * (Wave A was classic-only). Owners can still override via the wizard
 * picker — these are first-render seeds, not locks.
 *
 * Recipe lifted from `qaxx/HANDOFF.md §6` and extended to the full TR
 * sector vocabulary (`SectorKey`). Adding a new template = update both
 * `templates/registry.ts` and (optionally) this table.
 */

import { detectSector, type SectorKey } from '@/lib/sector-platforms';
import {
  DEFAULT_TEMPLATE_ID,
  isValidTemplateId,
} from '@/components/panel/qr/templates/registry';

/**
 * Per-sector default. Values must be ids registered in the templates
 * registry — `isValidTemplateId` guards `defaultTemplateForCategory` so an
 * orphan id (template removed from registry) doesn't crash the wizard.
 *
 * The mapping aims to surface the most "natural" template for each vertical
 * without hiding the others (full grid stays accessible).
 */
const SECTOR_DEFAULTS: Record<SectorKey, string> = {
  // Restaurants / cafés / bakeries — Classic suits most operators; it's the
  // generic lime + white card every reviewer recognises.
  food: 'classic',
  // Delivery / take-away — Receipt Footer integrates with thermal printers.
  delivery: 'receipt_footer',
  // Hotels / lodging — Postcard is the warmer "greetings from" voice.
  hospitality: 'postcard',
  // Clinics & healthcare — Premium Black projects calm authority.
  clinic: 'premium_black',
  // Legal — same upscale Premium Black tone fits an office reception.
  legal: 'premium_black',
  // Spa & beauty — Coaster's warm wood palette matches treatment rooms.
  spa: 'coaster',
  // Retail — Wallet Card doubles as a loyalty card insert.
  retail: 'wallet_card',
  // Fitness — Social Post template is the social-share-ready square format.
  fitness: 'social_post',
  // Education — Minimal Swiss reads as deliberate / academic.
  education: 'minimal_swiss',
  // Catch-all — Classic is the safe fallback.
  other: 'classic',
};

/** Pick the default templateId for a restaurant's category. Safe fallback. */
export function defaultTemplateForCategory(category: string | null | undefined): string {
  const candidate = SECTOR_DEFAULTS[detectSector(category)];
  return isValidTemplateId(candidate) ? candidate : DEFAULT_TEMPLATE_ID;
}
