import { NextRequest, NextResponse } from 'next/server';
import {
  isSupportedLegalLocale,
  type LegalLocale,
} from '@/lib/legal/keys';
import { loadActiveLegalDocumentList } from '@/lib/legal/loader';

export const dynamic = 'force-dynamic';

/**
 * Public read endpoint — owner panel ve marketing surface'leri "hangi yasal
 * metinler aktif?" listesini buradan çeker. Sadece aktif metinlerin özeti;
 * tam içerik public sayfalardan render edilir (`/[locale]/<slug>`).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const localeRaw = url.searchParams.get('locale')?.toLowerCase() ?? 'tr';
  const locale: LegalLocale = isSupportedLegalLocale(localeRaw) ? localeRaw : 'tr';

  const docs = await loadActiveLegalDocumentList(locale);
  return NextResponse.json(
    {
      docs: docs.map((d) => ({
        key: d.key,
        locale: d.locale,
        title: d.title,
        description: d.description,
        version: d.version,
        isActive: d.isActive,
        effectiveAt: d.effectiveAt?.toISOString() ?? null,
        updatedAt: d.updatedAt?.toISOString() ?? null,
        source: d.source,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
