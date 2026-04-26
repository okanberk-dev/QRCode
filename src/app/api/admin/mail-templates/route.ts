import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const SUPPORTED_KEYS = ['welcome', 'newsletter', 'trial-ending'] as const;
const SUPPORTED_LOCALES = ['tr', 'en'] as const;

/**
 * List mail templates (mvp scope: 3 keys × 2 locales = 6 rows). Always
 * returns the full grid; missing rows render as "not seeded yet" so the
 * admin UI can show a button to create + seed defaults.
 */
export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const rows = await prisma.mailTemplate.findMany({
    where: { key: { in: SUPPORTED_KEYS as unknown as string[] } },
    select: {
      id: true,
      key: true,
      locale: true,
      editable: true,
      updatedById: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: [{ key: 'asc' }, { locale: 'asc' }],
  });

  // Build the full 6-cell grid. Front-end uses presence/absence to render
  // "not seeded yet" state.
  const grid = SUPPORTED_KEYS.flatMap((key) =>
    SUPPORTED_LOCALES.map((locale) => {
      const row = rows.find((r) => r.key === key && r.locale === locale);
      return {
        key,
        locale,
        seeded: Boolean(row),
        ...(row && {
          id: row.id,
          editable: row.editable,
          updatedById: row.updatedById,
          updatedAt: row.updatedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        }),
      };
    }),
  );

  return NextResponse.json({ data: grid });
}
