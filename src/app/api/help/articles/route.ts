// SCAFFOLDED: help center article tree. Frontend `/help` page currently
// renders a hard-coded TR/EN mock; once a CMS (Notion sync, Contentful,
// or a simple `HelpArticle` Prisma model) lands, this endpoint should
// return `{ categories: [{ slug, title, articles: [{ slug, title,
// excerpt, body }]} ]}`. See scaffolding.ts for the suggested model.
import { NextRequest } from 'next/server';
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get('locale') ?? 'tr';
  const category = searchParams.get('category') ?? undefined;
  return scaffoldedResponse('src/app/api/help/articles/route.ts', {
    requested: { locale, category },
    categories: [],
  });
}
