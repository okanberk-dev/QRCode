// Cookie-consent storage helpers, split out of CookieConsentBanner so that
// ConditionalAnalytics (always in the root layout) can read the decision
// without pulling the whole banner UI into the first JS bundle — the banner
// itself is lazy-loaded (LazyCookieConsentBanner).

const STORAGE_KEY = 'bz_cookie_consent';
const STORAGE_VERSION = 2;

export interface CookieConsentState {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** Stage 32 §38.112 — panel preference personalization (forward-looking) */
  personalization: boolean;
  decidedAt: string;
}

/**
 * Stage 32 §38.112 — v1 → v2 migration helper.
 * Eski v1 row (`{ version: 1, essential: true, analytics, marketing,
 * decidedAt }`) `personalization: false` default ile v2 shape'e upgrade
 * edilir. v2+ row'lar olduğu gibi okunur. Geçersiz / corrupt JSON null
 * döner → banner görünür hale gelir.
 */
export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ver = typeof parsed?.version === 'number' ? parsed.version : 0;
    if (ver < 1 || ver > STORAGE_VERSION) return null;
    return {
      version: STORAGE_VERSION,
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      personalization: ver >= 2 ? Boolean(parsed.personalization) : false,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: Omit<CookieConsentState, 'version' | 'essential' | 'decidedAt'>) {
  if (typeof window === 'undefined') return;
  const payload: CookieConsentState = {
    version: STORAGE_VERSION,
    essential: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    personalization: consent.personalization,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* swallow — quota / private mode */
  }
  // Yeni karar Script tag'lerin re-evaluate edilmesi için window event
  // emit eder. ConditionalAnalytics component bunu dinler.
  window.dispatchEvent(new CustomEvent('bz:cookie-consent-changed', { detail: payload }));
}
