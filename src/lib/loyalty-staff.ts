/**
 * Staff mode of the customer's card page (CLAUDE.md §61).
 *
 * The QR on a customer's card is the card link. When the person opening it
 * is signed in to the Buaze panel and has loyalty access to that business
 * (owner, team member, admin), `/l/<slug>/k/<token>` opens as the counter
 * screen for that customer: the owner scans the card with the phone's own
 * camera app and lands on "+1 damga". Everyone else sees the customer's
 * card. `?view=customer` always shows the customer's card.
 *
 * Server only. Staff mode never writes the phone's "remembered card" cookie
 * (that would make the staff phone open this customer's card on the next
 * join scan) and returns personal data only as the panel would (§61:
 * whole phone / e-mail for managers).
 */
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import {
  LOYALTY_MEMBER_SELECT,
  loadLoyaltyProgram,
  loyaltyAccess,
  settleLapsedBalance,
  toMemberDto,
  toProgramDto,
  type LoyaltyAccess,
  type LoyaltyMemberDto,
  type LoyaltyProgramDto,
} from '@/lib/loyalty-server';

export type CardViewMode = 'staff' | 'customer';

/** `?view=customer` wins; otherwise staff mode needs panel access to the business. */
export function pickCardView(opts: { staffAccess: boolean; viewParam?: string | null }): CardViewMode {
  if (opts.viewParam === 'customer') return 'customer';
  return opts.staffAccess ? 'staff' : 'customer';
}

/** True when the request carries a panel session cookie (cheap pre-check, no crypto). */
export function hasPanelCookie(cookieHeader: string | null | undefined): boolean {
  return /(?:^|;\s*)(?:user_token|admin_token)=[^;\s]/.test(cookieHeader ?? '');
}

export interface StaffCard {
  restaurantId: string;
  restaurantName: string;
  moduleEnabled: boolean;
  /** Admin accounts go back to the admin panel, everyone else to the owner panel. */
  actorKind: 'admin' | 'owner';
  program: LoyaltyProgramDto;
  member: LoyaltyMemberDto;
  access: LoyaltyAccess;
}

/**
 * The counter view of this card for the signed-in panel user, or null (no
 * session, no access to the business, unknown card). Customers pay nothing
 * for it: without a panel cookie it returns before any token check.
 */
export async function loadStaffCard(token: string, slug: string): Promise<StaffCard | null> {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token) || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const h = await headers();
  if (!hasPanelCookie(h.get('cookie'))) return null;

  const actor = await getPanelActorFromRequest(new NextRequest(`${SITE_URL}/l/${slug}/k/${token}`, { headers: new Headers(h) }));
  if (!actor) return null;

  const base = await prisma.loyaltyMember.findUnique({
    where: { cardToken: token },
    select: { id: true, program: { select: { id: true, slug: true, restaurantId: true } } },
  });
  if (!base || base.program.slug !== slug) return null;
  const homeId = base.program.restaurantId;

  // A chain card (§61): staff of a branch act from their own business.
  let restaurantId = homeId;
  let access = await loyaltyAccess(actor, homeId);
  if (!access.read) {
    const branches = await prisma.loyaltyProgramBranch.findMany({
      where: { programId: base.program.id },
      orderBy: { createdAt: 'asc' },
      select: { restaurantId: true },
    });
    for (const b of branches) {
      const a = await loyaltyAccess(actor, b.restaurantId);
      if (!a.read) continue;
      if (!access.read || a.operate) {
        restaurantId = b.restaurantId;
        access = a;
      }
      if (a.operate) break;
    }
  }
  if (!access.read) return null;

  const program = await loadLoyaltyProgram(homeId);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, loyaltyEnabled: true },
  });
  if (!program || !restaurant) return null;

  await settleLapsedBalance(program, base.id);
  const member = await prisma.loyaltyMember.findUnique({ where: { id: base.id }, select: LOYALTY_MEMBER_SELECT });
  if (!member) return null;

  return {
    restaurantId,
    restaurantName: restaurant.name,
    moduleEnabled: restaurant.loyaltyEnabled,
    actorKind: actor.source === 'admin' ? 'admin' : 'owner',
    program: toProgramDto(program),
    member: toMemberDto(member, { full: access.manage }),
    access,
  };
}

/** "Panel" link of staff mode: the owner panel's loyalty counter or the admin's business page. */
export function staffPanelHref(card: Pick<StaffCard, 'actorKind' | 'restaurantId'>, locale: 'tr' | 'en'): string {
  return card.actorKind === 'admin'
    ? `/admin/restaurants/${encodeURIComponent(card.restaurantId)}`
    : `/${locale}/dashboard/loyalty?restaurantId=${encodeURIComponent(card.restaurantId)}`;
}
