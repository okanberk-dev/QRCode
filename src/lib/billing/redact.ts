import { Sensitive } from './sensitive';

/**
 * Redaction for logs and Sentry (CLAUDE.md §44, billing spec §14).
 *
 * Pure and edge-safe (no Node or Sentry import), so both Sentry configs can
 * use it. Three layers:
 *  - key-based: values under a sensitive key (normalised: lower-case, "_" and
 *    "-" removed) become "[redacted]";
 *  - value-based: PAN-like digit runs, long base64 runs and (in billing
 *    events) customer-key-shaped strings are masked inside any string;
 *  - structural: `scrubSentryEvent` drops query strings, cookies, headers
 *    (except user-agent/content-type), billing request bodies and, on billing
 *    events, every stack frame's local variables.
 */

const REDACTED = '[redacted]';

/** Lower-case and strip "_" and "-" before matching. */
export function normalizeKey(k: string): string {
  return String(k).toLowerCase().replace(/[_-]/g, '');
}

/** Normalised sensitive key names (spec §6.1). */
export const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'token',
  'cstoken',
  'tranid',
  'cstranid',
  'customerkey',
  'cscustomerkey',
  'cardnumber',
  'cardno',
  'cvv',
  'cvv2',
  'cvc',
  'pan',
  'maskedpan',
  'hashdatav2',
  'hashdata',
  'sx',
  'sxlist',
  'mitsx',
  'merchantsecretkey',
  'mitsecretkey',
  'secret',
  'cardtoken',
  'bankrequestmessage',
  'referencecode',
  'cardholdername',
  'authcode',
  'authorization',
  'cookie',
  'setcookie',
  'password',
  'idtoken',
  'totp',
  'otp',
  'stepup',
]);

