// Stage A2 §38.94 — granular RBAC helper.
//
// 2-tier (superadmin/manager) model permission-bazlı genişletildi. Helper:
//   - Superadmin role → her zaman geçer (bypass).
//   - Manager role → AdminPermission tablosunda matching grant arar
//     (resource + action exact match; expiresAt geçmiş ise grant geçersiz).
//
// CLAUDE.md §28.3 + §37.2 disipline: yeni endpoint eklerken
// `await requirePermission(actor.id, 'reviews', 'write')` paterni reuse.
// Helper 403 throw eder — caller try/catch veya bare-throw allow eder
// (Next.js route handler context'inde direct return alternatif).

import { prisma } from '@/lib/prisma';

// Resource enum — DB'de string olarak saklanır (migration drift sıfır).
// Yeni resource eklerken sadece bu array genişletilir; helper otomatik
// type-narrow yapar (literal union).
export const RESOURCES = [
  'reviews',
  'members',
  'users',
  'customers',
  'plans',
  'site_settings',
  'mail_templates',
  'announcements',
  'blog',
  'analytics',
  'audit_logs',
  // Stage A4 §38.96 — admin impersonation flow ("Owner gibi gör"). 'write'
  // action gerekli (start session); 'read' yok — superadmin OR grant'lı
  // manager bu yetkiyle owner panel'ine geçebilir.
  'impersonation',
  // Stage 29 §38.105 — campaign moderation queue. 'read' campaign queue
  // listesi + detail; 'write' approve/reject aksiyonu. Owner submit eder
  // → admin queue → admin onaylayınca Resend pipeline tetiklenir.
  'campaigns',
] as const;

export const ACTIONS = ['read', 'write', 'delete'] as const;

export type AdminResource = (typeof RESOURCES)[number];
export type AdminAction = (typeof ACTIONS)[number];

// Process-local cache: 60sn TTL. Vercel serverless cold start'ta sıfırlanır
// — kabul edilen drift (CLAUDE.md §21.26 mail copy cache paterni reuse).
// Production'da multi-instance drift maksimum 60sn.
//
// Cache key: `${adminUserId}` — tüm permission setini bir defada cache'ler;
// hasPermission lookup O(1) Map+Set fallback. Process-local olduğu için
// Redis migration gelecek scope (CLAUDE.md §15.1 paterni gibi opportunistic).
interface CachedPermissions {
  // resource:action format → expiry timestamp (null = no expiry)
  perms: Map<string, Date | null>;
  cachedAt: number;
  isSuperadmin: boolean;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CachedPermissions>();

export function invalidatePermissionCache(adminUserId: string | unknown): void {
  if (typeof adminUserId === 'string' && adminUserId.length > 0) {
    cache.delete(adminUserId);
  }
}

// Defensive coercion — JWT payload `id` field is typed as `unknown` by jose;
// callsites pass `admin.id` directly. Helper accepts unknown and rejects
// non-string IDs (returns conservative deny).
function toAdminId(adminUserId: string | unknown): string | null {
  return typeof adminUserId === 'string' && adminUserId.length > 0 ? adminUserId : null;
}

/**
 * Internal — load admin role + permissions from DB into cache.
 * Cache miss / expired → fresh fetch.
 */
async function loadPermissions(adminUserId: string): Promise<CachedPermissions> {
  const existing = cache.get(adminUserId);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing;
  }

  // Bulk fetch admin role + all permissions (single round-trip).
  const [admin, perms] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    }),
    prisma.adminPermission.findMany({
      where: { adminUserId },
      select: { resource: true, action: true, expiresAt: true },
    }),
  ]);

  const permsMap = new Map<string, Date | null>();
  for (const p of perms) {
    permsMap.set(`${p.resource}:${p.action}`, p.expiresAt);
  }

  const entry: CachedPermissions = {
    perms: permsMap,
    cachedAt: Date.now(),
    isSuperadmin: admin?.role === 'superadmin',
  };
  cache.set(adminUserId, entry);
  return entry;
}

/**
 * Returns true if the admin has the given (resource, action) grant or is superadmin.
 *
 * - Superadmin: always true (no DB lookup beyond role check).
 * - Manager: AdminPermission grant must exist AND not be expired (expiresAt
 *   null = permanent; expiresAt in past = expired, returns false).
 *
 * Errors are swallowed (DB unreachable → false; conservative deny). Caller
 * should treat thrown errors as auth failures, never bypass.
 */
