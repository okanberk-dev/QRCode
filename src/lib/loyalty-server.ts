/**
 * Loyalty card — database operations (CLAUDE.md §60). Rules live in
 * `loyalty.ts`; this file turns them into atomic writes:
 *
 *  - every balance change is ONE conditional UPDATE (`updateMany` with the
 *    rule in `where`) plus a `LoyaltyEvent` row, in one transaction — two
 *    staff tapping "+1" at the same moment cannot both pass the visit
 *    cooldown, and a reward cannot take a balance below zero;
 *  - a lapsed balance (expiryDays) is written off lazily, before an earn and
 *    when a card is read.
 */
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant, getTeamMemberRole } from '@/lib/panel-access';
import {
  LOYALTY_LIMITS,
  activeRewards,
  birthdayGiftAvailable,
  computeEarn,
  cooldownRemainingMs,
  expiredBalance,
  generateMemberCode,
  normalizeKind,
  readLoyaltyTiers,
  zonedMonthYear,
  type LookupQuery,
  type LoyaltyKind,
  type LoyaltyTier,
} from '@/lib/loyalty';

// ─── access ───────────────────────────────────────────────────────────────

export interface LoyaltyAccess {
  /** See the program, members and stats. */
  read: boolean;
  /** Counter work: add stamps / points, give rewards, enrol a customer. */
  operate: boolean;
  /** Program settings, publishing, deleting members, manual corrections. */
  manage: boolean;
}

/**
 * Viewers only read. Counter staff (team role `staff`) operate the counter
 * but do not change the program or delete customers; owners, team owners /
 * managers and admins do everything.
 */
export async function loyaltyAccess(actor: PanelActor, restaurantId: string): Promise<LoyaltyAccess> {
  const read = await canAccessRestaurant(actor, restaurantId);
  if (!read) return { read: false, operate: false, manage: false };
  const operate = await canWriteRestaurant(actor, restaurantId);
  if (!operate) return { read, operate: false, manage: false };
  if (actor.role !== 'team_member') return { read, operate, manage: true };
  const teamRole = await getTeamMemberRole(actor);
  return { read, operate, manage: teamRole === 'owner' || teamRole === 'manager' };
}

// ─── program ──────────────────────────────────────────────────────────────

export const LOYALTY_PROGRAM_SELECT = {
  id: true,
  restaurantId: true,
  slug: true,
  name: true,
  kind: true,
  pointsPerVisit: true,
  pointsPerSpend: true,
  spendStep: true,
  welcomeBonus: true,
  visitCooldownMinutes: true,
  expiryDays: true,
  birthdayReward: true,
  tiers: true,
  accentColor: true,
  terms: true,
  template: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  rewards: {
    orderBy: [{ sortOrder: 'asc' }, { cost: 'asc' }],
    select: { id: true, title: true, description: true, cost: true, isActive: true, sortOrder: true },
  },
} satisfies Prisma.LoyaltyProgramSelect;

export type LoyaltyProgramRow = Prisma.LoyaltyProgramGetPayload<{ select: typeof LOYALTY_PROGRAM_SELECT }>;

export interface LoyaltyProgramDto {
  id: string;
  restaurantId: string;
  slug: string;
  name: string;
  kind: LoyaltyKind;
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  welcomeBonus: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: string | null;
  tiers: LoyaltyTier[];
  accentColor: string | null;
  terms: string | null;
  template: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rewards: Array<{ id: string; title: string; description: string | null; cost: number; isActive: boolean; sortOrder: number }>;
}

