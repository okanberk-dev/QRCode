/**
 * Card notifications (CLAUDE.md §61): the customer turns them on from the
 * card page; Buaze sends only two kinds, both about their own card — the
 * reward is ready, and the birthday gift is waiting. No marketing over push.
 * Server only; sending is best effort (never blocks the counter).
 */
import { prisma } from '@/lib/prisma';
import { activeRewards, loyaltyCardPath, zonedMonthYear } from '@/lib/loyalty';
import { sendWebPush, vapidKeys, type PushMessage } from '@/lib/web-push';

/** Most subscriptions kept per card (one per phone / browser). */
export const PUSH_SUBSCRIPTIONS_PER_CARD = 5;

export async function saveLoyaltyPushSubscription(
  memberId: string,
  sub: { endpoint: string; p256dh: string; auth: string },
): Promise<void> {
  await prisma.loyaltyPushSubscription.upsert({
    where: { memberId_endpoint: { memberId, endpoint: sub.endpoint } },
    create: { memberId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    update: { p256dh: sub.p256dh, auth: sub.auth },
  });
  const rows = await prisma.loyaltyPushSubscription.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  const extra = rows.slice(PUSH_SUBSCRIPTIONS_PER_CARD).map((r) => r.id);
  if (extra.length > 0) await prisma.loyaltyPushSubscription.deleteMany({ where: { id: { in: extra } } });
}

export async function deleteLoyaltyPushSubscription(memberId: string, endpoint: string): Promise<void> {
  await prisma.loyaltyPushSubscription.deleteMany({ where: { memberId, endpoint } });
}

/** Reward titles a balance change just made reachable (before < cost ≤ after). */
export function rewardsBecameReady(before: number, after: number, rewards: Array<{ title: string; cost: number; isActive?: boolean }>): string[] {
  if (after <= before) return [];
  return activeRewards(rewards)
    .filter((r) => r.cost > before && r.cost <= after)
    .map((r) => r.title);
}

/** Sends one message to every subscription of a card; drops the ones the push service says are gone. */
export async function pushToMember(memberId: string, build: (ctx: { cardPath: string; iconPath: string; businessName: string }) => PushMessage): Promise<number> {
  if (!vapidKeys()) return 0;
  const member = await prisma.loyaltyMember.findUnique({
    where: { id: memberId },
    select: {
      cardToken: true,
      pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
      program: { select: { slug: true, isActive: true, restaurant: { select: { name: true, isActive: true, loyaltyEnabled: true } } } },
    },
  });
  if (!member || member.pushSubscriptions.length === 0) return 0;
  const { program } = member;
  if (!program.isActive || !program.restaurant.isActive || !program.restaurant.loyaltyEnabled) return 0;
  const message = build({
    cardPath: loyaltyCardPath(program.slug, member.cardToken),
    iconPath: `/l/${program.slug}/app-icon?size=192`,
    businessName: program.restaurant.name,
  });
  let sent = 0;
  const gone: string[] = [];
  for (const sub of member.pushSubscriptions) {
    const r = await sendWebPush(sub, message);
    if (r === 'sent') sent += 1;
    if (r === 'gone') gone.push(sub.endpoint);
  }
  if (gone.length > 0) await prisma.loyaltyPushSubscription.deleteMany({ where: { endpoint: { in: gone } } });
  if (sent > 0) {
    await prisma.loyaltyPushSubscription.updateMany({ where: { memberId, endpoint: { notIn: gone } }, data: { lastSentAt: new Date() } });
  }
  return sent;
}

export async function notifyRewardsReady(memberId: string, titles: string[], locale: 'tr' | 'en' = 'tr'): Promise<void> {
  if (titles.length === 0) return;
  const tr = locale === 'tr';
  await pushToMember(memberId, (ctx) => ({
    title: ctx.businessName,
    body: tr ? `Ödülünüz hazır: ${titles.join(', ')}. Kasada isteyin.` : `Your reward is ready: ${titles.join(', ')}. Ask at the counter.`,
    url: ctx.cardPath,
    icon: ctx.iconPath,
    tag: `reward-${memberId}`,
  }));
}

/**
 * Daily: a member whose birthday is today (or, without a day, whose birth
 * month began) and whose gift is not yet given gets one notification a
 * year. Only cards with notifications on are read.
 */
export async function runBirthdayNotices(now: Date, timeZone: string, max = 400): Promise<{ checked: number; sent: number }> {
  if (!vapidKeys()) return { checked: 0, sent: 0 };
  const { month, year } = zonedMonthYear(now, timeZone);
  const day = Number(new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric' }).format(now));
  const members = await prisma.loyaltyMember.findMany({
    where: {
      birthMonth: month,
      pushSubscriptions: { some: {} },
      OR: [{ birthdayNoticeYear: null }, { birthdayNoticeYear: { not: year } }],
      AND: [
        { OR: [{ lastBirthdayRewardYear: null }, { lastBirthdayRewardYear: { not: year } }] },
        { OR: [{ birthDay: null }, { birthDay: { lte: day } }] },
      ],
      program: { isActive: true, birthdayReward: { not: null }, restaurant: { isActive: true, loyaltyEnabled: true } },
    },
    select: { id: true, program: { select: { birthdayReward: true } } },
    take: max,
  });
  let sent = 0;
  for (const m of members) {
    // Mark first: a failed push is not retried all day long.
    const claimed = await prisma.loyaltyMember.updateMany({
      where: { id: m.id, OR: [{ birthdayNoticeYear: null }, { birthdayNoticeYear: { not: year } }] },
      data: { birthdayNoticeYear: year },
    });
    if (claimed.count === 0) continue;
    const gift = m.program.birthdayReward ?? '';
    const n = await pushToMember(m.id, (ctx) => ({
      title: ctx.businessName,
      body: `İyi ki doğdunuz! Doğum günü hediyeniz sizi bekliyor: ${gift}. Bu ay kasada isteyin.`,
      url: ctx.cardPath,
      icon: ctx.iconPath,
      tag: `birthday-${m.id}`,
    }));
    if (n > 0) sent += 1;
  }
  return { checked: members.length, sent };
}
