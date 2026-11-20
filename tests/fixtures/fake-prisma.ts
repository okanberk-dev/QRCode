/**
 * A tiny in-memory stand-in for the Prisma client calls the saved-card code
 * makes (card-vault, card-api, checkout-post, checkout-review). It supports
 * equality / null / Date matching plus `in`, `notIn`, `not`, `gte`, `gt`,
 * `lte`, `lt`, single-key `orderBy`, unique keys that throw P2002 like
 * Postgres, `$transaction(fn)` (runs fn against the same store) and a no-op
 * `$queryRaw` (the FOR UPDATE lock). `select` is ignored (whole rows are
 * returned); tests assert on the fields the code reads.
 */

import { Prisma, type PrismaClient } from '@prisma/client';

type Row = Record<string, unknown>;

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function cmp(a: unknown, b: unknown): number {
  const x = a instanceof Date ? a.getTime() : (a as number);
  const y = b instanceof Date ? b.getTime() : (b as number);
  return x < y ? -1 : x > y ? 1 : 0;
}

function matchValue(value: unknown, cond: unknown): boolean {
  if (cond === null || cond === undefined || cond instanceof Date || typeof cond !== 'object' || Array.isArray(cond)) {
    return cond === undefined ? true : cond === null ? value === null || value === undefined : same(value, cond);
  }
  const c = cond as Record<string, unknown>;
  if ('in' in c && !(c.in as unknown[]).some((v) => same(value, v))) return false;
  if ('notIn' in c && (c.notIn as unknown[]).some((v) => same(value, v))) return false;
  if ('not' in c) {
    if (c.not === null ? value === null || value === undefined : matchValue(value, c.not)) return false;
  }
  if ('gte' in c && (value === null || value === undefined || cmp(value, c.gte) < 0)) return false;
  if ('gt' in c && (value === null || value === undefined || cmp(value, c.gt) <= 0)) return false;
  if ('lte' in c && (value === null || value === undefined || cmp(value, c.lte) > 0)) return false;
  if ('lt' in c && (value === null || value === undefined || cmp(value, c.lt) >= 0)) return false;
  return true;
}

export function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'AND') {
      if (!(cond as Row[]).every((w) => matches(row, w))) return false;
    } else if (key === 'OR') {
      if (!(cond as Row[]).some((w) => matches(row, w))) return false;
    } else if (!matchValue(row[key], cond)) return false;
  }
  return true;
}

