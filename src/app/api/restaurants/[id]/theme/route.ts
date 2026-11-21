import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireMenuModuleAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { MENU_THEMES, type MenuTheme } from '@/lib/validations';
import { PRESETS, normalizeMenuDesign, type MenuDesign } from '@/lib/menu-design';
import { AccentWrite, CoverWrite, MenuDesignWriteSchema } from '@/lib/menu-design-schema';
import { contentVersion } from '@/lib/menu-image-url';

// PATCH /api/restaurants/[id]/theme — the Menu Studio "Görünüm" Apply
// (menu-design-final.md §8.1). One PATCH carries only the changed keys.
//
// - Gate: requireMenuModuleAccess (viewer → 403 forbidden_role, module off →
//   403 MENU_MODULE_DISABLED, admins bypass), 30 writes / min / restaurant.
// - Strict Zod body: an unknown key is a 400 `validation_error` on purpose —
//   ThemeSync confirms the keys it sent on `r.ok`, so a key that was not
//   persisted must fail loudly.
// - menuDesign must belong to the stored (or sent) menuTheme family → else 409
//   DESIGN_CONFLICT. It is stored normalised; a pure legacy look is SQL NULL
//   (Prisma.DbNull, never JsonNull).
// - The cover gets a content-hash version written with it; no blob is echoed.
// - Accent and logo are mirrored into BrandSettings (see below).

// Raster whitelist for the logo (unchanged rules; mirrors validations.ts).
const DATA_URL_RASTER_RE = /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,/i;
const PAYLOAD_MAX_BYTES = 900_000;

const LogoWrite = z.union([z.null(), z.string()]).transform((value, ctx) => {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) {
    // Raster only: `data:image/svg+xml` can carry <script> and the logo renders
    // on the public menu (stored XSS).
    if (!DATA_URL_RASTER_RE.test(trimmed) || trimmed.length > 300_000) {
      ctx.addIssue({ code: 'custom', message: 'invalid_logo' });
      return z.NEVER;
    }
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && trimmed.length <= 1000) return trimmed;
  } catch {
    // reported below
  }
  ctx.addIssue({ code: 'custom', message: 'invalid_logo' });
  return z.NEVER;
});

const ThemePatch = z
  .strictObject({
    menuTheme: z.enum(MENU_THEMES).optional(),
    menuAccentColor: z.union([z.null(), AccentWrite]).optional(),
    menuLogoUrl: LogoWrite.optional(),
    menuDesign: MenuDesignWriteSchema.nullable().optional(),
    menuCoverUrl: CoverWrite.optional(),
  })
  .refine((b) => Object.keys(b).length > 0, 'empty_body');

type ThemePatchBody = z.infer<typeof ThemePatch>;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await requireMenuModuleAccess(req, id);
  if (!access.ok) return access.res;

  const limit = await rateLimit(`menu-theme:${id}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > PAYLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const parsed = validateBody<ThemePatchBody>(ThemePatch, body);
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;

  const data: Prisma.RestaurantUpdateInput = {};
  if (b.menuTheme !== undefined) data.menuTheme = b.menuTheme;
  if (b.menuAccentColor !== undefined) data.menuAccentColor = b.menuAccentColor;
  if (b.menuLogoUrl !== undefined) data.menuLogoUrl = b.menuLogoUrl;

  if (b.menuDesign !== undefined) {
    let family: MenuTheme = 'classic';
    const sent = b.menuTheme;
    if (sent) {
      family = sent;
    } else {
      const row = await prisma.restaurant.findUnique({ where: { id }, select: { menuTheme: true } });
      if (row && (MENU_THEMES as readonly string[]).includes(row.menuTheme)) family = row.menuTheme as MenuTheme;
    }
    const design = b.menuDesign as MenuDesign | null;
    if (design && PRESETS[design.preset].family !== family) {
      return NextResponse.json({ error: 'DESIGN_CONFLICT' }, { status: 409 });
    }
    const normalized = normalizeMenuDesign(family, design);
    data.menuDesign = normalized ? (normalized as unknown as Prisma.InputJsonObject) : Prisma.DbNull;
  }

  if (b.menuCoverUrl !== undefined) {
    data.menuCoverUrl = b.menuCoverUrl;
    data.menuCoverVersion = b.menuCoverUrl ? contentVersion(b.menuCoverUrl) : null;
  }

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data,
    // No blobs are echoed (logo / cover stay server-side).
    select: { id: true, menuTheme: true, menuAccentColor: true, menuDesign: true, menuCoverVersion: true },
  });

  // Brand settings keep their own copy of the accent and logo, and a Brand
  // save writes that copy back onto the restaurant. Mirror what Studio just
  // applied (as the admin menu-theme route does), or the next Brand save
  // would silently revert it on the public menu.
  const brandData: { accentColor?: string | null; logoUrl?: string | null } = {};
  if (b.menuAccentColor !== undefined) brandData.accentColor = b.menuAccentColor;
  if (b.menuLogoUrl !== undefined) brandData.logoUrl = b.menuLogoUrl;
  if (Object.keys(brandData).length > 0) {
    await prisma.brandSettings.updateMany({ where: { restaurantId: id }, data: brandData }).catch(() => undefined);
  }

  await touchMenuUpdated(id);

  return NextResponse.json(restaurant);
}
