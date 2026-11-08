/**
 * Reply content safety gate.
 *
 * Owner + admin replies to reviews go out under the Buaze brand (email
 * sender, Google Business Profile reply, in-app record). A threat,
 * defamation, or otherwise unlawful sentence in that reply is a legal
 * exposure for Buaze, not just the business that sent it — so this is a
 * hard block, not a warning: there is no override, no "send anyway".
 *
 * Primary detector: OpenAI's Moderation endpoint (`omni-moderation-latest`),
 * purpose-built for exactly this (harassment/threatening, hate/threatening,
 * violence, illicit/violent, self-harm, sexual/minors — multi-language,
 * including Turkish). Free to call, no `OPENAI_API_KEY` billing quota
 * consumed (CLAUDE.md §15.1 AI_QUOTAS do NOT apply here — this is a safety
 * control, not a generative feature; gating it behind a user-facing quota
 * would open a bypass window once quota is exhausted).
 *
 * Deterministic layer first: `checkReplyRisk` (src/lib/reply-risk.ts) —
 * swear words, insults, threats, legal intimidation, slurs, review pressure,
 * personal data, links outside the business's saved hosts, markup and
 * look-alike / invisible characters. It needs no network, so it holds when
 * OPENAI_API_KEY is missing or the moderation call fails (infra failures fail
 * OPEN on the AI check only — the reCAPTCHA soft-pass pattern, CLAUDE.md §37.3).
 */

import * as Sentry from '@sentry/nextjs';

import { checkReplyRisk, type ReplyRiskKind, type ReplyRiskOptions } from './reply-risk';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const MODERATION_MODEL = 'omni-moderation-latest';
const MODERATION_TIMEOUT_MS = 8_000;

export interface ContentSafetyResult {
  blocked: boolean;
  /** Which layer / rule produced the block, for logging and owner copy. `null` when allowed. */
  reason: ReplyRiskKind | 'ai_moderation' | null;
  /**
   * Deterministic issues (every rule that matched) or the OpenAI moderation
   * category keys that triggered the block.
   */
  categories: string[];
}

const ALLOWED: ContentSafetyResult = { blocked: false, reason: null, categories: [] };

interface OpenAiModerationBody {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
  }>;
}

/**
 * Checks a reply body (manual, AI-drafted, or AI-drafted-and-edited) for
 * anything that could expose Buaze to legal or sender-reputation risk.
 * Callers MUST block the send when `blocked` is true — there is no
 * partial-allow path. Pass the business's saved hosts as `allowedHosts`
 * (`allowedHostsFromUrls`); without them every link except buaze.com blocks.
 */
export async function moderateReplyContent(
  text: string,
  opts: Pick<ReplyRiskOptions, 'allowedHosts'> = {},
): Promise<ContentSafetyResult> {
  const trimmed = text.trim();
  if (!trimmed) return ALLOWED;

  const risk = checkReplyRisk(trimmed, { allowedHosts: opts.allowedHosts ?? [] });
  if (risk.blocked) {
    return { blocked: true, reason: risk.issues[0], categories: risk.issues };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return ALLOWED;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_MODERATION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Moderation input is capped by the caller (reply body max lengths are
      // already 2000/4096 chars) — no additional truncation needed here.
      body: JSON.stringify({ model: MODERATION_MODEL, input: trimmed }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error('[content-safety] moderation non-OK', res.status);
      Sentry.captureMessage('Content moderation non-OK response', {
        level: 'warning',
        tags: { service: 'openai-moderation', status: String(res.status) },
      });
      return ALLOWED;
    }

    const data = (await res.json()) as OpenAiModerationBody;
    const result = data.results?.[0];
    if (result?.flagged) {
      const categories = Object.entries(result.categories ?? {})
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);
      return { blocked: true, reason: 'ai_moderation', categories };
    }
    return ALLOWED;
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || (err as { code?: number }).code === 20);
    if (isAbort) {
      console.warn('[content-safety] moderation request timed out', {
        timeoutMs: MODERATION_TIMEOUT_MS,
      });
      Sentry.captureMessage('Content moderation request timed out', {
        level: 'warning',
        tags: { service: 'openai-moderation', kind: 'abort' },
      });
    } else {
      console.error('[content-safety] moderation request failed', err);
      Sentry.captureException(err, { tags: { service: 'openai-moderation' } });
    }
    return ALLOWED;
  } finally {
    clearTimeout(timeout);
  }
}
