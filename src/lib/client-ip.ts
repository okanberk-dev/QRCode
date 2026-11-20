import { isIP } from 'node:net';

/**
 * Trusted client IP for billing (consent evidence, hosted `cardHolderIP`,
 * billing rate limits). Pinned topology: client → Traefik (Coolify) → app,
 * no CDN. Traefik overwrites any client-sent `X-Forwarded-For` and appends the
 * real peer, so the address to trust is the RIGHTMOST one that is not one of
 * our own proxies (`TRUSTED_PROXIES`). A client-supplied left entry is never
 * used. If a CDN is ever added, its ranges go into both Traefik
 * `forwardedHeaders.trustedIPs` and `TRUSTED_PROXIES` in the same change.
 *
 * The app-wide `getClientIp` is intentionally unchanged.
 */

export const DEFAULT_TRUSTED_PROXIES = '127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,::1/128,fc00::/7';

export interface Cidr {
  family: 4 | 6;
  bytes: Uint8Array;
  prefix: number;
}

function parseIpv4(ip: string): Uint8Array | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(parts[i])) return null;
    const n = Number(parts[i]);
    if (n > 255) return null;
    out[i] = n;
  }
  return out;
}

function parseIpv6(ip: string): Uint8Array | null {
  let text = ip.toLowerCase();
  const zone = text.indexOf('%');
  if (zone >= 0) text = text.slice(0, zone);
  // Embedded IPv4 tail (::ffff:1.2.3.4) → two hex groups.
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    text = `${text.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const parseGroups = (s: string): number[] | null => {
    if (!s) return [];
    const out: number[] = [];
    for (const g of s.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = parseGroups(halves[0]);
  const rest = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (!head || !rest) return null;
  const total = head.length + rest.length;
  if (halves.length === 1 ? total !== 8 : total > 7) return null;
  const full = [...head, ...new Array<number>(8 - total).fill(0), ...rest];
  const out = new Uint8Array(16);
  full.forEach((g, i) => {
    out[i * 2] = (g >> 8) & 0xff;
    out[i * 2 + 1] = g & 0xff;
  });
  return out;
}

/** IPv4-mapped IPv6 (::ffff:a.b.c.d) is treated as the IPv4 address. */
function toAddress(ip: string): { family: 4 | 6; bytes: Uint8Array } | null {
  const kind = isIP(ip);
  if (kind === 4) {
    const bytes = parseIpv4(ip);
    return bytes ? { family: 4, bytes } : null;
  }
  if (kind === 6) {
    const bytes = parseIpv6(ip);
    if (!bytes) return null;
    const mapped = bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
    return mapped ? { family: 4, bytes: bytes.slice(12) } : { family: 6, bytes };
  }
  return null;
}

/** "a.b.c.d/n, x::/n, …" → CIDRs. Invalid entries are ignored. */
export function parseCidrs(list: string): Cidr[] {
  const out: Cidr[] = [];
  for (const raw of String(list ?? '').split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    const [addr, prefixRaw] = entry.split('/');
    const parsed = toAddress(addr.trim());
    if (!parsed) continue;
    const max = parsed.family === 4 ? 32 : 128;
    const prefix = prefixRaw === undefined ? max : Number(prefixRaw.trim());
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) continue;
    out.push({ family: parsed.family, bytes: parsed.bytes, prefix });
  }
  return out;
}

function inCidr(addr: { family: 4 | 6; bytes: Uint8Array }, cidr: Cidr): boolean {
  if (addr.family !== cidr.family) return false;
  let bits = cidr.prefix;
  for (let i = 0; i < addr.bytes.length && bits > 0; i++) {
    const take = Math.min(8, bits);
    const mask = (0xff << (8 - take)) & 0xff;
    if ((addr.bytes[i] & mask) !== (cidr.bytes[i] & mask)) return false;
    bits -= take;
  }
  return true;
}

/** Strips IPv6 brackets and an IPv4 `:port`; returns '' for anything unusable. */
function cleanHeaderAddress(raw: string): string {
  let value = raw.trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
  if (bracketed) value = bracketed[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.slice(0, value.lastIndexOf(':'));
  return isIP(value) ? value : '';
}

let cachedList: string | null = null;
let cachedCidrs: Cidr[] = [];

function defaultTrusted(): Cidr[] {
  const list = process.env.TRUSTED_PROXIES?.trim() || DEFAULT_TRUSTED_PROXIES;
  if (list !== cachedList) {
    cachedList = list;
    cachedCidrs = parseCidrs(list);
  }
  return cachedCidrs;
}

interface HeaderSource {
  get(name: string): string | null;
}

/**
 * Walks `X-Forwarded-For` from the right, skips invalid entries and addresses
 * inside the trusted proxy ranges, and returns the first valid non-trusted
 * address; else a valid, non-trusted `x-real-ip`; else null.
 */
export function getTrustedClientIp(headers: HeaderSource, trusted: Cidr[] = defaultTrusted()): string | null {
  const isTrusted = (ip: string): boolean => {
    const addr = toAddress(ip);
    return !addr || trusted.some((cidr) => inCidr(addr, cidr));
  };
  const forwarded = headers.get('x-forwarded-for') ?? '';
  const entries = forwarded.split(',');
  for (let i = entries.length - 1; i >= 0; i--) {
    const ip = cleanHeaderAddress(entries[i]);
    if (!ip) continue;
    if (!isTrusted(ip)) return ip;
  }
  const real = cleanHeaderAddress(headers.get('x-real-ip') ?? '');
  if (real && !isTrusted(real)) return real;
  return null;
}
