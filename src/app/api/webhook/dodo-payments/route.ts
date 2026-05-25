/**
 * Dodo Payments webhook receiver — TEMPORARY STUB (Stage 141 §38.221).
 *
 * Stage 140 §38.220'de full event handler taxonomy + SDK signature verify
 * ile kurulmuştu; Vercel deployment ERROR sebebiyle geçici devre dışı.
 *
 * Bu stub aktif iken Dodo webhook tetiklenirse 503 döner; Dodo dashboard
 * retry storm'una izin verilir (signature verify yapamadığımız için
 * 401 dönmüyoruz — gerçek webhook handler restore edilince retry'lar
 * yakalanır). Operatör Dodo dashboard'tan test webhook tetiklemeden
 * önce bu route'un yeniden canlı olduğunu doğrulamalı.
 *
 * Schema (Stage 140 migration) intact — `BillingSubscription.source =
 * 'dodo_payments'`, `dodoProductId`, `providerCustomerId` field'ları
 * mevcut. Stub kalktığında handler kod'u DB ile bağlanır.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function POST() {
  return NextResponse.json(
    {
      error: 'dodo_payments_webhook_disabled',
      message:
        'Webhook handler geçici olarak devre dışı (Stage 141). Dodo retry queue korunur, restore sonrası yakalanır.',
    },
    { status: 503 },
  );
}

export function GET() {
  return NextResponse.json({ integration: 'dodo-payments', enabled: false, reason: 'stub' });
}