export function toProgramDto(row: LoyaltyProgramRow): LoyaltyProgramDto {
  return {
    ...row,
    kind: normalizeKind(row.kind),
    tiers: readLoyaltyTiers(row.tiers),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadLoyaltyProgram(restaurantId: string): Promise<LoyaltyProgramRow | null> {
  return prisma.loyaltyProgram.findUnique({ where: { restaurantId }, select: LOYALTY_PROGRAM_SELECT });
}

export interface ProgramInput {
  name: string;
  kind: LoyaltyKind;
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  welcomeBonus: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: string | null;
  tiers: LoyaltyTier[];
  accentColor: string | null;
  terms: string | null;
  template: string | null;
  isActive: boolean;
  rewards: Array<{ id?: string; title: string; description?: string | null; cost: number; isActive?: boolean }>;
}

/** Problems a program would have once saved (Turkish + English messages). */
export function programInputProblems(input: ProgramInput): string[] {
  const problems: string[] = [];
  const active = input.rewards.filter((r) => r.isActive !== false);
  if (active.length === 0) problems.push('NO_ACTIVE_REWARD');
  if (input.kind === 'stamps' && input.rewards.some((r) => r.cost > LOYALTY_LIMITS.stampCostMax)) {
    problems.push('STAMP_COST_TOO_HIGH');
  }
  if (input.kind === 'points' && input.pointsPerVisit <= 0 && (input.pointsPerSpend <= 0 || input.spendStep <= 0)) {
    problems.push('NO_EARN_RULE');
  }
  if (input.kind === 'stamps' && input.welcomeBonus > LOYALTY_LIMITS.welcomeBonusMaxStamps) {
    problems.push('WELCOME_BONUS_TOO_HIGH');
  }
  return problems;
}

async function freeSlug(base: string, programId?: string): Promise<string> {
  const clean = base.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'kart';
  const taken = await prisma.loyaltyProgram.findMany({
    where: { slug: { startsWith: clean }, ...(programId ? { NOT: { id: programId } } : {}) },
    select: { slug: true },
    take: 200,
  });
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(clean)) return clean;
  for (let i = 2; i < 500; i++) if (!set.has(`${clean}-${i}`)) return `${clean}-${i}`;
  return `${clean}-${randomBytes(3).toString('hex')}`;
}

/**
 * Creates or updates the business's program and replaces its reward list.
 * Rewards keep their id when sent back (history stays linked); rewards left
 * out are deleted. The public slug is the business slug at creation.
 */
export async function saveLoyaltyProgram(restaurantId: string, input: ProgramInput): Promise<LoyaltyProgramRow> {
  const existing = await prisma.loyaltyProgram.findUnique({
    where: { restaurantId },
    select: { id: true, rewards: { select: { id: true } } },
  });
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { slug: true } });
  const data = {
    name: input.name,
    kind: input.kind,
    pointsPerVisit: input.kind === 'points' ? input.pointsPerVisit : 0,
    pointsPerSpend: input.kind === 'points' ? input.pointsPerSpend : 0,
    spendStep: input.kind === 'points' ? input.spendStep : 0,
    welcomeBonus: input.welcomeBonus,
    visitCooldownMinutes: input.visitCooldownMinutes,
    expiryDays: input.expiryDays,
    birthdayReward: input.birthdayReward,
    tiers: input.tiers.length > 0 ? (input.tiers as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    accentColor: input.accentColor,
    terms: input.terms,
    template: input.template,
    isActive: input.isActive,
  };

  const keepIds = new Set(
    input.rewards.map((r) => r.id).filter((id): id is string => Boolean(id && existing?.rewards.some((x) => x.id === id))),
  );

  return prisma.$transaction(async (tx) => {
    const program = existing
      ? await tx.loyaltyProgram.update({ where: { id: existing.id }, data, select: { id: true } })
      : await tx.loyaltyProgram.create({
          data: { ...data, restaurantId, slug: await freeSlug(restaurant?.slug ?? 'kart') },
          select: { id: true },
        });
    await tx.loyaltyReward.deleteMany({ where: { programId: program.id, id: { notIn: Array.from(keepIds) } } });
    for (let i = 0; i < input.rewards.length; i++) {
      const r = input.rewards[i];
      const values = {
        title: r.title,
        description: r.description ?? null,
        cost: r.cost,
        isActive: r.isActive !== false,
        sortOrder: i,
      };
      if (r.id && keepIds.has(r.id)) {
        await tx.loyaltyReward.update({ where: { id: r.id }, data: values });
      } else {
        await tx.loyaltyReward.create({ data: { ...values, programId: program.id } });
      }
    }
    return tx.loyaltyProgram.findUniqueOrThrow({ where: { id: program.id }, select: LOYALTY_PROGRAM_SELECT });
  });
}

// ─── members ──────────────────────────────────────────────────────────────

export const LOYALTY_MEMBER_SELECT = {
  id: true,
  code: true,
  name: true,
  phone: true,
  email: true,
  birthMonth: true,
  birthDay: true,
  marketingConsent: true,
  balance: true,
  lifetimeEarned: true,
  visits: true,
  rewardsRedeemed: true,
  lastVisitAt: true,
  lastBirthdayRewardYear: true,
  joinedVia: true,
  createdAt: true,
} satisfies Prisma.LoyaltyMemberSelect;

