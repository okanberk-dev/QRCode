/**
 * Build a Google review-write URL from one of these inputs:
 *   • Raw Place ID (ChIJ…, GhIJ…, Eh…) — wrapped in writereview link
 *   • g.page/r/… short link — used as-is (already a review link)
 *   • search.google.com/local/writereview?placeid=… — used as-is
 *   • maps.app.goo.gl/… short link — used as-is (Google client-side resolves)
 *   • google.com/maps/place/… or maps.google.com/…
 *       → Tries to extract a Place ID via several known URL fragments
 *         ("!1s", "?place_id=", "?cid=", "ftid=", "data=…") and wraps it.
 *         If extraction fails, returns the URL as-is so the customer at
 *         least lands on the business page.
 *
 * Returns `null` for empty / whitespace input so callers can opt out
 * of rendering the Google CTA.
 *
 * Why this exists: prior to 2026-04 the public review page only handled
 * "starts with http → use as-is, else treat as raw Place ID". Owners who
 * pasted a Google Maps map URL ended up sending customers to the map
 * (no "Write a review" prompt), which silently lost reviews.
 */
export function buildGoogleReviewUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Heuristic: anything looking like a URL goes through URL parsing.
  if (/^https?:\/\//i.test(trimmed)) {
    return tryFromUrl(trimmed) ?? trimmed;
  }

  // Looks like a raw Place ID — wrap it in the canonical write-review URL.
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(trimmed)}`;
}

function tryFromUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;
  const search = parsed.search;

  // Already a review-write URL — pass through unchanged.
  if (host === 'g.page' && /^\/r\//i.test(path)) return raw;
  if (host.endsWith('search.google.com') && path.includes('/local/writereview')) return raw;

  // Goo.gl short links resolve client-side; nothing we can do server-side
  // without a HEAD request (and we don't want to add latency / fail on quota).
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return raw;

  // Try to extract a Place ID from common Google Maps URL shapes.
  const placeId = extractPlaceId(path + search);
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  return null;
}

/**
 * Pull a Place ID out of a Maps URL fragment. Tries (in order):
 *   • ?place_id=ChIJ…  or  ?placeid=ChIJ…
 *   • &cid=… (numeric customer-place-id; same canonical writereview slot)
 *   • !1s0x…:… inside the /data=… blob (Maps internal place reference)
 *   • !1sChIJ… inside /data=
 *   • ftid=0x…:… (older share format)
 */
function extractPlaceId(s: string): string | null {
  const patterns = [
    /[?&]place[_-]?id=([A-Za-z0-9_-]{20,})/i,
    /[?&]cid=(\d{6,})/i,
    /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i,
    /!1s(ChIJ[A-Za-z0-9_-]{20,})/i,
    /!1s(GhIJ[A-Za-z0-9_-]{20,})/i,
    /[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}
