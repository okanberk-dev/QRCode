/**
 * Dodo Payments checkout route — TEMPORARY STUB (Stage 141 §38.221).
 *
 * Stage 140 §38.220'de `@dodopayments/nextjs` SDK ile kurulmuştu ama
 * Vercel deployment ERROR çıkardı (build success + Sentry source-map
 * upload success + ready timestamp set, ama final state ERROR — log'un
 * son 8 saniyesi capture limit'ine takıldığı için kök neden henüz net
 * değil). Production'ı acil restore için Dodo SDK dep + import geçici
 * kaldırıldı; bu route 501 döner.
 *
 * Sonraki PR scope:
 *   • Vercel inspector URL veya `vercel logs` ile son 8sn build log'unu çek
 *   • Dodo SDK runtime gereksinimini (edge mi node mu, peer deps, dynamic
 *     imports) izole et
 *   • Stub'tan canlıya geç
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NOT_CONFIGURED = NextResponse.json(
  {
    error: 'dodo_payments_disabled',
    message:
      'Checkout entegrasyonu geçici olarak devre dışı (Stage 141). Lütfen daha sonra tekrar deneyin.',
  },
  { status: 501 },
);

export function GET() {
  return NOT_CONFIGURED;
}

export function POST() {
  return NOT_CONFIGURED;
}