export type LoyaltyMemberRow = Prisma.LoyaltyMemberGetPayload<{ select: typeof LOYALTY_MEMBER_SELECT }>;

export function toMemberDto(row: LoyaltyMemberRow) {
  return {
    ...row,
    lastVisitAt: row.lastVisitAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
export type LoyaltyMemberDto = ReturnType<typeof toMemberDto>;

function newCardToken(): string {
  return randomBytes(24).toString('base64url');
}

function newCode(): string {
  let pool = randomBytes(32);
  let i = 0;
  return generateMemberCode(() => {
    if (i >= pool.length) {
      pool = randomBytes(32);
      i = 0;
    }
    return pool[i++];
  });
}

export class LoyaltyError extends Error {
  code: string;
  status: number;
  extra?: Record<string, unknown>;
  constructor(code: string, status = 400, extra?: Record<string, unknown>) {
    super(code);
    this.name = 'LoyaltyError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export interface NewMemberInput {
  name: string | null;
  phone: string;
  email: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  marketingConsent: boolean;
  joinedVia: 'qr' | 'staff';
}

/**
 * Creates a card. A phone already in the program → `PHONE_EXISTS` (409)
 * with the existing member id. The welcome bonus is booked as a `join` event.
 */
export async function createLoyaltyMember(
  program: { id: string; welcomeBonus: number },
  input: NewMemberInput,
  actor?: { id: string; source: string } | null,
): Promise<LoyaltyMemberRow & { cardToken: string }> {
  const existing = await prisma.loyaltyMember.findUnique({
    where: { programId_phone: { programId: program.id, phone: input.phone } },
    select: { id: true },
  });
  if (existing) throw new LoyaltyError('PHONE_EXISTS', 409, { memberId: existing.id });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const member = await tx.loyaltyMember.create({
          data: {
            programId: program.id,
            cardToken: newCardToken(),
            code: newCode(),
            name: input.name,
            phone: input.phone,
            email: input.email,
            birthMonth: input.birthMonth,
            birthDay: input.birthDay,
            marketingConsent: input.marketingConsent,
            balance: program.welcomeBonus,
            lifetimeEarned: program.welcomeBonus,
            joinedVia: input.joinedVia,
          },
          select: { ...LOYALTY_MEMBER_SELECT, cardToken: true },
        });
        await tx.loyaltyEvent.create({
          data: {
            programId: program.id,
            memberId: member.id,
            type: 'join',
            amount: program.welcomeBonus,
            actorId: actor?.id ?? null,
            actorSource: actor?.source ?? null,
          },
        });
        return member;
      });
    } catch (err) {
      const e = err as { code?: string; meta?: { target?: unknown } };
      if (e.code !== 'P2002') throw err;
      const target = JSON.stringify(e.meta?.target ?? '');
      if (target.includes('phone')) {
        const again = await prisma.loyaltyMember.findUnique({
          where: { programId_phone: { programId: program.id, phone: input.phone } },
          select: { id: true },
        });
        throw new LoyaltyError('PHONE_EXISTS', 409, { memberId: again?.id ?? null });
      }
      // Code or token collision: try again with fresh random values.
    }
  }
  throw new LoyaltyError('CODE_EXHAUSTED', 500);
}

