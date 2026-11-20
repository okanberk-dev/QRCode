/**
 * Post-login redirect target from `?redirect=`: a same-origin path only
 * ("/tr/dashboard", "/billing/tr/checkout?intent=renew"); anything else —
 * an absolute URL, a protocol-relative "//host", "/\host", control
 * characters — falls back. Used by the login form (billing spec §6.3: the
 * billing review page sends signed-out owners to login and back).
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}
