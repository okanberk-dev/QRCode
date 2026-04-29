import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';

/**
 * §22 — Davet edilen kullanıcının (User.role='team_member') eriştiği
 * restoran ID listesini TeamMember.locations'dan çeker. Email match active
 * member zorunlu — pasif/iptal davetler hiçbir scope döndürmez.
 *
 * `email` null ise (token'da email claim'i eksik — beklenmiyor ama defansif)
 * boş array döner: kullanıcı hiçbir restoranı göremez. Hata değil, scope
 * sıfır.
 */
async function getTeamMemberScope(actor: PanelActor): Promise<string[]> {
  const email = actor.email?.toLowerCase().trim();
  if (!email) return [];
  const member = await prisma.teamMember.findFirst({
    where: { email, status: 'active' },
    select: { locations: true },
  });
  if (!member?.locations) return [];
  // locations Json? — üst katmanda string[] olarak yazıyoruz ama defansif
  // filtre koruyalım (corrupt JSON / manuel SQL girişine karşı).
  if (!Array.isArray(member.locations)) return [];
  return (member.locations as unknown[]).filter(
    (x): x is string => typeof x === 'string',
  );
}

export async function getScopedRestaurantIds(actor: PanelActor) {
  if (actor.role === 'manager') {
    return actor.restaurantId ? [actor.restaurantId] : [];
  }

  if (actor.role === 'team_member') {
    return getTeamMemberScope(actor);
  }

  if (actor.role === 'restaurant_owner') {
    const restaurants = await prisma.restaurant.findMany({
      where: { userId: actor.id },
      select: { id: true },
    });

    return restaurants.map((restaurant) => restaurant.id);
  }

  return null;
}

export async function canAccessRestaurant(actor: PanelActor, restaurantId: string) {
  if (actor.role === 'superadmin') {
    return true;
  }

  if (actor.role === 'manager') {
    return actor.restaurantId === restaurantId;
  }

  if (actor.role === 'team_member') {
    const ids = await getTeamMemberScope(actor);
    return ids.includes(restaurantId);
  }

  if (actor.role === 'restaurant_owner') {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { userId: true },
    });

    return restaurant?.userId === actor.id;
  }

  return false;
}

/**
 * Resolves the owning User.id for workspace-scoped features
 * (billing, team, campaigns, notification prefs).
 *
 * - `actor.source === 'user'` AND role='restaurant_owner' → the actor itself
 *   owns the workspace.
 * - `team_member` → resolve via TeamMember.ownerId (their workspace owner).
 * - `manager` → resolve via their scoped restaurant's owner.
 * - `superadmin` (admin source, no restaurant scope) → null; callers
 *   should 403 since superadmin doesn't have a personal workspace.
 */
export async function resolveOwnerUserId(actor: PanelActor): Promise<string | null> {
  if (actor.source === 'user' && actor.role === 'restaurant_owner') return actor.id;
  if (actor.role === 'team_member') {
    const email = actor.email?.toLowerCase().trim();
    if (!email) return null;
    const member = await prisma.teamMember.findFirst({
      where: { email, status: 'active' },
      select: { ownerId: true },
    });
    return member?.ownerId ?? null;
  }
  if (actor.role === 'manager' && actor.restaurantId) {
    const r = await prisma.restaurant.findUnique({
      where: { id: actor.restaurantId },
      select: { userId: true },
    });
    return r?.userId ?? null;
  }
  return null;
}
