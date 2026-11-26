/**
 * Texts a customer reads on the loyalty card (program name, rewards, tiers,
 * terms, customer names) go through the same risk gate as replies
 * (CLAUDE.md §48): profanity, insults, threats, hate, hidden characters,
 * links — and review pressure ("5 yıldız verene kahve"), because a reward
 * for a review breaks Google's policy (§60).
 */
import { checkReplyRisk, type ReplyRiskKind } from '@/lib/reply-risk';

/** Null when fine, else the blocking issue kinds. */
export function moderateText(text: string): ReplyRiskKind[] | null {
  const result = checkReplyRisk(text, { allowedHosts: [] });
  return result.blocked ? result.issues : null;
}
