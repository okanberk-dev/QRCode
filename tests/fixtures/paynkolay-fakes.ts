/**
 * Test doubles for the billing / PayNKolay code (billing spec §15.1).
 * No network: the fake transport answers from per-endpoint handlers.
 * Secrets are placeholders or generated at runtime — never real values.
 */

import { randomBytes } from 'node:crypto';
import type { PaynkolayConfig } from '../../src/lib/payment/paynkolay';
import {
  PaynkolayTransportError,
  type PaynkolayHttpResult,
  type PaynkolayTransport,
} from '../../src/lib/payment/paynkolay-transport';
import type { BillingSettingsApi, BillingSettingsRow, DailyMarkerField } from '../../src/lib/billing/billing-settings';

/** A fresh random 32-byte base64 key (throwaway, per test run). */
export function randomTestKey(): string {
  return randomBytes(32).toString('base64');
}

/** Config with obviously fake credentials and a fake base URL. */
export function testConfig(overrides: Partial<PaynkolayConfig> = {}): PaynkolayConfig {
  return {
    sx: 'SX',
    sxList: 'SXL',
    merchantSecretKey: 'SECRET',
    merchantNo: '400',
    baseUrl: 'https://pos.test',
    env: 'test',
    mit: null,
    hosted3dEnforced: false,
    ...overrides,
  };
}

export interface FakeReply {
  status?: number;
  contentType?: string;
  /** JSON body (stringified) — ignored when `text` is given. */
  body?: unknown;
  text?: string;
  delayMs?: number;
  /** Reject like a transport timeout. */
  timeout?: boolean;
}

export type FakeHandler = (form: Record<string, string>, url: string) => FakeReply | Promise<FakeReply>;

export interface RecordedCall {
  url: string;
  form: Record<string, string>;
}

/**
 * Records every `{url, form}` and replies from the handler whose key is a
 * suffix of the URL path (e.g. 'CardStorageCardList'). Unknown endpoint →
 * HTTP 404 HTML.
 */
export function fakeTransport(handlers: Record<string, FakeHandler>): {
  transport: PaynkolayTransport;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const transport: PaynkolayTransport = {
    async postForm(url, form) {
      calls.push({ url, form: { ...form } });
      const path = new URL(url).pathname;
      const key = Object.keys(handlers).find((k) => path.endsWith(k));
      const reply: FakeReply = key ? await handlers[key]({ ...form }, url) : htmlReply(404);
      if (reply.delayMs) await new Promise((r) => setTimeout(r, reply.delayMs));
      if (reply.timeout) throw new PaynkolayTransportError('timeout');
      const result: PaynkolayHttpResult = {
        status: reply.status ?? 200,
        contentType: reply.contentType ?? 'application/json; charset=utf-8',
        text: reply.text ?? (reply.body === undefined ? '' : JSON.stringify(reply.body)),
      };
      return result;
    },
  };
  return { transport, calls };
}

export function jsonReply(body: unknown, status = 200): FakeReply {
  return { status, body };
}

export function htmlReply(status: number): FakeReply {
  return { status, contentType: 'text/html; charset=utf-8', text: '<!doctype html><html><body>Hata</body></html>' };
}

export interface FakeCardRow {
  Token: string;
  TranId?: string;
  Maskedpan?: string;
  CARDISSUER?: string;
  CARDBRAND?: string;
  CARD_ALIACE?: string;
  CARDTYPE?: string;
  EXP_DATE?: string;
}

/** A measured-shape card list body. */
export function cardListBody(
  rows: FakeCardRow[],
  shape: 'detail-array' | 'detail-object' | 'card-array' | 'string-wrapper' = 'detail-array',
): unknown {
  if (rows.length === 0) return { ProcReturnCode: '02', ErrMsg: 'Gecerli Kart Yok' };
  if (shape === 'detail-object') {
    return { ProcReturnCode: '00', Data: { cards: { Card: { CardFileds: { Detail: rows[0] } } } } };
  }
  if (shape === 'card-array') {
    return { ProcReturnCode: '00', Data: { cards: { Card: rows.map((r) => ({ CardFileds: { Detail: r } })) } } };
  }
  const body = { ProcReturnCode: '00', Data: { cards: { Card: { CardFileds: { Detail: rows } } } } };
  return shape === 'string-wrapper' ? { result: JSON.stringify(body) } : body;
}

/** Clock fixed at `iso`, moved only by `advance(ms)`. */
export function fixedClock(iso: string): (() => Date) & { advance(ms: number): void; set(iso: string): void } {
  let now = new Date(iso).getTime();
  const clock = (() => new Date(now)) as (() => Date) & { advance(ms: number): void; set(iso: string): void };
  clock.advance = (ms: number) => {
    now += ms;
  };
  clock.set = (next: string) => {
    now = new Date(next).getTime();
  };
  return clock;
}

/** In-memory `BillingSettingsApi` (lease, breaker, daily markers). Atomic between awaits, like SQL. */
export function fakeSettings(init: Partial<BillingSettingsRow> | null = { providerEnv: 'live' }): BillingSettingsApi & {
  row: BillingSettingsRow | null;
} {
  const row: BillingSettingsRow | null = init
    ? {
        providerEnv: init.providerEnv ?? 'live',
        breakerUntil: init.breakerUntil ?? null,
        breakerReason: init.breakerReason ?? null,
        breakerTrippedAt: init.breakerTrippedAt ?? [],
        tickLeaseId: init.tickLeaseId ?? null,
        tickLeaseUntil: init.tickLeaseUntil ?? null,
        lastDailyScanOn: init.lastDailyScanOn ?? null,
        lastRetentionOn: init.lastRetentionOn ?? null,
        referenceBackfillDoneAt: init.referenceBackfillDoneAt ?? null,
      }
    : null;
  return {
    row,
    async get() {
      return row ? { ...row, breakerTrippedAt: [...row.breakerTrippedAt] } : null;
    },
    async acquireTickLease(now, ttlMs, leaseId) {
      if (!row) return false;
      if (row.tickLeaseUntil && row.tickLeaseUntil.getTime() >= now.getTime()) return false;
      row.tickLeaseId = leaseId;
      row.tickLeaseUntil = new Date(now.getTime() + ttlMs);
      return true;
    },
    async releaseTickLease(leaseId) {
      if (row && row.tickLeaseId === leaseId) {
        row.tickLeaseId = null;
        row.tickLeaseUntil = null;
      }
    },
    async tripBreaker(now, reason, holdMs) {
      if (!row) return { trips24h: 0 };
      const cutoff = now.getTime() - 24 * 3600_000;
      row.breakerTrippedAt = [...row.breakerTrippedAt.filter((t) => t.getTime() > cutoff), now];
      row.breakerUntil = new Date(now.getTime() + holdMs);
      row.breakerReason = reason.slice(0, 40);
      return { trips24h: row.breakerTrippedAt.length };
    },
    async claimDailyMarker(field: DailyMarkerField, day: string) {
      if (!row || row[field] === day) return false;
      row[field] = day;
      return true;
    },
    invalidate() {},
  };
}
