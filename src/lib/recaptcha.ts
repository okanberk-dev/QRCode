import { NextRequest } from 'next/server';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';
import { getClientIp } from '@/lib/rate-limit';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const PROJECT_ID =
  process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID ||
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const MIN_SCORE = Number(process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE || '0.5');
const SERVICE_ACCOUNT_JSON = process.env.RECAPTCHA_ENTERPRISE_SERVICE_ACCOUNT_JSON?.trim();
// Monitor mode (default): never block users on reCAPTCHA failures, just log
// the reason. Flip RECAPTCHA_ENFORCE=true once dashboards confirm scores
// are healthy. Mirrors Stripe Radar / Cloudflare Turnstile rollout pattern.
const ENFORCE = (process.env.RECAPTCHA_ENFORCE ?? 'false').toLowerCase() === 'true';

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
} as const;

const msg = (key: keyof typeof MESSAGES, locale: RecaptchaLocale) =>
  MESSAGES[key][locale];

let clientSingleton: RecaptchaEnterpriseServiceClient | null = null;

function parseServiceAccountJson() {
  if (!SERVICE_ACCOUNT_JSON) return undefined;
  try {
    const parsed = JSON.parse(SERVICE_ACCOUNT_JSON) as {
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.client_email || !parsed.private_key) return undefined;
    return {
      credentials: {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      },
    };
  } catch (error) {
    console.error('[recaptcha] invalid service account json', error);
    return undefined;
  }
}

function getRecaptchaClient() {
  if (clientSingleton) return clientSingleton;
  clientSingleton = new RecaptchaEnterpriseServiceClient(parseServiceAccountJson());
  return clientSingleton;
}

export function isRecaptchaServerConfigured(): boolean {
  return Boolean(SITE_KEY && PROJECT_ID);
}

function softFail(
  reason: string,
  detail: Record<string, unknown>,
  failure: RecaptchaFailure,
): RecaptchaSuccess | RecaptchaFailure {
  if (ENFORCE) return failure;
  console.warn(`[recaptcha] ${reason} — soft-pass (set RECAPTCHA_ENFORCE=true to block)`, detail);
  return { ok: true, skipped: true };
}

export async function verifyRecaptchaToken(
  req: NextRequest,
  token: unknown,
  expectedAction: string,
  locale: RecaptchaLocale = 'tr',
): Promise<RecaptchaSuccess | RecaptchaFailure> {
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

  try {
    const client = getRecaptchaClient();
    const parent = client.projectPath(PROJECT_ID!);
    const [response] = await client.createAssessment({
      parent,
      assessment: {
        event: {
          token,
          siteKey: SITE_KEY,
          expectedAction,
          userAgent: req.headers.get('user-agent') || undefined,
          userIpAddress: getClientIp(req.headers),
        },
      },
    });

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
    return softFail('assessment api error', { error: String(error), action: expectedAction }, {
      ok: false,
      error: msg('failure', locale),
      status: 502,
    });
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

  try {
    const client = getRecaptchaClient();
    await client.annotateAssessment({
      name: assessmentName,
      annotation,
    });
  } catch (error) {
    console.error('[recaptcha] annotate error', error);
  }
}
