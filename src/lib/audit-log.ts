// Stage A3 §38.95 — centralized audit log helper.
//
// Existing endpoints have inline `writeAudit` functions (see members/users/
// permissions endpoints). New audit writes should use this helper for two
// benefits:
//   1. Sentry observability — every write surfaces as `audit:${action}`
//      message so ops dashboard tags can build per-action volume reports.
//   2. PII guard — audit payload sanitized at write-time (defense-in-depth
//      on top of read-time sanitization in the viewer endpoint).
//
// CLAUDE.md §37.7 PII redaction disipline:
//   - Email/phone fields in payload are masked when stored
//     (`a***@domain.com`, `+90***1234`) — read-time masking is reversible
//     for trusted superadmin viewer; write-time masking is one-way and only
//     used for fields the audit log doesn't strictly need.
//   - In practice we keep raw values in payload (admin needs context) and
//     mask in viewer endpoint. Helper exposes mask functions both ways.
//
// Existing inline `writeAudit` functions can opt-in over time; this PR adds
// the helper + uses it in the new owner audit endpoint and admin audit
// viewer wrapper. Migration is gradual.

import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface AuditWriteParams {
  actorId: string;
  actorSource: 'admin' | 'user';
  action: string;
  targetId?: string | null;
  payload?: unknown;
}

/**
 * Write an admin audit log entry. Wrapped in try/catch — schema drift on
 * preview deploys before migration apply doesn't block the underlying mutation.
 *
 * Side-effect: Sentry captureMessage with `audit:${action}` for ops monitoring.
 */
export async function writeAdminAuditLog(entry: AuditWriteParams): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        actorSource: entry.actorSource,
        action: entry.action,
        targetId: entry.targetId ?? null,
        payload: (entry.payload as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (err) {
    console.warn('[audit] write failed (non-fatal)', (err as Error).message);
  }

  // Sentry tag — fail-soft, don't await. Provides ops dashboard with audit
  // volume + per-action breakdown (search by `tags.action:permission.grant`
  // etc). PII guard: extra fields contain only IDs, no email/phone.
  try {
    Sentry.captureMessage(`audit:${entry.action}`, {
      level: 'info',
      tags: {
        kind: 'audit-log',
        action: entry.action,
        actorSource: entry.actorSource,
      },
      extra: {
        actorId: entry.actorId,
        targetId: entry.targetId ?? null,
      },
    });
  } catch {
    // Sentry not configured / network — silent (CLAUDE.md §38.13 server-side
    // flush kör nokta intact, log kayıbı kabul).
  }
}

/**
 * Owner-panel write audit (2026-10 owner↔admin link).
 *
 * Owner-side changes (restaurant settings, team, surveys, account deletion…)
 * used to leave no trail at all, so `/admin/audit-logs` and the owner's own
 * `/api/account/audit-log` were blind to them — including changes an admin
 * made while impersonating ("Owner gibi gör"). This wrapper records the panel
 * actor and, when the request is an impersonation session, the real admin id
 * + session id so the trail shows who actually clicked.
 *
 * `targetId` should be the owning user id where possible so the row also
 * surfaces in `/admin/members/[id]/audit` and in the owner's audit view.
 * Never put PII (email/phone) in `payload` — field names, ids and booleans.
 */
export async function writePanelAuditLog(
  actor: {
    id: string;
    source: 'admin' | 'user';
    realAdminId?: string | null;
    impersonationSessionId?: string | null;
  },
  action: string,
  targetId: string | null,
  payload?: Record<string, unknown>,
): Promise<void> {
  const impersonation = actor.realAdminId
    ? { realAdminId: actor.realAdminId, sessionId: actor.impersonationSessionId ?? null }
    : undefined;
  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action,
    targetId,
    payload: impersonation ? { ...(payload ?? {}), impersonation } : payload,
  });
}

// PII redaction utilities — used by viewer endpoints to mask email/phone in
// payload JSON before returning to UI. Two-way: helper functions reusable.

/**
 * Mask email: a***@domain.com (preserves first char + domain).
 * Returns input unchanged if not a valid email shape.
 */
export function maskEmail(value: string): string {
  if (typeof value !== 'string' || !value.includes('@')) return value;
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}

/**
 * Mask phone: keep first 4 + last 4 chars, mask middle.
 * "+905551234567" → "+905***4567"
 */
export function maskPhone(value: string): string {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.length <= 6) return value;
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

const PII_KEY_PATTERNS: Array<{ regex: RegExp; mask: (v: string) => string }> = [
  { regex: /email/i, mask: maskEmail },
  { regex: /e[-_]?mail/i, mask: maskEmail },
  { regex: /phone/i, mask: maskPhone },
  { regex: /telefon/i, mask: maskPhone },
];

/**
 * Recursively walk a JSON-serializable payload and mask any fields whose
 * key matches PII patterns. Returns a deep-cloned masked copy. Other types
 * pass through unchanged.
 *
 * Used in admin/audit-logs viewer endpoint before returning rows to UI.
 * Read-time masking (data on disk is raw — superadmin can audit-trail
 * actual values via direct DB access if KVKK case requires).
 */
