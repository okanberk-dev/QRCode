/**
 * Dodo Payments customer portal route — TEMPORARY STUB (Stage 141 §38.221).
 * Bkz. `src/app/checkout/route.ts` üst yorumu.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json(
    {
      error: 'dodo_payments_disabled',
      message:
        'Müşteri portalı entegrasyonu geçici olarak devre dışı (Stage 141). Lütfen daha sonra tekrar deneyin.',
    },
    { status: 501 },
  );
}
