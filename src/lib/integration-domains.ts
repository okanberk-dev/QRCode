// Per-provider URL validation. Used both client-side (UI validation before
// save) and server-side (test endpoint guard) so a YemekSepeti URL pasted
// into the Getir slot doesn't silently HEAD-check the wrong host.
//
// Two layers:
//   1. Domain whitelist — protocol + hostname → hard error, blocks save.
//   2. Path heuristic   → soft warning, doesn't block save.
//
// The owner can save a homepage / non-review URL on purpose (legacy import,
// custom landing) — UI surfaces an amber notice but `requireRestaurantAccess`
// stays the only authoritative gate. Domains below match the URL hostname's
// final two labels (subdomains accepted automatically):
//   maps.app.goo.gl    → matches "google.com" entry's "maps.app.goo.gl" alias
//   tr.tripadvisor.com → matches "tripadvisor.com"
//
// `null` domain list means free-form (website / reservation) — only protocol
// is enforced.

export type IntegrationProvider =
  | 'google'
  | 'yemeksepeti'
  | 'getir'
  | 'trendyol_go'
  | 'tripadvisor'
  | 'airbnb'
  | 'booking'
  | 'yandex'
  // §38.52 — Yelp + Foursquare yorum platformları (hibrit taksonomi).
  | 'yelp'
  | 'foursquare'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'website'
  | 'reservation'
  | 'other';

export const PROVIDER_DOMAINS: Record<IntegrationProvider, string[] | null> = {
  google: ['google.com', 'g.page', 'goo.gl', 'maps.app.goo.gl', 'business.google.com'],
  yemeksepeti: ['yemeksepeti.com', 'yemeksepeti.com.tr'],
  getir: ['getir.com', 'getiryemek.com', 'getir.net', 'getir.com.tr'],
  trendyol_go: ['tgoapp.com', 'trendyol.com', 'trendyolgo.com', 'tgoyemek.com', 'trendyol.com.tr'],
  tripadvisor: ['tripadvisor.com', 'tripadvisor.com.tr'],
  airbnb: ['airbnb.com', 'airbnb.com.tr'],
  booking: ['booking.com'],
  yandex: ['yandex.com', 'yandex.com.tr', 'yandex.ru'],
  // §38.52 — Yelp + Foursquare
  yelp: ['yelp.com', 'yelp.com.tr'],
  foursquare: ['foursquare.com', 'fsq.com'],
  instagram: ['instagram.com', 'instagr.am'],
  facebook: ['facebook.com', 'fb.com', 'fb.me', 'm.facebook.com'],
  whatsapp: ['whatsapp.com', 'wa.me', 'api.whatsapp.com'],
  website: null,
  reservation: null,
  // "Diğer" — owner kendi review platform URL'i (TheFork, OpenTable, sektör-
  // spesifik). Domain whitelist YOK; sadece protocol kontrolü (`website` ile
  // aynı pattern).
  other: null,
};

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  website: 'Web sitesi',
  reservation: 'Rezervasyon',
  other: 'Diğer',
};

export type DomainCheckReason =
  | 'invalid_url'
  | 'wrong_protocol'
  | 'wrong_domain'
  | 'generic_homepage'
  | 'not_review_link';

export type DomainCheckSeverity = 'error' | 'warning';

export interface DomainCheckResult {
  ok: boolean;
  /** Severity for failed checks. `error` → hard block. `warning` → save allowed. */
  severity?: DomainCheckSeverity;
  reason?: DomainCheckReason;
  hostname?: string;
  expected?: string[];
}

function hostnameMatches(host: string, allowed: string): boolean {
  const h = host.toLowerCase();
  const a = allowed.toLowerCase();
  return h === a || h.endsWith(`.${a}`);
}

// Path heuristics — provider-aware. A domain match alone doesn't mean the
// URL points at a review surface (yemeksepeti.com → homepage; the customer
// who lands there can't write a review for a specific restaurant). These
// patterns are deliberately loose: we'd rather miss an exotic review URL
// than reject a legitimate one. Soft warning only.

interface PathRules {
  /** Treat as homepage if the URL has no meaningful path/query/segment. */
  homepageWhenBare?: boolean;
  /** Locale-only paths still considered homepage (`/tr`, `/en`, …). */
  localeHomepagePaths?: string[];
  /** Substrings that mark a real review/listing link. */
  reviewSignatures?: string[];
}

