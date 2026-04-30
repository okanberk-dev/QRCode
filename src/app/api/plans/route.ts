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
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('[/api/plans] failed:', error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
