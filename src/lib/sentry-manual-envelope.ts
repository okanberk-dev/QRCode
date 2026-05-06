// Stage 17 §38.88 — Sentry manual envelope POST helper.
//
// Bağlam (CLAUDE.md §38.13 A kararı):
// 5 hipotezden 4'ü §38.8 + §38.9 + §38.13'te elendi (await flush, console.error
// granularity, edge runtime mix, DSN drift). Kalan (e): SDK transport bug
// vs Vercel egress firewall. SDK Sentry.captureException eventId döndürür
// ama envelope dispatch fail eder (Sentry dashboard'da görünmez, flush()
// false döner). Hangisi olduğunu tek başına ayrıştırmak imkansız.
//
// Bu helper Sentry SDK'yı **bypass eder**: DSN'den endpoint construct edip
// elle fetch ile envelope POST atar. Sonuç:
//   - HTTP 200 → egress OK, ingest erişilebilir → SDK transport bug
//     (next step: Sentry support ticket veya SDK downgrade test)
//   - HTTP 403/401 → DSN auth fail (public key yanlış) → kanıtlanmış değil
//   - Network error / timeout → egress firewall veya Vercel function
//     egress kısıtı → Sentry support yerine Vercel ile konuş
//
// Endpoint format (Sentry envelope spec):
//   POST https://<host>/api/<projectId>/envelope/
//        ?sentry_key=<publicKey>&sentry_version=7&sentry_client=<name>/<version>
//   Content-Type: application/x-sentry-envelope
//   Body: <header_line>\n<item_header>\n<item_payload>
//
// CLAUDE.md §38.13 disipline: bu helper ÜRETİM Sentry akışına dokunmaz,
// sadece /api/sentry-test endpoint'inden çağrılır (gate ENABLE_SENTRY_TEST).

interface ParsedDsn {
  host: string;
  projectId: string;
  publicKey: string;
}

interface ManualEnvelopeResult {
  ok: boolean;
  status: number;
  statusText: string;
  bodyPreview: string | null;
  endpointHost: string;
  durationMs: number;
  error?: string;
}

function parseSentryDsn(raw: string): ParsedDsn | null {
  try {
    const url = new URL(raw);
    if (!url.username) return null;
    const projectId = url.pathname.replace(/^\//, '');
    if (!projectId) return null;
    return { host: url.host, projectId, publicKey: url.username };
  } catch {
    return null;
  }
}

function isoNow(): string {
  return new Date().toISOString();
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build a minimal Sentry envelope (header + event item) and POST it
 * directly to the ingest endpoint, bypassing the @sentry/nextjs SDK.
 *
 * `eventId` should match the Sentry event id format (32 lowercase hex).
 * Generate with `crypto.randomUUID().replace(/-/g, '')` upstream so the
 * caller can compare server-side capture vs manual POST under the same
 * id.
 */
export async function postSentryEnvelopeManually({
  dsn,
  eventId,
  message,
  environment,
  release,
  timeoutMs = 5000,
}: {
  dsn: string | undefined;
  eventId: string;
  message: string;
  environment?: string;
  release?: string;
  timeoutMs?: number;
}): Promise<ManualEnvelopeResult> {
  const startedAt = Date.now();
  const result: ManualEnvelopeResult = {
    ok: false,
    status: 0,
    statusText: '',
    bodyPreview: null,
    endpointHost: 'unset',
    durationMs: 0,
  };

  if (!dsn) {
    result.error = 'dsn_unset';
    result.durationMs = Date.now() - startedAt;
    return result;
  }
  const parsed = parseSentryDsn(dsn);
  if (!parsed) {
    result.error = 'dsn_invalid';
    result.durationMs = Date.now() - startedAt;
    return result;
  }
  result.endpointHost = parsed.host;

  // Envelope spec — header line + item header + item payload, all
  // newline-separated JSON. https://develop.sentry.dev/sdk/envelopes/
  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: isoNow(),
    sdk: { name: 'sentry.javascript.manual-buaze', version: '1.0.0' },
  });
  const itemHeader = JSON.stringify({ type: 'event', content_type: 'application/json' });
  const eventPayload = JSON.stringify({
    event_id: eventId,
    timestamp: unixNow(),
    platform: 'node',
    level: 'error',
    environment: environment ?? 'manual-diagnostic',
    release: release ?? undefined,
    logger: 'manual-envelope',
    tags: { 'sentry.diagnostic': 'manual-envelope', source: 'stage17-§38.88' },
    message: { formatted: message },
  });
  const body = `${envelopeHeader}\n${itemHeader}\n${eventPayload}`;

  const url =
    `https://${parsed.host}/api/${parsed.projectId}/envelope/` +
    `?sentry_key=${encodeURIComponent(parsed.publicKey)}` +
    `&sentry_version=7&sentry_client=sentry.javascript.manual-buaze/1.0.0`;

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
      signal: controller.signal,
    });
    result.status = res.status;
    result.statusText = res.statusText;
    result.ok = res.ok;
    // Read a short body preview for diagnostic — Sentry returns JSON on
    // both success (`{"id":"<eventId>"}`) and failure (rate limit /
    // auth). 256 char cap is enough to disambiguate without log spam.
    try {
      const text = await res.text();
      result.bodyPreview = text.slice(0, 256);
    } catch {
      result.bodyPreview = null;
    }
  } catch (err) {
    result.error =
      err instanceof Error
        ? `${err.name}: ${err.message.slice(0, 200)}`
        : 'unknown_fetch_error';
  } finally {
    clearTimeout(abortTimer);
    result.durationMs = Date.now() - startedAt;
  }

  return result;
}