const PATH_RULES: Partial<Record<IntegrationProvider, PathRules>> = {
  google: {
    homepageWhenBare: true,
    localeHomepagePaths: ['/maps', '/business'],
    reviewSignatures: [
      'g.page/r/',
      'goo.gl/maps',
      'maps.app.goo.gl',
      'business.google.com',
      '/maps/place/',
      'cid=',
      'placeid=',
    ],
  },
  yemeksepeti: {
    homepageWhenBare: true,
    localeHomepagePaths: ['/tr', '/en'],
    reviewSignatures: ['/restaurant/', '/menu/'],
  },
  trendyol_go: {
    homepageWhenBare: true,
    reviewSignatures: ['/restaurant/', '/yemek/restaurant/'],
  },
  tripadvisor: {
    homepageWhenBare: true,
    localeHomepagePaths: ['/Tourism', '/Hotels'],
    reviewSignatures: [
      '/Restaurant_Review-',
      '/Hotel_Review-',
      '/Attraction_Review-',
      '/ShowUserReviews-',
    ],
  },
  booking: {
    homepageWhenBare: true,
    localeHomepagePaths: ['/searchresults'],
    reviewSignatures: ['/hotel/'],
  },
  airbnb: {
    homepageWhenBare: true,
    reviewSignatures: ['/rooms/', '/h/'],
  },
  // §38.52 — Yelp business listing path: /biz/<slug>
  yelp: {
    homepageWhenBare: true,
    reviewSignatures: ['/biz/', '/biz_redir'],
  },
  // §38.52 — Foursquare venue path: /v/<slug>/<id> veya /venue/<id>
  foursquare: {
    homepageWhenBare: true,
    reviewSignatures: ['/v/', '/venue/'],
  },
};

function isBarePath(pathname: string, search: string): boolean {
  const p = pathname.replace(/\/+$/, '');
  return (p === '' || p === '/') && search === '';
}

/**
 * Validate that `url` is a well-formed http(s) URL pointing at a hostname the
 * given provider expects, and (for review providers) that the path looks like
 * a real listing rather than the marketplace homepage.
 *
 * - Hard `error` (blocks save): empty path is allowed; invalid/protocol/domain
 *   is not.
 * - Soft `warning` (save allowed): domain matches but URL looks like a generic
 *   homepage or has no review-link signature. Caller decides whether to block.
 *
 * Free-form providers (website/reservation) skip both layers once the
 * protocol is sane. Returns `{ ok: true }` for empty input — caller surfaces
 * "missing" via its own status badge, not via this helper.
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
    return { ok: false, severity: 'error', reason: 'invalid_url' };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return {
      ok: false,
      severity: 'error',
      reason: 'wrong_protocol',
      hostname: parsed.hostname,
    };
  }

  const allowed = PROVIDER_DOMAINS[provider];
  if (!allowed) return { ok: true, hostname: parsed.hostname };

  const matched = allowed.some((d) => hostnameMatches(parsed.hostname, d));
  if (!matched) {
    return {
      ok: false,
      severity: 'error',
      reason: 'wrong_domain',
      hostname: parsed.hostname,
      expected: allowed,
    };
  }

  // Domain looks right — now look at the path. Anything ambiguous becomes a
  // warning, never an error: owner can dismiss the notice and save anyway.
  const rules = PATH_RULES[provider];
  if (rules) {
    const pathname = parsed.pathname || '/';
    const search = parsed.search || '';

    // Homepage: bare path, or locale-only path with no further segments.
    if (rules.homepageWhenBare && isBarePath(pathname, search)) {
      return {
        ok: false,
        severity: 'warning',
        reason: 'generic_homepage',
        hostname: parsed.hostname,
      };
    }
    if (rules.localeHomepagePaths) {
      for (const prefix of rules.localeHomepagePaths) {
        if (pathname === prefix || pathname === `${prefix}/`) {
          return {
            ok: false,
            severity: 'warning',
            reason: 'generic_homepage',
            hostname: parsed.hostname,
          };
        }
      }
    }

    // Review signature: path or query has at least one expected substring.
    // We check both `pathname + search` and the full URL because Google
    // short links carry the marker on the host (`g.page/r/`).
    if (rules.reviewSignatures && rules.reviewSignatures.length > 0) {
      const haystack = `${parsed.host}${pathname}${search}`.toLowerCase();
      const hasSignature = rules.reviewSignatures.some((sig) =>
        haystack.includes(sig.toLowerCase()),
      );
      if (!hasSignature) {
        return {
          ok: false,
          severity: 'warning',
          reason: 'not_review_link',
          hostname: parsed.hostname,
        };
      }
    }
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
  if (result.reason === 'generic_homepage') {
    return locale === 'tr'
      ? `Bu link ${label} ana sayfası gibi görünüyor — müşteri yorumu yazmak için doğru sayfaya yönlendirilemeyebilir.`
      : `This looks like the ${label} homepage — customers may not reach the right page to leave a review.`;
  }
  if (result.reason === 'not_review_link') {
    return locale === 'tr'
      ? `Bu link ${label}'da bir restoran/listing sayfasına benzemiyor. Yorum bırakılan asıl sayfanın bağlantısını yapıştır.`
      : `This URL doesn't look like a ${label} listing page. Paste the link of the page where customers actually leave reviews.`;
  }
  return locale === 'tr' ? 'URL doğrulanamadı.' : 'URL could not be verified.';
}
