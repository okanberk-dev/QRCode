import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { CASE_STUDY_SEEDS } from '@/lib/seed/case-studies';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return { ok: false as const, res: ApiErrors.unauthorized() };
  }
  if (admin.role !== 'superadmin') {
    return { ok: false as const, res: ApiErrors.forbidden() };
  }
  return { ok: true as const, admin };
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (!auth.ok) return auth.res;

  try {
    let seeded = 0;
    for (const study of CASE_STUDY_SEEDS) {
      await prisma.caseStudy.upsert({
        where: { slug: study.slug },
        create: study,
        update: study,
      });
      seeded++;
    }
    return NextResponse.json({ success: true, seeded });
  } catch (error) {
    console.error('[Case Study Seed Error]', error);
    return ApiErrors.internalError('Vaka çalışmaları örneklenemedi');
  }
}
