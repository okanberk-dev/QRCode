import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { SignJWT, importPKCS8 } from 'jose';
import { getClientIp, blockKey, isBlocked } from '@/lib/rate-limit';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const PROJECT_ID =
  process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID ||
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const MIN_SCORE = Number(process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE || '0.5');
const SERVICE_ACCOUNT_JSON = process.env.RECAPTCHA_ENTERPRISE_SERVICE_ACCOUNT_JSON?.trim();
const API_KEY = process.env.RECAPTCHA_ENTERPRISE_API_KEY?.trim();
// Monitor mode (default): never block users on reCAPTCHA failures, just log
// the reason. Flip RECAPTCHA_ENFORCE=true once dashboards confirm scores
// are healthy. Mirrors Stripe Radar / Cloudflare Turnstile rollout pattern.
const ENFORCE = (process.env.RECAPTCHA_ENFORCE ?? 'false').toLowerCase() === 'true';

// Auth-path latency budget. reCAPTCHA sits on the critical path of every
// login / Google sign-in / register request; a slow Google edge must not
// hold the user hostage. On timeout we fall through to `softFail` (monitor
// mode passes, enforce mode rejects) instead of hanging the request.
const ASSESSMENT_TIMEOUT_MS = Number(process.env.RECAPTCHA_ASSESSMENT_TIMEOUT_MS || '4000');

const RECAPTCHA_REST_BASE = 'https://recaptchaenterprise.googleapis.com/v1';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

type RecaptchaSuccess = {
  ok: true;
  skipped?: boolean;
  score?: number;
  assessmentName?: string;
  reasons?: string[];
};

type RecaptchaFailure = {
  ok: false;
  error: string;
  status: number;
};

type RecaptchaLocale = 'tr' | 'en';

const MESSAGES = {
  missing: {
    tr: 'Güvenlik doğrulaması eksik.',
    en: 'Security check is missing.',
  },
  invalid: {
    tr: 'Güvenlik doğrulaması geçersiz.',
    en: 'Security check is invalid.',
  },
  mismatch: {
    tr: 'Güvenlik doğrulaması eşleşmedi.',
    en: 'Security check did not match.',
  },
  lowScore: {
    tr: 'İstek güvenli görünmüyor. Lütfen tekrar deneyin.',
    en: 'This request looks suspicious. Please try again.',
  },
  failure: {
    tr: 'Güvenlik doğrulaması sırasında hata oluştu.',
    en: 'Security check failed unexpectedly.',
  },
  botBlocked: {
    tr: 'Bot davranışı saptandı. Erişiminiz geçici olarak engellendi.',
    en: 'Automated/bot behaviour detected. Access is temporarily blocked.',
  },
} as const;

// Risk reasons that reCAPTCHA Enterprise emits when it is highly confident
// the request is automated. These ALWAYS block, regardless of monitor mode.
// Reference: https://cloud.google.com/recaptcha-enterprise/docs/reference/rest/v1/projects.assessments#ClassificationReason
const HARD_BLOCK_REASONS = new Set([
  'AUTOMATION',
  'MALWARE',
  'SCRAPING',
  'SUSPICIOUS_NETWORK',
  'UNEXPECTED_ENVIRONMENT',
]);

// Score threshold below which we treat the request as a clear bot regardless
// of explicit reasons. Tuned conservatively — 0.1 = "we're sure this is a bot".
const HARD_BLOCK_SCORE = 0.1;

// How long a hard-blocked IP stays banned (1 hour). Bypasses ENFORCE flag.
const BOT_BAN_WINDOW_MS = 60 * 60 * 1000;

function botBanKey(ip: string) {
  return `recaptcha-bot-ban:${ip}`;
}

function hasCriticalBotSignal(score: number, reasons: string[]): boolean {
  if (score <= HARD_BLOCK_SCORE) return true;
  return reasons.some((r) => HARD_BLOCK_REASONS.has(r));
}

const msg = (key: keyof typeof MESSAGES, locale: RecaptchaLocale) =>
  MESSAGES[key][locale];

// ---------------------------------------------------------------------------
// Transport — plain REST over `fetch`.
//
// The previous implementation instantiated `@google-cloud/recaptcha-enterprise`
// (google-gax + grpc-js + protobufjs, several MB of JS). On a Vercel cold
// start that meant ~1–2 s of module evaluation plus a gRPC channel handshake
// and an OAuth2 exchange before the FIRST assessment could even be sent — and
// it sat directly on the login / Google sign-in critical path. The REST API
// is a single HTTPS round-trip with the exact same request/response shape.
//
// Credential precedence (unchanged from the gRPC client):
//   1. `RECAPTCHA_ENTERPRISE_SERVICE_ACCOUNT_JSON` → self-signed JWT assertion
//      (jose RS256) → short-lived Google access token, cached in memory until
//      ~1 min before expiry so warm instances pay 0 extra round-trips.
//   2. `RECAPTCHA_ENTERPRISE_API_KEY`             → `?key=` query parameter.
// ---------------------------------------------------------------------------

