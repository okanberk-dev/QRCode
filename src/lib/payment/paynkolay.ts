import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * PayNKolay (Nkolay Ödeme Kuruluşu) virtual POS — the only card payment
 * provider (CLAUDE.md §44). Adapted from the laffogato integration, trimmed
 * to what a subscription needs: the hosted payment page and the server-side
 * transaction check. No card data ever reaches this server.
 *
 * Flow
 *   1. `buildHostedCheckout` → form fields signed with `hashDataV2`; the
 *      browser POSTs them to `${baseUrl}/Vpos` (PayNKolay's own card page,
 *      3D Secure always on).
 *   2. PayNKolay form-POSTs the outcome to `successUrl` / `failUrl`.
 *   3. That POST is NOT trusted on its own: `confirmPayment` asks the
 *      `PaymentList` service for the transaction and only a SUCCESS sale whose
 *      amount equals what we asked for counts. PayNKolay sends no
 *      server-to-server webhook.
 *
 * Amounts are integer kuruş everywhere; `1280.10` style strings exist only at
 * the API boundary (a float rounding error would change the hash).
 */

const CURRENCY_CODE = '949'; // TRY
const POS_TIMEOUT_MS = 15_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PAYNKOLAY_TEST_BASE_URL = 'https://paynkolaytest.nkolayislem.com.tr';
export const PAYNKOLAY_LIVE_BASE_URL = 'https://paynkolay.nkolayislem.com.tr';

export interface PaynkolayConfig {
  /** Panel → "sx (Token)": payment form. */
  sx: string;
  /** Panel → "sx List": transaction verification. */
  sxList: string;
  /** Panel → "Merchant Secret Key". Never sent anywhere. */
  merchantSecretKey: string;
  /** Merchant number, first field of the return hash. */
  merchantNo: string;
  baseUrl: string;
}

/** Null when PayNKolay is not configured — checkout is then unavailable. */
export function getPaynkolayConfig(): PaynkolayConfig | null {
  const sx = process.env.PAYNKOLAY_SX?.trim();
  const sxList = process.env.PAYNKOLAY_SX_LIST?.trim();
  const merchantSecretKey = process.env.PAYNKOLAY_MERCHANT_SECRET_KEY?.trim();
  const merchantNo = process.env.PAYNKOLAY_MERCHANT_NO?.trim() ?? '';
  if (!sx || !sxList || !merchantSecretKey) return null;
  const raw = process.env.PAYNKOLAY_BASE_URL?.trim();
  const baseUrl = (raw || PAYNKOLAY_TEST_BASE_URL).replace(/\/+$/, '');
  return { sx, sxList, merchantSecretKey, merchantNo, baseUrl };
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
  throw new Error(`paynkolay PaymentList: no transaction list${message ? ` (${message.slice(0, 120)})` : ''}`);
}

export type PaymentCheck =
  | { status: 'succeeded'; referenceCode: string; amountMinor: number }
  | { status: 'failed'; reason: string };

/**
 * Decides a payment from PaymentList rows. Only a SUCCESS *sale* counts; a
 * same-day cancel shows up as the same row with TRANSACTION_TYPE CANCEL.
 */
export function decidePayment(
  rows: Record<string, unknown>[],
  expectedAmountMinor: number,
  returnedReference: string,
): PaymentCheck {
  const row = returnedReference
    ? rows.find((r) => readField(r, 'REFERENCE_CODE', 'referenceCode') === returnedReference)
    : rows.find((r) => readField(r, 'STATUS', 'status').toUpperCase() === 'SUCCESS') ?? rows[0];
  if (!row) return { status: 'failed', reason: 'transaction_not_found' };
  const status = readField(row, 'STATUS', 'status').toUpperCase();
  if (status !== 'SUCCESS') return { status: 'failed', reason: `status_${(status || 'unknown').toLowerCase()}` };
  const kind = readField(row, 'TRANSACTION_TYPE', 'transactionType').toLowerCase();
  if (kind && kind !== 'sales') return { status: 'failed', reason: `transaction_${kind}` };
  const settled = paynkolayAmountToMinor(readField(row, 'AUTHORIZATION_AMOUNT', 'authorizationAmount'));
  if (settled === null || settled <= 0) return { status: 'failed', reason: 'amount_unreadable' };
  if (settled !== expectedAmountMinor) return { status: 'failed', reason: 'amount_mismatch' };
  return {
    status: 'succeeded',
    referenceCode: readField(row, 'REFERENCE_CODE', 'referenceCode') || returnedReference,
    amountMinor: settled,
  };
}

// ── POS calls ───────────────────────────────────────────────────────────────

export interface HostedCheckoutInput {
  /** Our order id — ASCII only (`clientRefCode`). */
  clientRefCode: string;
  amountMinor: number;
  successUrl: string;
  failUrl: string;
  buyerIp?: string | null;
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
  const fields: Record<string, string> = {
    sx: cfg.sx,
    clientRefCode: input.clientRefCode,
    amount: minorToPaynkolayAmount(input.amountMinor),
    currencyCode: CURRENCY_CODE,
    successUrl: input.successUrl,
    failUrl: input.failUrl,
    rnd: formatPaynkolayRnd(now),
    // Always 3D Secure: chargeback liability moves to the issuer.
    use3D: 'true',
    transactionType: 'SALES',
    cardHolderIP: input.buyerIp?.trim() || '0.0.0.0',
    customerKey: '',
  };
  // Hash over the exact strings that go into the form.
  fields.hashDataV2 = paynkolayHash(
    [fields.sx, fields.clientRefCode, fields.amount, fields.successUrl, fields.failUrl, fields.rnd, fields.customerKey],
    cfg.merchantSecretKey,
  );
  return { action: `${cfg.baseUrl}/Vpos`, fields };
}

async function queryTransactions(
  cfg: PaynkolayConfig,
  clientRefCode: string,
  from: Date,
  to: Date,
): Promise<Record<string, unknown>[]> {
  const startDate = formatPaynkolayDay(from);
  const endDate = formatPaynkolayDay(to);
  const body = new FormData();
  body.append('sx', cfg.sxList);
  body.append('startDate', startDate);
  body.append('endDate', endDate);
  body.append('clientRefCode', clientRefCode);
  // Lower-case `v` on this endpoint.
  body.append('hashDatav2', paynkolayHash([cfg.sxList, startDate, endDate, clientRefCode], cfg.merchantSecretKey));
  const res = await fetch(`${cfg.baseUrl}/Vpos/Payment/PaymentList`, {
    method: 'POST',
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(POS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`paynkolay PaymentList HTTP ${res.status}`);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('paynkolay PaymentList: response is not JSON');
  }
  return paymentListRows(json);
}

/**
 * Server-side confirmation of a returned payment. Throws when the POS cannot
 * be asked (timeout, refused key) — the caller keeps the payment pending.
 */
export async function confirmPayment(
  cfg: PaynkolayConfig,
  params: Record<string, string>,
  expected: { clientRefCode: string; amountMinor: number; createdAt: Date },
): Promise<PaymentCheck> {
  if (!verifyPaynkolayReturnHash(params, cfg.merchantSecretKey)) {
    console.warn('[paynkolay] return hash did not verify; deciding from PaymentList', {
      ref: expected.clientRefCode,
    });
  }
  const now = new Date();
  // A payment that crosses midnight lands on the previous day.
  const from = new Date(Math.min(expected.createdAt.getTime(), now.getTime() - DAY_MS));
  const rows = await queryTransactions(cfg, expected.clientRefCode, from, now);
  return decidePayment(rows, expected.amountMinor, (params.REFERENCE_CODE ?? '').trim());
}