/** Members matching what the staff typed or scanned (max 8). */
export async function findLoyaltyMembers(programId: string, query: LookupQuery): Promise<LoyaltyMemberRow[]> {
  switch (query.kind) {
    case 'token': {
      const m = await prisma.loyaltyMember.findFirst({
        where: { programId, cardToken: query.token },
        select: LOYALTY_MEMBER_SELECT,
      });
      return m ? [m] : [];
    }
    case 'code': {
      const m = await prisma.loyaltyMember.findUnique({
        where: { programId_code: { programId, code: query.code } },
        select: LOYALTY_MEMBER_SELECT,
      });
      return m ? [m] : [];
    }
    case 'phone': {
      const m = await prisma.loyaltyMember.findUnique({
        where: { programId_phone: { programId, phone: query.phone } },
        select: LOYALTY_MEMBER_SELECT,
      });
      return m ? [m] : [];
    }
    case 'text': {
      const digits = query.text.replace(/\D/g, '');
      return prisma.loyaltyMember.findMany({
        where: {
          programId,
          OR: [
            { name: { contains: query.text, mode: 'insensitive' } },
            ...(digits.length >= 4 ? [{ phone: { endsWith: digits } }] : []),
          ],
        },
        orderBy: [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        select: LOYALTY_MEMBER_SELECT,
        take: 8,
      });
    }
    default:
      return [];
  }
}

export type MemberSort = 'recent' | 'visits' | 'balance' | 'new';

export async function listLoyaltyMembers(
  programId: string,
  opts: { q?: string | null; sort?: MemberSort; cursor?: string | null; limit?: number; rewardReady?: boolean; minCost?: number },
) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const q = (opts.q ?? '').trim().slice(0, 60);
  const digits = q.replace(/\D/g, '');
  const where: Prisma.LoyaltyMemberWhereInput = {
    programId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { equals: q.toUpperCase().replace(/[\s-]/g, '') } },
            ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : {}),
    ...(opts.rewardReady && typeof opts.minCost === 'number' ? { balance: { gte: opts.minCost } } : {}),
  };
  const orderBy: Prisma.LoyaltyMemberOrderByWithRelationInput[] =
    opts.sort === 'visits'
      ? [{ visits: 'desc' }, { id: 'desc' }]
      : opts.sort === 'balance'
        ? [{ balance: 'desc' }, { id: 'desc' }]
        : opts.sort === 'new'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
  const [rows, total] = await prisma.$transaction([
    prisma.loyaltyMember.findMany({
      where,
      orderBy,
      select: LOYALTY_MEMBER_SELECT,
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    }),
    prisma.loyaltyMember.count({ where }),
  ]);
  const page = rows.slice(0, limit);
  return { items: page, total, nextCursor: rows.length > limit ? page[page.length - 1]?.id ?? null : null };
}

export async function memberEvents(memberId: string, take = 30) {
  return prisma.loyaltyEvent.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      type: true,
      amount: true,
      visit: true,
      spend: true,
      rewardTitle: true,
      note: true,
      createdAt: true,
    },
  });
}

// ─── balance changes ──────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

interface ProgramRules {
  id: string;
  kind: string;
  pointsPerVisit: number;
  pointsPerSpend: number;
  spendStep: number;
  visitCooldownMinutes: number;
  expiryDays: number | null;
  birthdayReward: string | null;
}

async function writeOffLapsed(
  tx: Tx,
  program: ProgramRules,
  memberId: string,
  now: Date,
  actor?: { id: string; source: string } | null,
): Promise<number> {
  if (!program.expiryDays) return 0;
  const m = await tx.loyaltyMember.findUnique({
    where: { id: memberId },
    select: { balance: true, lastVisitAt: true, createdAt: true },
  });
  if (!m) return 0;
  const lost = expiredBalance(m, program.expiryDays, now);
  if (lost <= 0) return 0;
  const res = await tx.loyaltyMember.updateMany({
    where: { id: memberId, balance: m.balance },
    data: { balance: 0 },
  });
  if (res.count === 0) return 0;
  await tx.loyaltyEvent.create({
    data: {
      programId: program.id,
      memberId,
      type: 'expire',
      amount: -lost,
      actorId: actor?.id ?? null,
      actorSource: actor?.source ?? null,
    },
  });
  return lost;
}

/** Writes off a lapsed balance outside another change (card view, lookup). */
export async function settleLapsedBalance(program: ProgramRules, memberId: string, now = new Date()): Promise<number> {
  if (!program.expiryDays) return 0;
  return prisma.$transaction((tx) => writeOffLapsed(tx, program, memberId, now));
}

async function finish(tx: Tx, memberId: string): Promise<LoyaltyMemberRow> {
  return tx.loyaltyMember.findUniqueOrThrow({ where: { id: memberId }, select: LOYALTY_MEMBER_SELECT });
}

/**
 * A visit: adds stamps / points and counts the visit. Refused with
 * `COOLDOWN` (and the minutes left) when the last visit is within the
 * program's cooldown, unless the staff confirms (`override`).
 */
