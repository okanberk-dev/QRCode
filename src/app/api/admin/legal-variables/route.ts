import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import {
  LEGAL_VARIABLE_CATALOG,
  LEGAL_VARIABLE_KEYS,
  invalidateLegalVariableCache,
} from '@/lib/legal/variables';

export const dynamic = 'force-dynamic';

/**
 * Tüm değişken katalog + mevcut değerleri döner.
 *
 * Response:
 *   { variables: Array<{ key, label, defaultValue, value, description, group, customised }> }
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const stored = await prisma.legalVariable.findMany({
    select: { key: true, value: true, description: true, updatedAt: true },
  });
  const storedMap = new Map(stored.map((s) => [s.key, s]));

  const variables = LEGAL_VARIABLE_CATALOG.map((def) => {
    const row = storedMap.get(def.key);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      group: def.group,
      defaultValue: def.defaultValue,
      value: row?.value ?? def.defaultValue,
      customised: !!row,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ variables });
}

interface PatchBody {
  values?: Record<string, string | null>;
}

/**
 * Bulk update — admin "Kaydet" tuşuyla tüm değerleri tek seferde gönderir.
 * `null` veya boş string → kayıt silinir, default'a döner.
 *
 * Whitelist enforced — yalnız `LEGAL_VARIABLE_KEYS` kabul edilir.
 */
export async function PATCH(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }
  if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values)) {
    return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
  }

  const adminId = (admin.id ?? admin.userId ?? null) as string | null;
  const allowedKeys = new Set<string>(LEGAL_VARIABLE_KEYS);

  const ops: Array<Promise<unknown>> = [];
  for (const [key, raw] of Object.entries(body.values)) {
    if (!allowedKeys.has(key)) continue; // sessiz reddet
    if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      ops.push(
        prisma.legalVariable
          .delete({ where: { key } })
          .catch((err: { code?: string }) => {
            // Yoksa sessiz geç — DELETE missing row
            if (err?.code !== 'P2025') throw err;
          }),
      );
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length > 5000) {
        return NextResponse.json(
          { error: 'value_too_long', key, max: 5000 },
          { status: 400 },
        );
      }
      ops.push(
        prisma.legalVariable.upsert({
          where: { key },
          create: { key, value: trimmed, updatedById: adminId },
          update: { value: trimmed, updatedById: adminId },
        }),
      );
    }
  }

  await Promise.all(ops);
  invalidateLegalVariableCache();
  return NextResponse.json({ ok: true });
}
