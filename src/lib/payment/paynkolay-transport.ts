import { resolvePaynkolayBaseUrl } from './paynkolay';

/**
 * The only way billing code talks to PayNKolay over HTTP (card list, card
 * delete, and later PaymentList / saved-card charge). Injectable so every
 * caller can be tested with a fake transport or a local fake server — tests
 * never reach the real provider.
 *
 * Rules:
 *  - multipart/form-data POST, `cache: 'no-store'`, 15 s timeout;
 *  - only to an allowed origin (by default: the allow-listed host of the
 *    configured `PAYNKOLAY_ENV`); redirects are not followed;
 *  - never logs the form or the response; errors carry fixed messages and a
 *    short code, never body text.
 */

export const PAYNKOLAY_TIMEOUT_MS = 15_000;
/** Responses larger than this are cut (card lists and payment rows are a few KB). */
const MAX_RESPONSE_CHARS = 1_000_000;

export interface PaynkolayHttpResult {
  status: number;
  contentType: string;
  text: string;
}

export interface PaynkolayTransport {
  /**
   * multipart/form-data POST, cache 'no-store', AbortSignal.timeout(timeoutMs ?? 15_000).
   * Never logs the form. Refuses any URL whose origin is not allowed.
   * Resolves with any HTTP status; rejects only with `PaynkolayTransportError`.
   */
  postForm(url: string, form: Record<string, string>, opts?: { timeoutMs?: number }): Promise<PaynkolayHttpResult>;
}

/** Non-2xx answer from PayNKolay. The message never contains the body. */
export class PaynkolayHttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number) {
    const safe = Number.isInteger(status) && status >= 0 && status < 1000 ? status : 0;
    super(`paynkolay_http_${safe}`);
    this.name = 'PaynkolayHttpError';
    this.status = safe;
    this.code = `paynkolay_http_${safe}`;
  }
}

export type PaynkolayTransportErrorCode = 'origin_not_allowed' | 'timeout' | 'network';

/** The request did not produce an HTTP answer (or was refused before sending). */
export class PaynkolayTransportError extends Error {
  readonly code: PaynkolayTransportErrorCode;
  constructor(code: PaynkolayTransportErrorCode) {
    super(`paynkolay_transport_${code}`);
    this.name = 'PaynkolayTransportError';
    this.code = code;
  }
}

export interface FetchTransportOptions {
  /** Origins (`scheme://host[:port]`) requests may go to. Read on every call. */
  allowedOrigins: () => readonly string[];
  fetchImpl?: typeof fetch;
}

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function createFetchTransport(options: FetchTransportOptions): PaynkolayTransport {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    async postForm(url, form, opts) {
      const origin = originOf(url);
      const allowed = options.allowedOrigins();
      if (!origin || !allowed.includes(origin)) throw new PaynkolayTransportError('origin_not_allowed');
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value);
      let res: Response;
      try {
        res = await doFetch(url, {
          method: 'POST',
          body,
          cache: 'no-store',
          redirect: 'manual',
          signal: AbortSignal.timeout(opts?.timeoutMs ?? PAYNKOLAY_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        throw new PaynkolayTransportError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network');
      }
      let text: string;
      try {
        text = await res.text();
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        throw new PaynkolayTransportError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network');
      }
      return {
        status: res.status,
        contentType: (res.headers.get('content-type') ?? '').toLowerCase(),
        text: text.length > MAX_RESPONSE_CHARS ? text.slice(0, MAX_RESPONSE_CHARS) : text,
      };
    },
  };
}

/** Production transport: only the allow-listed host of the configured `PAYNKOLAY_ENV`. */
export const fetchTransport: PaynkolayTransport = createFetchTransport({
  allowedOrigins: () => {
    const base = resolvePaynkolayBaseUrl();
    return base.ok ? [new URL(base.baseUrl).origin] : [];
  },
});
