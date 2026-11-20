/**
 * Per-viewer conveniences in the browser (spec §7.10). Every access is wrapped:
 * private windows, blocked site data and previews can throw or come back empty,
 * and the studio must work the same without them.
 *
 * Keys in use: `buaze:menu:preview-collapsed`, `buaze:menu:live-hint:v1`,
 * `buaze:menu:mode`, `buaze:menu:service-hint:v1`, `buaze:menu:single-keys`,
 * `buaze:menu:collapsed:<restaurantId>`, `buaze:menu-setup:<restaurantId>` (session).
 */

export function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalSet(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the preference just is not remembered */
  }
}

export function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function safeSessionRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export const STORAGE_KEYS = {
  previewCollapsed: 'buaze:menu:preview-collapsed',
  liveHint: 'buaze:menu:live-hint:v1',
  mode: 'buaze:menu:mode',
  serviceHint: 'buaze:menu:service-hint:v1',
  singleKeys: 'buaze:menu:single-keys',
  collapsed: (restaurantId: string) => `buaze:menu:collapsed:${restaurantId}`,
  setup: (restaurantId: string) => `buaze:menu-setup:${restaurantId}`,
} as const;