function p2002(target: string): Error {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${target}`, { code: 'P2002', clientVersion: 'fake' });
}

export interface FakeModel {
  rows: Row[];
  findUnique(args: { where: Row }): Promise<Row | null>;
  findFirst(args: { where?: Row; orderBy?: Row }): Promise<Row | null>;
  findMany(args?: { where?: Row; orderBy?: Row; take?: number }): Promise<Row[]>;
  count(args?: { where?: Row }): Promise<number>;
  create(args: { data: Row }): Promise<Row>;
  update(args: { where: Row; data: Row }): Promise<Row>;
  updateMany(args: { where?: Row; data: Row }): Promise<{ count: number }>;
  deleteMany(args?: { where?: Row }): Promise<{ count: number }>;
}

function model(name: string, opts: { id?: string; unique?: string[]; defaults?: () => Row; now: () => Date }): FakeModel {
  let seq = 0;
  const rows: Row[] = [];
  const idKey = opts.id ?? 'id';
  const sorted = (list: Row[], orderBy?: Row) => {
    if (!orderBy) return list;
    const [[key, dir]] = Object.entries(orderBy);
    return [...list].sort((a, b) => cmp(a[key], b[key]) * (dir === 'desc' ? -1 : 1));
  };
  const apply = (row: Row, data: Row) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v) && 'increment' in (v as Row)) {
        row[k] = ((row[k] as number) ?? 0) + ((v as { increment: number }).increment);
      } else if (v !== undefined) row[k] = v;
    }
    if ('updatedAt' in row) row.updatedAt = opts.now();
  };
  const checkUnique = (candidate: Row, self: Row | null) => {
    for (const key of [idKey, ...(opts.unique ?? [])]) {
      const v = candidate[key];
      if (v === null || v === undefined) continue;
      if (rows.some((r) => r !== self && same(r[key], v))) throw p2002(`${name}.${key}`);
    }
  };
  return {
    rows,
    async findUnique({ where }) {
      const r = rows.find((row) => matches(row, where));
      return r ? { ...r } : null;
    },
    async findFirst({ where, orderBy }) {
      const r = sorted(rows.filter((row) => matches(row, where)), orderBy)[0];
      return r ? { ...r } : null;
    },
    async findMany(args = {}) {
      const list = sorted(rows.filter((row) => matches(row, args.where)), args.orderBy);
      return list.slice(0, args.take ?? list.length).map((r) => ({ ...r }));
    },
    async count(args = {}) {
      return rows.filter((row) => matches(row, args.where)).length;
    },
    async create({ data }) {
      seq += 1;
      const row: Row = { ...(opts.defaults?.() ?? {}), ...(idKey === 'id' ? { id: `${name}_${seq}` } : {}), createdAt: opts.now(), ...data };
      for (const k of Object.keys(row)) if (row[k] === undefined) row[k] = null;
      checkUnique(row, null);
      rows.push(row);
      return { ...row };
    },
    async update({ where, data }) {
      const row = rows.find((r) => matches(r, where));
      if (!row) throw new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'fake' });
      const next = { ...row };
      apply(next, data);
      checkUnique(next, row);
      Object.assign(row, next);
      return { ...row };
    },
    async updateMany({ where, data }) {
      const hit = rows.filter((r) => matches(r, where));
      for (const row of hit) apply(row, data);
      return { count: hit.length };
    },
    async deleteMany(args = {}) {
      const keep = rows.filter((r) => !matches(r, args.where));
      const count = rows.length - keep.length;
      rows.splice(0, rows.length, ...keep);
      return { count };
    },
  };
}

export interface FakePrisma {
  client: PrismaClient;
  user: FakeModel;
  billingCustomer: FakeModel;
  billingCard: FakeModel;
  billingPayment: FakeModel;
  billingConsent: FakeModel;
  billingSubscription: FakeModel;
  billingRenewal: FakeModel;
  subscriptionPlan: FakeModel;
  restaurant: FakeModel;
  legalDocument: FakeModel;
}

export function fakePrisma(now: () => Date = () => new Date()): FakePrisma {
  const m = {
    user: model('user', {
      unique: ['email'],
      now,
      defaults: () => ({
        role: 'restaurant_owner',
        isActive: true,
        emailVerified: true,
        locale: 'tr',
        name: null,
        deactivatedAt: null,
        scheduledDeletionAt: null,
        lastLoginRiskScore: null,
        lastLoginRiskAt: null,
      }),
    }),
    billingCustomer: model('billingCustomer', {
      id: 'userId',
      unique: ['userId', 'customerKeyFp'],
      now,
      defaults: () => ({ provider: 'paynkolay', lastListedAt: null, retentionNoticeAt: null, updatedAt: now() }),
    }),
    billingCard: model('billingCard', {
      unique: ['handle', 'boundConsentId'],
      now,
      defaults: () => ({
        last4: null,
        brand: null,
        issuer: null,
        cardType: null,
        expMonth: null,
        expYear: null,
        alias: null,
        savedByPaymentId: null,
        boundConsentId: null,
        missingSince: null,
        lastSeenAt: now(),
        deletedAt: null,
        deleteReason: null,
        updatedAt: now(),
      }),
    }),
    billingPayment: model('billingPayment', {
      unique: ['referenceCode'],
      now,
      defaults: () => ({
        status: 'pending',
        kind: 'checkout',
        currency: 'TRY',
        providerEnv: null,
        renewalId: null,
        attemptNo: null,
        saveCard: false,
        cardAlias: null,
        cardSaveResult: null,
        autoRenewConsentId: null,
        referenceCode: null,
        completedAt: null,
        failureReason: null,
        locale: 'tr',
      }),
    }),
    billingConsent: model('billingConsent', { now, defaults: () => ({ cardId: null, effectiveAt: null, paymentId: null }) }),
    billingSubscription: model('billingSubscription', {
      id: 'userId',
      unique: ['userId'],
      now,
      defaults: () => ({ autoRenew: false, autoRenewConsentId: null, autoRenewChangedAt: null, billingAnchorDay: null, cancelAtPeriodEnd: false }),
    }),
    billingRenewal: model('billingRenewal', {
      now,
      defaults: () => ({ ownerPaymentId: null, ownerPrevState: null, lockedUntil: null, mode: 'reminder', graceEndsAt: null }),
    }),
    subscriptionPlan: model('subscriptionPlan', { now }),
    restaurant: model('restaurant', { now }),
    legalDocument: model('legalDocument', { now }),
  };
  const client = {
    ...m,
    async $transaction(fn: unknown) {
      if (typeof fn === 'function') return (fn as (tx: unknown) => Promise<unknown>)(client);
      return Promise.all(fn as Promise<unknown>[]);
    },
    async $queryRaw() {
      return [];
    },
  };
  return { client: client as unknown as PrismaClient, ...m };
}
