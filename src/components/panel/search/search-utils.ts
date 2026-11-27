/**
 * Pure helpers shared by the owner and admin search palettes: accent- and
 * case-insensitive matching (Turkish aware) with the matched range mapped
 * back to the original text, comment snippets, short dates and the
 * "recently opened" list kept in localStorage.
 *
 * No React here, so the helpers can be unit tested on their own.
 */

import { resolveDisplayTimeZone } from '@/lib/timezone';

export type SearchLocale = 'tr' | 'en';

// ── Matching ───────────────────────────────────────────────────────────────

/**
 * Folds one character for matching: Turkish lower case, accents removed,
 * dotless ı treated as i (so "isletme" finds "İşletme" and "ığdır" finds
 * "Iğdır").
 */
function foldChar(ch: string): string {
  return ch
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');
}

/** Folded text plus, for every folded char, the index of its source char. */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const f = foldChar(text[i]);
    for (let k = 0; k < f.length; k += 1) {
      folded += f[k];
      map.push(i);
    }
  }
  return { folded, map };
}

export function foldForSearch(text: string): string {
  return foldWithMap(text).folded;
}

function foldQuery(query: string): string {
  return foldForSearch(query.trim().replace(/\s+/g, ' '));
}

/** `[start, end)` of the first match in the original text, or null. */
export function findMatch(text: string, query: string): [number, number] | null {
  const q = foldQuery(query);
  if (!q || !text) return null;
  const { folded, map } = foldWithMap(text);
  const at = folded.indexOf(q);
  if (at < 0) return null;
  return [map[at], map[at + q.length - 1] + 1];
}

/** True when any of the fields contains the query (empty query matches). */
export function matchesQuery(fields: ReadonlyArray<string | null | undefined>, query: string): boolean {
  const q = foldQuery(query);
  if (!q) return true;
  return fields.some((field) => !!field && foldForSearch(field).includes(q));
}

/**
 * One-line excerpt of a comment that keeps the matched words visible: the
 * start of the text when the match is near it, otherwise a window that opens
 * a little before the match (snapped to a word boundary) with a leading "…".
 */
export function snippetAround(text: string, query: string, max = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const match = findMatch(clean, query);
  if (!match || match[0] < max * 0.45) return `${clean.slice(0, max - 1).trimEnd()}…`;
  let start = Math.max(0, match[0] - 32);
  const space = clean.lastIndexOf(' ', start + 12);
  if (space > start - 12 && space < match[0]) start = space + 1;
  const body = clean.slice(start, start + max - 2).trimEnd();
  const tail = start + max - 2 < clean.length ? '…' : '';
  return `…${body}${tail}`;
}

// ── Display ────────────────────────────────────────────────────────────────

/** Short relative date for result rows: "az önce", "3 sa önce", "12 Kas". */
export function formatPaletteDate(value: string | number, locale: SearchLocale, nowMs: number): string {
  const ts = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ts)) return '';
  const isTr = locale === 'tr';
  const mins = Math.floor((nowMs - ts) / 60000);
  if (mins < 1) return isTr ? 'az önce' : 'just now';
  if (mins < 60) return isTr ? `${mins} dk önce` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isTr ? `${hours} sa önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return isTr ? `${days} gün önce` : `${days}d ago`;
  const timeZone = resolveDisplayTimeZone();
  const sameYear =
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(ts) ===
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(nowMs);
  return new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone,
  }).format(ts);
}

export function initialOf(name: string | null | undefined): string {
  const first = (name ?? '').trim().charAt(0);
  return first ? first.toLocaleUpperCase('tr-TR') : '·';
}

const HEX = /^#[0-9a-f]{6}$/i;
/** The old Buaze default brand colour; a business that kept it chose nothing. */
const LEGACY_DEFAULT_BRAND = '#C6F24E';

/** A business colour worth showing on its avatar, or null for the neutral avatar. */
export function businessAvatarColor(color: string | null | undefined): string | null {
  if (!color || !HEX.test(color)) return null;
  if (color.toUpperCase() === LEGACY_DEFAULT_BRAND) return null;
  return color;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or ink, whichever reads better on the given background. */
export function readableOn(hex: string): '#FFFFFF' | '#111110' {
  const bg = luminance(hex);
  const onWhite = 1.05 / (bg + 0.05);
  const onInk = (bg + 0.05) / (luminance('#111110') + 0.05);
  return onWhite >= onInk ? '#FFFFFF' : '#111110';
}

// ── Recently opened ────────────────────────────────────────────────────────

export const OWNER_RECENT_KEY = 'buaze:palette:recent:owner';
export const ADMIN_RECENT_KEY = 'buaze:palette:recent:admin';
export const RECENT_LIMIT = 5;

/**
 * One palette pick. Only panel pages and businesses are kept: never review
 * text, customer names or contact details.
 */
export interface RecentEntry {
  href: string;
  label: string;
  kind: 'page' | 'business';
  /** Business category; empty for pages. */
  sub?: string;
  at: number;
}

/** True for an in-panel path under `prefix` (e.g. `/tr/dashboard`, `/admin`). */
export function isPanelHref(href: string, prefix: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\') || href.includes('://')) return false;
  if (/\/\.\.?(\/|\?|$)/.test(href)) return false;
  return href === prefix || href.startsWith(`${prefix}/`) || href.startsWith(`${prefix}?`);
}

function sanitize(raw: unknown, prefix: string): RecentEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.href !== 'string' || r.href.length > 300 || !isPanelHref(r.href, prefix)) return null;
  if (typeof r.label !== 'string' || !r.label.trim() || r.label.length > 80) return null;
  if (r.kind !== 'page' && r.kind !== 'business') return null;
  const sub = typeof r.sub === 'string' && r.sub.length <= 80 ? r.sub : undefined;
  const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0;
  return { href: r.href, label: r.label.trim(), kind: r.kind, sub, at };
}

export function readRecent(key: string, prefix: string): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: RecentEntry[] = [];
    for (const item of parsed) {
      const entry = sanitize(item, prefix);
      if (entry && !out.some((e) => e.href === entry.href)) out.push(entry);
      if (out.length >= RECENT_LIMIT) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Puts the entry first (deduplicated by href) and returns the new list. */
export function rememberRecent(key: string, prefix: string, entry: Omit<RecentEntry, 'at'>): RecentEntry[] {
  const clean = sanitize({ ...entry, at: Date.now() }, prefix);
  const current = readRecent(key, prefix);
  if (!clean) return current;
  const next = [clean, ...current.filter((e) => e.href !== clean.href)].slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* storage blocked (private mode): the list just is not kept */
  }
  return next;
}

export function clearRecent(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
