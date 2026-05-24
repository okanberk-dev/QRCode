/**
 * Lemon Squeezy REST API client (CLAUDE.md §44).
 *
 * `openai.ts` §15 paralel paterni: fetch wrapper, no SDK dep. Foundation
 * PR'da sadece skeleton — gerçek checkout/portal endpoint'leri sonraki
 * PR'da bu helper'ı tüketecek (`/v1/checkouts`, `/v1/subscriptions/[id]`,
 * `/v1/customers/[id]`).
 *
 * **Yapma**: bu helper'ı request handler içinde sync olarak çağırma —
 * Vercel serverless 10s gateway timeout var. AbortSignal ile timeout
 * (varsayılan 8s) zorunlu.
 *
 * **Yapma**: API key'i log'lama — `console.error` çıktısı Sentry `extra`
 * ile auto-capture (CLAUDE.md §40.4.PII). Error response body Lemon
 * Squeezy'den gelir, customer email içerebilir → redact before log.
 */

import * as Sentry from '@sentry/nextjs';
import { getLemonSqueezyConfig } from './config';
import type { LemonSqueezyApiError, LemonSqueezyApiResponse } from './types';

const API_BASE = 'https://api.lemonsqueezy.com/v1';
const DEFAULT_TIMEOUT_MS = 8_000;

export interface LemonSqueezyFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  timeoutMs?: number;
}

export type LemonSqueezyFetchResult<T> =
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      status: number;
      reason: 'not_configured' | 'http_error' | 'network_error' | 'invalid_response';
      errors?: LemonSqueezyApiError['errors'];
      message?: string;
    };

/**
 * Authenticated fetch wrapper. Returns `not_configured` if Lemon Squeezy
 * env vars missing — caller decides whether to 503 or graceful no-op.
 */
export async function lsFetch<T = unknown>(
  path: string,
  opts: LemonSqueezyFetchOptions = {},
): Promise<LemonSqueezyFetchResult<LemonSqueezyApiResponse<T>>> {
  const config = getLemonSqueezyConfig();
  if (!config.enabled) {
    return {
      ok: false,
      status: 503,
      reason: 'not_configured',
      message: config.disabledReason ?? 'lemon_squeezy_disabled',
    };
  }

  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let parsed: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          ok: false,
          status: response.status,
          reason: 'invalid_response',
          message: `Non-JSON body (${text.slice(0, 120)})`,
        };
      }
    }

    if (!response.ok) {
      const errors = (parsed as LemonSqueezyApiError | null)?.errors;
      // Log structured — no PII (Lemon Squeezy errors don't include
      // customer email by default, but extra-safety we redact details).
      Sentry.captureMessage('Lemon Squeezy API error', {
        level: response.status >= 500 ? 'error' : 'warning',
        tags: {
          integration: 'lemon-squeezy',
          status: String(response.status),
          path: path.split('?')[0]!.slice(0, 60),
        },
        extra: {
          method,
          errorCount: errors?.length ?? 0,
          firstErrorTitle: errors?.[0]?.title?.slice(0, 80),
        },
      });
      return {
        ok: false,
        status: response.status,
        reason: 'http_error',
        errors,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed as LemonSqueezyApiResponse<T>,
    };
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === '20');
    Sentry.captureMessage('Lemon Squeezy network error', {
      level: 'warning',
      tags: {
        integration: 'lemon-squeezy',
        kind: aborted ? 'timeout' : 'network',
      },
      extra: {
        path: path.split('?')[0]!.slice(0, 60),
        timeoutMs,
      },
    });
    return {
      ok: false,
      status: aborted ? 408 : 0,
      reason: 'network_error',
      message: aborted ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timer);
  }
}
