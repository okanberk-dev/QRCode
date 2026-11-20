import { prisma } from '@/lib/prisma';
import { isRecaptchaServerConfigured } from '@/lib/recaptcha';

/**
 * Sign-in risk score (billing spec §3.3, §18.2 #1). The login, register and
 * Google routes already assess every sign-in with reCAPTCHA Enterprise; the
 * score is stored on the user so the card checkout can require a recent,
 * good score WITHOUT loading Google's script on the payment pages (D12).
 * Overwritten at every assessed sign-in (riskScoreUpdate); nothing else about the assessment is kept.
 */

export interface AssessedCaptcha {
  ok: true;
  score?: number;
}

/**
 * The column update for a sign-in's reCAPTCHA result. With reCAPTCHA configured, EVERY sign-in overwrites
 * the pair: a sign-in that produced no score (no or invalid token, action mismatch, timeout — all soft-pass
 * in monitor mode) stores a null score, so an older good score can never vouch for a later, unassessed
 * sign-in (the checkout gate then refuses). Without reCAPTCHA nothing is written (the gate is off).
 */
export function riskScoreUpdate(
  captcha: AssessedCaptcha,
  now: Date,
  configured: boolean,
): { lastLoginRiskScore: number | null; lastLoginRiskAt: Date } | null {
  if (typeof captcha.score === 'number' && Number.isFinite(captcha.score)) {
    return { lastLoginRiskScore: Math.min(1, Math.max(0, captcha.score)), lastLoginRiskAt: now };
  }
  return configured ? { lastLoginRiskScore: null, lastLoginRiskAt: now } : null;
}

/** Best effort: a failure never blocks a sign-in. */
export async function recordLoginRiskScore(userId: string, captcha: AssessedCaptcha, now: Date = new Date()): Promise<void> {
  const data = riskScoreUpdate(captcha, now, isRecaptchaServerConfigured());
  if (!data) return;
  try {
    await prisma.user.update({ where: { id: userId }, data, select: { id: true } });
  } catch {
    /* the score is a checkout gate input only */
  }
}
