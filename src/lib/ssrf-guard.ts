// SSRF guard for server-side outbound fetches of owner-controlled URLs.
//
// Why: `website` / `reservation` platform links are free-form (no domain
// whitelist, CLAUDE.md §19.4). The platform link test fetches them from our
// serverless runtime and reports statusCode + latency back to the owner — an
// owner could point the link at 127.0.0.1:6379, 169.254.169.254 or a private
// VPC address and use the response as an internal port scanner / metadata
// probe. Every hop (initial URL + each redirect Location) must pass this guard.
//
// Residual risk (documented, not solved here): DNS rebinding between this
// lookup and the fetch's own resolution. Pinning would need a custom undici
// dispatcher; the guard still closes the trivial literal / static-DNS cases.

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type SsrfGuardResult = { ok: true } | { ok: false; reason: SsrfBlockReason };

export type SsrfBlockReason =
  | 'invalid_url'
  | 'wrong_protocol'
  | 'blocked_hostname'
  | 'private_address'
  | 'dns_unresolved';

const DEFAULT_DNS_TIMEOUT_MS = 3000;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function inV4Range(n: number, base: string, bits: number): boolean {
  const b = ipv4ToInt(base);
  if (b === null) return false;
  const size = 2 ** (32 - bits);
  return n >= b && n < b + size;
}

// Non-public IPv4 space: unspecified, private, CGNAT, loopback, link-local
// (cloud metadata 169.254.169.254), IETF/doc ranges, benchmarking, multicast,
// reserved + broadcast (224.0.0.0 and up).
const PRIVATE_V4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
];

export function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable → treat as unsafe
  if (n >= ipv4ToInt('224.0.0.0')!) return true;
  return PRIVATE_V4_RANGES.some(([base, bits]) => inV4Range(n, base, bits));
}

/** Expand an IPv6 literal (no brackets, no zone) into 8 16-bit groups. */
function parseIPv6(ip: string): number[] | null {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf('%');
  if (zone !== -1) addr = addr.slice(0, zone);

  // Trailing embedded IPv4 (e.g. ::ffff:10.0.0.1) → two hex groups.
  let tail: number[] = [];
  const lastColon = addr.lastIndexOf(':');
  const maybeV4 = addr.slice(lastColon + 1);
  if (maybeV4.includes('.')) {
    const n = ipv4ToInt(maybeV4);
    if (n === null) return null;
    tail = [Math.floor(n / 65536), n % 65536];
    // Placeholder groups; overwritten with `tail` once the layout is expanded.
    addr = addr.slice(0, lastColon + 1) + '0:0';
  }

  const halves = addr.split('::');
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

  let groups: number[];
  if (halves.length === 2) {
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array(missing).fill(0), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  if (tail.length) {
    groups[6] = tail[0];
    groups[7] = tail[1];
  }
  return groups;
}

function v4FromGroups(hi: number, lo: number): string {
  return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join('.');
}

export function isPrivateIPv6(ip: string): boolean {
  const g = parseIPv6(ip);
  if (!g) return true; // unparseable → treat as unsafe

  const allZeroPrefix = (count: number) => g.slice(0, count).every((x) => x === 0);

  // :: (unspecified) and ::1 (loopback)
  if (allZeroPrefix(7) && (g[7] === 0 || g[7] === 1)) return true;
  // ::ffff:a.b.c.d (IPv4-mapped) and deprecated ::a.b.c.d (IPv4-compatible)
  if (allZeroPrefix(5) && (g[5] === 0xffff || g[5] === 0)) {
    return isPrivateIPv4(v4FromGroups(g[6], g[7]));
  }
  // 64:ff9b::/96 NAT64 well-known prefix — embedded IPv4 decides.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isPrivateIPv4(v4FromGroups(g[6], g[7]));
  }
  // 2002::/16 6to4 — embedded IPv4 in groups 1-2.
  if (g[0] === 0x2002) return isPrivateIPv4(v4FromGroups(g[1], g[2]));
  // fc00::/7 unique local
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link-local, fec0::/10 deprecated site-local
  if ((g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0) return true;
  // ff00::/8 multicast
  if ((g[0] & 0xff00) === 0xff00) return true;
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  // Single-label names resolve via the runtime's DNS search domains (e.g.
  // `http://metadata/`). A public website always has a dot.
  if (!h.includes('.')) return true;
  return false;
}

async function resolveAll(host: string, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('dns_timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Validate that `url` is an http(s) URL whose host is publicly routable.
 * IP literals are checked directly (no DNS); hostnames are resolved and
 * rejected if ANY resolved address is non-public.
 */
export async function assertPublicHttpUrl(
  url: string,
  opts: { dnsTimeoutMs?: number } = {},
): Promise<SsrfGuardResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'wrong_protocol' };
  }

  // WHATWG URL already canonicalises IPv4 shorthands (0x7f.1, 2130706433 →
  // 127.0.0.1) and wraps IPv6 in brackets.
  let host = parsed.hostname;
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

  if (isIP(host)) {
    return isPrivateAddress(host) ? { ok: false, reason: 'private_address' } : { ok: true };
  }

  if (isBlockedHostname(host)) return { ok: false, reason: 'blocked_hostname' };

  let addresses: Array<{ address: string }>;
  try {
    addresses = await resolveAll(host, opts.dnsTimeoutMs ?? DEFAULT_DNS_TIMEOUT_MS);
  } catch {
    return { ok: false, reason: 'dns_unresolved' };
  }
  if (!addresses.length) return { ok: false, reason: 'dns_unresolved' };
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    return { ok: false, reason: 'private_address' };
  }
  return { ok: true };
}
