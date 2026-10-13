/**
 * Owner-safe copy for everything Google-related (pure, no imports).
 *
 * The owner panel must never render `data.error` / `data.message` from a
 * Google route verbatim: server strings can carry developer vocabulary
 * (quotas, API names, env var names) and, in the worst case, text that came
 * from Google. Instead the UI maps a machine key — a failure `code`, a
 * `warning`, a `?google=` flash status — through `ownerGoogleMessage`.
 *
 * Rules every string here follows (and `tests/google-owner-copy.test.ts`
 * enforces): Turkish primary with English parity, direct "dene / seç" voice
 * (CLAUDE.md §11), no emoji, and none of: quota/kota, API, OAuth, env,
 * Vercel, Cloud Console, GOOGLE_*, "sunucu". "bağla" (connect) is reserved
 * for the Google *account* sign-in; Places profile wording is "bul / seç".
 *
 * Unknown keys return the generic message — never the key itself and never
 * a raw reason echoed from a callback URL.
 */

export type OwnerGoogleLocale = 'tr' | 'en';
export type OwnerGoogleTone = 'success' | 'info' | 'warn' | 'danger';

interface Copy {
  tr: string;
  en: string;
}

export const OWNER_GOOGLE_GENERIC: Copy = {
  tr: 'Bir sorun oluştu. Biraz sonra tekrar dene.',
  en: 'Something went wrong. Please try again shortly.',
};

/** Shared by several keys. */
const NOT_PROVISIONED: Copy = {
  tr: 'Google, yorum yanıtlama erişimini Buaze için henüz açmadı. Hesabın doğru bağlı; Google erişimi açtığında konumların burada listelenecek. Profil analizin bundan etkilenmez.',
  en: "Google hasn't enabled review replies for Buaze yet. Your account is connected correctly; your locations will be listed here once Google turns access on. Your profile check isn't affected.",
};
const BUSY: Copy = {
  tr: 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.',
  en: 'Google is busy right now. Please try again in a few minutes.',
};
const SIGN_IN_UNAVAILABLE: Copy = {
  tr: 'Google hesabı bağlama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
  en: "Connecting a Google account isn't available right now. Please try again later.",
};
const SEARCH_UNAVAILABLE: Copy = {
  tr: 'Google araması şu an kullanılamıyor. Linkini elle ekleyebilirsin.',
  en: "Google search isn't available right now. You can add the link manually.",
};
const CONNECT_FAILED: Copy = {
  tr: 'Google hesabı bağlanamadı. Biraz sonra tekrar dene.',
  en: "We couldn't connect your Google account. Please try again shortly.",
};
const TOO_MANY: Copy = {
  tr: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
  en: 'Too many attempts. Wait a moment and try again.',
};

/**
 * Failure codes, warnings, Places codes, profile states and the reply
 * section's status rows. Keys are case-sensitive.
 */
