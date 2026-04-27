import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import {
  getSiteSettings,
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_KEYS,
  type SiteSettings,
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

function keywordsToCsv(input: unknown): string | null {
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean).join(', ');
  }
  if (typeof input === 'string') {
    return input.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
  }
  return null;
}

export async function PUT(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return gate.res;

  let body: Partial<SiteSettings>;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('Geçersiz JSON gövdesi');
  }

  const updates: Array<{ key: string; value: string | null }> = [];

  if (typeof body.titleDefaultTr === 'string') updates.push({ key: SITE_SETTINGS_KEYS.titleDefaultTr, value: body.titleDefaultTr.trim() });
  if (typeof body.titleDefaultEn === 'string') updates.push({ key: SITE_SETTINGS_KEYS.titleDefaultEn, value: body.titleDefaultEn.trim() });
  if (typeof body.titleTemplate === 'string') updates.push({ key: SITE_SETTINGS_KEYS.titleTemplate, value: body.titleTemplate.trim() });
  if (typeof body.descriptionTr === 'string') updates.push({ key: SITE_SETTINGS_KEYS.descriptionTr, value: body.descriptionTr.trim() });
  if (typeof body.descriptionEn === 'string') updates.push({ key: SITE_SETTINGS_KEYS.descriptionEn, value: body.descriptionEn.trim() });

  const kwTr = keywordsToCsv(body.keywordsTr);
  if (kwTr !== null) updates.push({ key: SITE_SETTINGS_KEYS.keywordsTr, value: kwTr });

  const kwEn = keywordsToCsv(body.keywordsEn);
  if (kwEn !== null) updates.push({ key: SITE_SETTINGS_KEYS.keywordsEn, value: kwEn });

  if (body.faviconUrl !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.faviconUrl, value: body.faviconUrl });
  if (body.logoUrl !== undefined) updates.push({ key: SITE_SETTINGS_KEYS.logoUrl, value: body.logoUrl });

  // Entity-disambiguation profile URLs (audit §9 / §10). Each is independently
  // optional and trim-then-null-on-empty so an admin can clear a value with
  // an empty string just like the existing logo/favicon fields.
  const profileUrlFields: Array<keyof SiteSettings> = [
    'g2Url',
    'wikidataUrl',
    'crunchbaseUrl',
    'capterraUrl',
  ];
  for (const field of profileUrlFields) {
    if (body[field] !== undefined) {
      const raw = body[field];
      const value = typeof raw === 'string' ? raw.trim() || null : raw;
      updates.push({ key: SITE_SETTINGS_KEYS[field as keyof typeof SITE_SETTINGS_KEYS], value: value as string | null });
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

    // Invalidate every route cache so logo/metadata changes surface immediately
    revalidatePath('/', 'layout');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[site-settings PUT]', err);
    return ApiErrors.internalError('Ayarlar kaydedilemedi');
  }
}