export async function earnLoyalty(
  program: ProgramRules,
  memberId: string,
  input: { count?: number | null; spend?: number | null; override?: boolean; note?: string | null },
  actor: { id: string; source: string },
  now = new Date(),
): Promise<{ member: LoyaltyMemberRow; amount: number; expired: number }> {
  const amount = computeEarn(program, input);
  if (amount <= 0) throw new LoyaltyError('NOTHING_TO_ADD');
  return prisma.$transaction(async (tx) => {
    const expired = await writeOffLapsed(tx, program, memberId, now, actor);
    const cutoff = new Date(now.getTime() - program.visitCooldownMinutes * 60_000);
    const res = await tx.loyaltyMember.updateMany({
      where: {
        id: memberId,
        programId: program.id,
        ...(input.override || program.visitCooldownMinutes <= 0
          ? {}
          : { OR: [{ lastVisitAt: null }, { lastVisitAt: { lte: cutoff } }] }),
      },
      data: {
        balance: { increment: amount },
        lifetimeEarned: { increment: amount },
        visits: { increment: 1 },
        lastVisitAt: now,
      },
    });
    if (res.count === 0) {
      const m = await tx.loyaltyMember.findFirst({
        where: { id: memberId, programId: program.id },
        select: { lastVisitAt: true },
      });
      if (!m) throw new LoyaltyError('MEMBER_NOT_FOUND', 404);
      const left = cooldownRemainingMs(m.lastVisitAt, program.visitCooldownMinutes, now);
      throw new LoyaltyError('COOLDOWN', 409, { minutesLeft: Math.max(1, Math.ceil(left / 60_000)) });
    }
    await tx.loyaltyEvent.create({
      data: {
        programId: program.id,
        memberId,
        type: 'earn',
        amount,
        visit: true,
        spend: normalizeKind(program.kind) === 'points' && input.spend ? Math.trunc(input.spend) : null,
        note: input.override ? (input.note ? `override · ${input.note}` : 'override') : input.note ?? null,
        actorId: actor.id,
        actorSource: actor.source,
      },
    });
    return { member: await finish(tx, memberId), amount, expired };
  });
}

/** Gives a reward: takes its cost from the balance (never below zero). */
export async function redeemLoyaltyReward(
  program: ProgramRules,
  memberId: string,
  rewardId: string,
  actor: { id: string; source: string },
  now = new Date(),
): Promise<{ member: LoyaltyMemberRow; rewardTitle: string }> {
  const reward = await prisma.loyaltyReward.findFirst({
    where: { id: rewardId, programId: program.id, isActive: true },
    select: { id: true, title: true, cost: true },
  });
  if (!reward) throw new LoyaltyError('REWARD_NOT_FOUND', 404);
  return prisma.$transaction(async (tx) => {
    await writeOffLapsed(tx, program, memberId, now, actor);
    const res = await tx.loyaltyMember.updateMany({
      where: { id: memberId, programId: program.id, balance: { gte: reward.cost } },
      data: { balance: { decrement: reward.cost }, rewardsRedeemed: { increment: 1 } },
    });
    if (res.count === 0) {
      const exists = await tx.loyaltyMember.count({ where: { id: memberId, programId: program.id } });
      throw new LoyaltyError(exists ? 'NOT_ENOUGH_BALANCE' : 'MEMBER_NOT_FOUND', exists ? 409 : 404);
    }
    await tx.loyaltyEvent.create({
      data: {
        programId: program.id,
        memberId,
        type: 'redeem',
        amount: -reward.cost,
        rewardId: reward.id,
        rewardTitle: reward.title,
        actorId: actor.id,
        actorSource: actor.source,
      },
    });
    return { member: await finish(tx, memberId), rewardTitle: reward.title };
  });
}

/** Records the yearly birthday gift (no balance change). */
export async function giveBirthdayGift(
  program: ProgramRules,
  memberId: string,
  actor: { id: string; source: string },
  timeZone?: string | null,
  now = new Date(),
): Promise<LoyaltyMemberRow> {
  const { year } = zonedMonthYear(now, timeZone);
  return prisma.$transaction(async (tx) => {
    const m = await tx.loyaltyMember.findFirst({
      where: { id: memberId, programId: program.id },
      select: { birthMonth: true, lastBirthdayRewardYear: true },
    });
    if (!m) throw new LoyaltyError('MEMBER_NOT_FOUND', 404);
    if (!birthdayGiftAvailable(program, m, now, timeZone)) throw new LoyaltyError('BIRTHDAY_NOT_AVAILABLE', 409);
    const res = await tx.loyaltyMember.updateMany({
      where: {
        id: memberId,
        OR: [{ lastBirthdayRewardYear: null }, { lastBirthdayRewardYear: { not: year } }],
      },
      data: { lastBirthdayRewardYear: year },
    });
    if (res.count === 0) throw new LoyaltyError('BIRTHDAY_NOT_AVAILABLE', 409);
    await tx.loyaltyEvent.create({
      data: {
        programId: program.id,
        memberId,
        type: 'birthday',
        amount: 0,
        rewardTitle: program.birthdayReward,
        actorId: actor.id,
        actorSource: actor.source,
      },
    });
    return finish(tx, memberId);
  });
}