const MESSAGES: Record<string, Copy> = {
  // — Business Profile failure codes (GoogleBusinessFailureCode) —
  GOOGLE_REAUTH_REQUIRED: {
    tr: 'Google bağlantının süresi doldu. Google hesabını yeniden bağla.',
    en: 'Your Google connection has expired. Connect your Google account again.',
  },
  GOOGLE_RATE_LIMITED: BUSY,
  GOOGLE_API_NOT_PROVISIONED: NOT_PROVISIONED,
  GOOGLE_SERVER_ERROR: {
    tr: 'Google geçici bir sorun yaşıyor. Biraz sonra tekrar dene.',
    en: 'Google is having a temporary problem. Please try again shortly.',
  },
  GOOGLE_NETWORK_ERROR: {
    tr: "Google'a şu an ulaşılamadı. Biraz sonra tekrar dene.",
    en: "Couldn't reach Google right now. Please try again shortly.",
  },
  GOOGLE_API_ERROR: {
    tr: "Google'dan beklenmeyen bir yanıt geldi. Biraz sonra tekrar dene.",
    en: 'Google sent an unexpected response. Please try again shortly.',
  },
  GOOGLE_NOT_CONFIGURED: SIGN_IN_UNAVAILABLE,
  missing_google_client_id: SIGN_IN_UNAVAILABLE,

  // — warnings / route codes of the reply section —
  CLIENT_THROTTLED: {
    tr: 'Çok sık yenilendi. Birkaç saniye sonra tekrar dene.',
    en: 'Refreshed too often. Please try again in a few seconds.',
  },
  GOOGLE_CLIENT_THROTTLED: {
    tr: 'Çok sık yenilendi. Birkaç saniye sonra tekrar dene.',
    en: 'Refreshed too often. Please try again in a few seconds.',
  },
  GOOGLE_NOT_CONNECTED: {
    tr: 'Google hesabı bağlı değil.',
    en: 'No Google account is connected.',
  },
  GOOGLE_LOCATION_NOT_SELECTED: {
    tr: 'Bu işletme için bir Google konumu seçilmemiş.',
    en: 'No Google location is selected for this business.',
  },
  GOOGLE_REVIEW_MANAGEMENT_DISABLED: {
    tr: 'Yanıt özelliği bu işletmenin paketinde kapalı.',
    en: "Replying isn't included in this business's plan.",
  },
  CONTENT_BLOCKED: {
    tr: 'Bu yanıt gönderilemedi: tehdit, hakaret veya benzeri riskli bir ifade içeriyor olabilir.',
    en: 'This reply could not be sent: it may contain a threat, harassment, or similarly risky content.',
  },
  PULSE_AI_DISABLED: {
    tr: 'Pulse AI bu işletme için kapalı.',
    en: 'Pulse AI is turned off for this business.',
  },

  // — Places search / select —
  GOOGLE_PLACES_NOT_CONFIGURED: SEARCH_UNAVAILABLE,
  GOOGLE_PLACES_BUSY: SEARCH_UNAVAILABLE,
  DAILY_LIMIT: {
    tr: 'Bugün çok fazla arama yaptın. Yarın tekrar dene ya da linki elle ekle.',
    en: "You've searched too much today. Try again tomorrow or add the link manually.",
  },
  places_search_failed: {
    tr: 'Google araması şu an yanıt vermedi. Biraz sonra tekrar dene.',
    en: "Google search didn't respond. Please try again shortly.",
  },
  PLACE_NOT_FOUND: {
    tr: "Bu kayıt Google'da bulunamadı. Listeden başka bir sonuç seç ya da yeniden ara.",
    en: "This listing wasn't found on Google. Pick another result or search again.",
  },
  GOOGLE_UNAVAILABLE: {
    tr: 'Google şu an doğrulayamadı. Tekrar dene.',
    en: "Google couldn't verify this right now. Please try again.",
  },

  // — Places profile states —
  profile_not_found: {
    tr: 'Seçili Google kaydı artık bulunamıyor. İşletmeni yeniden ara.',
    en: 'The selected Google listing can no longer be found. Search for your business again.',
  },
  profile_unavailable: {
    tr: 'Google bilgileri şu an kullanılamıyor.',
    en: "Google details aren't available right now.",
  },
  profile_upstream: {
    tr: 'Google bilgileri alınamadı. Biraz sonra tekrar dene.',
    en: "Couldn't load Google details. Please try again shortly.",
  },
  profile_limit_restaurant: {
    tr: "Bugünlük Google yenileme hakkın doldu. Yarın tekrar dene; profilini Google'da açabilirsin.",
    en: "You've used today's Google refreshes. Try again tomorrow; you can still open your profile on Google.",
  },
  profile_limit_global: {
    tr: 'Google bilgileri şu an alınamıyor. Daha sonra tekrar dene.',
    en: "Google details can't be loaded right now. Please try again later.",
  },

  // — Reply section status rows —
  reply_badge_unavailable: { tr: 'Henüz açık değil', en: 'Not available yet' },
  reply_unavailable: {
    tr: 'Google, yorum yanıtlama erişimini Buaze için henüz açmadı. Erişim açıldığında bu bölümden Google hesabını bağlayabileceksin; profil analizin bundan etkilenmez.',
    en: "Google hasn't enabled review replies for Buaze yet. Once it does, you'll be able to connect your Google account from this section; your profile check isn't affected.",
  },
  reply_plan_off: {
    tr: 'Yanıt özelliği bu işletmenin paketinde kapalı.',
    en: "Replying isn't included in this business's plan.",
  },
  reply_plan_off_cta: { tr: 'Açtırmak için yaz', en: 'Ask to enable' },
  reply_feature_off: {
    tr: 'Bu özellik şu an kullanılamıyor.',
    en: "This feature isn't available right now.",
  },
  reply_connect_hint: {
    tr: 'Google ile güvenli giriş yapacaksın; bu sayfaya geri döneceksin.',
    en: "You'll sign in securely with Google and come back to this page.",
  },
  reply_connected_not_provisioned: NOT_PROVISIONED,
  reply_busy: {
    tr: 'Google şu an yoğun. Birkaç dakika sonra “Yenile”yi dene.',
    en: 'Google is busy right now. Try “Refresh” in a few minutes.',
  },

  // — generic route codes —
  RATE_LIMITED: TOO_MANY,
  TOO_MANY_REQUESTS: TOO_MANY,
  UNAUTHORIZED: {
    tr: 'Oturumun sona ermiş. Tekrar giriş yap.',
    en: 'Your session has ended. Please sign in again.',
  },
  FORBIDDEN: {
    tr: 'Bu işlem için yetkin yok.',
    en: "You don't have permission to do this.",
  },
  validation_error: OWNER_GOOGLE_GENERIC,
  INTERNAL_SERVER_ERROR: OWNER_GOOGLE_GENERIC,
};

interface FlashEntry extends Copy {
  kind: OwnerGoogleTone;
}

