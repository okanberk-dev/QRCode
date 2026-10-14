/**
 * Owner-facing messages for the menu builder's API failures.
 *
 * The menu endpoints answer with raw server text ("Kategoride aktif ürünler
 * var. Önce taşıyın veya silin.", "forbidden_role", "Görsel 5 MB'dan büyük
 * olamaz"…) that is Turkish-only, sometimes a machine token, and never meant
 * for display. Every error the builder shows goes through `mapMenuApiError`:
 * known failures map to a short sentence in the owner's language, anything
 * else becomes a generic retry hint. **Raw server text and raw codes are
 * never returned.**
 *
 * Pure and dependency-free so it can run in the client bundle and in tests.
 */

export type MenuApiErrorInput =
  | {
      status?: number | null;
      code?: string | null;
      error?: string | null;
      name?: string | null;
      message?: string | null;
    }
  | Error
  | null
  | undefined;

type Copy = { tr: string; en: string };

const KNOWN: Record<string, Copy> = {
  forbidden_role: {
    tr: 'Bu işlem için yetkin yok (yalnızca görüntüleme).',
    en: "You don't have permission for this (view-only).",
  },
  MENU_MODULE_DISABLED: {
    tr: 'Menü düzenleme bu işletme için kapalı.',
    en: 'Menu editing is turned off for this business.',
  },
  MENU_EMPTY: {
    tr: 'Yayına almak için en az bir ürün ekle.',
    en: 'Add at least one item to publish.',
  },
  CATEGORY_NOT_EMPTY: {
    tr: 'Bu kategoride ürün var. Kategoriyi ürünleriyle birlikte silebilir ya da önce ürünleri başka kategoriye taşıyabilirsin.',
    en: 'This category has items. Delete it together with its items, or move the items to another category first.',
  },
  IMAGE_TOO_LARGE: {
    tr: 'Fotoğraf çok büyük. Daha küçük bir fotoğraf dene.',
    en: 'The photo is too large. Try a smaller one.',
  },
  IMAGE_UNPROCESSABLE: {
    tr: 'Bu fotoğraf işlenemedi. Başka bir fotoğraf dene.',
    en: "This photo couldn't be processed. Try another.",
  },
};

const RATE_LIMITED: Copy = {
  tr: 'Çok fazla istek. Birazdan tekrar dene.',
  en: 'Too many requests. Try again shortly.',
};

const NETWORK: Copy = {
  tr: 'Bağlantı sorunu. Tekrar dene.',
  en: 'Connection problem. Try again.',
};

const GENERIC: Copy = {
  tr: 'Bir şey ters gitti. Tekrar dene.',
  en: 'Something went wrong. Try again.',
};

// Browser wording for a request that never completed (Chrome / Safari /
// Firefox). English only on purpose: matching Turkish words here would also
// catch unrelated server sentences.
const NETWORK_MESSAGE = /network|failed to fetch|fetch failed|load failed/i;

function pick(copy: Copy, isTr: boolean): string {
  return isTr ? copy.tr : copy.en;
}

function lookup(token: unknown): Copy | null {
  if (typeof token !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(KNOWN, token) ? KNOWN[token] : null;
}

function isNetworkFailure(input: NonNullable<MenuApiErrorInput>): boolean {
  if (input instanceof Error) {
    // `fetch()` rejects with a TypeError when the request never completed.
    return input.name === 'TypeError' || NETWORK_MESSAGE.test(input.message);
  }
  if (input.status === 0) return true;
  if (input.name === 'TypeError') return true;
  // A response object (has a status) is a server answer, not a network error —
  // only fall back to the message sniffing when there is no status at all.
  if (typeof input.status !== 'number' && typeof input.message === 'string') {
    return NETWORK_MESSAGE.test(input.message);
  }
  return false;
}

/**
 * Map a menu API failure to an owner-facing sentence.
 *
 * Accepts the parsed error body plus the HTTP status
 * (`{ status, code, error }`), a thrown `Error` (a rejected `fetch` is a
 * `TypeError`), or nothing at all.
 *
 * Resolution order: explicit `code` → the `error` field when it is itself a
 * known token (`forbidden_role` arrives as `{ error: 'forbidden_role' }`) →
 * HTTP status (429, 413) → network failure → generic message.
 */
export function mapMenuApiError(input: MenuApiErrorInput, isTr: boolean): string {
  if (input === null || input === undefined) return pick(GENERIC, isTr);

  if (input instanceof Error) {
    // `throw new Error(data.error)` loses the status/code — still resolve a
    // message that is exactly one of the known tokens.
    const byMessage = lookup(input.message);
    if (byMessage) return pick(byMessage, isTr);
  } else {
    const byCode = lookup(input.code);
    if (byCode) return pick(byCode, isTr);

    const byErrorToken = lookup(input.error);
    if (byErrorToken) return pick(byErrorToken, isTr);

    if (input.status === 429) return pick(RATE_LIMITED, isTr);
    // The only 413 the menu endpoints (or the platform in front of them) send
    // is an oversized upload.
    if (input.status === 413) return pick(KNOWN.IMAGE_TOO_LARGE, isTr);
  }

  if (isNetworkFailure(input)) return pick(NETWORK, isTr);

  return pick(GENERIC, isTr);
}
