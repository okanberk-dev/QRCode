import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const PROJECT_ID =
  process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID ||
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.RECAPTCHA_ENTERPRISE_API_KEY;
const MIN_SCORE = Number(process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE || '0.5');

interface AssessmentResponse {
  tokenProperties?: {
    valid?: boolean;
    action?: string;
    invalidReason?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
}

export function isRecaptchaServerConfigured(): boolean {
  return Boolean(SITE_KEY && PROJECT_ID && API_KEY);
}

export async function verifyRecaptchaToken(
  req: NextRequest,
  token: unknown,
  expectedAction: string,
): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string; status: number }> {
  if (!isRecaptchaServerConfigured()) return { ok: true, skipped: true };

  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    return { ok: false, error: 'Güvenlik doğrulaması eksik.', status: 400 };
  }

  const endpoint =
    `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID!)}/assessments` +
    `?key=${encodeURIComponent(API_KEY!)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          token,
          siteKey: SITE_KEY,
          expectedAction,
          userAgent: req.headers.get('user-agent') || undefined,
          userIpAddress: getClientIp(req.headers),
        },
      }),
    });

    if (!response.ok) {
      console.error('[recaptcha] assessment failed', response.status, await response.text());
      return { ok: false, error: 'Güvenlik doğrulaması yapılamadı.', status: 502 };
    }

    const assessment = (await response.json()) as AssessmentResponse;
    const tokenProps = assessment.tokenProperties;
    const score = assessment.riskAnalysis?.score ?? 0;

    if (!tokenProps?.valid) {
      console.warn('[recaptcha] invalid token', tokenProps?.invalidReason);
      return { ok: false, error: 'Güvenlik doğrulaması geçersiz.', status: 403 };
    }

    if (tokenProps.action !== expectedAction) {
      console.warn('[recaptcha] action mismatch', { expectedAction, action: tokenProps.action });
      return { ok: false, error: 'Güvenlik doğrulaması eşleşmedi.', status: 403 };
    }

    if (score < MIN_SCORE) {
      console.warn('[recaptcha] low score', { score, reasons: assessment.riskAnalysis?.reasons });
      return { ok: false, error: 'İstek güvenli görünmüyor. Lütfen tekrar deneyin.', status: 403 };
    }

    return { ok: true };
  } catch (error) {
    console.error('[recaptcha] assessment error', error);
    return { ok: false, error: 'Güvenlik doğrulaması sırasında hata oluştu.', status: 502 };
  }
}
