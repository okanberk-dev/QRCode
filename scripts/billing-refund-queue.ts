// Refund queue of saved-card billing (billing spec §11.7).
//
// Usage:
//   DATABASE_URL=... npx tsx scripts/billing-refund-queue.ts list
//   DATABASE_URL=... npx tsx scripts/billing-refund-queue.ts mark <paymentId> refunded --ref <panel ref>
//   DATABASE_URL=... npx tsx scripts/billing-refund-queue.ts mark <paymentId> waived --ref <reason/ticket>
//
// Refund in the PayNKolay panel first (find the transaction by clientRefCode =
// payment id), then mark it here. Prints payment ids, amounts and reasons
// only — never a reference code, card or customer data.

import { PrismaClient } from '@prisma/client';
import { listRefundQueue, markRefund } from '../src/lib/billing/refund-queue';

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

async function main(): Promise<number> {
  const [command, paymentId, outcome] = process.argv.slice(2);
  const prisma = new PrismaClient();
  try {
    if (command === 'list') {
      const entries = await listRefundQueue(prisma);
      if (entries.length === 0) console.log('[billing-refund-queue] empty');
      for (const e of entries) {
        // "refund" is the total to send back; for provider_duplicate it covers only the extra charges and the
        // payment's own invoice stays paid.
        console.log(
          `${e.paymentId}\trefund ${(e.refundAmountMinor / 100).toFixed(2)} TRY (charge ${(e.amountMinor / 100).toFixed(2)})\t${e.reason ?? '-'}${e.keepsInvoice ? ' (invoice kept)' : ''}\t${e.kind}/${e.status}\tsince ${e.since.toISOString()}`,
        );
      }
      return 0;
    }
    if (command === 'mark' && paymentId && (outcome === 'refunded' || outcome === 'waived')) {
      const ref = arg('--ref');
      if (!ref) {
        console.error('[billing-refund-queue] --ref <panel ref> is required');
        return 1;
      }
      const result = await markRefund(prisma, paymentId, outcome, ref);
      if (result !== 'marked') {
        console.error(`[billing-refund-queue] not marked: ${result}`);
        return 1;
      }
      console.log(`[billing-refund-queue] ${paymentId} marked ${outcome}`);
      return 0;
    }
    console.error('usage: billing-refund-queue.ts list | mark <paymentId> refunded|waived --ref <panel ref>');
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error('[billing-refund-queue] failed:', err instanceof Error ? err.name : 'Error');
    process.exit(1);
  });
