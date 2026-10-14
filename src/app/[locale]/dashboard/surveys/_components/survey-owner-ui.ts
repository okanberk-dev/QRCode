// Small helpers shared by the owner survey screens (list, detail, share and
// results tabs). Plain functions — no React, no server imports.

import type { Locale } from '@/lib/translations';

/** Customer link for a survey: `<origin>/s/<slug>`. */
export function surveyPublicUrl(publicBaseUrl: string, slug: string): string {
  return `${publicBaseUrl.replace(/\/+$/, '')}/s/${slug}`;
}

/**
 * Copy text to the clipboard. `navigator.clipboard` is missing on plain-http
 * origins and can be refused in embedded browsers, so fall back to a hidden
 * textarea + `execCommand`. Resolves false when both fail.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

const EN_MESSAGES: Record<string, string> = {
  surveys_disabled: 'The Surveys module is turned off by Buaze for this business.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  no_questions: 'Add at least one question before publishing.',
};

/**
 * Message for a failed survey API call, in the owner's language. The API's own
 * `message` is Turkish and written for owners; English panels map the known
 * codes and fall back to a neutral sentence. Raw error codes never reach the
 * screen.
 */
export async function readSurveyApiError(res: Response, locale: Locale): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: unknown;
    message?: unknown;
  } | null;
  const code = typeof body?.error === 'string' ? body.error : '';
  if (locale === 'en') {
    return EN_MESSAGES[code] ?? 'Something went wrong. Please try again.';
  }
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (res.status === 403) return 'Bu işlem için yetkin yok.';
  if (res.status === 404) return 'Anket bulunamadı. Sayfayı yenile.';
  return 'Bir şeyler ters gitti. Tekrar dene.';
}

export function connectionErrorMessage(locale: Locale): string {
  return locale === 'tr'
    ? 'Bağlantı hatası. İnternetini kontrol edip tekrar dene.'
    : 'Connection error. Check your internet and try again.';
}