/** `?google=<status>` values written by `/api/integrations/google/callback`. */
const FLASH: Record<string, FlashEntry> = {
  connected: {
    kind: 'success',
    tr: 'Google hesabın bağlandı.',
    en: 'Your Google account is connected.',
  },
  cancelled: {
    kind: 'info',
    tr: 'Google hesabı bağlama iptal edildi.',
    en: 'Connecting your Google account was cancelled.',
  },
  'state-mismatch': {
    kind: 'danger',
    tr: 'Bağlantı oturumu doğrulanamadı. Sayfayı yenileyip tekrar dene.',
    en: "We couldn't verify the connection session. Refresh the page and try again.",
  },
  'state-invalid': {
    kind: 'danger',
    tr: 'Bağlantı oturumu geçersiz. Sayfayı yenileyip tekrar dene.',
    en: "The connection session isn't valid. Refresh the page and try again.",
  },
  'state-missing': {
    kind: 'danger',
    tr: 'Bağlantı oturumu bulunamadı. Tekrar dene.',
    en: "The connection session wasn't found. Please try again.",
  },
  'state-expired': {
    kind: 'warn',
    tr: 'Bağlantı oturumunun süresi doldu. Tekrar dene.',
    en: 'The connection session expired. Please try again.',
  },
  'state-actor-mismatch': {
    kind: 'danger',
    tr: 'Farklı bir oturum algılandı. Çıkış yapıp tekrar giriş yap, sonra yeniden dene.',
    en: 'A different session was detected. Sign out, sign back in and try again.',
  },
  'token-error': { kind: 'danger', ...CONNECT_FAILED },
  'token-missing': {
    kind: 'danger',
    tr: 'Google hesabı bağlanamadı. Tekrar dene.',
    en: "We couldn't connect your Google account. Please try again.",
  },
  'missing-config': { kind: 'danger', ...SIGN_IN_UNAVAILABLE },
  unauthorized: {
    kind: 'warn',
    tr: 'Oturum açıp tekrar dene.',
    en: 'Sign in and try again.',
  },
};

const ACCESS_DENIED: FlashEntry = {
  kind: 'warn',
  tr: "Google'da izin vermedin. İstersen tekrar deneyebilirsin.",
  en: "You didn't allow access on Google. You can try again.",
};

function pick(copy: Copy, locale: OwnerGoogleLocale): string {
  return locale === 'en' ? copy.en : copy.tr;
}

/**
 * Owner-safe message for a machine key (failure code, warning, flash status,
 * profile/reply key). Unknown keys — including every `error:<reason>` other
 * than `error:access_denied` — return the generic message.
 */
export function ownerGoogleMessage(key: string | null | undefined, locale: OwnerGoogleLocale = 'tr'): string {
  if (typeof key !== 'string' || !key) return pick(OWNER_GOOGLE_GENERIC, locale);
  // Own-property lookups only: `constructor` / `__proto__` are not keys.
  if (Object.prototype.hasOwnProperty.call(MESSAGES, key)) return pick(MESSAGES[key]!, locale);
  if (Object.prototype.hasOwnProperty.call(FLASH, key)) return pick(FLASH[key]!, locale);
  if (key === 'error:access_denied') return pick(ACCESS_DENIED, locale);
  return pick(OWNER_GOOGLE_GENERIC, locale);
}

/**
 * Message + severity for a `?google=` flash status; `null` when the status is
 * empty. Unknown / `error:<reason>` statuses are a generic danger banner —
 * the raw reason is never echoed.
 */
export function ownerGoogleFlash(
  status: string | null | undefined,
  locale: OwnerGoogleLocale = 'tr',
): { kind: OwnerGoogleTone; message: string } | null {
  if (typeof status !== 'string' || !status) return null;
  if (Object.prototype.hasOwnProperty.call(FLASH, status)) {
    const entry = FLASH[status]!;
    return { kind: entry.kind, message: pick(entry, locale) };
  }
  if (status === 'error:access_denied') {
    return { kind: ACCESS_DENIED.kind, message: pick(ACCESS_DENIED, locale) };
  }
  return { kind: 'danger', message: pick(OWNER_GOOGLE_GENERIC, locale) };
}

/**
 * Map a Google-route JSON body to owner-safe copy. Looks at `warning`, then
 * `code`, then an `error` string that is itself a known machine key
 * (`missing_google_client_id`, `GOOGLE_CLIENT_THROTTLED`). The body's own
 * `message` / free-text `error` are NEVER returned.
 */
export function ownerGoogleMessageForBody(body: unknown, locale: OwnerGoogleLocale = 'tr'): string {
  if (typeof body === 'object' && body !== null) {
    const b = body as { warning?: unknown; code?: unknown; error?: unknown };
    for (const candidate of [b.warning, b.code, b.error]) {
      if (typeof candidate !== 'string') continue;
      if (
        Object.prototype.hasOwnProperty.call(MESSAGES, candidate) &&
        MESSAGES[candidate] !== OWNER_GOOGLE_GENERIC
      ) {
        return pick(MESSAGES[candidate]!, locale);
      }
    }
  }
  return pick(OWNER_GOOGLE_GENERIC, locale);
}

/**
 * Every key the module knows, plus the two `error:` shapes — for the
 * jargon test and for callers that want to check membership.
 */
export const OWNER_GOOGLE_MESSAGE_KEYS: readonly string[] = [
  ...Object.keys(MESSAGES),
  ...Object.keys(FLASH),
  'error:access_denied',
  'error:foo',
];