type ServiceAccount = { client_email: string; private_key: string };

let serviceAccountCache: ServiceAccount | null | undefined;

function getServiceAccount(): ServiceAccount | null {
  if (serviceAccountCache !== undefined) return serviceAccountCache;
  if (!SERVICE_ACCOUNT_JSON) {
    serviceAccountCache = null;
    return null;
  }
  try {
    const parsed = JSON.parse(SERVICE_ACCOUNT_JSON) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) {
      serviceAccountCache = null;
      return null;
    }
    serviceAccountCache = {
      client_email: parsed.client_email,
      // Vercel env UI stores the key with literal "\n" sequences; normalise so
      // PEM parsing works regardless of how the operator pasted it.
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    };
    return serviceAccountCache;
  } catch (error) {
    console.error('[recaptcha] invalid service account json', error);
    serviceAccountCache = null;
    return null;
  }
}

let accessTokenCache: { token: string; expiresAt: number } | null = null;
let accessTokenInflight: Promise<string> | null = null;

async function mintServiceAccountAccessToken(sa: ServiceAccount, signal: AbortSignal): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(sa.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: CLOUD_PLATFORM_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`token exchange failed (${res.status}) ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('token exchange returned no access_token');
  const ttlMs = Math.max(60, (data.expires_in ?? 3600) - 60) * 1000;
  accessTokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

async function getServiceAccountAccessToken(sa: ServiceAccount, signal: AbortSignal): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) return accessTokenCache.token;
  if (!accessTokenInflight) {
    accessTokenInflight = mintServiceAccountAccessToken(sa, signal).finally(() => {
      accessTokenInflight = null;
    });
  }
  return accessTokenInflight;
}

type RestAuth =
  | { kind: 'bearer'; token: string }
  | { kind: 'apiKey'; key: string }
  | null;

async function resolveRestAuth(signal: AbortSignal): Promise<RestAuth> {
  const sa = getServiceAccount();
  if (sa) {
    return { kind: 'bearer', token: await getServiceAccountAccessToken(sa, signal) };
  }
  if (API_KEY) return { kind: 'apiKey', key: API_KEY };
  return null;
}

async function recaptchaRest<T>(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  const auth = await resolveRestAuth(signal);
  if (!auth) throw new Error('no reCAPTCHA Enterprise credentials configured');

  const url = new URL(`${RECAPTCHA_REST_BASE}/${path}`);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.kind === 'apiKey') url.searchParams.set('key', auth.key);
  else headers.Authorization = `Bearer ${auth.token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Google wraps errors as { error: { code, message, status } } — surface
    // the status token (PERMISSION_DENIED etc.) so ops can act on it.
    let summary = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { error?: { status?: string; message?: string } };
      if (parsed.error?.status || parsed.error?.message) {
        summary = `${parsed.error.status ?? ''} ${parsed.error.message ?? ''}`.trim().slice(0, 200);
      }
    } catch {
      // keep raw slice
    }
    throw new Error(`recaptcha REST ${res.status}: ${summary}`);
  }
  return (await res.json()) as T;
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

interface AssessmentResponse {
  name?: string;
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    action?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
}

export function isRecaptchaServerConfigured(): boolean {
  return Boolean(SITE_KEY && PROJECT_ID);
}

/**
 * Build the Sentry capture envelope for a soft-passed reCAPTCHA decision.
 * Pure for testing — see `tests/recaptcha.test.ts`.
 *
 * PII guard: callers only pass numeric scores, enum-like reasons, the
 * expected action, and Google's invalidReason / typeof checks. IP is
 * never threaded into `detail`. We keep the same shape here.
 */
export function buildSoftPassSentryEnvelope(
  reason: string,
  detail: Record<string, unknown>,
): {
  level: 'warning';
  tags: { reason: string; action?: string };
  extra: Record<string, unknown>;
} {
  return {
    level: 'warning',
    tags: {
      reason,
      ...(typeof detail.action === 'string' && { action: detail.action }),
    },
    extra: { ...detail },
  };
}

