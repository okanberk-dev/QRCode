import { randomInt } from 'node:crypto';
import { isIPv4 } from 'node:net';
import { Sensitive, sensitive } from '@/lib/billing/sensitive';
import { redactString } from '@/lib/billing/redact';
import {
  formatPaynkolayRnd,
  minorToPaynkolayAmount,
  paynkolayHash,
  unwrapPaynkolayResult,
  type PaynkolayConfig,
} from './paynkolay';
import { PaynkolayHttpError, type PaynkolayHttpResult, type PaynkolayTransport } from './paynkolay-transport';

/**
 * PayNKolay card storage wire layer (billing spec §7): pure request builders
 * with the exact form fields and hash formulas, pure response parsers, and
 * thin async calls through an injectable transport.
 *
 *  - Tokens, TranIds and customer keys travel as `Sensitive`; `.reveal()` is
 *    called only while building the `form` that goes straight to the
 *    transport.
 *  - Parsers never put response text into an error message: a failure is
 *    `card_list_failed:<code>` with a short sanitised code.
 *  - Saved-card list/delete use the hosted `sx` and its secret. The
 *    merchant-initiated charge builder uses the MIT terminal when configured
 *    (D15); the call that sends it ships with the charging release.
 */

// ── Customer key ───────────────────────────────────────────────────────────

/** PayNKolay accepts at most 11 characters; a longer key fails with CORE0364. */
export const CUSTOMER_KEY_RE = /^[A-Z0-9]{11}$/;
const CUSTOMER_KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CUSTOMER_KEY_LENGTH = 11;

/** 11 characters, each uniform over [A-Z0-9] (crypto.randomInt by default). */
export function generateCustomerKey(randomIndex: (max: number) => number = (max) => randomInt(max)): Sensitive {
  let key = '';
  for (let i = 0; i < CUSTOMER_KEY_LENGTH; i++) {
    const index = randomIndex(CUSTOMER_KEY_ALPHABET.length);
    if (!Number.isInteger(index) || index < 0 || index >= CUSTOMER_KEY_ALPHABET.length) {
      throw new Error('paynkolay: random index out of range');
    }
    key += CUSTOMER_KEY_ALPHABET[index];
  }
  return sensitive(key);
}

function revealCustomerKey(customerKey: Sensitive): string {
  const value = customerKey.reveal();
  if (!CUSTOMER_KEY_RE.test(value)) throw new Error('paynkolay: invalid customer key');
  return value;
}

function revealToken(token: Sensitive, what: 'token' | 'tranId'): string {
  const value = token.reveal();
  if (!value || /[\r\n]/.test(value) || value.length > 512) throw new Error(`paynkolay: invalid ${what}`);
  return value;
}

// ── Request builders ───────────────────────────────────────────────────────

export interface FormRequest {
  url: string;
  form: Record<string, string>;
}

/** `${base}/Vpos/Payment/CardStorageCardList` — hash `sx|customerKey|secret`. */
export function cardListRequest(cfg: PaynkolayConfig, customerKey: Sensitive): FormRequest {
  const ck = revealCustomerKey(customerKey);
  return {
    url: `${cfg.baseUrl}/Vpos/Payment/CardStorageCardList`,
    form: {
      sx: cfg.sx,
      customerKey: ck,
      hashDatav2: paynkolayHash([cfg.sx, ck], cfg.merchantSecretKey),
    },
  };
}

/**
 * `${base}/Vpos/Payment/CardStorageCardDelete` — hash
 * `sx|customerKey|tranId|token|secret`, keeping the empty tranId slot
 * (`sx|ck||tok|secret`) when no TranId is sent.
 */
export function cardDeleteRequest(
  cfg: PaynkolayConfig,
  customerKey: Sensitive,
  token: Sensitive,
  tranId?: Sensitive | null,
): FormRequest {
  const ck = revealCustomerKey(customerKey);
  const tok = revealToken(token, 'token');
  const tid = tranId ? revealToken(tranId, 'tranId') : '';
  return {
    url: `${cfg.baseUrl}/Vpos/Payment/CardStorageCardDelete`,
    form: {
      sx: cfg.sx,
      customerKey: ck,
      token: tok,
      tranId: tid,
      hashDatav2: paynkolayHash([cfg.sx, ck, tid, tok], cfg.merchantSecretKey),
    },
  };
}

/** `installmentNo` for a single payment. [VERIFY Q-15: '1' or '0'] */
export const INSTALLMENT_SINGLE = '1';

export interface SavedCardChargeInput {
  clientRefCode: string;
  amountMinor: number;
  successUrl: string;
  failUrl: string;
  customerKey: Sensitive;
  token: Sensitive;
  /** `PAYNKOLAY_MIT_CARDHOLDER_IP` — never a stored consent IP. */
  cardHolderIp: string;
  use3D: false;
}

