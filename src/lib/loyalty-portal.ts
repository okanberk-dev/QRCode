/**
 * The business's customer panel (CLAUDE.md §61): look and content of the
 * /l/<slug> pages the business edits — theme, logo, cover, welcome text,
 * offers / news and which contact blocks show. Pure and client-safe:
 * `readLoyaltyPortal` never throws (bad JSON → defaults), the server writes
 * only through the zod schema in the portal route.
 */

export type PortalTheme = 'light' | 'dark' | 'brand';

export interface PortalOffer {
  id: string;
  title: string;
  body: string;
  /** Small label on the card: "Yeni", "Bu hafta" … */
  badge: string | null;
}

export interface LoyaltyPortal {
  theme: PortalTheme;
  logoUrl: string | null;
  coverUrl: string | null;
  headline: string | null;
  welcome: string | null;
  offers: PortalOffer[];
  showMenu: boolean;
  showContact: boolean;
  showSocial: boolean;
  /** Data controller details for the legal texts (unvan, adres, KVKK e-posta). */
  legalName: string | null;
  legalAddress: string | null;
  legalEmail: string | null;
}

export const PORTAL_LIMITS = {
  headlineMax: 60,
  welcomeMax: 280,
  offersMax: 4,
  offerTitleMax: 50,
  offerBodyMax: 160,
  badgeMax: 16,
  legalNameMax: 160,
  legalAddressMax: 240,
} as const;

export const DEFAULT_PORTAL: LoyaltyPortal = {
  theme: 'light',
  logoUrl: null,
  coverUrl: null,
  headline: null,
  welcome: null,
  offers: [],
  showMenu: true,
  showContact: true,
  showSocial: true,
  legalName: null,
  legalAddress: null,
  legalEmail: null,
};

/**
 * Only images Buaze stored for this purpose (`/files/loyalty/...`), given as
 * a site-relative or absolute https URL. Returns the site-relative path so
 * the page works on any host (local, preview, production).
 */
export function normalizePortalImage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  const m = /^(?:https:\/\/[a-z0-9.-]+(?::\d+)?)?(\/files\/loyalty\/[A-Za-z0-9][A-Za-z0-9_./-]{0,200})$/.exec(v);
  if (!m) return null;
  if (m[1].includes('..') || m[1].includes('//')) return null;
  return m[1];
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return t || null;
}

function multiline(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
  return t || null;
}

export function readLoyaltyPortal(value: unknown): LoyaltyPortal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_PORTAL, offers: [] };
  const v = value as Record<string, unknown>;
  const offers: PortalOffer[] = [];
  if (Array.isArray(v.offers)) {
    for (const raw of v.offers) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const title = text(o.title, PORTAL_LIMITS.offerTitleMax);
      if (!title) continue;
      const id = typeof o.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(o.id) ? o.id : `offer-${offers.length + 1}`;
      offers.push({
        id,
        title,
        body: multiline(o.body, PORTAL_LIMITS.offerBodyMax) ?? '',
        badge: text(o.badge, PORTAL_LIMITS.badgeMax),
      });
      if (offers.length >= PORTAL_LIMITS.offersMax) break;
    }
  }
  return {
    theme: v.theme === 'dark' || v.theme === 'brand' ? v.theme : 'light',
    logoUrl: normalizePortalImage(v.logoUrl),
    coverUrl: normalizePortalImage(v.coverUrl),
    headline: text(v.headline, PORTAL_LIMITS.headlineMax),
    welcome: multiline(v.welcome, PORTAL_LIMITS.welcomeMax),
    offers,
    showMenu: v.showMenu !== false,
    showContact: v.showContact !== false,
    showSocial: v.showSocial !== false,
    legalName: text(v.legalName, PORTAL_LIMITS.legalNameMax),
    legalAddress: text(v.legalAddress, PORTAL_LIMITS.legalAddressMax),
    legalEmail: typeof v.legalEmail === 'string' && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v.legalEmail.trim())
      ? v.legalEmail.trim().toLowerCase()
      : null,
  };
}

// ─── colours ──────────────────────────────────────────────────────────────

// Buaze defaults when the business picked no card colour: Fintora green
// (black text on it) with a black band in the dark theme. A colour the
// business chose always wins (it is the business's data).
const INK = '#111110';
const BUAZE_GREEN = '#78FC90';
const DEEP_BAND = '#111110';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function mix(hex: string, withHex: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(withHex);
  if (!a || !b) return hex;
  const c = a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Black or white, whichever reads better on `hex` (WCAG contrast). */
function readableOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const l = luminance(rgb);
  // contrast(black) = (l + .05) / .05, contrast(white) = 1.05 / (l + .05)
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? INK : '#FFFFFF';
}

export interface PortalPalette {
  /** Page background. */
  bg: string;
  /** Card / section surface. */
  surface: string;
  border: string;
  text: string;
  muted: string;
  /** Buttons and highlights. */
  accent: string;
  /** Text on `accent`. */
  onAccent: string;
  /** Header band behind the logo when there is no cover photo. */
  band: string;
  onBand: string;
}

/** Readable colours for the three themes from the card colour. */
export function portalPalette(theme: PortalTheme, accentColor: string | null | undefined): PortalPalette {
  const accent = accentColor && hexToRgb(accentColor) ? accentColor : null;
  const brand = accent ?? BUAZE_GREEN;
  const brandLight = readableOn(brand) === INK;
  const button = accent ?? BUAZE_GREEN;
  if (theme === 'dark') {
    // Dark brand colours are lifted a little so the button stands out from
    // the near-black page; the text colour follows the button.
    const btn = brandLight ? brand : mix(brand, '#FFFFFF', 0.15);
    const band = accent ?? DEEP_BAND;
    return {
      bg: '#0B0B0C',
      surface: '#161618',
      border: '#2A2A2E',
      text: '#F5F5F5',
      muted: '#A3A3A3',
      accent: btn,
      onAccent: readableOn(btn),
      band,
      onBand: readableOn(band),
    };
  }
  if (theme === 'brand') {
    return {
      bg: mix(brand, '#FFFFFF', 0.9),
      surface: '#FFFFFF',
      border: mix(brand, '#FFFFFF', 0.75),
      text: INK,
      muted: '#525252',
      accent: button,
      onAccent: readableOn(button),
      band: brand,
      onBand: readableOn(brand),
    };
  }
  return {
    bg: '#F6F6F6',
    surface: '#FFFFFF',
    border: '#EBEBEB',
    text: INK,
    muted: '#525252',
    accent: button,
    onAccent: readableOn(button),
    band: brand,
    onBand: readableOn(brand),
  };
}

// ─── names ────────────────────────────────────────────────────────────────

/** "Ayşe" + "Yılmaz" → "Ayşe Yılmaz" (either part may be empty). */
export function joinName(first: string | null | undefined, last: string | null | undefined): string | null {
  const v = [first?.trim(), last?.trim()].filter(Boolean).join(' ');
  return v || null;
}

/** "Ayşe Nur Yılmaz" → first "Ayşe Nur", last "Yılmaz" (last word is the surname). */
export function splitName(full: string | null | undefined): { firstName: string | null; lastName: string | null } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/** Instagram / web links the business saved, only http(s). */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** tel: link from a stored phone ("0216 123 45 67" → "tel:+902161234567"). */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, '');
  if (!d) return null;
  if (d.startsWith('0') && d.length === 11) d = `+90${d.slice(1)}`;
  return `tel:${d}`;
}
