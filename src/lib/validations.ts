export function isValidRating(rating: unknown): boolean {
  if (typeof rating === 'string') {
    rating = parseInt(rating, 10);
  }
  return typeof rating === 'number' && rating >= 1 && rating <= 5;
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true; // Optional field
  // Simple validation: Allow +, space, -, and digits. Should have at least 10 digits
  const cleaned = phone.replace(/[\s+-]/g, '');
  return /^\d{10,14}$/.test(cleaned);
}

export function sanitizeText(text: string | null | undefined, maxLength = 1000): string | null {
  if (!text) return null;
  return text.trim().substring(0, maxLength);
}

/**
 * Validate a table / location identifier used in QR URLs.
 * Rules: 1-20 chars, alphanumeric + `-_` only. Empty/null is allowed (general QR).
 */
export function isValidTableIdentifier(value: unknown): value is string {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string') return false;
  if (value.length > 20) return false;
  return /^[A-Za-z0-9_-]+$/.test(value);
}

/**
 * Validate a hex color (#RGB or #RRGGBB).
 */
export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/**
 * Minimal password strength check used for staff / admin accounts.
 * Requires 8+ chars plus at least one letter and one digit.
 */
export function isStrongPassword(password: unknown): password is string {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

// ─── Announcements ──────────────────────────────────────────────────────────

export const ANNOUNCEMENT_STATUSES = ['draft', 'published'] as const;
export const ANNOUNCEMENT_SEVERITIES = ['info', 'success', 'warning', 'critical'] as const;
export const ANNOUNCEMENT_LOCALES = ['tr', 'en', 'all'] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];
export type AnnouncementLocale = (typeof ANNOUNCEMENT_LOCALES)[number];

export interface AnnouncementInput {
  title: string;
  message: string;
  status: AnnouncementStatus;
  severity: AnnouncementSeverity;
  locale: AnnouncementLocale;
  priority: number;
  startDate: Date | null;
  endDate: Date | null;
  ctaText: string | null;
  ctaLink: string | null;
  isDismissible: boolean;
}

