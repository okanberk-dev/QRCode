/**
 * QR template id whitelist — server-side `isValidTemplateId` guard için
 * minimum kontrat. Şu anda owner panel server-side composer
 * (`composePremiumQrPng`) tek "classic" Pulse Lime frame'i üretir;
 * persisted `template_id` value sadece schema integrity için kaydedilir,
 * runtime render değil.
 *
 * Wave A backlog: 15 hazır template (Classic + 14 qaxx handoff) JSX'leri
 * `git log` üzerinden erişilebilir, server-side SVG composer'a port
 * edilirse geri eklenir. Çıktı path'i değişmez (`templateId` çağrısı
 * client'a görünür kalır).
 */

export const TEMPLATE_IDS = [
  'classic',
  'table_tent',
  'window_sticker',
  'receipt_footer',
  'premium_black',
  'menu_insert',
  'counter_plaque',
  'wallet_card',
  'social_post',
  'door_hanger',
  'minimal_swiss',
  'brutalist',
  'coaster',
  'postcard',
  'photo_hero',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE_ID: TemplateId = 'classic';

/** All template IDs registered — useful for server-side validation. */
export function getTemplateIds(): readonly string[] {
  return TEMPLATE_IDS;
}

/** Is the provided string a valid template id in the registry? */
export function isValidTemplateId(id: unknown): id is TemplateId {
  return typeof id === 'string' && (TEMPLATE_IDS as readonly string[]).includes(id);
}