/**
 * Merchant-initiated (non-3D) charge of a saved card: `${base}/Vpos/v1/Payment`.
 * Uses the MIT terminal (`cfg.mit`) when configured, else the hosted `sx` —
 * and the hosted `sx` only when PayNKolay confirmed in writing that the hosted
 * page always enforces 3D (`cfg.hosted3dEnforced`). Hash:
 * `sx|clientRefCode|amount|successUrl|failUrl|rnd|csCustomerKey|secret` with
 * the secret that belongs to that `sx`. Never carries card number, CVV,
 * expiry or holder name.
 */
export function savedCardChargeRequest(cfg: PaynkolayConfig, input: SavedCardChargeInput, now: Date): FormRequest {
  const terminal = cfg.mit ?? (cfg.hosted3dEnforced ? { sx: cfg.sx, secret: cfg.merchantSecretKey } : null);
  if (!terminal) throw new Error('paynkolay: no merchant-initiated terminal');
  if (input.use3D !== false) throw new Error('paynkolay: saved-card charge must be use3D=false');
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(input.clientRefCode)) {
    throw new Error('paynkolay: clientRefCode must be ASCII [A-Za-z0-9._-]{1,64}');
  }
  if (!isIPv4(input.cardHolderIp)) throw new Error('paynkolay: cardHolderIP must be IPv4');
  const ck = revealCustomerKey(input.customerKey);
  const tok = revealToken(input.token, 'token');
  const amount = minorToPaynkolayAmount(input.amountMinor);
  const rnd = formatPaynkolayRnd(now);
  return {
    url: `${cfg.baseUrl}/Vpos/v1/Payment`,
    form: {
      sx: terminal.sx,
      clientRefCode: input.clientRefCode,
      successUrl: input.successUrl,
      failUrl: input.failUrl,
      amount,
      installmentNo: INSTALLMENT_SINGLE,
      use3D: 'false',
      transactionType: 'SALES',
      rnd,
      environment: 'API',
      currencyNumber: '949',
      cardHolderIP: input.cardHolderIp,
      csCustomerKey: ck,
      csToken: tok,
      hashDatav2: paynkolayHash(
        [terminal.sx, input.clientRefCode, amount, input.successUrl, input.failUrl, rnd, ck],
        terminal.secret,
      ),
    },
  };
}

// ── Card list parsing ──────────────────────────────────────────────────────

export interface ProviderCard {
  token: Sensitive;
  tranId: Sensitive | null;
  last4: string | null;
  brand: string | null;
  issuer: string | null;
  cardType: string | null;
  expMonth: number | null;
  expYear: number | null;
  alias: string | null;
}