function parseDate(value: unknown): Date | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' && !(value instanceof Date)) return 'invalid';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'invalid';
  return d;
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateAnnouncement(body: unknown): { ok: true; data: AnnouncementInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Geçersiz istek gövdesi' };
  const b = body as Record<string, unknown>;

  const title = sanitizeText(typeof b.title === 'string' ? b.title : null, 160);
  if (!title) return { ok: false, error: 'Başlık zorunludur' };

  const message = sanitizeText(typeof b.message === 'string' ? b.message : null, 2000);
  if (!message) return { ok: false, error: 'Mesaj zorunludur' };

  const status = typeof b.status === 'string' ? b.status : 'draft';
  if (!ANNOUNCEMENT_STATUSES.includes(status as AnnouncementStatus)) {
    return { ok: false, error: 'Geçersiz durum' };
  }

  const severity = typeof b.severity === 'string' ? b.severity : 'info';
  if (!ANNOUNCEMENT_SEVERITIES.includes(severity as AnnouncementSeverity)) {
    return { ok: false, error: 'Geçersiz önem derecesi' };
  }

  const locale = typeof b.locale === 'string' ? b.locale : 'all';
  if (!ANNOUNCEMENT_LOCALES.includes(locale as AnnouncementLocale)) {
    return { ok: false, error: 'Geçersiz dil' };
  }

  const priorityRaw = typeof b.priority === 'string' ? parseInt(b.priority, 10) : b.priority;
  const priority = typeof priorityRaw === 'number' && Number.isFinite(priorityRaw) ? Math.trunc(priorityRaw) : 0;

  const startDate = parseDate(b.startDate);
  if (startDate === 'invalid') return { ok: false, error: 'Geçersiz başlangıç tarihi' };
  const endDate = parseDate(b.endDate);
  if (endDate === 'invalid') return { ok: false, error: 'Geçersiz bitiş tarihi' };
  if (startDate && endDate && endDate <= startDate) {
    return { ok: false, error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' };
  }

  const ctaText = sanitizeText(typeof b.ctaText === 'string' ? b.ctaText : null, 60);
  const ctaLinkRaw = sanitizeText(typeof b.ctaLink === 'string' ? b.ctaLink : null, 500);
  if (ctaLinkRaw && !isValidUrl(ctaLinkRaw)) {
    return { ok: false, error: 'CTA bağlantısı geçersiz (http/https olmalı)' };
  }
  if (ctaText && !ctaLinkRaw) {
    return { ok: false, error: 'CTA metni için bir bağlantı gereklidir' };
  }

  const isDismissible = typeof b.isDismissible === 'boolean' ? b.isDismissible : true;

  return {
    ok: true,
    data: {
      title,
      message,
      status: status as AnnouncementStatus,
      severity: severity as AnnouncementSeverity,
      locale: locale as AnnouncementLocale,
      priority,
      startDate,
      endDate,
      ctaText,
      ctaLink: ctaLinkRaw,
      isDismissible,
    },
  };
}

// ─── Menu ───────────────────────────────────────────────────────────────────

export const MENU_THEMES = ['classic', 'modern', 'elegant', 'gastronomy'] as const;
export type MenuTheme = (typeof MENU_THEMES)[number];
export function isValidMenuTheme(v: unknown): v is MenuTheme {
  return typeof v === 'string' && (MENU_THEMES as readonly string[]).includes(v);
}

export const MENU_BADGES = ['populer', 'yeni', 'vegan', 'vegetaryen', 'aci', 'sef_onerisi', 'glutensiz'] as const;
export type MenuBadge = (typeof MENU_BADGES)[number];

export interface MenuCategoryInput {
  name: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  badges: MenuBadge[];
  isAvailable: boolean;
  isOutOfStock: boolean;
  sortOrder: number;
}

export function validateMenuCategory(body: unknown, opts: { partial?: boolean } = {}): { ok: true; data: Partial<MenuCategoryInput> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Geçersiz istek gövdesi' };
  const b = body as Record<string, unknown>;
  const out: Partial<MenuCategoryInput> = {};

  if ('name' in b || !opts.partial) {
    const name = sanitizeText(typeof b.name === 'string' ? b.name : null, 80);
    if (!name) return { ok: false, error: 'Kategori adı zorunludur' };
    out.name = name;
  }
  if ('description' in b) {
    out.description = sanitizeText(typeof b.description === 'string' ? b.description : null, 300);
  }
  if ('sortOrder' in b) {
    const n = typeof b.sortOrder === 'number' ? b.sortOrder : Number(b.sortOrder);
    if (!Number.isFinite(n)) return { ok: false, error: 'Sıralama sayı olmalıdır' };
    out.sortOrder = Math.trunc(n);
  }
  if ('isVisible' in b) {
    out.isVisible = Boolean(b.isVisible);
  }

  return { ok: true, data: out };
}

export function validateMenuItem(body: unknown, opts: { partial?: boolean } = {}): { ok: true; data: Partial<MenuItemInput> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Geçersiz istek gövdesi' };
  const b = body as Record<string, unknown>;
  const out: Partial<MenuItemInput> = {};

  if ('categoryId' in b || !opts.partial) {
    const categoryId = typeof b.categoryId === 'string' ? b.categoryId.trim() : '';
    if (!categoryId) return { ok: false, error: 'Kategori zorunludur' };
    out.categoryId = categoryId;
  }
  if ('name' in b || !opts.partial) {
    const name = sanitizeText(typeof b.name === 'string' ? b.name : null, 120);
    if (!name) return { ok: false, error: 'Ürün adı zorunludur' };
    out.name = name;
  }
  if ('description' in b) {
    out.description = sanitizeText(typeof b.description === 'string' ? b.description : null, 500);
  }
  if ('priceCents' in b || !opts.partial) {
    const raw = typeof b.priceCents === 'string' ? Number(b.priceCents) : b.priceCents;
    const n = typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
      return { ok: false, error: 'Geçersiz fiyat' };
    }
    out.priceCents = Math.trunc(n);
  }
  if ('currency' in b) {
    const c = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : 'TRY';
    if (!/^[A-Z]{3}$/.test(c)) return { ok: false, error: 'Geçersiz para birimi' };
    out.currency = c;
  }
  if ('imageUrl' in b) {
    // Images are stored either as an http(s) URL or as an inline base64
    // data URL (produced by the upload endpoint). Max length ~300KB keeps
    // base64 headroom for ~220KB binary images (≈1200px WebP@80).
    const raw = typeof b.imageUrl === 'string' ? b.imageUrl.trim() : null;
    if (!raw) {
      out.imageUrl = null;
    } else {
      const isDataUrl = raw.startsWith('data:image/');
      const maxLen = isDataUrl ? 300_000 : 1000;
      if (raw.length > maxLen) return { ok: false, error: 'Görsel çok büyük' };
      if (!isDataUrl && !isValidUrl(raw)) return { ok: false, error: 'Görsel bağlantısı geçersiz' };
      out.imageUrl = raw;
    }
  }
  if ('badges' in b) {
    if (!Array.isArray(b.badges)) return { ok: false, error: 'Etiketler liste olmalı' };
    const filtered = (b.badges as unknown[]).filter(
      (x): x is MenuBadge => typeof x === 'string' && (MENU_BADGES as readonly string[]).includes(x),
    );
    out.badges = Array.from(new Set(filtered));
  }
  if ('isAvailable' in b) out.isAvailable = Boolean(b.isAvailable);
  if ('isOutOfStock' in b) out.isOutOfStock = Boolean(b.isOutOfStock);
  if ('sortOrder' in b) {
    const n = typeof b.sortOrder === 'number' ? b.sortOrder : Number(b.sortOrder);
    if (!Number.isFinite(n)) return { ok: false, error: 'Sıralama sayı olmalıdır' };
    out.sortOrder = Math.trunc(n);
  }

  return { ok: true, data: out };
}

export interface ReorderEntry {
  id: string;
  sortOrder: number;
}

export function validateReorder(body: unknown): { ok: true; categories: ReorderEntry[]; items: ReorderEntry[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Geçersiz istek gövdesi' };
  const b = body as Record<string, unknown>;
  const parse = (arr: unknown, label: string): ReorderEntry[] | string => {
    if (arr === undefined) return [];
    if (!Array.isArray(arr)) return `${label} liste olmalı`;
    const out: ReorderEntry[] = [];
    for (const entry of arr) {
      if (!entry || typeof entry !== 'object') return `Geçersiz ${label} girişi`;
      const e = entry as Record<string, unknown>;
      const id = typeof e.id === 'string' ? e.id.trim() : '';
      const so = typeof e.sortOrder === 'number' ? e.sortOrder : Number(e.sortOrder);
      if (!id || !Number.isFinite(so)) return `Geçersiz ${label} girişi`;
      out.push({ id, sortOrder: Math.trunc(so) });
    }
    return out;
  };
  const categories = parse(b.categories, 'kategori');
  if (typeof categories === 'string') return { ok: false, error: categories };
  const items = parse(b.items, 'ürün');
  if (typeof items === 'string') return { ok: false, error: items };
  return { ok: true, categories, items };
}
