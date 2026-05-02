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
 *
 * Owner deactivation cascade: TeamMember.ownerId'ye bağlı User pasifleştirildi
 * mi (`isActive=false` veya `deactivatedAt!=null`) → scope sıfır. Owner
 * suspend edildiğinde tüm ekibi otomatik kapanır; aksi halde admin "Pasifleştir"
 * sadece owner'ı engellerken team member'lar boşa erişebiliyordu.
 */
async function getTeamMemberScope(actor: PanelActor): Promise<string[]> {
  const email = actor.email?.toLowerCase().trim();
  if (!email) return [];
  const member = await prisma.teamMember.findFirst({
    where: { email, status: 'active' },
    select: { ownerId: true, locations: true },
  });
  if (!member) return [];
  const owner = await prisma.user.findUnique({
    where: { id: member.ownerId },
    select: { isActive: true, deactivatedAt: true },
  });
  if (!owner || !owner.isActive || owner.deactivatedAt) return [];
  if (!member.locations) return [];
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
    if (!member) return null;
    // Owner deactivation cascade — same guard as getTeamMemberScope.
    // Workspace-scoped helper'lar (billing, team mgmt, campaigns,
    // notification prefs) suspend edilmiş owner'a yazmamalı.
    const owner = await prisma.user.findUnique({
      where: { id: member.ownerId },
      select: { isActive: true, deactivatedAt: true },
    });
    if (!owner || !owner.isActive || owner.deactivatedAt) return null;
    return member.ownerId;
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

/**
 * Restoran üzerinde yazma izni kontrolü (theme, menu CRUD, QR generation,
 * settings, branches, vb.).
 *
 * Sıra:
 *  1. `canAccessRestaurant` ile IDOR scope check (false ise erişim reddi).
 *  2. Sadece `team_member` rolüne ek katman: TeamMember.role 'viewer' ise
 *     read-only; diğer rol'ler (`owner`/`manager`/`staff`) yazabilir.
 *     `superadmin`/`manager` (admin source)/`restaurant_owner` write izinli.
 *
 * Yeni helper: `canWriteFeedback`'in restoran-CRUD muadili. Aynı role
 * matrisini iki domain'e (feedback + restaurant) tutarlı uygular.
 */
export async function canWriteRestaurant(
  actor: PanelActor,
  restaurantId: string,
): Promise<boolean> {
  const access = await canAccessRestaurant(actor, restaurantId);
  if (!access) return false;
  if (actor.role !== 'team_member') return true;

  const email = actor.email?.toLowerCase().trim();
  if (!email) return false;
  const member = await prisma.teamMember.findFirst({
    where: { email, status: 'active' },
    select: { role: true },
  });
  if (!member) return false;
  return member.role !== 'viewer';
}

/**
 * Restoran silme yetkisi (CLAUDE.md §37.3 deferred #4 closure).
 *
 * Restoran DELETE yıkıcı bir aksiyon — feedback / menu / analytics
 * cascade siler. `canWriteRestaurant` viewer dışındaki tüm rolleri
 * geçiriyor ki bu staff/manager team rolleri için gereksiz geniş bir
 * yetki: bir manager kendi yetkilendirdiği yorum cevabı için yeterli
 * ama tüm restoranı silmek için değil.
 *
 * Sadece şu rollere izin verilir:
 *  - `superadmin` (admin source) — Buaze iç ekibi global access
 *  - `manager` (admin source) — kendi scoped restaurantId'si — admin
 *    panelinden yapılan operasyonel iş
 *  - `restaurant_owner` (user source) — workspace owner, kendi restoranı
 *
 * `team_member` HİÇBİR rolde restoran silemez (manager/staff/owner team
 * etiketleri olsa bile). Owner'ın workspace sahibi olarak silme yetkisi,
 * davet ettiği team üyelerine devredilmez.
 */
export async function canDeleteRestaurant(
  actor: PanelActor,
  restaurantId: string,
): Promise<boolean> {
  const access = await canAccessRestaurant(actor, restaurantId);
  if (!access) return false;
  if (actor.role === 'superadmin') return true;
  if (actor.role === 'manager' && actor.source === 'admin') return true;
  if (actor.role === 'restaurant_owner') return true;
  // team_member (workspace üye) — silmek YASAK
  return false;
}

/**
 * Feedback üzerinde yazma izni kontrolü (reply, flag, assign, bulk).
 *
 * Sıra:
 *  1. `canAccessRestaurant` ile IDOR scope check (false ise erişim reddi).
 *  2. Sadece `team_member` rolüne ek katman: TeamMember.role 'viewer' ise
 *     read-only (görüntüleyici); diğer rol'ler (`owner`/`manager`/`staff`)
 *     yazabilir. `superadmin`/`manager` (admin source)/`restaurant_owner`
 *     write izinli — kendi konvansiyonu zaten sahiplikte.
 *
 * Not: `manager` (admin source) farklı bir tip — `actor.role === 'manager'`
 * AdminUser'dan gelir; yazma kısıtlamasına tabi değildir. TeamMember.role
 * 'manager' workspace içi rol etiketi, AdminUser.role 'manager' farklı bir
 * scope.
 */
export async function canWriteFeedback(
  actor: PanelActor,
  restaurantId: string,
): Promise<boolean> {
  const access = await canAccessRestaurant(actor, restaurantId);
  if (!access) return false;
  if (actor.role !== 'team_member') return true;

  const email = actor.email?.toLowerCase().trim();
  if (!email) return false;
  const member = await prisma.teamMember.findFirst({
    where: { email, status: 'active' },
    select: { role: true },
  });
  if (!member) return false;
  return member.role !== 'viewer';
}
