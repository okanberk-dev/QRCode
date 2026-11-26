/**
 * Win-back e-mail of a loyalty program (CLAUDE.md §61). Daily: members who
 * gave an e-mail, ticked the marketing consent and have not visited for the
 * owner's chosen days (30 / 45 / 60 / 90) get the owner's message once; the
 * same member again only after 90 days. Off until the owner turns it on and
 * confirms the İYS / consent responsibility (`winbackConfirmedAt`).
 * Commercial message rules (6563): sender business named, one-click
 * opt-out in every mail and in the List-Unsubscribe header.
 */
import { prisma } from '@/lib/prisma';
import { loyaltyCardPath, nextReward, normalizeKind, redeemableRewards, unitLabel, type LoyaltyKind } from '@/lib/loyalty';
import { loyaltyPublicBaseUrl } from '@/lib/loyalty-server';
import { readLoyaltyPortal } from '@/lib/loyalty-portal';
import { plainLegalValue } from '@/lib/legal/loyalty-legal';
import { isValidEmail } from '@/lib/validations';
import { loyaltyUnsubscribeUrl } from '@/lib/loyalty-unsubscribe';

export const WINBACK_DAY_OPTIONS = [30, 45, 60, 90] as const;
/** Same member again only after this many days. */
export const WINBACK_REPEAT_DAYS = 90;

const DAY = 24 * 3600_000;

/** Pure: is this member due a win-back mail now? */
export function isWinbackDue(
  m: { email: string | null; marketingConsent: boolean; lastVisitAt: Date | null; createdAt: Date; winbackSentAt: Date | null },
  days: number,
  now: Date,
): boolean {
  if (!m.email || !m.marketingConsent) return false;
  const lastSeen = m.lastVisitAt ?? m.createdAt;
  if (now.getTime() - lastSeen.getTime() < days * DAY) return false;
  if (m.winbackSentAt && now.getTime() - m.winbackSentAt.getTime() < WINBACK_REPEAT_DAYS * DAY) return false;
  // Came back after the last mail: a new absence counts from the visit.
  return true;
}

/** "Kartınızda 4 damga var — 5 damga sonra: Ücretsiz kahve" / "Ödülünüz hazır: …". */
export function winbackStatusLine(kind: LoyaltyKind, balance: number, rewards: Array<{ title: string; cost: number; isActive?: boolean }>, locale: 'tr' | 'en'): string | null {
  const tr = locale === 'tr';
  const ready = redeemableRewards(balance, rewards);
  if (ready.length > 0) return tr ? `Ödülünüz hazır: ${ready[0].title}. Kasada isteyin.` : `Your reward is ready: ${ready[0].title}. Ask at the counter.`;
  if (balance <= 0) return null;
  const next = nextReward(balance, rewards);
  const have = `${balance} ${unitLabel(kind, balance, locale)}`;
  if (!next) return tr ? `Kartınızda ${have} var.` : `You have ${have} on your card.`;
  const left = `${next.remaining} ${unitLabel(kind, next.remaining, locale)}`;
  return tr ? `Kartınızda ${have} var — ${left} sonra: ${next.reward.title}` : `You have ${have} — ${left} more for ${next.reward.title}`;
}

export interface WinbackSummary {
  programs: number;
  due: number;
  sent: number;
  failed: number;
}

export async function runWinbackMails(now = new Date(), opts: { maxTotal?: number; perProgram?: number } = {}): Promise<WinbackSummary> {
  const maxTotal = opts.maxTotal ?? 300;
  const perProgram = opts.perProgram ?? 100;
  const summary: WinbackSummary = { programs: 0, due: 0, sent: 0, failed: 0 };
  const { sendResendEmail, MAIL_SEND_GAP_MS } = await import('@/lib/email-internal');
  const { renderLoyaltyWinbackMail } = await import('@/lib/email/templates/loyalty-winback');

  const programs = await prisma.loyaltyProgram.findMany({
    where: {
      winbackEnabled: true,
      winbackConfirmedAt: { not: null },
      isActive: true,
      restaurant: { isActive: true, loyaltyEnabled: true },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      winbackDays: true,
      winbackMessage: true,
      portal: true,
      rewards: { select: { title: true, cost: true, isActive: true } },
      restaurant: { select: { name: true, address: true, city: true, phone: true, notificationEmail: true } },
    },
  });
  summary.programs = programs.length;
  const repeatCutoff = new Date(now.getTime() - WINBACK_REPEAT_DAYS * DAY);

  for (const p of programs) {
    if (summary.sent + summary.failed >= maxTotal) break;
    const cutoff = new Date(now.getTime() - Math.max(30, p.winbackDays) * DAY);
    const members = await prisma.loyaltyMember.findMany({
      where: {
        programId: p.id,
        email: { not: null },
        marketingConsent: true,
        OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null, createdAt: { lt: cutoff } }],
        AND: [{ OR: [{ winbackSentAt: null }, { winbackSentAt: { lt: repeatCutoff } }] }],
      },
      orderBy: { createdAt: 'asc' },
      take: perProgram,
      select: { id: true, email: true, firstName: true, name: true, balance: true, cardToken: true, winbackSentAt: true },
    });
    summary.due += members.length;

    const kind = normalizeKind(p.kind);
    const portal = readLoyaltyPortal(p.portal);
    const r = p.restaurant;
    const senderLine =
      [
        plainLegalValue(portal.legalName) || plainLegalValue(r.name),
        plainLegalValue(portal.legalAddress) || plainLegalValue([r.address, r.city].filter(Boolean).join(', ')),
        plainLegalValue(portal.legalEmail) || plainLegalValue(r.phone),
      ]
        .filter(Boolean)
        .join(' · ') || r.name;
    const replyTo = r.notificationEmail && isValidEmail(r.notificationEmail) ? r.notificationEmail : undefined;

    for (const m of members) {
      if (summary.sent + summary.failed >= maxTotal) break;
      const unsubscribeUrl = loyaltyUnsubscribeUrl(m.id);
      if (!m.email || !unsubscribeUrl) continue;
      // Claim first so an overlapping run cannot mail the same member twice.
      const claimed = await prisma.loyaltyMember.updateMany({
        where: { id: m.id, marketingConsent: true, winbackSentAt: m.winbackSentAt },
        data: { winbackSentAt: now },
      });
      if (claimed.count === 0) continue;
      const mail = renderLoyaltyWinbackMail(
        {
          businessName: r.name,
          programName: p.name,
          customerName: m.firstName?.trim() || m.name?.trim().split(/\s+/)[0] || null,
          message: p.winbackMessage,
          statusLine: winbackStatusLine(kind, m.balance, p.rewards, 'tr'),
          cardUrl: `${loyaltyPublicBaseUrl()}${loyaltyCardPath(p.slug, m.cardToken)}`,
          unsubscribeUrl,
          senderLine,
        },
        'tr',
      );
      const ok = await sendResendEmail({
        to: m.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        template: 'loyalty-winback',
        locale: 'tr',
        logMetadata: { programId: p.id },
      });
      if (ok) {
        summary.sent += 1;
      } else {
        summary.failed += 1;
        // Not sent: free the member for the next run.
        await prisma.loyaltyMember.updateMany({ where: { id: m.id, winbackSentAt: now }, data: { winbackSentAt: m.winbackSentAt } });
      }
      await new Promise((res) => setTimeout(res, MAIL_SEND_GAP_MS));
    }
  }
  return summary;
}
