// CLAUDE.md §42 — Audit Center access helpers.
//
// IDOR + role check ortak modülü. Mevcut panel-access.ts paterniyle uyumlu
// (CLAUDE.md §4 + §37.2.B). Audit özelliği:
//   - Global template (restaurantId null) → herkes okur, sadece superadmin
//     yazar.
//   - Restoran-özel template (restaurantId dolu) → standart IDOR.
//   - Assignment / response → her zaman restoranScoped IDOR.

import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';

/**
 * Bir audit template'e erişim (READ).
 *
 *  - Global (restaurantId null) + isPublished true → herkes okur
 *  - Global + draft → sadece superadmin
 *  - Restoran-özel → canAccessRestaurant kurallarına tabi
 */
export async function canReadAuditTemplate(
  actor: PanelActor,
  templateId: string,
): Promise<boolean> {
  const tpl = await prisma.auditTemplate.findUnique({
    where: { id: templateId },
    select: { restaurantId: true, isPublished: true },
  });
  if (!tpl) return false;

  // Global template
  if (!tpl.restaurantId) {
    if (actor.role === 'superadmin') return true;
    return tpl.isPublished;
  }

  return canAccessRestaurant(actor, tpl.restaurantId);
}

/**
 * Bir audit template üzerinde WRITE.
 *
 *  - Global (restaurantId null) → SADECE superadmin
 *  - Restoran-özel → canWriteRestaurant (team_member viewer hariç)
 */
export async function canWriteAuditTemplate(
  actor: PanelActor,
  templateId: string,
): Promise<boolean> {
  const tpl = await prisma.auditTemplate.findUnique({
    where: { id: templateId },
    select: { restaurantId: true },
  });
  if (!tpl) return false;

  if (!tpl.restaurantId) {
    return actor.role === 'superadmin';
  }
  return canWriteRestaurant(actor, tpl.restaurantId);
}

/**
 * AuditResponse okuma yetkisi — restoran scope'una bağlı.
 */
export async function canReadAuditResponse(
  actor: PanelActor,
  responseId: string,
): Promise<boolean> {
  const resp = await prisma.auditResponse.findUnique({
    where: { id: responseId },
    select: { restaurantId: true },
  });
  if (!resp) return false;
  return canAccessRestaurant(actor, resp.restaurantId);
}

/**
 * Superadmin gate — admin-scoped endpoint için kısayol.
 */
export function isSuperadmin(actor: PanelActor | null): actor is PanelActor {
  return actor !== null && actor.role === 'superadmin';
}
