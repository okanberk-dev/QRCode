// Stage 98 — Public read for /s/[slug] public surface.
//
// Returns only public-safe fields (no IPs, no userIds). Inactive or
// unpublished surveys → silent 404 (fingerprinting önleme, CLAUDE.md
// §13.5 paterni).
//
// Brief edge cache mirrors /api/restaurants?slug= (CLAUDE.md §19.3) —
// 60s fresh + 5min stale. Owner publish toggles propagate within 6 min.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SURVEY_PUBLIC_SELECT } from '@/lib/surveys';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const survey = await prisma.survey.findUnique({
    where: { slug },
    select: SURVEY_PUBLIC_SELECT,
  });

  if (!survey || !survey.isActive || !survey.isPublished) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!survey.restaurant.isActive) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(
    { survey },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
