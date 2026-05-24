import type { NextRequest } from 'next/server';
import { detectLocaleFromAcceptLanguage, type Locale } from '@/lib/translations';

/**
 * API route locale resolver (CLAUDE.md §40 i18n disipline).
 *
 * Öncelik sırası:
 *   1. `?locale=tr|en` query parametresi (UI explicit override için)
 *   2. `Accept-Language` request header (browser preference)
 *   3. Default `tr` (CLAUDE.md §22.9 — TR primary)
 *
 * Mevcut `detectLocaleFromAcceptLanguage` helper'ını reuse eder
 * (src/lib/translations.ts).
 */
export function getLocaleFromRequest(req: NextRequest): Locale {
  const queryLocale = req.nextUrl.searchParams.get('locale');
  if (queryLocale === 'tr' || queryLocale === 'en') return queryLocale;
  return detectLocaleFromAcceptLanguage(req.headers.get('accept-language'));
}
