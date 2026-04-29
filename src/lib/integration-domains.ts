// Per-provider allowed domain list. Used both client-side (UI validation
// before save) and server-side (test endpoint guard) so a YemekSepeti URL
// pasted into the Getir slot doesn't silently HEAD-check the wrong host.
//
// Domains are matched against the URL hostname's final two labels (or the
// full hostname when shorter). Subdomains are accepted automatically:
//   maps.app.goo.gl    → matches "google.com" entry's "goo.gl" alias
//   tr.tripadvisor.com → matches "tripadvisor.com"
//
// `null` means free-form (website / reservation) — only protocol is enforced.

export type IntegrationProvider =
  | 'google'
  | 'yemeksepeti'
  | 'getir'
  | 'trendyol_go'
  | 'tripadvisor'
  | 'airbnb'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'website'
  | 'reservation';

export const PROVIDER_DOMAINS: Record<IntegrationProvider, string[] | null> = {
  google: ['google.com', 'g.page', 'goo.gl', 'maps.app.goo.gl', 'business.google.com'],
  yemeksepeti: ['yemeksepeti.com'],
  getir: ['getir.com', 'getiryemek.com'],
  trendyol_go: ['tgoapp.com', 'trendyol.com', 'trendyolgo.com'],
  tripadvisor: ['tripadvisor.com', 'tripadvisor.com.tr'],
  airbnb: ['airbnb.com', 'airbnb.com.tr'],
  instagram: ['instagram.com', 'instagr.am'],
  facebook: ['facebook.com', 'fb.com', 'fb.me', 'm.facebook.com'],
  whatsapp: ['whatsapp.com', 'wa.me', 'api.whatsapp.com'],
  website: null,
  reservation: null,
};

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  website: 'Web sitesi',
  reservation: 'Rezervasyon',
};

export interface DomainCheckResult {
  ok: boolean;
  reason?: 'invalid_url' | 'wrong_protocol' | 'wrong_domain';
  hostname?: string;
  expected?: string[];
}

function hostnameMatches(host: string, allowed: string): boolean {
  const h = host.toLowerCase();
  const a = allowed.toLowerCase();
  return h === a || h.endsWith(`.${a}`);
}

/**
 * Validate that `url` is a well-formed http(s) URL pointing at a hostname
 * the given provider expects. Returns `{ ok: true }` for free-form providers
 * (website/reservation) once the protocol is sane.
 */
export function checkProviderUrl(
  provider: IntegrationProvider,
  url: string,
): DomainCheckResult {
  const trimmed = url.trim();
  if (!trimmed) return { ok: true };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, reason: 'wrong_protocol', hostname: parsed.hostname };
  }

  const allowed = PROVIDER_DOMAINS[provider];
  if (!allowed) return { ok: true, hostname: parsed.hostname };

  const matched = allowed.some((d) => hostnameMatches(parsed.hostname, d));
  if (!matched) {
    return {
      ok: false,
      reason: 'wrong_domain',
      hostname: parsed.hostname,
      expected: allowed,
    };
  }
  return { ok: true, hostname: parsed.hostname };
}

export function describeDomainError(
  provider: IntegrationProvider,
  result: DomainCheckResult,
  locale: 'tr' | 'en' = 'tr',
): string {
  const label = PROVIDER_LABELS[provider];
  if (result.ok) return '';
  if (result.reason === 'invalid_url') {
    return locale === 'tr' ? 'Geçersiz URL formatı.' : 'Invalid URL format.';
  }
  if (result.reason === 'wrong_protocol') {
    return locale === 'tr'
      ? 'URL https:// ile başlamalı.'
      : 'URL must start with https://.';
  }
  if (result.reason === 'wrong_domain') {
    const expected = (result.expected ?? []).slice(0, 3).join(', ');
    return locale === 'tr'
      ? `Bu URL ${label} adresi gibi görünmüyor. Beklenen: ${expected}.`
      : `This URL doesn't look like a ${label} link. Expected: ${expected}.`;
  }
  return locale === 'tr' ? 'URL doğrulanamadı.' : 'URL could not be verified.';
}
