/**
 * Per-business settings for Google review replies (CLAUDE.md §54). Stored in
 * `restaurants.google_reply_settings` (JSONB, NULL = defaults). Always read
 * with `readGoogleReplySettings` (never throws, drops unknown values) and
 * written only through the reply-settings route's zod schema (kept there so
 * this module stays free of zod for client bundles).
 */
export const REPLY_TONES = ['warm', 'formal'] as const;
export const REPLY_LENGTHS = ['short', 'medium', 'long'] as const;
export const REPLY_ADDRESS_FORMS = ['siz', 'sen'] as const;

export type ReplyTone = (typeof REPLY_TONES)[number];
export type ReplyLength = (typeof REPLY_LENGTHS)[number];
export type ReplyAddressForm = (typeof REPLY_ADDRESS_FORMS)[number];

export interface GoogleReplySettings {
  tone: ReplyTone;
  length: ReplyLength;
  /** Turkish replies only: "siz" (formal) or "sen" (informal). */
  addressForm: ReplyAddressForm;
  /** Greet the customer by first name when Google shows one. */
  useName: boolean;
  /** Closing line, e.g. "L'Affogato ekibi". Empty = none. */
  signature: string;
  /** Words or phrases a reply may never contain (checked case-insensitively). */
  bannedPhrases: string[];
}

export const DEFAULT_GOOGLE_REPLY_SETTINGS: GoogleReplySettings = {
  tone: 'warm',
  length: 'medium',
  addressForm: 'siz',
  useName: true,
  signature: '',
  bannedPhrases: [],
};

export const MAX_BANNED_PHRASES = 20;
export const MAX_SIGNATURE_LENGTH = 60;
export const MAX_BANNED_PHRASE_LENGTH = 60;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Normalizes stored JSON (or anything) into settings. Never throws. */
export function readGoogleReplySettings(value: unknown): GoogleReplySettings {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const d = DEFAULT_GOOGLE_REPLY_SETTINGS;
  const signature =
    typeof raw.signature === 'string'
      ? raw.signature.replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_SIGNATURE_LENGTH)
      : d.signature;
  return {
    tone: pick(raw.tone, REPLY_TONES, d.tone),
    length: pick(raw.length, REPLY_LENGTHS, d.length),
    addressForm: pick(raw.addressForm, REPLY_ADDRESS_FORMS, d.addressForm),
    useName: typeof raw.useName === 'boolean' ? raw.useName : d.useName,
    signature,
    bannedPhrases: normalizeBannedPhrases(Array.isArray(raw.bannedPhrases) ? raw.bannedPhrases : []),
  };
}

export function normalizeBannedPhrases(list: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const value = item.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, MAX_BANNED_PHRASE_LENGTH);
    const key = value.toLocaleLowerCase('tr-TR');
    if (value.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_BANNED_PHRASES) break;
  }
  return out;
}

/** Banned phrases found in a reply (case- and Turkish-İ-insensitive). */
export function findBannedPhrases(text: string, phrases: string[]): string[] {
  if (!text || phrases.length === 0) return [];
  const hay = text.toLocaleLowerCase('tr-TR');
  return phrases.filter((p) => p && hay.includes(p.toLocaleLowerCase('tr-TR')));
}
