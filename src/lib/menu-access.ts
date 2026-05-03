import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest, isAdminRole } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { prisma } from '@/lib/prisma';

/**
 * Restaurant erişim guard'ı (read + write).
 *
 * Default davranış: HTTP method'una göre **auto-detect**. GET/HEAD/OPTIONS
 * salt-okunur kabul edilir (sadece IDOR scope kontrolü); diğer method'lar
 * (POST/PUT/PATCH/DELETE) write op sayılır ve `canWriteRestaurant` ile
 * TeamMember.role 'viewer' filtreden geçer.
 *
 * `opts.requireWrite` ile manuel override:
 *  - `true`  → request method ne olursa olsun write check zorunlu
 *  - `false` → request method ne olursa olsun sadece read check
 *  Edge case: yan-etkisiz POST (örn. integration test) için `false`,
 *  veya GET endpoint'inde tutucu davranmak için `true`.
 *
 * 19 restaurant endpoint'i bu helper'ı kullanır → tek dokunuş ile viewer
 * tüm CRUD endpoint'lerinde 403'lenir, mevcut caller'lara dokunulmaz.
 */
export async function requireRestaurantAccess(
  req: NextRequest,
  restaurantId: string,
  opts: { requireWrite?: boolean } = {},
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return { ok: false as const, res: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 }) };
  }
  // Superadmin: global access. Manager: scoped to their own restaurantId.
  // Everyone else (restaurant_owner / team_member): checked via canAccessRestaurant.
  const isSuperadmin = actor.role === 'superadmin';
  if (!isSuperadmin) {
    if (actor.role === 'manager') {
      if ((actor as { restaurantId?: string }).restaurantId !== restaurantId) {
        return { ok: false as const, res: NextResponse.json({ error: 'Bu restorana erişiminiz yok' }, { status: 403 }) };
      }
    } else {
      const allowed = await canAccessRestaurant(actor, restaurantId);
      if (!allowed) {
        return { ok: false as const, res: NextResponse.json({ error: 'Bu restorana erişiminiz yok' }, { status: 403 }) };
      }
    }
  }

  // Write gate — method-based auto-detect, manuel override mümkün.
  // Superadmin / manager (admin source) hep yazabilir; team_member 'viewer'
  // yazma op'larında 403. canWriteRestaurant kendi içinde role lookup yapar.
  const method = req.method?.toUpperCase() ?? 'GET';
  const isReadOnly = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const writeNeeded = opts.requireWrite ?? !isReadOnly;
  if (writeNeeded && !isSuperadmin && actor.role !== 'manager') {
    const canWrite = await canWriteRestaurant(actor, restaurantId);
    if (!canWrite) {
      return { ok: false as const, res: NextResponse.json({ error: 'forbidden_role' }, { status: 403 }) };
    }
  }

  const isAdmin = isSuperadmin || isAdminRole(actor.role);
  return { ok: true as const, actor, isAdmin };
}

export async function touchMenuUpdated(restaurantId: string) {
  try {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { menuUpdatedAt: new Date() },
    });
  } catch (error) {
    console.error('[touchMenuUpdated]', error);
  }
}

export async function requireMenuModuleAccess(
  req: NextRequest,
  restaurantId: string,
  opts: { requireWrite?: boolean } = {},
) {
  const gate = await requireRestaurantAccess(req, restaurantId, opts);
  if (!gate.ok) return gate;

  // Admin can inspect and maintain disabled menu rows from the admin panel.
  // Owner/workspace users see a plan lock and cannot mutate the menu module.
  if (!gate.isAdmin) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { menuEnabled: true },
    });
    if (!restaurant) {
      return {
        ok: false as const,
        res: NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 }),
      };
    }
    if (!restaurant.menuEnabled) {
      return {
        ok: false as const,
        res: NextResponse.json(
          { error: 'Menü modülü bu işletme için kapalı.', code: 'MENU_MODULE_DISABLED' },
          { status: 403 },
        ),
      };
    }
  }

  return gate;
}
