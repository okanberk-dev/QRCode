import type { PrismaClient } from '@prisma/client';

/**
 * Refund queue (billing spec §11.7, D19). Payments with
 * `refund_state = 'required'` — a second payment for an already paid period
 * (`duplicate_period`), a duplicate provider charge (`provider_duplicate`), a
 * charge that went through after an opt-out (`owner_opt_out`,
 * `card_removed`, `account_deletion`), a hosted payment PaymentList shows as
 * charged with other terms (`charged_mismatch`), a payment of an erased
 * account (`erased_user`) or a reused reference (`reference_reused`).
 *
 * The operator refunds in the PayNKolay panel (no refund API yet, Q-17) and
 * then marks the entry `refunded` (invoice → refunded) or `waived` with a
 * reason. Entries older than 3 days raise `billing-refund-overdue` (engine
 * phase 7). Outputs carry ids, amounts and reasons only.
 *
 * `provider_duplicate` is different: the payment itself is kept (its period
 * was granted and its invoice stands); only the EXTRA charges PayNKolay made
 * for the same clientRefCode go back, and they never had an invoice.
 */

/** Reasons where the payment and its invoice are kept and only extra provider charges are refunded. */
const KEEPS_INVOICE_REASONS: ReadonlySet<string> = new Set(['provider_duplicate']);

export interface RefundQueueEntry {
  paymentId: string;
  /** One charge of this payment. */
  amountMinor: number;
  /** What must be refunded in total (more than one charge when PayNKolay charged the clientRefCode repeatedly). */
  refundAmountMinor: number;
  reason: string | null;
  /** True when the payment's own invoice stays paid (only extra charges are refunded). */
  keepsInvoice: boolean;
  status: string;
  kind: string;
  since: Date;
}

/** Operator reference: a PayNKolay panel / ticket id, never card data. */
export const PANEL_REF_RE = /^[A-Za-z0-9._:-]{1,64}$/;

export async function listRefundQueue(db: PrismaClient, limit = 200): Promise<RefundQueueEntry[]> {
  const rows = await db.billingPayment.findMany({
    where: { refundState: 'required' },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      amountMinor: true,
      refundAmountMinor: true,
      refundReason: true,
      status: true,
      kind: true,
      completedAt: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    paymentId: r.id,
    amountMinor: r.amountMinor,
    refundAmountMinor: r.refundAmountMinor ?? r.amountMinor,
    reason: r.refundReason,
    keepsInvoice: KEEPS_INVOICE_REASONS.has(r.refundReason ?? ''),
    status: r.status,
    kind: r.kind,
    since: r.completedAt ?? r.createdAt,
  }));
}

export type MarkRefundResult = 'marked' | 'not_in_queue' | 'invalid_ref';

/**
 * Closes a queue entry. `refunded` also marks the payment's invoice as
 * refunded (the credit note follows accounting practice) — except for
 * `provider_duplicate`, where the invoice belongs to the charge the owner
 * keeps. The panel reference is appended to the invoice admin notes, which
 * owners never see.
 */
export async function markRefund(
  db: PrismaClient,
  paymentId: string,
  outcome: 'refunded' | 'waived',
  panelRef: string,
  now: Date = new Date(),
): Promise<MarkRefundResult> {
  if (!PANEL_REF_RE.test(panelRef)) return 'invalid_ref';
  return db.$transaction(async (tx) => {
    const res = await tx.billingPayment.updateMany({
      where: { id: paymentId, refundState: 'required' },
      data: { refundState: outcome },
    });
    if (res.count === 0) return 'not_in_queue';
    // Read after the conditional update, so this is the row we just closed.
    const payment = await tx.billingPayment.findUnique({ where: { id: paymentId }, select: { refundReason: true } });
    const keepsInvoice = KEEPS_INVOICE_REASONS.has(payment?.refundReason ?? '');
    const note = `[${now.toISOString()}] refund ${outcome}${keepsInvoice ? ' (extra provider charges; invoice kept)' : ''}: ${panelRef}`;
    const invoices = await tx.billingInvoice.findMany({
      where: { source: 'paynkolay', invoiceNumber: { endsWith: paymentId.slice(-8).toUpperCase() } },
      select: { id: true, adminNotes: true },
      take: 5,
    });
    for (const invoice of invoices) {
      await tx.billingInvoice.update({
        where: { id: invoice.id },
        data: {
          ...(outcome === 'refunded' && !keepsInvoice ? { status: 'refunded' } : {}),
          adminNotes: invoice.adminNotes ? `${invoice.adminNotes}\n${note}` : note,
        },
        select: { id: true },
      });
    }
    return 'marked';
  });
}
