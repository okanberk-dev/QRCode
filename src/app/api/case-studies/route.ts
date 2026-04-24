import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim();

  if (slug) {
    const study = await prisma.caseStudy.findUnique({ where: { slug } });
    if (!study || !study.isPublished) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ data: study });
  }

  const studies = await prisma.caseStudy.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
  });
  return NextResponse.json({ data: studies });
}
