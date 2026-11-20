import { createHash, timingSafeEqual } from 'node:crypto';
import { billingLog, redactString } from '@/lib/billing/redact';
import type { Sensitive } from '@/lib/billing/sensitive';
import type { PaynkolayHttpResult, PaynkolayTransport } from './paynkolay-transport';

/**
 * PayNKolay (Nkolay Ödeme Kuruluşu) virtual POS — the only card payment
 * provider (CLAUDE.md §44). Adapted from the laffogato integration, trimmed
 * to what a subscription needs: the hosted payment page and the server-side
 * transaction check. No card data ever reaches this server.
 *
 * Flow
 *   1. `buildHostedCheckout` → form fields signed with `hashDataV2`; the
 *      browser POSTs them to `${baseUrl}/Vpos` (PayNKolay's own card page,
 *      3D Secure requested; `use3D` is unsigned, see billing spec §3.3).
 *   2. PayNKolay form-POSTs the outcome to `successUrl` / `failUrl`.
 *   3. That POST is NOT trusted on its own: `confirmPayment` asks the
 *      `PaymentList` service for the transaction and `decidePayment` decides
 *      (billing spec §7.3): only a SUCCESS sale for exactly this
 *      clientRefCode, of the exact amount, counts. PayNKolay sends no
 *      server-to-server webhook.
 *
 * Amounts are integer kuruş everywhere; `1280.10` style strings exist only at
 * the API boundary (a float rounding error would change the hash).
 */

const CURRENCY_CODE = '949'; // TRY
const DAY_MS = 24 * 60 * 60 * 1000;

export const PAYNKOLAY_TEST_BASE_URL = 'https://paynkolaytest.nkolayislem.com.tr';
export const PAYNKOLAY_LIVE_BASE_URL = 'https://paynkolay.nkolayislem.com.tr';

/** The two PayNKolay environments. Each maps to exactly one allow-listed host. */
export type PaynkolayEnv = 'live' | 'test';

/** Host allow-list: these two origins, `https` only, no path. Nothing else is ever called. */
export const PAYNKOLAY_BASE_URLS: Readonly<Record<PaynkolayEnv, string>> = Object.freeze({
  live: PAYNKOLAY_LIVE_BASE_URL,
  test: PAYNKOLAY_TEST_BASE_URL,
});

export interface PaynkolayConfig {
  /** Panel → "sx (Token)": payment form, card list and card delete. */
  sx: string;
  /** Panel → "sx List": transaction verification. */
  sxList: string;
  /** Panel → "Merchant Secret Key". Never sent anywhere. */
  merchantSecretKey: string;
  /** Merchant number, first field of the return hash. */
  merchantNo: string;
  /** Always one of `PAYNKOLAY_BASE_URLS`, the one that belongs to `env`. */
  baseUrl: string;
  /** `PAYNKOLAY_ENV`: which PayNKolay environment this deployment talks to. */
  env: PaynkolayEnv;
  /**
   * Separate merchant-initiated (non-3D) terminal (`PAYNKOLAY_MIT_SX` +
   * `PAYNKOLAY_MIT_SECRET_KEY`), used only server-to-server. Null unless both
   * are set.
   */
  mit: { sx: string; secret: string } | null;
  /**
   * `PAYNKOLAY_HOSTED_3D_ENFORCED=confirmed`: PayNKolay confirmed in writing
   * that the hosted page always enforces 3D Secure, so the hosted `sx` may be
   * used for merchant-initiated API charges when no MIT terminal exists.
   */
  hosted3dEnforced: boolean;
}

/** Anything shaped like `process.env` (tests pass plain objects). */
export type EnvSource = Readonly<Record<string, string | undefined>>;

export type PaynkolayBaseUrlResult =
  | { ok: true; env: PaynkolayEnv; baseUrl: string }
  | { ok: false; reason: 'missing_env' | 'invalid_env' | 'base_url_not_allowed' };

/**
 * The allow-listed base URL for `PAYNKOLAY_ENV` (needs no secret, so it also
 * works at build time). `PAYNKOLAY_ENV` is required in every environment —
 * there is no default host, so a missing or mistyped value never silently
 * sends owners to the TEST host (or test traffic to the live one).
 * `PAYNKOLAY_BASE_URL` is optional; when set it must equal that host exactly.
 */