// Any run of 12 or more digits (a superset of the PAN-like /\b\d{12,19}\b/),
// plus 4-4-4-n groups separated by spaces or dashes.
const PAN_GROUPED_RE = /(^|\D)\d{4}(?:[ -]\d{4}){2}[ -]\d{1,7}(?!\d)/g;
const PAN_RE = /\d{12,}/g;
// base64 / base64url runs of 40+ characters (hashes, tokens, sealed blobs).
const B64_RE = /[A-Za-z0-9+/_-]{40,}={0,2}/g;
// PayNKolay customer-key shape ([A-Z0-9]{11}), billing events only.
const CK_RE = /(^|[^A-Za-z0-9])[A-Z0-9]{11}(?![A-Za-z0-9])/g;
// Query string / fragment of an absolute URL inside free text.
const URL_QUERY_RE = /(https?:\/\/[^\s?#"'<>]*)[?#][^\s"'<>]*/g;

export interface RedactOptions {
  /** Also mask customer-key-shaped values ([A-Z0-9]{11}). */
  billing?: boolean;
}

/**
 * PAN-like digit runs → "[pan]"; base64/base64url runs ≥ 40 chars → "[b64]";
 * with `billing`, customer-key-shaped values → "[ck]".
 */
export function redactString(s: string, opts?: RedactOptions): string {
  if (typeof s !== 'string') return s;
  let out = s.replace(PAN_GROUPED_RE, '$1[pan]').replace(PAN_RE, '[pan]').replace(B64_RE, '[b64]');
  if (opts?.billing) out = out.replace(CK_RE, '$1[ck]');
  return out;
}

/** Removes "?query" and "#fragment" from a URL (or a "METHOD url" string). */
export function stripQuery(value: string): string {
  return typeof value === 'string' ? value.replace(/[?#][\s\S]*$/, '') : value;
}

function stripUrlQueries(s: string): string {
  return s.replace(URL_QUERY_RE, '$1');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SAFE_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const SAFE_CODE_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

/** An Error reduced to `{ name, code }` — never its message, cause or body. */
function errorSummary(err: Error): { name: string; code?: string } {
  const name = SAFE_NAME_RE.test(err.name) ? err.name : 'Error';
  const rawCode = (err as { code?: unknown }).code;
  const code = typeof rawCode === 'string' || typeof rawCode === 'number' ? String(rawCode) : undefined;
  return code && SAFE_CODE_RE.test(code) ? { name, code } : { name };
}

const MAX_DEPTH = 6;

interface WalkOptions {
  billing: boolean;
  stripUrls: boolean;
}

function walk(value: unknown, opts: WalkOptions, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    const masked = redactString(value, { billing: opts.billing });
    return opts.stripUrls ? stripUrlQueries(masked) : masked;
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Sensitive) return REDACTED;
  if (value instanceof Date) return value;
  if (value instanceof Error) return errorSummary(value);
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return '[binary]';
  if (depth >= MAX_DEPTH) return '[depth]';
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => walk(item, opts, depth + 1, seen));
  if (value instanceof Map) return walk(Object.fromEntries(value), opts, depth, seen);
  if (value instanceof Set) return walk([...value], opts, depth, seen);
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.has(normalizeKey(key)) ? REDACTED : walk(item, opts, depth + 1, seen);
  }
  return out;
}

/**
 * Recursively replaces values of SENSITIVE_KEYS (normalised) with
 * "[redacted]" and redactString()s every other string, depth ≤ 6. Errors
 * become `{ name, code }`, `Sensitive` becomes "[redacted]". Returns a copy.
 */
export function redactDeep<T>(value: T, opts?: RedactOptions): T {
  return walk(value, { billing: opts?.billing === true, stripUrls: false }, 0, new WeakSet()) as T;
}

const PAYNKOLAY_LOG_KEYS: ReadonlySet<string> = new Set([
  'clientreferencecode',
  'clientrefcode',
  'responsecode',
  'errorcode',
  'use3d',
  'installment',
  'status',
  'transactiontype',
]);

/**
 * Allow-list projection of a PayNKolay return/response body for logs: keeps
 * only CLIENT_REFERENCE_CODE, RESPONSE_CODE, ERROR_CODE, USE_3D, INSTALLMENT,
 * STATUS and TRANSACTION_TYPE (values ≤ 64 chars, redactString'ed) and
 * reports how many other keys were dropped.
 */
export function redactPaynkolayParams(params: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  let dropped = 0;
  for (const [key, value] of Object.entries(isRecord(params) ? params : {})) {
    if (!PAYNKOLAY_LOG_KEYS.has(normalizeKey(key))) {
      dropped += 1;
      continue;
    }
    if (typeof value === 'string') out[key] = redactString(value, { billing: true }).slice(0, 64);
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'boolean') out[key] = String(value);
    else dropped += 1;
  }
  out.droppedKeys = dropped;
  return out;
}

const BILLING_URL_RE = /\/api\/(billing|cron\/billing)|\/billing\/(tr|en)\//;
const BILLING_FRAME_RE = /(\/billing\/|\/payment\/|paynkolay|vault|card)/i;

function framesOf(container: unknown): Record<string, unknown>[] {
  if (!isRecord(container) || !Array.isArray(container.values)) return [];
  const frames: Record<string, unknown>[] = [];
  for (const value of container.values) {
    if (!isRecord(value) || !isRecord(value.stacktrace) || !Array.isArray(value.stacktrace.frames)) continue;
    for (const frame of value.stacktrace.frames) if (isRecord(frame)) frames.push(frame);
  }
  return frames;
}

/**
 * True when the event concerns billing: tag `billing` / `integration=paynkolay`,
 * a billing request URL or transaction, or a stack frame in billing/payment
 * code.
 */
export function isBillingEvent(event: unknown): boolean {
  if (!isRecord(event)) return false;
  const tags = event.tags;
  if (isRecord(tags) && (tags.billing !== undefined && tags.billing !== null && tags.billing !== false)) return true;
  if (isRecord(tags) && tags.integration === 'paynkolay') return true;
  const req = event.request;
  if (isRecord(req) && typeof req.url === 'string' && BILLING_URL_RE.test(req.url)) return true;
  if (typeof event.transaction === 'string' && BILLING_URL_RE.test(event.transaction)) return true;
  for (const frame of [...framesOf(event.exception), ...framesOf(event.threads)]) {
    const file = typeof frame.filename === 'string' ? frame.filename : typeof frame.abs_path === 'string' ? frame.abs_path : '';
    if (BILLING_FRAME_RE.test(file)) return true;
  }
  return false;
}

const KEPT_HEADERS: ReadonlySet<string> = new Set(['user-agent', 'content-type']);
const URL_DATA_KEYS = ['url', 'to', 'from', 'http.url', 'http.query', 'http.target', 'url.full', 'url.query'];

function scrubUrlData(data: Record<string, unknown>, billing: boolean): Record<string, unknown> {
  for (const key of URL_DATA_KEYS) {
    if (typeof data[key] === 'string') data[key] = key.endsWith('query') ? '' : stripQuery(data[key] as string);
  }
  return redactDeep(data, { billing });
}

/**
 * Sentry `beforeSend` / `beforeSendTransaction` helper (pure). For every event:
 *  - request: delete query_string and cookies; keep only the user-agent and
 *    content-type headers; strip "?…" from request.url; delete request.data
 *    on billing URLs/events, else redactDeep it;
 *  - transaction, breadcrumb data.url/to/from and span URLs: strip "?…";
 *  - exception values, message, logentry: redactString (billing patterns on
 *    billing events);
 *  - extra, contexts, tags, breadcrumb data: redactDeep;
 *  - billing events: every stack frame loses `vars`; other events keep them
 *    with sensitive keys redacted.
 * Mutates and returns the same event object.
 */
export function scrubSentryEvent<E>(event: E): E {
  if (!isRecord(event)) return event;
  const ev = event as Record<string, unknown>;
  const billing = isBillingEvent(ev);

  const req = ev.request;
  if (isRecord(req)) {
    delete req.query_string;
    delete req.cookies;
    if (isRecord(req.headers)) {
      const kept: Record<string, unknown> = {};
      for (const [name, value] of Object.entries(req.headers)) {
        if (KEPT_HEADERS.has(name.toLowerCase())) kept[name] = value;
      }
      req.headers = kept;
    }
    const billingUrl = typeof req.url === 'string' && BILLING_URL_RE.test(req.url);
    if (typeof req.url === 'string') req.url = stripQuery(req.url);
    if (billingUrl || billing) delete req.data;
    else if ('data' in req) req.data = redactDeep(req.data);
  }

  if (typeof ev.transaction === 'string') ev.transaction = stripQuery(ev.transaction);

  const crumbs = Array.isArray(ev.breadcrumbs)
    ? ev.breadcrumbs
    : isRecord(ev.breadcrumbs) && Array.isArray(ev.breadcrumbs.values)
      ? ev.breadcrumbs.values
      : [];
  for (const crumb of crumbs) {
    if (!isRecord(crumb)) continue;
    if (isRecord(crumb.data)) crumb.data = scrubUrlData(crumb.data, billing);
    if (typeof crumb.message === 'string') crumb.message = redactString(stripUrlQueries(crumb.message), { billing });
  }

  for (const container of [ev.exception, ev.threads]) {
    if (!isRecord(container) || !Array.isArray(container.values)) continue;
    for (const value of container.values) {
      if (isRecord(value) && typeof value.value === 'string') {
        value.value = redactString(stripUrlQueries(value.value), { billing });
      }
    }
    for (const frame of framesOf(container)) {
      if (billing) delete frame.vars;
      else if ('vars' in frame) frame.vars = redactDeep(frame.vars);
    }
  }

  if (typeof ev.message === 'string') {
    ev.message = redactString(stripUrlQueries(ev.message), { billing });
  } else if (isRecord(ev.message)) {
    for (const key of ['message', 'formatted']) {
      if (typeof ev.message[key] === 'string') ev.message[key] = redactString(ev.message[key] as string, { billing });
    }
    if ('params' in ev.message) ev.message.params = redactDeep(ev.message.params, { billing });
  }
  if (isRecord(ev.logentry)) {
    if (typeof ev.logentry.message === 'string') ev.logentry.message = redactString(ev.logentry.message, { billing });
    if ('params' in ev.logentry) ev.logentry.params = redactDeep(ev.logentry.params, { billing });
  }

  if ('extra' in ev) ev.extra = redactDeep(ev.extra, { billing });
  if ('contexts' in ev) ev.contexts = redactDeep(ev.contexts, { billing });
  if ('tags' in ev) ev.tags = redactDeep(ev.tags, { billing });

  if (Array.isArray(ev.spans)) {
    for (const span of ev.spans) {
      if (!isRecord(span)) continue;
      if (typeof span.description === 'string') span.description = stripQuery(span.description);
      if (isRecord(span.data)) span.data = scrubUrlData(span.data, billing);
    }
  }
  return event;
}

/** Sentry `beforeSendLog` helper: redactString(message) and redactDeep(attributes). */
export function scrubSentryLog<L>(log: L): L {
  if (!isRecord(log)) return log;
  const record = log as Record<string, unknown>;
  const raw = record.message;
  const text = typeof raw === 'string' || raw instanceof String ? String(raw) : null;
  const billing = text !== null && /\[billing\]|paynkolay/i.test(text);
  if (text !== null) record.message = redactString(stripUrlQueries(text), { billing });
  if ('attributes' in record) record.attributes = redactDeep(record.attributes, { billing });
  return log;
}

// Field names billing logs never carry, whatever their value (PII / bodies).
const LOG_DENY_KEYS: ReadonlySet<string> = new Set([
  'email',
  'ip',
  'ipaddress',
  'clientip',
  'useragent',
  'ua',
  'url',
  'href',
  'body',
  'form',
  'text',
  'responsetext',
  'html',
  'headers',
]);

/**
 * The only logger billing code uses: `console[level]("[billing] <event>", fields)`
 * where every field is redacted (sensitive keys, PAN/base64/customer-key
 * shapes, URL query strings) and Error objects are reduced to `{ name, code }`.
 * Allowed fields (§14): userId, paymentId, renewalId, attemptNo, state,
 * reason, code, phase, amountMinor, handle (debug only), runId.
 */
export function billingLog(level: 'info' | 'warn' | 'error', event: string, fields?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(isRecord(fields) ? fields : {})) {
    const normalized = normalizeKey(key);
    safe[key] =
      SENSITIVE_KEYS.has(normalized) || LOG_DENY_KEYS.has(normalized)
        ? REDACTED
        : walk(value, { billing: true, stripUrls: true }, 1, new WeakSet());
  }
  const line = `[billing] ${stripUrlQueries(redactString(String(event), { billing: true }))}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  sink(line, safe);
}

/**
 * Wraps an unknown error for Sentry: `new Error("<name>:<code>")` carrying
 * the original stack frames but never the original message (which may hold
 * provider text).
 */
export function safeError(err: unknown, code: string): Error {
  const name = err instanceof Error && SAFE_NAME_RE.test(err.name) ? err.name : 'Error';
  const safeCode = typeof code === 'string' && SAFE_CODE_RE.test(code) ? code : 'unknown';
  const out = new Error(`${name}:${safeCode}`);
  if (err instanceof Error && typeof err.stack === 'string') {
    const frames = err.stack.split('\n').filter((line) => /^\s+at\s/.test(line));
    out.stack = [`Error: ${name}:${safeCode}`, ...frames].join('\n');
  }
  return out;
}
