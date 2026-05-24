import { NextRequest, NextResponse } from 'next/server';
import { getActivePlans } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const localeParam = req.nextUrl.searchParams.get('locale');
  const locale: 'tr' | 'en' = localeParam === 'en' ? 'en' : 'tr';

  try {
    const plans = await getActivePlans(locale);
    return NextResponse.json(
      { data: plans },
      {
        headers: {
          // §38.219 Stage 139 — cache TTL azaltıldı 60s → 10s; admin
          // fiyat düzenleme sonrası "marketing'de değişmedi" hissini
          // önler. Pricing page'in ISR cache'i `revalidatePath` ile
          // anında invalidate olduğu için bu REST endpoint daha kısa
          // TTL ile public clients (Buaze SDK, third-party embed) için
          // hâlâ CDN-friendly kalır.
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      },
    );
  } catch (error) {
    console.error('[/api/plans] failed:', error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
