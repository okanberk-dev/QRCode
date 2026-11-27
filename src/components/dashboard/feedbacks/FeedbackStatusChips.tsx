import type { ReactNode } from 'react';
import { Bookmark, Check, Flag, Reply, Sparkles, UserCheck } from 'lucide-react';
import { Badge, type BadgeKind } from '@/components/ui';

/**
 * Prioritised, sentence-case status chips for a review (owner + admin, list
 * rows and detail header). Text + icon, never colour alone.
 *
 * Priority (the list passes `max={2}`, the detail shows all):
 *   1. Replied            ok      Check
 *   2. Pending            warn    Bookmark
 *   3. Flagged            danger  Flag
 *   4. Assigned (admin)   ghost   UserCheck      — `showAssigned`
 *   5. AI draft ready     lime    Sparkles       — low rating, not replied
 *   6. Needs reply        danger  Reply          — low rating, nothing else set
 *
 * "Needs reply" replaces the old cryptic "● !" low-rating badge.
 */

export interface FeedbackStatusSource {
  rating: number;
  isReplied?: boolean;
  isPending?: boolean;
  isFlagged?: boolean;
  isAssigned?: boolean;
  hasPendingAiDraft?: boolean;
}

interface FeedbackStatusChipsProps {
  feedback: FeedbackStatusSource;
  isTr: boolean;
  /** Maximum chips to render (list rows use 2). Omit for all. */
  max?: number;
  /** Admin inbox shows the assignment chip. */
  showAssigned?: boolean;
  /** Ratings at or below this count as "low" for the needs-reply / AI chips. */
  lowRatingThreshold?: number;
  className?: string;
}

interface Chip {
  key: string;
  kind: BadgeKind;
  icon: ReactNode;
  label: string;
}

export function getFeedbackStatusChips(
  f: FeedbackStatusSource,
  isTr: boolean,
  { showAssigned = false, lowRatingThreshold = 3 }: { showAssigned?: boolean; lowRatingThreshold?: number } = {},
): Chip[] {
  const chips: Chip[] = [];
  const iconProps = { size: 11, strokeWidth: 2.2, 'aria-hidden': true } as const;
  const isLow = f.rating <= lowRatingThreshold;
  if (f.isReplied) {
    chips.push({ key: 'replied', kind: 'ok', icon: <Check {...iconProps} />, label: isTr ? 'Yanıtlandı' : 'Replied' });
  }
  if (f.isPending) {
    chips.push({ key: 'pending', kind: 'warn', icon: <Bookmark {...iconProps} />, label: isTr ? 'Beklemede' : 'Pending' });
  }
  if (f.isFlagged) {
    chips.push({ key: 'flagged', kind: 'danger', icon: <Flag {...iconProps} />, label: isTr ? 'İşaretli' : 'Flagged' });
  }
  if (showAssigned && f.isAssigned) {
    chips.push({ key: 'assigned', kind: 'ghost', icon: <UserCheck {...iconProps} />, label: isTr ? 'Atandı' : 'Assigned' });
  }
  if (f.hasPendingAiDraft && !f.isReplied && isLow) {
    chips.push({ key: 'ai', kind: 'lime', icon: <Sparkles {...iconProps} />, label: isTr ? 'AI taslağı hazır' : 'AI draft ready' });
  }
  if (isLow && !f.isReplied && !f.isPending && !f.hasPendingAiDraft) {
    chips.push({ key: 'needs-reply', kind: 'danger', icon: <Reply {...iconProps} />, label: isTr ? 'Yanıt bekliyor' : 'Needs reply' });
  }
  return chips;
}

export function FeedbackStatusChips({
  feedback,
  isTr,
  max,
  showAssigned = false,
  lowRatingThreshold = 3,
  className = '',
}: FeedbackStatusChipsProps) {
  const all = getFeedbackStatusChips(feedback, isTr, { showAssigned, lowRatingThreshold });
  const chips = typeof max === 'number' ? all.slice(0, max) : all;
  if (chips.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {chips.map((c) => (
        <Badge
          key={c.key}
          kind={c.kind}
          dot={false}
          // Fintora soft pills: the AI chip is light green with black text, not a
          // filled black pill (the filled one is reserved for actions).
          className={`gap-1 ${c.key === 'ai' ? 'bg-pn-accent-soft text-pn-accent' : ''}`}
        >
          {c.icon}
          {c.label}
        </Badge>
      ))}
    </span>
  );
}

export default FeedbackStatusChips;
