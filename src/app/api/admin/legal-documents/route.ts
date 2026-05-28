import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import {
  LEGAL_DOCUMENT_KEYS,
  LEGAL_LOCALES,
  LEGAL_DOCUMENT_LABELS,
  LEGAL_DOCUMENT_DESCRIPTIONS,
} from '@/lib/legal/keys';
import { LEGAL_TEMPLATE_DEFAULTS } from '@/lib/legal/templates';

export const dynamic = 'force-dynamic';

/**
 * Admin liste view — 7 belge × 2 dil = 14 satır halinde "seeded mi /
 * default mi" durumunu döner. UI bu listeden grid render eder.
 *
 * Response:
 *   { docs: Array<{ key, locale, label, title, version, isActive,
 *                   updatedAt, source: 'db' | 'default' }> }
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.toLowerCase().trim() ?? '';
  const filterStatus = url.searchParams.get('status') ?? 'all'; // all | active | inactive | unseeded

  const rows = await prisma.legalDocument.findMany({
    select: {
      id: true,
      key: true,
      locale: true,
      title: true,
      description: true,
      version: true,
      isActive: true,
      updatedAt: true,
      effectiveAt: true,
      updatedById: true,
    },
  });
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) byKey.set(`${row.key}:${row.locale}`, row);

  const docs = LEGAL_DOCUMENT_KEYS.flatMap((key) =>
    LEGAL_LOCALES.map((locale) => {
      const row = byKey.get(`${key}:${locale}`);
      const label = LEGAL_DOCUMENT_LABELS[key][locale];
      const desc = LEGAL_DOCUMENT_DESCRIPTIONS[key][locale];
      const def = LEGAL_TEMPLATE_DEFAULTS[key][locale];
      if (row) {
        return {
          id: row.id,
          key,
          locale,
          label,
          description: row.description ?? desc,
          title: row.title,
          version: row.version,
          isActive: row.isActive,
          updatedAt: row.updatedAt.toISOString(),
          effectiveAt: row.effectiveAt?.toISOString() ?? null,
          source: 'db' as const,
        };
      }
      return {
        id: null,
        key,
        locale,
        label,
        description: desc,
        title: def.title,
        version: 0,
        isActive: false,
        updatedAt: null,
        effectiveAt: null,
        source: 'default' as const,
      };
    }),
  );

  let filtered = docs;
  if (filterStatus === 'active') filtered = filtered.filter((d) => d.source === 'db' && d.isActive);
  else if (filterStatus === 'inactive')
    filtered = filtered.filter((d) => d.source === 'db' && !d.isActive);
  else if (filterStatus === 'unseeded') filtered = filtered.filter((d) => d.source === 'default');

  if (search) {
    filtered = filtered.filter(
      (d) =>
        d.label.toLowerCase().includes(search) ||
        d.title.toLowerCase().includes(search) ||
        d.key.toLowerCase().includes(search),
    );
  }

  return NextResponse.json(
    { docs: filtered },
    { headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' } },
  );
}