export function resolvePaynkolayBaseUrl(env: EnvSource = process.env): PaynkolayBaseUrlResult {
  // Back-compat: deployments configured before PAYNKOLAY_ENV existed name
  // the host only. An exact allow-listed PAYNKOLAY_BASE_URL selects its env.
  const inferred = (Object.keys(PAYNKOLAY_BASE_URLS) as Array<keyof typeof PAYNKOLAY_BASE_URLS>).find(
    (k) => PAYNKOLAY_BASE_URLS[k] === env.PAYNKOLAY_BASE_URL?.trim().replace(/\/+$/, ''),
  );
  const rawEnv = env.PAYNKOLAY_ENV?.trim() || inferred;
  if (!rawEnv) return { ok: false, reason: 'missing_env' };
  if (rawEnv !== 'live' && rawEnv !== 'test') return { ok: false, reason: 'invalid_env' };
  const allowed = PAYNKOLAY_BASE_URLS[rawEnv];
  const rawBase = env.PAYNKOLAY_BASE_URL?.trim();
  if (rawBase && rawBase.replace(/\/+$/, '') !== allowed) return { ok: false, reason: 'base_url_not_allowed' };
  return { ok: true, env: rawEnv, baseUrl: allowed };
}

/**
 * Null when PayNKolay is not configured — checkout is then unavailable.
 * Requires an explicit, allow-listed `PAYNKOLAY_ENV` plus the three secrets.
 */
export function getPaynkolayConfig(env: EnvSource = process.env): PaynkolayConfig | null {
  const base = resolvePaynkolayBaseUrl(env);
  if (!base.ok) return null;
  const sx = env.PAYNKOLAY_SX?.trim();
  const sxList = env.PAYNKOLAY_SX_LIST?.trim();
  const merchantSecretKey = env.PAYNKOLAY_MERCHANT_SECRET_KEY?.trim();
  const merchantNo = env.PAYNKOLAY_MERCHANT_NO?.trim() ?? '';
  if (!sx || !sxList || !merchantSecretKey) return null;
  const mitSx = env.PAYNKOLAY_MIT_SX?.trim();
  const mitSecret = env.PAYNKOLAY_MIT_SECRET_KEY?.trim();
  return {
    sx,
    sxList,
    merchantSecretKey,
    merchantNo,
    baseUrl: base.baseUrl,
    env: base.env,
    mit: mitSx && mitSecret ? { sx: mitSx, secret: mitSecret } : null,
    hosted3dEnforced: env.PAYNKOLAY_HOSTED_3D_ENFORCED?.trim() === 'confirmed',
  };
}

/**
 * Whether public pages may advertise card checkout. Reads only the non-secret
 * `PAYNKOLAY_ENV` (+ optional `PAYNKOLAY_BASE_URL`), so prerendered pricing
 * pages never need the runtime-only secrets. The checkout routes still need
 * the full `getPaynkolayConfig()` and answer `unavailable` without it.
 */
export function paynkolayAdvertised(env: EnvSource = process.env): boolean {
  return resolvePaynkolayBaseUrl(env).ok;
}

// ── Pure helpers (tests/paynkolay.test.ts) ─────────────────────────────────

/** Kuruş integer → `"1280.10"` (dot, two decimals, no thousands separator). */
export function minorToPaynkolayAmount(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`paynkolay: invalid amount (kuruş): ${amountMinor}`);
  }
  const lira = Math.trunc(amountMinor / 100);
  const kurus = amountMinor % 100;
  return `${lira}.${String(kurus).padStart(2, '0')}`;
}

