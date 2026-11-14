/**
 * Window events shared by the marketing chrome.
 *
 * The footer's "Çerez tercihleri / Cookie preferences" button fires
 * OPEN_COOKIE_PREFERENCES_EVENT; CookieConsentBanner (lazy-loaded in the root
 * layout) listens and opens its settings dialog, so a visitor can change or
 * withdraw a cookie decision at any time (the cookie policy promises this
 * link). If the button is pressed before the banner chunk has loaded, the
 * flag below is set and the banner opens the dialog as soon as it mounts.
 */
export const OPEN_COOKIE_PREFERENCES_EVENT = 'buaze:open-cookie-preferences';
export const COOKIE_PREFERENCES_PENDING_FLAG = '__BZ_OPEN_COOKIE_PREFS__';
