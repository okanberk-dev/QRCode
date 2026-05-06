import * as Sentry from '@sentry/nextjs';

/**
 * Defensive `JSON.parse` wrapper that captures parse failures to Sentry
 * with a small body snippet for debugging instead of throwing.
 *
 * Why: production has shown a `SyntaxError: Invalid character '�'`
 * (Sentry issue `buaze-ev/sentry-apricot-blanket-2`) without enough
 * context to find the source. Threading every risky parse through this
 * helper attaches a `kind: json-parse-failure` tag plus the first 200
 * characters of the raw payload so the next occurrence is debuggable
 * from the dashboard alone. CLAUDE.md §5.4 Task 5 + §38.8.
 *
 * Returns `null` on failure — callers must decide whether to fall back
 * to a default, surface a 4xx, or skip the operation. Throwing was
 * intentionally rejected: most existing callsites already handle empty
 * data gracefully (AI replies fall back to templates, OAuth state
 * triggers a redirect with `state-parse-failure`), so a thrown error
 * would just become a 500 the user can't act on.
 *
 * PII guard: the snippet is capped at 200 chars. Callers must NOT pass
 * raw payloads that contain access tokens, refresh tokens, request
 * bodies, or cookies. The same discipline is enforced elsewhere by
 * `maskGoogleUrl` (`src/lib/google-business.ts`) and the recaptcha
 * `buildSoftPassSentryEnvelope` PII check.
 */
export function safeParseJson<T = unknown>(
  raw: string,
  ctx?: Record<string, unknown>,
): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { kind: 'json-parse-failure' },
      extra: {
        rawSnippet: typeof raw === 'string' ? raw.slice(0, 200) : null,
        rawLength: typeof raw === 'string' ? raw.length : null,
        ...(ctx ?? {}),
      },
    });
    // Local breadcrumb so the failure also lands in Vercel runtime logs
    // even if Sentry's serverless flush race drops the envelope (CLAUDE.md
    // §38.8 — server-side Sentry flush kör nokta is still open).
    //
    // Stage 17 §38.87 — `console.warn` (not `console.error`): bu helper
    // tüm caller'larda fail-safe fallback path'inde (template / empty
    // result) kullanılıyor. Status 200, kullanıcı etkilenmiyor — Vercel
    // runtime log "error" sayısını şişiriyordu (son 24h'de 9 entry,
    // hepsi expected fallback). `warn` seviyesi aynı görünürlükte
    // kalır ama `level=error` filter'ında temiz olur.
    console.warn('[safe-json] parse failed', {
      message: err instanceof Error ? err.message : 'unknown',
      rawLength: typeof raw === 'string' ? raw.length : null,
      ...(ctx ?? {}),
    });
    return null;
  }
}