/** Manual correction (managers only); the note says why. */
export async function adjustLoyaltyBalance(
  program: ProgramRules,
  memberId: string,
  delta: number,
  note: string,
  actor: { id: string; source: string },
): Promise<LoyaltyMemberRow> {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > LOYALTY_LIMITS.adjustMax) {
    throw new LoyaltyError('INVALID_ADJUST');
  }
  return prisma.$transaction(async (tx) => {
    const res = await tx.loyaltyMember.updateMany({
      where: { id: memberId, programId: program.id, ...(delta < 0 ? { balance: { gte: -delta } } : {}) },
      data: {
        balance: { increment: delta },
        ...(delta > 0 ? { lifetimeEarned: { increment: delta } } : {}),
      },
    });
    if (res.count === 0) {
      const exists = await tx.loyaltyMember.count({ where: { id: memberId, programId: program.id } });
      throw new LoyaltyError(exists ? 'NOT_ENOUGH_BALANCE' : 'MEMBER_NOT_FOUND', exists ? 409 : 404);
    }
    await tx.loyaltyEvent.create({
      data: {
        programId: program.id,
        memberId,
        type: 'adjust',
        amount: delta,
        note: note.slice(0, LOYALTY_LIMITS.noteMax),
        actorId: actor.id,
        actorSource: actor.source,
      },
    });
    return finish(tx, memberId);
  });
}

// ─── statistics ───────────────────────────────────────────────────────────

export interface LoyaltyStats {
  members: number;
  newMembers30: number;
  activeMembers30: number;
  visits30: number;
  rewards30: number;
  returningMembers: number;
  visitedMembers: number;
  rewardReady: number;
  /** Visits per day, oldest first, last 14 days (business time zone not applied: UTC days). */
  daily: Array<{ day: string; visits: number }>;
}

export async function loyaltyStats(
  program: { id: string; rewards: Array<{ title: string; cost: number; isActive: boolean }> },
  now = new Date(),
): Promise<LoyaltyStats> {
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const since14 = new Date(now.getTime() - 13 * 86_400_000);
  since14.setUTCHours(0, 0, 0, 0);
  const minCost = activeRewards(program.rewards).map((r) => r.cost)[0] ?? null;
  const id = program.id;
  const [members, newMembers30, activeMembers30, visits30, rewards30, returningMembers, visitedMembers, rewardReady, daily] =
    await prisma.$transaction([
      prisma.loyaltyMember.count({ where: { programId: id } }),
      prisma.loyaltyMember.count({ where: { programId: id, createdAt: { gte: since30 } } }),
      prisma.loyaltyMember.count({ where: { programId: id, lastVisitAt: { gte: since30 } } }),
      prisma.loyaltyEvent.count({ where: { programId: id, type: 'earn', visit: true, createdAt: { gte: since30 } } }),
      prisma.loyaltyEvent.count({ where: { programId: id, type: 'redeem', createdAt: { gte: since30 } } }),
      prisma.loyaltyMember.count({ where: { programId: id, visits: { gte: 2 } } }),
      prisma.loyaltyMember.count({ where: { programId: id, visits: { gte: 1 } } }),
      prisma.loyaltyMember.count({
        where: { programId: id, balance: { gte: minCost ?? Number.MAX_SAFE_INTEGER } },
      }),
      prisma.$queryRaw<Array<{ day: Date; visits: bigint }>>`
        SELECT date_trunc('day', "created_at") AS "day", COUNT(*)::bigint AS "visits"
        FROM "loyalty_events"
        WHERE "program_id" = ${id} AND "type" = 'earn' AND "visit" = TRUE AND "created_at" >= ${since14}
        GROUP BY 1
      `,
    ]);
  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), Number(d.visits)]));
  const days: Array<{ day: string; visits: number }> = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    days.push({ day: d, visits: byDay.get(d) ?? 0 });
  }
  return {
    members,
    newMembers30,
    activeMembers30,
    visits30,
    rewards30,
    returningMembers,
    visitedMembers,
    rewardReady: minCost === null ? 0 : rewardReady,
    daily: days,
  };
}