function softFail(
  reason: string,
  detail: Record<string, unknown>,
  failure: RecaptchaFailure,
): RecaptchaSuccess | RecaptchaFailure {
  if (ENFORCE) return failure;
  console.warn(`[recaptcha] ${reason} — soft-pass (set RECAPTCHA_ENFORCE=true to block)`, detail);
  // Görev C Faz 1: emit a Sentry breadcrumb on every soft-pass so we can
  // measure how often each reason fires before flipping RECAPTCHA_ENFORCE
  // to `true` in production. Tagged so dashboards can break down by
  // {reason, action}. PII-safe: caller details never include IP, token,
  // or user identifiers — see CLAUDE.md §37.3 #2.
  Sentry.captureMessage('reCAPTCHA soft-pass', buildSoftPassSentryEnvelope(reason, detail));
  return { ok: true, skipped: true };
}

export async function verifyRecaptchaToken(
  req: NextRequest,
  token: unknown,
  expectedAction: string,
  locale: RecaptchaLocale = 'tr',
): Promise<RecaptchaSuccess | RecaptchaFailure> {
  // Hard block IPs we previously flagged as bots — bypasses monitor mode
  // because the signal was already high-confidence at flag-time.
  const ip = getClientIp(req.headers);
  if (isBlocked(botBanKey(ip))) {
    console.warn('[recaptcha] hard-blocked IP retried', { ip, action: expectedAction });
    return { ok: false, error: msg('botBlocked', locale), status: 429 };
  }

  if (!isRecaptchaServerConfigured()) {
    if (!SITE_KEY) console.warn('[recaptcha] NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY not set — skipped');
    if (!PROJECT_ID) console.warn('[recaptcha] RECAPTCHA_ENTERPRISE_PROJECT_ID not set — skipped');
    return { ok: true, skipped: true };
  }

  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    return softFail('client did not send a valid token', { tokenType: typeof token, action: expectedAction }, {
      ok: false,
      error: msg('missing', locale),
      status: 400,
    });
  }

  const timeout = withTimeout(ASSESSMENT_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await recaptchaRest<AssessmentResponse>(
      `projects/${encodeURIComponent(PROJECT_ID!)}/assessments`,
      {
        event: {
          token,
          siteKey: SITE_KEY,
          expectedAction,
          userAgent: req.headers.get('user-agent') || undefined,
          userIpAddress: ip,
        },
      },
      timeout.signal,
    );

    if (!response.tokenProperties?.valid) {
      return softFail('token invalid', { invalidReason: response.tokenProperties?.invalidReason, action: expectedAction }, {
        ok: false,
        error: msg('invalid', locale),
        status: 403,
      });
    }

    if (response.tokenProperties.action !== expectedAction) {
      return softFail('action mismatch', { expectedAction, action: response.tokenProperties.action }, {
        ok: false,
        error: msg('mismatch', locale),
        status: 403,
      });
    }

    const score = response.riskAnalysis?.score ?? 0;
    const reasons = (response.riskAnalysis?.reasons ?? []).map((reason) => String(reason));

    // High-confidence bot signal → ban this IP for an hour and ALWAYS block,
    // regardless of monitor mode. Monitor mode is for tuning grey-zone scores;
    // confirmed automation should never get a free pass.
    if (hasCriticalBotSignal(score, reasons)) {
      blockKey(botBanKey(ip), BOT_BAN_WINDOW_MS);
      console.error('[recaptcha] HARD BLOCK — bot signal confirmed', {
        ip,
        score,
        reasons,
        action: expectedAction,
        banWindowMs: BOT_BAN_WINDOW_MS,
      });
      return { ok: false, error: msg('botBlocked', locale), status: 403 };
    }

    if (score < MIN_SCORE) {
      return softFail('low score', { score, reasons, action: expectedAction }, {
        ok: false,
        error: msg('lowScore', locale),
        status: 403,
      });
    }

    return {
      ok: true,
      score,
      reasons,
      assessmentName: response.name || undefined,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return softFail(
      aborted ? 'assessment timeout' : 'assessment api error',
      {
        error: aborted ? `timed out after ${ASSESSMENT_TIMEOUT_MS}ms` : String(error),
        elapsedMs: Date.now() - startedAt,
        action: expectedAction,
      },
      {
        ok: false,
        error: msg('failure', locale),
        status: 502,
      },
    );
  } finally {
    timeout.clear();
  }
}

export async function annotateRecaptchaAssessment(
  assessmentName: string,
  annotation:
    | 'LEGITIMATE'
    | 'FRAUDULENT'
    | 'PASSWORD_CORRECT'
    | 'PASSWORD_INCORRECT',
) {
  if (!assessmentName || !isRecaptchaServerConfigured()) return;

  const timeout = withTimeout(ASSESSMENT_TIMEOUT_MS);
  try {
    // `assessmentName` is the fully-qualified resource name returned by
    // createAssessment: `projects/{project}/assessments/{id}`.
    await recaptchaRest(`${assessmentName}:annotate`, { annotation }, timeout.signal);
  } catch (error) {
    console.error('[recaptcha] annotate error', error);
  } finally {
    timeout.clear();
  }
}
