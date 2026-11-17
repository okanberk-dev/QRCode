// Coarse device fingerprint stored on UserSession.fingerprint (UA major
// version + IP /16, SHA-256, first 32 hex chars). It groups an account's
// sessions by device; nothing is mailed from it. The "new device login"
// alert that used to fire on a fingerprint change was retired in 2026-11
// (CLAUDE.md §21.39): browser majors change every few weeks and mobile IPs
// rotate, so the owner kept getting alerts for their own devices.

import { createHash } from 'crypto';

/** Extract "Browser MajorVersion" from a User-Agent string. */
function extractUaMajor(userAgent: string | null | undefined): string {
  if (!userAgent) return 'unknown/0';
  // Common patterns: Chrome/120.0.6099.130, Firefox/121.0, Safari/17.1.2,
  // Edg/120.0.2210.91, Mobile Safari/16.6 (in iOS), CriOS/120.0.6099.119
  // (Chrome on iOS), FxiOS/121.0 (Firefox on iOS), Opera/100.0.
  // The first major version segment in any of these works for fuzzy match.
  const patterns: Array<{ name: string; re: RegExp }> = [
    { name: 'Edge', re: /\bEdg\/(\d+)/ },
    { name: 'Chrome', re: /\b(?:Chrome|CriOS)\/(\d+)/ },
    { name: 'Firefox', re: /\b(?:Firefox|FxiOS)\/(\d+)/ },
    { name: 'Safari', re: /\bVersion\/(\d+)[^/]*Safari/ },
    { name: 'Opera', re: /\bOPR\/(\d+)/ },
    { name: 'Mobile Safari', re: /\bMobile.*Safari\/(\d+)/ },
  ];
  for (const p of patterns) {
    const m = userAgent.match(p.re);
    if (m) return `${p.name}/${m[1]}`;
  }
  // Fallback: a generic hash of the UA family so any UA still produces a
  // stable fingerprint for the same browser. Prefix with "ua:" so the
  // structure is readable in DB.
  return `ua:${userAgent.slice(0, 60)}`;
}

/** Truncate IP to a /16 prefix for fuzzy match.
 *  IPv4: keep first 2 octets ("88.123.x.y" → "88.123").
 *  IPv6: keep first 4 hex groups (16-bit each = 64 bits, equivalent of
 *  IPv4 /16 in coarse-grain terms).
 *  Localhost / invalid → 'unknown'.
 */
function ipToSlash16(ip: string | null | undefined): string {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return 'unknown';
  }
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    const [a, b] = ip.split('.');
    return `${a}.${b}`;
  }
  // IPv6 (possibly with :: shorthand expanded)
  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean);
    return groups.slice(0, 4).join(':') || 'unknown';
  }
  return 'unknown';
}

/**
 * Compute a stable fuzzy fingerprint from a UA + IP pair. Same major
 * browser version + same /16 IP range → same hash. Different browser
 * family OR jump to a different /16 → different hash → alert fires.
 */
export function computeDeviceFingerprint(
  userAgent: string | null | undefined,
  ip: string | null | undefined,
): string {
  const uaMajor = extractUaMajor(userAgent);
  const ipPrefix = ipToSlash16(ip);
  const raw = `${uaMajor}|${ipPrefix}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}
