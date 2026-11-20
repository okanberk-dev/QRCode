import { prisma } from '@/lib/prisma';

/**
 * Sign-in risk score (billing spec §3.3, §18.2 #1). The login, register and
 * Google routes already assess every sign-in with reCAPTCHA Enterprise; the
 * score is stored on the user so the card checkout can require a recent,
 * good score WITHOUT loading Google's script on the payment pages (D12).
 * Overwritten at every sign-in; nothing else about the assessment is kept.
 */

export interface AssessedCaptcha {
  ok: true;
  score?: number;
}

/** The column update for a reCAPTCHA result, or null when no score was produced (not configured / no token). */
export function riskScoreUpdate(captcha: AssessedCaptcha, now: Date): { lastLoginRiskScore: number; lastLoginRiskAt: Date } | null {
  if (typeof captcha.score !== 'number' || !Number.isFinite(captcha.score)) return null;
  return { lastLoginRiskScore: Math.min(1, Math.max(0, captcha.score)), lastLoginRiskAt: now };
}

/** Best effort: a failure never blocks a sign-in. */
export async function recordLoginRiskScore(userId: string, captcha: AssessedCaptcha, now: Date = new Date()): Promise<void> {
  const data = riskScoreUpdate(captcha, now);
  if (!data) return;
  try {
    await prisma.user.update({ where: { id: userId }, data, select: { id: true } });
  } catch {
    /* the score is a checkout gate input only */
  }
}
