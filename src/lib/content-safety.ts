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
 * Fallback: a narrow, high-precision keyword net for explicit death/legal
 * threats. Used when `OPENAI_API_KEY` is unset, or when the moderation
 * call itself fails (timeout/network/non-2xx) — infra failures fail OPEN
 * on the AI check (matches the reCAPTCHA soft-pass pattern, CLAUDE.md
 * §37.3) but the keyword net still applies regardless of network state.
 */

import * as Sentry from '@sentry/nextjs';

import { containsProfanity } from './profanity';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const MODERATION_MODEL = 'omni-moderation-latest';
const MODERATION_TIMEOUT_MS = 8_000;

export interface ContentSafetyResult {
  blocked: boolean;
  /** Which layer produced the block, for logging/telemetry. `null` when allowed. */
  reason: 'ai_moderation' | 'keyword_filter' | 'profanity' | null;
  /** OpenAI moderation category keys that triggered the block (empty for keyword_filter). */
  categories: string[];
}

// Deliberately short. Every phrase here must be unambiguous — a
// false-positive here blocks a legitimate reply outright with no override,
// so this net is reserved for phrases that are threats under any reading.
// This is a fallback only; the AI moderation call above is the primary
// detector and understands context/idiom far better than regex ever could.
const HARD_BLOCK_PATTERNS: RegExp[] = [
  /seni?\s+(öldür|geber+t)/iu,
  /adamlar[ıi]m[ıi]?\s+(yollar|gönderir)/iu,
  /seni\s+bulur(?:um|uz)\b/iu,
  /kan[ıi]n[ıi]?\s+dök/iu,
  /sonunu(?:zu)?\s+haz[ıi]rla/iu,
  /\bi\s*(?:will|'ll)\s+kill\s+you\b/i,
  /\bi\s*(?:will|'ll)\s+(?:hurt|destroy)\s+you\b/i,
  /\bi\s+know\s+where\s+you\s+live\b/i,
];

function keywordFlag(text: string): boolean {
  return HARD_BLOCK_PATTERNS.some((re) => re.test(text));
}

function keywordResult(text: string): ContentSafetyResult {
  return keywordFlag(text)
    ? { blocked: true, reason: 'keyword_filter', categories: [] }
    : { blocked: false, reason: null, categories: [] };
}

interface OpenAiModerationBody {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
  }>;
}

/**
 * Checks a reply body (manual, AI-drafted, or AI-drafted-and-edited) for
 * threats, harassment, hate speech, or other content that could expose
 * Buaze to legal risk. Callers MUST block the send when `blocked` is true
 * — there is no partial-allow path.
 */
export async function moderateReplyContent(text: string): Promise<ContentSafetyResult> {
  const trimmed = text.trim();
  if (!trimmed) return { blocked: false, reason: null, categories: [] };

  // Swear words in any supported language — deterministic, no API call, so
  // it also holds when OPENAI_API_KEY is missing or the moderation call fails.
  if (containsProfanity(trimmed)) {
    return { blocked: true, reason: 'profanity', categories: [] };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return keywordResult(trimmed);

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
      return keywordResult(trimmed);
    }

    const data = (await res.json()) as OpenAiModerationBody;
    const result = data.results?.[0];
    if (result?.flagged) {
      const categories = Object.entries(result.categories ?? {})
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);
      return { blocked: true, reason: 'ai_moderation', categories };
    }
    return keywordResult(trimmed);
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
    return keywordResult(trimmed);
  } finally {
    clearTimeout(timeout);
  }
}