export function loyaltyErrorResponseBody(err: LoyaltyError) {
  return { error: err.code, code: err.code, ...(err.extra ?? {}) };
}

/** Public origin for card / join links (never localhost in a real deploy). */
export function loyaltyPublicBaseUrl(envUrl: string | undefined = process.env.NEXT_PUBLIC_APP_URL): string {
  const normalized = envUrl?.trim().replace(/\/+$/, '');
  const isLocal = normalized ? /localhost|127\.0\.0\.1/i.test(normalized) : false;
  return normalized && !isLocal ? normalized : 'https://www.buaze.com';
}

// ─── public (customer) ────────────────────────────────────────────────────

/** A published program whose business and module are on, or null. */
export async function loadPublicLoyaltyProgram(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const program = await prisma.loyaltyProgram.findUnique({
    where: { slug },
    select: {
      ...LOYALTY_PROGRAM_SELECT,
      restaurant: { select: { name: true, isActive: true, loyaltyEnabled: true } },
    },
  });
  if (!program || !program.isActive || !program.restaurant.isActive || !program.restaurant.loyaltyEnabled) return null;
  return program;
}
export type PublicLoyaltyProgram = NonNullable<Awaited<ReturnType<typeof loadPublicLoyaltyProgram>>>;

/** What the customer's card page shows. Never the e-mail, only phone's last 2 digits. */
export async function loadPublicLoyaltyCard(token: string, now = new Date()) {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return null;
  const base = await prisma.loyaltyMember.findUnique({
    where: { cardToken: token },
    select: { id: true, program: { select: { slug: true } } },
  });
  if (!base) return null;
  const program = await loadPublicLoyaltyProgram(base.program.slug);
  if (!program) return null;
  await settleLapsedBalance(program, base.id, now);
  const [member, events] = await prisma.$transaction([
    prisma.loyaltyMember.findUniqueOrThrow({
      where: { id: base.id },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        balance: true,
        visits: true,
        lifetimeEarned: true,
        rewardsRedeemed: true,
        lastVisitAt: true,
        createdAt: true,
        birthMonth: true,
        lastBirthdayRewardYear: true,
      },
    }),
    prisma.loyaltyEvent.findMany({
      where: { memberId: base.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, type: true, amount: true, rewardTitle: true, createdAt: true },
    }),
  ]);
  return { program, member, events };
}
export type PublicLoyaltyCard = NonNullable<Awaited<ReturnType<typeof loadPublicLoyaltyCard>>>;

/** JSON-safe card for the page and its polling endpoint. */
export function toPublicCardDto(card: PublicLoyaltyCard) {
  const { program, member, events } = card;
  const firstName = member.name?.trim().split(/\s+/)[0] ?? null;
  return {
    business: { name: program.restaurant.name, color: program.accentColor ?? null },
    program: {
      slug: program.slug,
      name: program.name,
      kind: normalizeKind(program.kind),
      pointsPerVisit: program.pointsPerVisit,
      pointsPerSpend: program.pointsPerSpend,
      spendStep: program.spendStep,
      expiryDays: program.expiryDays,
      birthdayReward: program.birthdayReward,
      tiers: readLoyaltyTiers(program.tiers),
      terms: program.terms,
      rewards: activeRewards(program.rewards).map((r) => ({ id: r.id, title: r.title, description: r.description, cost: r.cost })),
    },
    member: {
      firstName,
      code: member.code,
      phoneEnd: member.phone ? member.phone.replace(/\D/g, '').slice(-2) : null,
      balance: member.balance,
      visits: member.visits,
      lifetimeEarned: member.lifetimeEarned,
      rewardsRedeemed: member.rewardsRedeemed,
      lastVisitAt: member.lastVisitAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
      birthMonth: member.birthMonth,
      lastBirthdayRewardYear: member.lastBirthdayRewardYear,
    },
    events: events.map((e) => ({ id: e.id, type: e.type, amount: e.amount, rewardTitle: e.rewardTitle, createdAt: e.createdAt.toISOString() })),
  };
}
export type PublicCardDto = ReturnType<typeof toPublicCardDto>;
