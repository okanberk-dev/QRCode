/**
 * Low-rating reply approval (CLAUDE.md §54). A public Google reply to a 1–3★
 * review (or one whose rating is unknown) needs a recorded human approval:
 * who approved it and when. Automatic and bulk paths never carry one, so
 * they can only reply to 4–5★ reviews. Pure: no Prisma, no network.
 */

export const LOW_RATING_MAX = 3;

export interface ReplyApproval {
  /** Panel actor id of the person who approved and sent the reply. */
  actorId: string;
  approvedAt: Date;
}

export interface ReplyApprovalGate {
  rating: number | null;
  approval: ReplyApproval | null;
}

export function needsReplyApproval(rating: number | null | undefined): boolean {
  return rating == null || !Number.isFinite(rating) || rating <= LOW_RATING_MAX;
}

export function isReplyApproved(gate: ReplyApprovalGate): boolean {
  if (!needsReplyApproval(gate.rating)) return true;
  const a = gate.approval;
  return Boolean(
    a && typeof a.actorId === 'string' && a.actorId.trim() !== '' && a.approvedAt instanceof Date && !Number.isNaN(a.approvedAt.getTime()),
  );
}

export class ReplyApprovalRequiredError extends Error {
  readonly code = 'APPROVAL_REQUIRED';
  constructor() {
    super('low-rating reply needs a recorded approval');
    this.name = 'ReplyApprovalRequiredError';
  }
}

export function assertReplyApproval(gate: ReplyApprovalGate): void {
  if (!isReplyApproved(gate)) throw new ReplyApprovalRequiredError();
}
