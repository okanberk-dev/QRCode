import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import {
  clearSiteSettingsCache,
  getSiteSettings,
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_KEYS,
} from '@/lib/site-settings';

async function requireSuperadmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return { ok: false as const, res: ApiErrors.unauthorized() };
  if (admin.role !== 'superadmin') return { ok: false as const, res: ApiErrors.forbidden() };
  return { ok: true as const, admin };
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const settings = await getSiteSettings();
  return NextResponse.json({ settings, defaults: SITE_SETTINGS_DEFAULTS });
}

function keywordsToCsv(input: string | string[]): string {
  const list = Array.isArray(input) ? input : input.split(',');
  return list.map((s) => String(s).trim()).filter(Boolean).join(', ');
}

// CLAUDE.md §28.3.1 — admin write surface, .strict() mass-assignment guard.
// Form sends the full settings object; image auto-persist sends a single
// field. Every field optional → partial update; only provided keys touched.
const Body = z
  .object({
    titleDefaultTr: z.string().optional(),
    titleDefaultEn: z.string().optional(),
    titleTemplate: z.string().optional(),
    descriptionTr: z.string().optional(),
    descriptionEn: z.string().optional(),
    keywordsTr: z.union([z.string(), z.array(z.string())]).optional(),
    keywordsEn: z.union([z.string(), z.array(z.string())]).optional(),
    ogImageUrl: z.string().nullable().optional(),
    faviconUrl: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    g2Url: z.string().nullable().optional(),
    wikidataUrl: z.string().nullable().optional(),
    crunchbaseUrl: z.string().nullable().optional(),
    capterraUrl: z.string().nullable().optional(),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  const raw = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, raw);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const updates: Array<{ key: string; value: string | null }> = [];

  if (body.titleDefaultTr !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.titleDefaultTr, value: body.titleDefaultTr.trim() });
  if (body.titleDefaultEn !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.titleDefaultEn, value: body.titleDefaultEn.trim() });
  if (body.titleTemplate !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.titleTemplate, value: body.titleTemplate.trim() });
  if (body.descriptionTr !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.descriptionTr, value: body.descriptionTr.trim() });
  if (body.descriptionEn !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.descriptionEn, value: body.descriptionEn.trim() });

  if (body.keywordsTr !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.keywordsTr, value: keywordsToCsv(body.keywordsTr) });
  if (body.keywordsEn !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.keywordsEn, value: keywordsToCsv(body.keywordsEn) });

  // URL/asset fields: trim → empty becomes null → row delete (clear). Each
  // independently optional so a single-field auto-persist PUT works.
  const urlFields = [
    'ogImageUrl',
    'faviconUrl',
    'logoUrl',
    'g2Url',
    'wikidataUrl',
    'crunchbaseUrl',
    'capterraUrl',
  ] as const;
  for (const field of urlFields) {
    const rawVal = body[field];
    if (rawVal !== undefined) {
      const value: string | null = typeof rawVal === 'string' ? rawVal.trim() || null : rawVal;
      updates.push({ key: SITE_SETTINGS_KEYS[field], value });
    }
  }

  if (updates.length === 0) return ApiErrors.badRequest('Güncellenecek alan yok');

  try {
    await prisma.$transaction(
      updates.map((u) =>
        u.value === null
          ? prisma.settings.deleteMany({ where: { key: u.key } })
          : prisma.settings.upsert({
              where: { key: u.key },
              update: { value: u.value },
              create: { key: u.key, value: u.value },
            })
      )
    );

    // Invalidate every route cache + process-local site-settings cache so
    // logo/metadata changes surface immediately (CLAUDE.md §38.101 — without
    // clearSiteSettingsCache the edit drifts up to the 60s TTL window).
    revalidatePath('/', 'layout');
    clearSiteSettingsCache();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[site-settings PUT]', err);
    return ApiErrors.internalError('Ayarlar kaydedilemedi');
  }
}
