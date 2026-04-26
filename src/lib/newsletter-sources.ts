// Canonical mapping from NewsletterSubscriber.source raw strings to admin
// UI labels. Adding a new signup placement (popup, blog inline, dashboard
// invite, …) means: pass `source="..."` from the form, then add the entry
// here so admin filter chips and CSV exports use a friendly label.
//
// Unknown sources fall back to the raw value so a new placement still works
// out of the box; the label upgrade is purely cosmetic.

export const NEWSLETTER_SOURCE_LABELS: Record<string, { tr: string; en: string }> = {
  footer: { tr: 'Site footer', en: 'Site footer' },
  popup: { tr: 'Popup modal', en: 'Popup modal' },
  blog_inline: { tr: 'Blog yazısı içi', en: 'Inline blog CTA' },
  dashboard_invite: { tr: 'Panel davet', en: 'Dashboard invite' },
  onboarding: { tr: 'Onboarding ekranı', en: 'Onboarding flow' },
  roi_form: { tr: 'ROI hesaplayıcı', en: 'ROI calculator' },
  homepage_hero: { tr: 'Anasayfa hero', en: 'Homepage hero' },
};

export function getNewsletterSourceLabel(
  source: string | null | undefined,
  locale: 'tr' | 'en' = 'tr',
): string {
  if (!source) return locale === 'en' ? 'Unknown' : 'Bilinmeyen';
  return NEWSLETTER_SOURCE_LABELS[source]?.[locale] ?? source;
}
