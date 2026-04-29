import { randomBytes } from 'crypto';
import { prisma } from './prisma';

export const INVITE_TOKEN_TTL_DAYS = 7;
export const INVITE_RESEND_COOLDOWN_MS = 60 * 60 * 1000; // 1 saat

/**
 * Section 5 — TeamMember davet helper'ları (Faz 4).
 *
 * Token: 32 byte hex (64 char) — tahmin edilemez. UNIQUE constraint çatışmasında
 * yeniden üretilir (≤3 deneme); pratikte hiç çatışmaz, defansif loop.
 */
export async function generateInviteToken(): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const token = randomBytes(32).toString('hex');
    const exists = await prisma.teamMember.findUnique({
      where: { inviteToken: token },
      select: { id: true },
    });
    if (!exists) return token;
  }
  // Hâlâ çatıştıysa son denemeyi ham olarak dön — UNIQUE constraint upsert
  // sırasında zaten error fırlatır, fail-loud.
  return randomBytes(32).toString('hex');
}

export function inviteExpiresAt(): Date {
  return new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export interface RoleLabelOpts {
  role: string;
  locale?: 'tr' | 'en';
}

/** Insan-okur rol etiketi — mail'de + accept page'de gösterilir. */
export function roleLabel({ role, locale = 'tr' }: RoleLabelOpts): string {
  const isTr = locale !== 'en';
  const labels: Record<string, { tr: string; en: string }> = {
    owner: { tr: 'Sahip', en: 'Owner' },
    manager: { tr: 'Yönetici', en: 'Manager' },
    staff: { tr: 'Personel', en: 'Staff' },
    viewer: { tr: 'Sadece görüntüleyici', en: 'Viewer' },
  };
  const entry = labels[role] ?? { tr: 'Üye', en: 'Member' };
  return isTr ? entry.tr : entry.en;
}
