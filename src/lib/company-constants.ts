import { SITE_URL } from '@/lib/site';

/**
 * Client-safe company constants (no DB access — safe to import from
 * 'use client' files). Server code that also needs the legal name/address
 * uses `getCompanyFacts()` from '@/lib/company-facts'.
 */

/** The only public mailbox (CLAUDE.md §19.1.2). */
export const SUPPORT_EMAIL = 'support@buaze.com';

/** The single published support promise (ContactFloat uses the same). */
export const SUPPORT_HOURS = {
  tr: 'Hafta içi 09:00–18:00 (TSİ). Genellikle bir iş günü içinde yanıt veriyoruz.',
  en: 'Weekdays 09:00–18:00 (Turkey time). We usually reply within one business day.',
} as const;

/** Stable @id of the Organization node in the locale layout's JSON-LD. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
/** Stable @id of the WebSite node in the locale layout's JSON-LD. */
export const WEBSITE_ID = `${SITE_URL}/#website`;