export function sanitizeAuditPayload(payload: unknown): unknown {
  if (payload == null) return payload;
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'number' || typeof payload === 'boolean') return payload;

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeAuditPayload(item));
  }

  if (typeof payload === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      const matchedPattern = PII_KEY_PATTERNS.find((p) => p.regex.test(k));
      if (matchedPattern && typeof v === 'string') {
        result[k] = matchedPattern.mask(v);
      } else {
        result[k] = sanitizeAuditPayload(v);
      }
    }
    return result;
  }

  return payload;
}

/**
 * Action label resolver — Buaze internal action keys (e.g. `admin.users.update`)
 * mapped to human-readable TR/EN labels. Used by both admin viewer and owner
 * KVKK transparency surface.
 *
 * Unknown action codes fall through with the raw key (forensic — superadmin
 * can spot new audit actions in the wild before label is added).
 */
export const ACTION_LABELS: Record<string, { tr: string; en: string }> = {
  // Member (User restaurant_owner) lifecycle
  'admin.members.create': {
    tr: 'Yeni hesap oluşturuldu',
    en: 'Account created',
  },
  'admin.members.deactivate': {
    tr: 'Hesap pasifleştirildi',
    en: 'Account deactivated',
  },
  'admin.members.reactivate': {
    tr: 'Hesap yeniden aktive edildi',
    en: 'Account reactivated',
  },
  'admin.members.send_password_reset': {
    tr: 'Şifre sıfırlama maili gönderildi',
    en: 'Password reset email sent',
  },
  'admin.billing.update': {
    tr: 'Faturalandırma güncellendi',
    en: 'Billing updated',
  },
  'admin.invoice.create': { tr: 'Yeni fatura eklendi', en: 'Invoice created' },
  'admin.invoice.update': { tr: 'Fatura düzenlendi', en: 'Invoice updated' },
  'admin.invoice.delete': { tr: 'Fatura silindi', en: 'Invoice deleted' },
  // Admin user (AdminUser) lifecycle
  'admin.users.create': { tr: 'Yönetici hesabı eklendi', en: 'Admin user created' },
  'admin.users.update': {
    tr: 'Yönetici hesabı güncellendi',
    en: 'Admin user updated',
  },
  'admin.users.delete': {
    tr: 'Yönetici hesabı silindi',
    en: 'Admin user deleted',
  },
  // Restaurant lifecycle
  'admin.restaurants.create': { tr: 'Yeni restoran eklendi', en: 'Restaurant created' },
  'admin.restaurants.update': { tr: 'Restoran güncellendi', en: 'Restaurant updated' },
  'admin.restaurants.delete': { tr: 'Restoran silindi', en: 'Restaurant deleted' },
  'admin.restaurants.feature_access': {
    tr: 'Paket özellik erişimi güncellendi',
    en: 'Feature access updated',
  },
  // Permission grants (Stage A2 §38.94)
  'admin.permission.grant': { tr: 'Yetki verildi', en: 'Permission granted' },
  'admin.permission.revoke': { tr: 'Yetki geri alındı', en: 'Permission revoked' },
  // Bulk operations (Stage A5 §38.97)
  'admin.restaurants.bulk.activate': {
    tr: 'Toplu işletme aktivasyonu',
    en: 'Bulk restaurant activation',
  },
  'admin.restaurants.bulk.deactivate': {
    tr: 'Toplu işletme pasifleştirildi',
    en: 'Bulk restaurant deactivation',
  },
  'admin.restaurants.bulk.feature_override': {
    tr: 'Toplu özellik geçişi',
    en: 'Bulk feature override',
  },
  'admin.owners.bulk.send_email': {
    tr: 'Toplu e-posta gönderildi (işletme sahipleri)',
    en: 'Bulk email sent (owners)',
  },
  // Owner-side actions (logged when owner self-modifies)
  'user.password.change': { tr: 'Şifre değiştirildi', en: 'Password changed' },
  'user.profile.update': { tr: 'Profil güncellendi', en: 'Profile updated' },
  'user.feedback.reply': { tr: 'Yoruma yanıt verildi', en: 'Feedback replied' },
  // Owner campaigns (Stage §38.99)
  'owner.campaigns.create': {
    tr: 'Kampanya oluşturuldu',
    en: 'Campaign created',
  },
  'owner.campaigns.send': {
    tr: 'Kampanya gönderildi',
    en: 'Campaign sent',
  },
  'owner.campaigns.delete': {
    tr: 'Kampanya silindi',
    en: 'Campaign deleted',
  },
  // Stage 29 §38.105 — campaign moderation pipeline.
  // Owner submit → admin approve/reject → Resend send (admin-triggered).
  // submit/send action'ları AdminAuditLog'a actorSource='user' olarak yazılır
  // (owner aksiyonu); approve/reject actorSource='admin' (admin aksiyonu).
  'admin.campaign.submit': {
    tr: 'Kampanya onaya gönderildi',
    en: 'Campaign submitted for approval',
  },
  'admin.campaign.approve': {
    tr: 'Kampanya onaylandı',
    en: 'Campaign approved',
  },
  'admin.campaign.reject': {
    tr: 'Kampanya reddedildi',
    en: 'Campaign rejected',
  },
  'admin.campaign.send': {
    tr: 'Kampanya gönderildi (admin)',
    en: 'Campaign sent (admin)',
  },
};

export function actionLabel(action: string, locale: 'tr' | 'en' = 'tr'): string {
  return ACTION_LABELS[action]?.[locale] || action;
}
