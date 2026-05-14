import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { SUPPORTED_MAIL_KEYS } from '@/lib/email/copy-loader';

export const dynamic = 'force-dynamic';

const SUPPORTED_KEYS = SUPPORTED_MAIL_KEYS;
const SUPPORTED_LOCALES = ['tr', 'en'] as const;

/**
 * List mail templates (Phase 2 scope: 8 keys × 2 locales = 16 rows). Always
 * returns the full grid; missing rows render as "not seeded yet" so the
 * admin UI can show a button to create + seed defaults.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
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

  return NextResponse.json(
    { data: grid },
    {
      headers: {
        // Stage 108 §38.188 — admin list edge cache (CLAUDE.md §40.6).
        // Mail template grid mutates only when a superadmin edits/seeds a
        // template; 60s fresh + 5min SWR keeps the index page snappy on
        // back-and-forth navigation. PUT/DELETE responses bypass cache via
        // mutation handler defaults (Next 15 routes — no cache directive
        // means no-store).
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