export type ProviderCardList = { kind: 'empty' } | { kind: 'cards'; cards: ProviderCard[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function readScalar(row: Record<string, unknown>, ...names: string[]): string | null {
  for (const name of names) {
    const value = row[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** Short, safe code for error messages: never more than 16 [A-Za-z0-9_-] chars. */
function safeCode(raw: string | null): string {
  return raw && /^[A-Za-z0-9_-]{1,16}$/.test(raw) ? raw : 'unknown';
}

const DIGIT_RUN_12 = /[0-9]{12,}/;

/** Display text from the provider: trimmed, capped, and dropped if it holds a 12+ digit run. */
function displayText(raw: string | null, maxLength: number): string | null {
  if (!raw) return null;
  if (DIGIT_RUN_12.test(raw)) return null;
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return text || null;
}

/** Last 4 digits of a masked PAN ("545616******5454" → "5454"); everything else is discarded. */
export function last4FromMasked(masked: string | null | undefined): string | null {
  if (typeof masked !== 'string') return null;
  const m = /([0-9]{4})\s*$/.exec(masked);
  return m ? m[1] : null;
}

function validExp(month: number, year: number): { month: number; year: number } | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2099) return null;
  return { month, year };
}

/**
 * Card expiry from the list row. Accepts MMYY, MM/YY, MM/YYYY, YYYYMM and
 * YYMM (MMYY wins when both read as valid). [VERIFY Q-9]
 */
export function parseExpDate(raw: string | null | undefined): { month: number; year: number } | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  let m = /^(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    return validExp(Number(m[1]), year);
  }
  m = /^(\d{4})(\d{2})$/.exec(s);
  if (m) return validExp(Number(m[2]), Number(m[1]));
  m = /^(\d{2})(\d{2})$/.exec(s);
  if (m) return validExp(Number(m[1]), 2000 + Number(m[2])) ?? validExp(Number(m[2]), 2000 + Number(m[1]));
  return null;
}

function toProviderCard(row: Record<string, unknown>): ProviderCard | null {
  const token = readScalar(row, 'Token', 'TOKEN', 'token');
  if (!token) return null;
  const tranId = readScalar(row, 'TranId', 'TRANID', 'TRAN_ID', 'tranId');
  const exp = parseExpDate(readScalar(row, 'EXP_DATE', 'ExpDate', 'EXPDATE'));
  const brand = displayText(readScalar(row, 'CARDBRAND', 'CardBrand'), 24);
  const cardType = displayText(readScalar(row, 'CARDTYPE', 'CardType'), 16);
  return {
    token: sensitive(token),
    tranId: tranId ? sensitive(tranId) : null,
    last4: last4FromMasked(readScalar(row, 'Maskedpan', 'MaskedPan', 'MASKEDPAN')),
    brand: brand ? brand.toUpperCase() : null,
    issuer: displayText(readScalar(row, 'CARDISSUER', 'CardIssuer'), 64),
    cardType: cardType ? cardType.toLowerCase() : null,
    expMonth: exp?.month ?? null,
    expYear: exp?.year ?? null,
    alias: displayText(readScalar(row, 'CARD_ALIACE', 'CARD_ALIAS', 'CardAlias'), 32),
  };
}

/**
 * `CardStorageCardList` response → cards.
 *  - `ProcReturnCode "02"` (or ErrMsg "Geçerli Kart Yok") ⇒ empty;
 *  - `"00"` ⇒ rows at `Data.cards.Card(.CardFileds.Detail)`, where `Card` and
 *    `Detail` may each be an object or an array (the key really is spelled
 *    `CardFileds`); rows without a non-empty Token are skipped; display
 *    values holding a 12+ digit run are dropped;
 *  - anything else ⇒ throws `card_list_failed:<code>` — never body text.
 */
export function parseCardList(payload: unknown): ProviderCardList {
  const body = unwrapPaynkolayResult(payload);
  if (!isRecord(body)) throw new Error('card_list_failed:unparsable');
  const code = readScalar(body, 'ProcReturnCode', 'procReturnCode', 'PROC_RETURN_CODE');
  const errMsg = readScalar(body, 'ErrMsg', 'errMsg', 'ERR_MSG') ?? '';
  if (code === '02' || /ge[cç]erli kart yok/i.test(errMsg)) return { kind: 'empty' };
  if (code !== '00') throw new Error(`card_list_failed:${safeCode(code)}`);
  const data = isRecord(body.Data) ? body.Data : isRecord(body.data) ? body.data : null;
  const cardsNode = data && (isRecord(data.cards) ? data.cards : isRecord(data.Cards) ? data.Cards : null);
  const cards: ProviderCard[] = [];
  for (const card of asList(cardsNode?.Card ?? cardsNode?.card)) {
    if (!isRecord(card)) continue;
    const fields = isRecord(card.CardFileds) ? card.CardFileds : isRecord(card.CardFields) ? card.CardFields : null;
    const rows = fields ? asList(fields.Detail ?? fields.detail) : [card];
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const parsed = toProviderCard(row);
      if (parsed) cards.push(parsed);
    }
  }
  return { kind: 'cards', cards };
}

/** Advisory only: the truth is a re-list that no longer shows the card. [VERIFY Q-10] */
export function parseCardDelete(payload: unknown): { providerAccepted: boolean; code: string } {
  const body = unwrapPaynkolayResult(payload);
  if (!isRecord(body)) return { providerAccepted: false, code: 'unparsable' };
  const code = safeCode(readScalar(body, 'ProcReturnCode', 'procReturnCode', 'RESPONSE_CODE', 'ResponseCode'));
  return { providerAccepted: code === '00', code };
}

// ── Card identity (handles) ────────────────────────────────────────────────

/**
 * Card identity used for handles. Decided once from sandbox step §16.2-2
 * (Q-9) and recorded in docs/PAYNKOLAY_CARDS.md:
 *  'token'      → Token (only if stable across list calls),
 *  'composite'  → CARD_ALIACE|last4|EXP_DATE|TranId (TranId stable, Token not),
 *  'attributes' → CARD_ALIACE|last4|EXP_DATE (neither stable).
 */
export type CardIdentityStrategy = 'token' | 'composite' | 'attributes';
export const CARD_IDENTITY_STRATEGY: CardIdentityStrategy = 'composite';

export function cardIdentity(card: ProviderCard, strategy: CardIdentityStrategy = CARD_IDENTITY_STRATEGY): Sensitive {
  if (strategy === 'token') return sensitive(card.token.reveal());
  const exp = card.expMonth && card.expYear ? `${String(card.expMonth).padStart(2, '0')}${card.expYear}` : '';
  const attributes = `${card.alias ?? ''}|${card.last4 ?? ''}|${exp}`;
  if (strategy === 'attributes') return sensitive(attributes);
  return sensitive(`${attributes}|${card.tranId ? card.tranId.reveal() : ''}`);
}

// ── Direct-charge response parsing ─────────────────────────────────────────

/** Stays false until sandbox step §16.2-5 proves an HTML 200 body always means "3D required". */
export const HTML_200_MEANS_3D: boolean = false;

export type DirectChargeOutcome =
  /** NOT trusted — only a PaymentList SUCCESS row settles a payment. */
  | { kind: 'approved_claimed'; referenceCode: string | null }
  /** Explicit decline in a JSON body; safeMessage ≤ 80 chars, no digit runs ≥ 6. */
  | { kind: 'declined'; errorCode: string | null; safeMessage: string | null }
  | { kind: 'three_d_required' }
  /** Never a decline: a missing confirmation is not "not charged". */
  | { kind: 'unknown'; why: 'timeout' | 'http_status' | 'html' | 'unparsable' | 'empty' };

function safeDeclineMessage(raw: string | null): string | null {
  if (!raw) return null;
  const text = redactString(raw.replace(/[0-9]{6,}/g, ''), { billing: true })
    .replace(/[0-9]{6,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return text || null;
}

function isTrue(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

/**
 * Synchronous answer of a saved-card charge → outcome. Non-2xx ⇒
 * unknown('http_status'); HTML (content type or a body starting with "<") ⇒
 * unknown('html') (three_d_required only for status 200 once
 * HTML_200_MEANS_3D is proven); JSON ⇒ three_d_required (BANK_REQUEST_MESSAGE
 * or USE_3D=true), declined (ERROR_CODE), approved_claimed (RESPONSE_CODE 2 /
 * 00); anything else ⇒ unknown. [VERIFY Q-6]
 */
export function parseDirectCharge(res: PaynkolayHttpResult | null): DirectChargeOutcome {
  if (!res) return { kind: 'unknown', why: 'empty' };
  if (!Number.isInteger(res.status) || res.status < 200 || res.status > 299) return { kind: 'unknown', why: 'http_status' };
  const text = (res.text ?? '').trim();
  if ((res.contentType ?? '').includes('text/html') || text.startsWith('<')) {
    return res.status === 200 && HTML_200_MEANS_3D ? { kind: 'three_d_required' } : { kind: 'unknown', why: 'html' };
  }
  if (!text) return { kind: 'unknown', why: 'empty' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: 'unknown', why: 'unparsable' };
  }
  const body = unwrapPaynkolayResult(json);
  if (!isRecord(body)) return { kind: 'unknown', why: 'unparsable' };
  if (readScalar(body, 'BANK_REQUEST_MESSAGE', 'bankRequestMessage') || isTrue(body.USE_3D) || isTrue(body.use3D)) {
    return { kind: 'three_d_required' };
  }
  const errorCode = readScalar(body, 'ERROR_CODE', 'errorCode');
  if (errorCode && errorCode !== '0' && errorCode !== '00') {
    return {
      kind: 'declined',
      errorCode: safeCode(errorCode) === 'unknown' ? null : errorCode,
      safeMessage: safeDeclineMessage(readScalar(body, 'ERROR_MESSAGE', 'RESPONSE_DATA', 'errorMessage')),
    };
  }
  const responseCode = readScalar(body, 'RESPONSE_CODE', 'responseCode');
  if (responseCode === '2' || responseCode === '00') {
    return { kind: 'approved_claimed', referenceCode: readScalar(body, 'REFERENCE_CODE', 'referenceCode') };
  }
  return { kind: 'unknown', why: 'unparsable' };
}

// ── Thin async calls ───────────────────────────────────────────────────────

function parseJsonBody(res: PaynkolayHttpResult, failure: string): unknown {
  if (res.status < 200 || res.status > 299) throw new PaynkolayHttpError(res.status);
  try {
    return JSON.parse(res.text);
  } catch {
    throw new Error(`${failure}:unparsable`);
  }
}

/** Lists the customer's saved cards. Throws on transport/HTTP/shape failures (never with body text). */
export async function listSavedCards(
  cfg: PaynkolayConfig,
  t: PaynkolayTransport,
  ck: Sensitive,
): Promise<ProviderCardList> {
  const req = cardListRequest(cfg, ck);
  const res = await t.postForm(req.url, req.form);
  return parseCardList(parseJsonBody(res, 'card_list_failed'));
}

/** Deletes one saved card. Advisory result; callers verify with a re-list. */
export async function deleteSavedCard(
  cfg: PaynkolayConfig,
  t: PaynkolayTransport,
  ck: Sensitive,
  token: Sensitive,
): Promise<{ providerAccepted: boolean; code: string }> {
  const req = cardDeleteRequest(cfg, ck, token);
  const res = await t.postForm(req.url, req.form);
  return parseCardDelete(parseJsonBody(res, 'card_delete_failed'));
}
