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

  // `locations` NULL ya da boş dizi = "Tüm konumlar" — davet akışının
  // VARSAYILANI budur (`/api/team` POST konum seçilmediğinde NULL yazar, davet
  // maili "Tüm konumlar / All locations" der, `/api/team/accept-invite`
  // `allLocations = pinnedLocations.length === 0` ile owner'ın tam listesini
  // gösterir). Bu helper ise aynı durumu "hiç erişim yok" diye okuyordu: en
  // yaygın davet biçimiyle katılan ekip üyesi giriş yapıp bomboş bir panel
  // görüyordu. Üç ayrı yer bu semantiği tanımlıyor; outlier olan buydu.
  if (member.locations === null || member.locations === undefined) {
    return listOwnerRestaurantIds(member.ownerId);
  }
  // Json? — üst katmanda string[] yazıyoruz; corrupt JSON / manuel SQL girişine
  // karşı defansif kal ve fail-closed davran (dizi değilse hiçbir scope yok).
  if (!Array.isArray(member.locations)) return [];
  const pinned = (member.locations as unknown[]).filter(
    (x): x is string => typeof x === 'string',
  );
  if (pinned.length === 0) {
    return listOwnerRestaurantIds(member.ownerId);
  }
  return pinned;
}

async function listOwnerRestaurantIds(ownerId: string): Promise<string[]> {
  const rows = await prisma.restaurant.findMany({
    where: { userId: ownerId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * §22 viewer-mode UI gating — `team_member` rolündeki kullanıcının
 * `TeamMember.role` ('owner' | 'manager' | 'staff' | 'viewer') değerini döner.
 * Owner / admin / manager actor'lar için `null` (gating uygulanmaz).
 *
 * Backend zaten `canWriteFeedback` + `canWriteRestaurant` ile viewer'ı write
 * action'lardan reddediyor (`role !== 'viewer'` check). UI bu helper'la
 * paralel olarak butonları gizler / disabled gösterir — owner viewer'a "read
 * only" gibi davransın diye.
 */
export async function getTeamMemberRole(actor: PanelActor): Promise<string | null> {
  if (actor.role !== 'team_member') return null;
  const email = actor.email?.toLowerCase().trim();
  if (!email) return null;
  const member = await prisma.teamMember.findFirst({
    where: { email, status: 'active' },
    select: { role: true },
  });
  return member?.role ?? null;
}

/**
 * Server-component variant of the API scope for pages that only hold a
 * verified `user_token` payload. Owner dashboard pages used to filter
 * restaurants with `userId: payload.userId`, which is only correct for the
 * workspace owner — invited team members (role=team_member) saw empty
 * Surveys / Audit Center / Menu / Platforms pages even though
 * the APIs behind them already accepted their scope. This resolves the same
 * scope the API layer uses.
 */
export async function getScopedRestaurantIdsForUserPayload(payload: {
  userId: string;
  role?: unknown;
  email?: unknown;
}): Promise<string[]> {
  const actor: PanelActor = {
    id: payload.userId,
    role: typeof payload.role === 'string' && payload.role ? payload.role : 'restaurant_owner',
    restaurantId: null,
    username: null,
    email: typeof payload.email === 'string' ? payload.email : null,
    plan: null,
    source: 'user',
  };
  return (await getScopedRestaurantIds(actor)) ?? [];
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

  // Staff = granular RBAC tier (CLAUDE.md §37.2). No workspace scope —
  // access is gated per-resource via AdminPermission. Returning [] makes
  // any `where: { restaurantId: { in: scopedIds } }` query yield nothing,
  // which is the safe default if a future API route forgets to wrap with
  // `requirePermission()` before calling this helper.
  if (actor.role === 'staff') {
    return [];
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
 * Faturalandırma yönetim yetkisi (§38.238).
 *
 * `resolveOwnerUserId` bir workspace'in owner id'sini AKTİF HER team
 * member için döndürür — `TeamMember.role` hiç bakılmaz. Billing route'ları
 * yalnız onu kullanınca, `viewer` etiketiyle davet edilmiş bir üye bile
 * `GET /api/customer-portal` çağırıp owner'ın imzalı Dodo müşteri portalına
 * yönlendiriliyordu: tüm fatura geçmişi, fatura adresi, kayıtlı kart bilgisi
 * görünür; ödeme yöntemi değiştirilebilir; abonelik iptal edilebilir.
 *
 * Billing, `canWriteRestaurant`'ın kapsadığı operasyonel yazma değil,
 * `canDeleteRestaurant` sınıfı bir sahiplik aksiyonudur (para + geri
 * alınamaz iptal). Bu yüzden aynı posture uygulanır:
 *  - `superadmin` (admin source) — Buaze iç ekibi
 *  - `manager` (admin source) — admin panelinden operasyonel iş
 *  - `restaurant_owner` (user source) — workspace sahibi
 *
 * `team_member` HİÇBİR rolde (owner/manager/staff/viewer etiketi dahil)
 * faturalandırmayı yönetemez. Owner'ın ödeme yetkisi davet ettiği üyelere
 * devredilmez.
 *
 * Not: read-only billing özeti (`/api/billing/summary`) bu gate'e tabi
 * değildir — plan adını görmek workspace üyeleri için zararsız.
 */
export function canManageBilling(actor: PanelActor): boolean {
  if (actor.role === 'superadmin') return true;
  if (actor.role === 'manager' && actor.source === 'admin') return true;
  if (actor.role === 'restaurant_owner' && actor.source === 'user') return true;
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
