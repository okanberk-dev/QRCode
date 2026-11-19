// OpenAI helper. Uses the REST API directly over `fetch` to avoid a
// dependency on the `openai` SDK (CLAUDE.md §7: avoid new deps when the
// project already has a working pattern).
//
// Provider: `ANTHROPIC_API_KEY` (Claude) is preferred; falls back to
// `OPENAI_API_KEY`. When missing (dev / preview without
// the secret), callers should fall back to a deterministic template so
// the UI stays functional.

import * as Sentry from '@sentry/nextjs';
import { notifyOpsOfOpenAiBillingFailure } from '@/lib/email/ops-alert';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 15_000;

// OpenAI error types that indicate the operator needs to top up / fix
// billing. Production logs (1-3 May 2026) repeatedly showed
// `billing_not_active` and `insufficient_quota` while AI features
// silently fell back to templates — owners had no idea AI was offline.
// CLAUDE.md §38.12.
const OPENAI_BILLING_ERROR_TYPES = new Set([
  'billing_not_active',
  'insufficient_quota',
  'billing_hard_limit_reached',
]);

interface OpenAiErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

function hasAnthropicKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && key.length > 10;
}

/**
 * True when any AI provider is configured. The name is kept for backwards
 * compatibility with existing callers. `ANTHROPIC_API_KEY` (Claude) takes
 * priority over `OPENAI_API_KEY` when both are set.
 */
export function hasOpenAIKey(): boolean {
  if (hasAnthropicKey()) return true;
  const key = process.env.OPENAI_API_KEY;
  return !!key && key.length > 10;
}

/**
 * Calls the Anthropic Messages API. Same contract as the OpenAI path:
 * returns the text or null on any failure so callers fall back to templates.
 */
async function anthropicCompletion(
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = opts.model && opts.model.startsWith('claude') ? opts.model : ANTHROPIC_DEFAULT_MODEL;
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  if (turns.length === 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 400,
        temperature: Math.min(1, Math.max(0, opts.temperature ?? 0.7)),
        ...(system ? { system } : {}),
        messages: turns,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[anthropic] non-OK', res.status, text.slice(0, 200));
      let errorType: string | undefined;
      let errorMessage: string | undefined;
      try {
        const parsed = JSON.parse(text) as { error?: { type?: string; message?: string } };
        errorType = parsed.error?.type;
        errorMessage = parsed.error?.message;
      } catch {
        // non-JSON body
      }
      const billing =
        res.status === 402 ||
        errorType === 'billing_error' ||
        /credit balance/i.test(errorMessage ?? '');
      if (billing) {
        notifyOpsOfOpenAiBillingFailure({
          status: res.status,
          errorType: errorType ?? 'billing_error',
          message: errorMessage,
          source: model,
        }).catch(() => undefined);
      }
      Sentry.captureMessage('Anthropic non-OK response', {
        level: 'warning',
        tags: {
          service: 'anthropic',
          status: String(res.status),
          ...(errorType ? { errorType } : {}),
        },
        extra: { bodySnippet: text.slice(0, 200), model },
      });
      return null;
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = data.content
      ?.filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim();
    return content && content.length > 0 ? content : null;
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || (err as { code?: number }).code === 20);
    if (isAbort) {
      console.warn('[anthropic] request aborted (timeout)', { model });
      Sentry.captureMessage('Anthropic request aborted (timeout)', {
        level: 'warning',
        tags: { service: 'anthropic', kind: 'abort' },
        extra: { timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, model },
      });
    } else {
      console.error('[anthropic] request failed', err);
      Sentry.captureException(err, { tags: { service: 'anthropic' } });
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calls OpenAI Chat Completions. Returns the first choice's content or
 * null on any failure (missing key, non-2xx, network, timeout). Caller
 * is expected to fall back to a template when null is returned.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string | null> {
  if (hasAnthropicKey()) return anthropicCompletion(messages, opts);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model || DEFAULT_MODEL,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 400,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[openai] non-OK', res.status, text.slice(0, 200));

      // Detect billing-related failures. OpenAI returns these as 429 with
      // a structured `error.type` like `billing_not_active`. When this
      // happens, every AI feature falls back to templates silently — the
      // operator needs to know immediately so they can top up. Single
      // mail per 5 min per error type (rate-limited inside ops-alert).
      let errorType: string | undefined;
      let errorMessage: string | undefined;
      if (res.status === 429) {
        try {
          const parsed = JSON.parse(text) as OpenAiErrorBody;
          errorType = parsed.error?.type;
          errorMessage = parsed.error?.message;
        } catch {
          // Body wasn't JSON — leave fields undefined; the alert still
          // fires with `errorType: 'unknown'` so ops still gets one mail.
        }
        if (errorType && OPENAI_BILLING_ERROR_TYPES.has(errorType)) {
          // Fire-and-forget — we don't want to block the AI fallback path
          // on a mail send. Errors are swallowed inside the helper.
          notifyOpsOfOpenAiBillingFailure({
            status: res.status,
            errorType,
            message: errorMessage,
            source: opts.model || DEFAULT_MODEL,
          }).catch(() => undefined);
        }
      }

      // CLAUDE.md §26.5 — operatör görünürlüğü. Owner panelinde "AI çalışmıyor"
      // şikayeti geldiğinde Sentry'den root cause (rate limit, quota, auth)
      // hızlı tespit edilir. Body trunc'lanır (PII guard).
      Sentry.captureMessage('OpenAI non-OK response', {
        level: 'warning',
        tags: {
          service: 'openai',
          status: String(res.status),
          ...(errorType ? { errorType } : {}),
        },
        extra: { bodySnippet: text.slice(0, 200), model: opts.model || DEFAULT_MODEL },
      });
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content && content.length > 0 ? content : null;
  } catch (err) {
    // AbortError (timeout) is an *expected* operational signal — the
    // caller already falls back to a template/empty result and the user
    // sees the fallback UI without a 5xx. Routing this through
    // `console.error` + `captureException` was inflating Vercel
    // `level=error` log counts (§38.B Stage 122 audit) and creating
    // false-alarm Sentry issues that ops triaged repeatedly.
    //
    // Network errors and unexpected exceptions stay at `error` level —
    // those still warrant on-call attention.
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        (err as { code?: number }).code === 20 /* DOMException ABORT_ERR */);
    if (isAbort) {
      console.warn('[openai] request aborted (timeout)', {
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        model: opts.model || DEFAULT_MODEL,
      });
      Sentry.captureMessage('OpenAI request aborted (timeout)', {
        level: 'warning',
        tags: { service: 'openai', kind: 'abort' },
        extra: {
          timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          model: opts.model || DEFAULT_MODEL,
        },
      });
    } else {
      console.error('[openai] request failed', err);
      Sentry.captureException(err, { tags: { service: 'openai' } });
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
