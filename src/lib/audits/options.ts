// CLAUDE.md §42 — Audit question options normalization (saf helper).
//
// Public link akışında ve UI render sırasında, yes_no soruları için
// `options` alanı eksik olabilir (seed legacy / admin form bypass).
// Bu helper question type'a göre defansif default döndürür:
//
//   yes_no: locale-aware ['Evet', 'Hayır'] (TR) veya ['Yes', 'No'] (EN)
//   single / multi: gelen options array'i (string filter'lı), boşsa null
//   diğer: null (scale / text / file için options anlamsız)
//
// Score logic case-insensitive trim karşılaştırma yaptığı için locale
// yanlış set edilse bile correctAnswer="Evet" + UI value="evet" eşleşir.

import type { AuditQuestionType } from './types';

type SupportedLocale = 'tr' | 'en';

const YES_NO_OPTIONS: Record<SupportedLocale, string[]> = {
  tr: ['Evet', 'Hayır'],
  en: ['Yes', 'No'],
};

/**
 * Question type'a göre options'u normalize et.
 * UI'da render edilecek halini döndürür — null değer hiç options yok demek.
 */
export function normalizeQuestionOptions(
  type: AuditQuestionType,
  rawOptions: unknown,
  locale: SupportedLocale = 'tr',
): string[] | null {
  const filtered = Array.isArray(rawOptions)
    ? (rawOptions as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];

  if (type === 'yes_no') {
    // yes_no için her zaman 2 seçenek garanti et — seed/legacy bypass safety.
    if (filtered.length >= 2) return filtered.slice(0, 2);
    return YES_NO_OPTIONS[locale];
  }

  if (type === 'single' || type === 'multi') {
    return filtered.length >= 2 ? filtered : null;
  }

  // scale / text / file — options anlamsız
  return null;
}

/**
 * yes_no için default options döndür (locale-aware). Editor/wizard'da
 * type değişikliğinde fallback eklemek için.
 */
export function getYesNoDefaultOptions(locale: SupportedLocale = 'tr'): string[] {
  return [...YES_NO_OPTIONS[locale]];
}
