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

export async function verifyRecaptchaToken(
  req: NextRequest,
  token: unknown,
  expectedAction: string,
): Promise<RecaptchaSuccess | RecaptchaFailure> {
  if (!isRecaptchaServerConfigured()) return { ok: true, skipped: true };

  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    return { ok: false, error: 'Güvenlik doğrulaması eksik.', status: 400 };
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
      console.warn('[recaptcha] invalid token', response.tokenProperties?.invalidReason);
      return { ok: false, error: 'Güvenlik doğrulaması geçersiz.', status: 403 };
    }

    if (response.tokenProperties.action !== expectedAction) {
      console.warn('[recaptcha] action mismatch', {
        expectedAction,
        action: response.tokenProperties.action,
      });
      return { ok: false, error: 'Güvenlik doğrulaması eşleşmedi.', status: 403 };
    }

    const score = response.riskAnalysis?.score ?? 0;
    const reasons = (response.riskAnalysis?.reasons ?? []).map((reason) => String(reason));

    if (score < MIN_SCORE) {
      console.warn('[recaptcha] low score', { score, reasons });
      return { ok: false, error: 'İstek güvenli görünmüyor. Lütfen tekrar deneyin.', status: 403 };
    }

    return {
      ok: true,
      score,
      reasons,
      assessmentName: response.name || undefined,
    };
  } catch (error) {
    console.error('[recaptcha] assessment error', error);
    return { ok: false, error: 'Güvenlik doğrulaması sırasında hata oluştu.', status: 502 };
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