/** `"1280.10"` / `"1280,1"` → 128010; unreadable → null (never 0). */
export function paynkolayAmountToMinor(amount: string | null | undefined): number | null {
  const m = /^\s*(\d{1,15})(?:[.,](\d{1,2}))?\s*$/.exec(amount ?? '');
  if (!m) return null;
  const minor = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Every PayNKolay hash: fields joined by `|`, secret appended, raw SHA-512 → Base64. */
export function paynkolayHash(parts: readonly string[], merchantSecretKey: string): string {
  return createHash('sha512').update([...parts, merchantSecretKey].join('|'), 'utf8').digest('base64');
}

const ISTANBUL = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function istanbulParts(at: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of ISTANBUL.formatToParts(at)) if (part.type !== 'literal') out[part.type] = part.value;
  return out;
}

/** `rnd` field: `dd.MM.yyyy HH:mm:ss`, Europe/Istanbul. */
export function formatPaynkolayRnd(at: Date): string {
  const c = istanbulParts(at);
  return `${c.day}.${c.month}.${c.year} ${c.hour}:${c.minute}:${c.second}`;
}

/** `DD.MM.YYYY` — PaymentList date range. */
export function formatPaynkolayDay(at: Date): string {
  const c = istanbulParts(at);
  return `${c.day}.${c.month}.${c.year}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * `hashDataV2` on the return POST. A mismatch is logged but not decisive —
 * the transaction query is the source of truth.
 */
export function verifyPaynkolayReturnHash(
  params: Record<string, string>,
  merchantSecretKey: string,
): boolean {
  const given = (params.hashDataV2 ?? params.hashDatav2 ?? '').trim();
  if (!given) return false;
  const base = [
    params.MERCHANT_NO ?? '',
    params.REFERENCE_CODE ?? '',
    params.AUTH_CODE ?? '',
    params.RESPONSE_CODE ?? '',
    params.USE_3D ?? '',
    params.RND ?? '',
    params.INSTALLMENT ?? '',
    params.AUTHORIZATION_AMOUNT ?? '',
  ];
  const currencies = params.CURRENCY_CODE != null ? [params.CURRENCY_CODE] : [CURRENCY_CODE, ''];
  return currencies.some((currency) => safeEqual(paynkolayHash([...base, currency], merchantSecretKey), given));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readField(row: Record<string, unknown>, ...names: string[]): string {
  for (const name of names) {
    const value = row[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

/** Responses wrap the body in `result`, sometimes as a JSON string. */
export function unwrapPaynkolayResult(payload: unknown): unknown {
  let current = payload;
  for (let depth = 0; depth < 3; depth++) {
    if (!isRecord(current) || !('result' in current)) return current;
    const inner = current.result;
    if (typeof inner === 'string') {
      try {
        current = JSON.parse(inner) as unknown;
      } catch {
        return current;
      }
    } else if (isRecord(inner) || Array.isArray(inner)) {
      current = inner;
    } else {
      return current;
    }
  }
  return current;
}

/**
 * Transaction rows of a PaymentList response. "No record" (`CORE0305`) is an
 * empty list; any other unreadable answer THROWS — not being able to ask the
 * POS is not the same as "unpaid".
 */
export function paymentListRows(payload: unknown): Record<string, unknown>[] {
  const body = unwrapPaynkolayResult(payload);
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) throw new Error('paynkolay PaymentList: unreadable response');
  for (const value of Object.values(body)) {
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  if (readField(body, 'REFERENCE_CODE', 'referenceCode')) return [body];
  const message = readField(body, 'RESPONSE_DATA', 'ERROR_MESSAGE', 'responseData');
  const errorCode = readField(body, 'ERROR_CODE');
  if (
    'LIST' in body &&
    (errorCode === 'CORE0305' || (!errorCode && (!message || /kay[ıi]t bulunamad/i.test(message))))
  ) {
    return [];
  }
  // Provider text: truncated and redacted (billing spec §14.2).
  const detail = message ? ` (${redactString(message.slice(0, 120), { billing: true })})` : '';
  throw new Error(`paynkolay PaymentList: no transaction list${detail}`);
}

/** Legacy shape kept for code that has not moved to `PaymentDecision` yet. */
export type PaymentCheck =
  | { status: 'succeeded'; referenceCode: string; amountMinor: number }
  | { status: 'failed'; reason: string };

/**
 * PaymentList statuses that prove a transaction did not go through. Initial
 * set; finalised from Q-20 / sandbox step §16.2-5. Anything else that is not
 * SUCCESS is "in progress / unknown" and never counts as a failure.
 */
export const TERMINAL_FAILURE_STATUSES: ReadonlySet<string> = new Set([
  'FAIL',
  'FAILED',
  'ERROR',
  'DECLINED',
  'REJECTED',
  'CANCELED',
  'CANCELLED',
]);

/**
 * PaymentList field names this code reads. `required` stays false until the
 * row schema is verified (Q-20): a missing optional field skips its check; a
 * field marked required but missing makes the decision `indeterminate`.
 */
export const PAYMENT_LIST_FIELDS = {
  clientRef: ['CLIENT_REFERENCE_CODE', 'clientRefCode', 'clientReferenceCode'],
  reference: ['REFERENCE_CODE', 'referenceCode'],
  status: ['STATUS', 'status'],
  type: ['TRANSACTION_TYPE', 'transactionType'],
  amount: ['AUTHORIZATION_AMOUNT', 'authorizationAmount'],
  currency: { names: ['CURRENCY_CODE', 'CURRENCY', 'currencyCode'], required: false },
  threeD: { names: ['USE_3D', 'IS_3D', 'use3D'], required: false },
  installment: { names: ['INSTALLMENT', 'installment', 'INSTALLMENT_COUNT'], required: false },
} as const;

export type PaymentDecision =
  | { kind: 'succeeded'; referenceCode: string | null; amountMinor: number }
  /** PayNKolay charged this clientRefCode more than once: settle once, alert, refund. */
  | { kind: 'duplicate'; referenceCode: string | null; amountMinor: number; successCount: number }
  /** ≥ 1 matching row, all in TERMINAL_FAILURE_STATUSES, no SUCCESS. */
  | { kind: 'failed'; reason: string }
  /** No row for this clientRefCode. */
  | { kind: 'not_found' }
  /** A matching row in a non-terminal / unknown status. */
  | { kind: 'indeterminate'; status: string }
  | {
      kind: 'charged_mismatch';
      reason: 'amount' | 'currency' | 'installment' | 'not_3d' | 'type';
      referenceCode: string | null;
    };

export interface ExpectedPayment {
  clientRefCode: string;
  amountMinor: number;
  /** Hosted-page payment (`checkout` / `renewal_link`): also needs 3D, one instalment (§3.3). */
  hosted: boolean;
}

function readOptional(row: Record<string, unknown>, names: readonly string[]): string | null {
  for (const name of names) {
    if (!(name in row)) continue;
    const value = row[name];
    if (value === null || value === undefined) continue;
    return typeof value === 'string' ? value.trim() : String(value);
  }
  return null;
}

function isFalseFlag(value: string): boolean {
  return /^(false|0|no|n)$/i.test(value.trim());
}

const SALES_TYPES = new Set(['', 'SALES', 'SALE']);

/**
 * Decides a payment from PaymentList rows (billing spec §7.3).
 *  1. Only rows whose CLIENT_REFERENCE_CODE equals the payment id count, so
 *     correctness never depends on PaymentList honouring the filter.
 *  2. SUCCESS sales: amount (and currency, and for hosted payments 3D +
 *     single instalment) must match, else `charged_mismatch`; more than one
 *     → `duplicate`; exactly one → `succeeded`.
 *  3. A SUCCESS row of another type (REFUND, CANCEL, …) → `charged_mismatch('type')`.
 *  4. No SUCCESS: every row terminal → `failed`; anything else → `indeterminate`.
 *  5. No matching row → `not_found`.
 * `returnedReference` only picks between matching SUCCESS rows; it can never
 * select a row of another clientRefCode.
 */
export function decidePayment(
  rows: Record<string, unknown>[],
  expected: ExpectedPayment,
  returnedReference?: string | null,
): PaymentDecision {
  const matching = rows.filter(
    (row) => isRecord(row) && readField(row, ...PAYMENT_LIST_FIELDS.clientRef) === expected.clientRefCode,
  );
  if (matching.length === 0) return { kind: 'not_found' };

  const statusOf = (row: Record<string, unknown>) => readField(row, ...PAYMENT_LIST_FIELDS.status).toUpperCase();
  const typeOf = (row: Record<string, unknown>) => readField(row, ...PAYMENT_LIST_FIELDS.type).toUpperCase();
  const refOf = (row: Record<string, unknown>) => readField(row, ...PAYMENT_LIST_FIELDS.reference) || null;

  const successes = matching.filter((row) => statusOf(row) === 'SUCCESS');
  if (successes.length > 0) {
    const sales = successes.filter((row) => SALES_TYPES.has(typeOf(row)));
    const other = successes.find((row) => !SALES_TYPES.has(typeOf(row)));
    if (other) return { kind: 'charged_mismatch', reason: 'type', referenceCode: refOf(other) };

    for (const row of sales) {
      const ref = refOf(row);
      const settled = paynkolayAmountToMinor(readField(row, ...PAYMENT_LIST_FIELDS.amount));
      if (settled === null || settled !== expected.amountMinor) {
        return { kind: 'charged_mismatch', reason: 'amount', referenceCode: ref };
      }
      const currency = readOptional(row, PAYMENT_LIST_FIELDS.currency.names);
      if (currency === null && PAYMENT_LIST_FIELDS.currency.required) return { kind: 'indeterminate', status: 'SUCCESS' };
      if (currency !== null && currency !== '' && currency !== CURRENCY_CODE && currency.toUpperCase() !== 'TRY') {
        return { kind: 'charged_mismatch', reason: 'currency', referenceCode: ref };
      }
      if (expected.hosted) {
        const threeD = readOptional(row, PAYMENT_LIST_FIELDS.threeD.names);
        if (threeD === null && PAYMENT_LIST_FIELDS.threeD.required) return { kind: 'indeterminate', status: 'SUCCESS' };
        if (threeD !== null && isFalseFlag(threeD)) return { kind: 'charged_mismatch', reason: 'not_3d', referenceCode: ref };
        const installment = readOptional(row, PAYMENT_LIST_FIELDS.installment.names);
        if (installment !== null && !['', '0', '1'].includes(installment)) {
          return { kind: 'charged_mismatch', reason: 'installment', referenceCode: ref };
        }
      }
    }

    const wanted = returnedReference?.trim();
    const chosen = (wanted && sales.find((row) => refOf(row) === wanted)) || sales[0];
    if (sales.length > 1) {
      return { kind: 'duplicate', referenceCode: refOf(chosen), amountMinor: expected.amountMinor, successCount: sales.length };
    }
    return { kind: 'succeeded', referenceCode: refOf(chosen), amountMinor: expected.amountMinor };
  }

  const statuses = matching.map(statusOf);
  if (statuses.every((status) => TERMINAL_FAILURE_STATUSES.has(status))) {
    return { kind: 'failed', reason: `provider:${statuses[0].toLowerCase()}` };
  }
  const open = statuses.find((status) => !TERMINAL_FAILURE_STATUSES.has(status)) ?? '';
  return { kind: 'indeterminate', status: open.replace(/[^A-Z0-9_]/g, '').slice(0, 24) || 'UNKNOWN' };
}

/** Maps a `PaymentDecision` to the legacy `PaymentCheck` (only `succeeded`/`duplicate` settle). */
export function paymentDecisionToCheck(decision: PaymentDecision): PaymentCheck {
  switch (decision.kind) {
    case 'succeeded':
    case 'duplicate':
      return { status: 'succeeded', referenceCode: decision.referenceCode ?? '', amountMinor: decision.amountMinor };
    case 'failed':
      return { status: 'failed', reason: decision.reason };
    case 'not_found':
      return { status: 'failed', reason: 'transaction_not_found' };
    case 'indeterminate':
      return { status: 'failed', reason: `status_${decision.status.toLowerCase()}` };
    case 'charged_mismatch':
      return { status: 'failed', reason: `mismatch_${decision.reason}` };
  }
}

// ── POS calls ───────────────────────────────────────────────────────────────

export interface HostedCheckoutInput {
  /** Our order id — ASCII only (`clientRefCode`). */
  clientRefCode: string;
  amountMinor: number;
  successUrl: string;
  failUrl: string;
  buyerIp?: string | null;
  /**
   * The owner's PayNKolay customer key (D13): sent only on a payment that
   * saves a card (or, once PAYNKOLAY_HOSTED_CARD_SELECT is on, to offer a
   * verified saved card). It is covered by hashDataV2; empty otherwise.
   */
  customerKey?: Sensitive | null;
  /** Ask PayNKolay to store the card (`csAutoSave=true` + `csCardAlias`). Needs `customerKey`. */
  saveCard?: boolean;
  /** `csCardAlias`, `Buaze-XXXXXX` (≤ 20 chars of [A-Za-z0-9-]); used to recognise the saved card. */
  cardAlias?: string;
}

const HOSTED_CUSTOMER_KEY_RE = /^[A-Z0-9]{11}$/;
export const CARD_ALIAS_RE = /^[A-Za-z0-9-]{1,20}$/;

/** `csCardAlias` of a payment: `Buaze-` + the last 6 alphanumeric characters of its id, upper-cased. */
export function cardAliasFor(paymentId: string): string {
  const alias = `Buaze-${paymentId.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`;
  if (!CARD_ALIAS_RE.test(alias)) throw new Error('paynkolay: invalid card alias');
  return alias;
}

/** Fields for the auto-submitted form to `${baseUrl}/Vpos`. */
export function buildHostedCheckout(
  cfg: PaynkolayConfig,
  input: HostedCheckoutInput,
  now: Date = new Date(),
): { action: string; fields: Record<string, string> } {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(input.clientRefCode)) {
    throw new Error('paynkolay: clientRefCode must be ASCII [A-Za-z0-9._-]{1,64}');
  }
  let customerKey = '';
  if (input.customerKey) {
    customerKey = input.customerKey.reveal();
    if (!HOSTED_CUSTOMER_KEY_RE.test(customerKey)) throw new Error('paynkolay: invalid customer key');
  }
  if (input.saveCard) {
    if (!customerKey) throw new Error('paynkolay: saving a card needs a customer key');
    if (!input.cardAlias || !CARD_ALIAS_RE.test(input.cardAlias)) throw new Error('paynkolay: invalid card alias');
  }
  const fields: Record<string, string> = {
    sx: cfg.sx,
    clientRefCode: input.clientRefCode,
    amount: minorToPaynkolayAmount(input.amountMinor),
    currencyCode: CURRENCY_CODE,
    successUrl: input.successUrl,
    failUrl: input.failUrl,
    rnd: formatPaynkolayRnd(now),
    // Requests 3D Secure, but `use3D` is NOT covered by hashDataV2 and can be
    // edited in the browser, so it is no guarantee (billing spec §3.3): the
    // hosted `sx` must never hold Non-Secure permission, and confirmation
    // must come from the PaymentList row.
    use3D: 'true',
    transactionType: 'SALES',
    cardHolderIP: input.buyerIp?.trim() || '0.0.0.0',
    customerKey,
  };
  if (input.saveCard) {
    // Not covered by hashDataV2 (billing spec §3.3): a card stored without these is never bound or charged (D1).
    fields.csAutoSave = 'true';
    fields.csCardAlias = input.cardAlias as string;
  }
  // Hash over the exact strings that go into the form.
  fields.hashDataV2 = paynkolayHash(
    [fields.sx, fields.clientRefCode, fields.amount, fields.successUrl, fields.failUrl, fields.rnd, fields.customerKey],
    cfg.merchantSecretKey,
  );
  return { action: `${cfg.baseUrl}/Vpos`, fields };
}

/**
 * Daily-scan date-range query without `clientRefCode` (billing spec §9 phase 7).
 * The hash for this request shape is unverified (Q-16), so the scan stays off
 * and this function refuses to run until sandbox step §16.2-8 confirms it.
 */
export const PAYMENT_LIST_RANGE_VERIFIED: boolean = false;

function paymentListResult(res: PaynkolayHttpResult): Record<string, unknown>[] {
  if (res.status < 200 || res.status > 299) throw new Error(`paynkolay PaymentList HTTP ${Number.isInteger(res.status) ? res.status : 0}`);
  let json: unknown;
  try {
    json = JSON.parse(res.text);
  } catch {
    throw new Error('paynkolay PaymentList: response is not JSON');
  }
  return paymentListRows(json);
}

/** PaymentList rows for one `clientRefCode` (sxList; hash `sxList|startDate|endDate|clientRefCode|secret`). Throws when the POS cannot be asked. */
export async function queryPaymentList(
  cfg: PaynkolayConfig,
  transport: PaynkolayTransport,
  clientRefCode: string,
  from: Date,
  to: Date,
): Promise<Record<string, unknown>[]> {
  const startDate = formatPaynkolayDay(from);
  const endDate = formatPaynkolayDay(to);
  const res = await transport.postForm(`${cfg.baseUrl}/Vpos/Payment/PaymentList`, {
    sx: cfg.sxList,
    startDate,
    endDate,
    clientRefCode,
    // Lower-case `v` on this endpoint.
    hashDatav2: paynkolayHash([cfg.sxList, startDate, endDate, clientRefCode], cfg.merchantSecretKey),
  });
  return paymentListResult(res);
}

/** PaymentList rows for a date range (daily scan). Refuses until Q-16 is verified. [VERIFY Q-16] */
export async function queryPaymentListRange(
  cfg: PaynkolayConfig,
  transport: PaynkolayTransport,
  from: Date,
  to: Date,
): Promise<Record<string, unknown>[]> {
  if (!PAYMENT_LIST_RANGE_VERIFIED) throw new Error('paynkolay PaymentList: range query not verified (Q-16)');
  const startDate = formatPaynkolayDay(from);
  const endDate = formatPaynkolayDay(to);
  const res = await transport.postForm(`${cfg.baseUrl}/Vpos/Payment/PaymentList`, {
    sx: cfg.sxList,
    startDate,
    endDate,
    clientRefCode: '',
    hashDatav2: paynkolayHash([cfg.sxList, startDate, endDate, ''], cfg.merchantSecretKey),
  });
  return paymentListResult(res);
}

/** A payment that crosses midnight lands on the previous day: query from one day before. */
function queryWindow(createdAt: Date, now: Date): Date {
  return new Date(Math.min(createdAt.getTime(), now.getTime() - DAY_MS));
}

/**
 * Server-side confirmation of a returned hosted payment. The return hash is
 * checked for logging only; PaymentList decides. Throws when the POS cannot be
 * asked (timeout, refused key) — the caller keeps the payment pending.
 */
export async function confirmPayment(
  cfg: PaynkolayConfig,
  params: Record<string, string>,
  expected: { clientRefCode: string; amountMinor: number; createdAt: Date },
  transport: PaynkolayTransport,
  now: Date = new Date(),
): Promise<PaymentDecision> {
  if (!verifyPaynkolayReturnHash(params, cfg.merchantSecretKey)) {
    billingLog('warn', 'paynkolay.return_hash_unverified', { paymentId: expected.clientRefCode });
  }
  const rows = await queryPaymentList(cfg, transport, expected.clientRefCode, queryWindow(expected.createdAt, now), now);
  return decidePayment(
    rows,
    { clientRefCode: expected.clientRefCode, amountMinor: expected.amountMinor, hosted: true },
    (params.REFERENCE_CODE ?? '').trim() || null,
  );
}

/**
 * PaymentList decision for any stored payment (reconciliation, the engine,
 * the renewal_auto return). `renewal_auto` is merchant-initiated (no 3D);
 * every other kind is a hosted payment.
 */
export async function confirmCharge(
  cfg: PaynkolayConfig,
  transport: PaynkolayTransport,
  expected: { clientRefCode: string; amountMinor: number; createdAt: Date; kind: string },
  now: Date = new Date(),
  returnedReference?: string | null,
): Promise<PaymentDecision> {
  const rows = await queryPaymentList(cfg, transport, expected.clientRefCode, queryWindow(expected.createdAt, now), now);
  return decidePayment(
    rows,
    { clientRefCode: expected.clientRefCode, amountMinor: expected.amountMinor, hosted: expected.kind !== 'renewal_auto' },
    returnedReference ?? null,
  );
}