export async function hasPermission(
  adminUserId: string | unknown,
  resource: AdminResource,
  action: AdminAction,
): Promise<boolean> {
  const id = toAdminId(adminUserId);
  if (!id) return false;
  try {
    const entry = await loadPermissions(id);
    if (entry.isSuperadmin) {
      return true;
    }
    const key = `${resource}:${action}`;
    if (!entry.perms.has(key)) {
      return false;
    }
    const expiresAt = entry.perms.get(key);
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return false;
    }
    return true;
  } catch (err) {
    // DB error → conservative deny. Sentry capture is caller's responsibility
    // (we don't want every guard call to spam alerts).
    console.error('[rbac] hasPermission failed', { adminUserId: id, resource, action, err });
    return false;
  }
}

/**
 * Permission check that throws a structured error when denied. Use in route
 * handlers via:
 *
 *   const admin = await getAdminFromRequest(req);
 *   if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
 *   const allowed = await hasPermission(admin.id, 'members', 'read');
 *   if (!allowed) return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
 *
 * (Or use `requirePermission` directly with try/catch for the 403 mapping.)
 */
export class PermissionDeniedError extends Error {
  resource: AdminResource;
  action: AdminAction;
  constructor(resource: AdminResource, action: AdminAction) {
    super(`Permission denied: ${resource}:${action}`);
    this.name = 'PermissionDeniedError';
    this.resource = resource;
    this.action = action;
  }
}

/**
 * Throws PermissionDeniedError if the admin lacks the grant.
 *
 * Caller pattern (Next.js route handler):
 *
 *   try {
 *     await requirePermission(admin.id, 'members', 'write');
 *   } catch {
 *     return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
 *   }
 */
export async function requirePermission(
  adminUserId: string | unknown,
  resource: AdminResource,
  action: AdminAction,
): Promise<void> {
  const allowed = await hasPermission(adminUserId, resource, action);
  if (!allowed) {
    throw new PermissionDeniedError(resource, action);
  }
}

/**
 * Bulk hasPermission check — returns Map<resource:action, boolean>. Useful for
 * sidebar gating (single DB round-trip; check multiple resources at once).
 */
export async function hasPermissions(
  adminUserId: string | unknown,
  checks: Array<{ resource: AdminResource; action: AdminAction }>,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  const id = toAdminId(adminUserId);
  if (!id) {
    for (const c of checks) result[`${c.resource}:${c.action}`] = false;
    return result;
  }
  // loadPermissions caches the full set; loop is O(n) Map lookup.
  const entry = await loadPermissions(id).catch(() => null);
  if (!entry) {
    for (const c of checks) result[`${c.resource}:${c.action}`] = false;
    return result;
  }
  for (const c of checks) {
    const key = `${c.resource}:${c.action}`;
    if (entry.isSuperadmin) {
      result[key] = true;
      continue;
    }
    if (!entry.perms.has(key)) {
      result[key] = false;
      continue;
    }
    const expiresAt = entry.perms.get(key);
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      result[key] = false;
      continue;
    }
    result[key] = true;
  }
  return result;
}

// Permission preset bundles — UI'da "Read-only analyst" / "Reviews moderator"
// gibi tek-tıklamalı grant'lar için. Yeni preset eklerken bu sabite ekle;
// UI dinamik render eder.
export const PERMISSION_PRESETS: Record<
  string,
  {
    label: string;
    labelEn: string;
    description: string;
    grants: Array<{ resource: AdminResource; action: AdminAction }>;
  }
> = {
  read_only_analyst: {
    label: 'Salt-okunur analist',
    labelEn: 'Read-only analyst',
    description:
      'Tüm verileri okuma erişimi (yorumlar, müşteriler, analitik, audit log) — değişiklik yapamaz.',
    grants: [
      { resource: 'reviews', action: 'read' },
      { resource: 'customers', action: 'read' },
      { resource: 'analytics', action: 'read' },
      { resource: 'audit_logs', action: 'read' },
      { resource: 'members', action: 'read' },
    ],
  },
  reviews_moderator: {
    label: 'Yorum moderatörü',
    labelEn: 'Reviews moderator',
    description:
      'Yorumları okuma + yanıtlama (yazma) erişimi; silme veya başka tablo dokunma yok.',
    grants: [
      { resource: 'reviews', action: 'read' },
      { resource: 'reviews', action: 'write' },
      { resource: 'customers', action: 'read' },
    ],
  },
  content_editor: {
    label: 'İçerik editörü',
    labelEn: 'Content editor',
    description: 'Blog + duyuru + mail template edit erişimi.',
    grants: [
      { resource: 'blog', action: 'read' },
      { resource: 'blog', action: 'write' },
      { resource: 'announcements', action: 'read' },
      { resource: 'announcements', action: 'write' },
      { resource: 'mail_templates', action: 'read' },
      { resource: 'mail_templates', action: 'write' },
    ],
  },
};
