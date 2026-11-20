import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { MENU_THEMES } from '@/lib/validations';
import { revalidatePublicMenu } from '@/lib/restaurant-revalidate';
import { PRESETS, normalizeMenuDesign, readMenuDesign } from '@/lib/menu-design';
import { AccentWrite } from '@/lib/menu-design-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH /api/admin/restaurants/[id]/menu-theme
//
// Superadmin-only override for restaurant menu theme + accent + logo.
// Owner usually controls these from /[locale]/dashboard/restaurants/[id]/menu
// (CLAUDE.md §12), but Buaze support/operations occasionally needs to fix a
// broken visual setup without impersonation.
//
// Disipline:
// - Superadmin gate only (CLAUDE.md §37.2.E + admin destructive CRUD pattern).
// - Zod `.strict()` schema (CLAUDE.md §28.3.1 mass-assignment kapatma).
// - Hex color regex via shared isValidHexColor helper (XSS-safe inline style).
// - Logo URL: data: prefix (base64) accepts up to 300KB; http(s) URL up to 1000
//   chars. Mirror's `imageUrl` validation in owner-side /theme endpoint.
// - Upstash rate limit 30/dk/actor (CLAUDE.md §37.2.C privileged write).
// - AdminAuditLog row with before/after snapshot (CLAUDE.md §37.2.C).
// - Defensive `select` (CLAUDE.md §14.1).
const Body = z
  .object({
    menuTheme: z.enum(MENU_THEMES).optional(),
    // Color: #RGB / #RRGGBB, stored as uppercase #RRGGBB, or null (clears the
    // override → falls back to primaryColor at render time).
    menuAccentColor: AccentWrite.nullable().optional(),
    // Logo: data:image/ base64 (≤300 KB) or http(s) URL (≤1000 chars), or null.
    menuLogoUrl: z
      .string()
      .max(500_000)
      .refine(
        (v) => {
          if (!v) return true;
          if (v.startsWith('data:image/')) {
            // Raster only, same 300 KB budget as the owner theme route — the
            // public image route rejects SVG, so an SVG logo would just break.
            if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v)) return false;
            return v.length <= 300 * 1024;
          }
          return /^https?:\/\//i.test(v) && v.length <= 1000;
        },
        { message: 'invalid_logo_url' },
      )
      .nullable()
      .optional(),
    // Reset / remove only — admins do not design for owners (menu-design-final §8.2).
    menuDesign: z.null().optional(),
    menuCoverUrl: z.null().optional(),
  })
  .strict();

async function writeAudit(entry: {
  actorId: string;
  action: string;
  targetId: string;
  payload?: unknown;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        actorSource: 'admin',
        action: entry.action,
        targetId: entry.targetId,
        payload: (entry.payload as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (err) {
    // Non-fatal: preview deploy may lack audit table (P2021 schema drift).
    console.warn('[audit] write failed (non-fatal)', (err as Error).message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Yetkisiz erişim' },
      { status: admin ? 403 : 401 },
    );
  }

  // Rate limit — privileged write surface, 30/dk/actor.
  const limit = await rateLimit(`admin-menu-theme:${String(admin.id)}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' },
      { status: 429 },
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;

  // Defensive select — only the 3 fields we manage (CLAUDE.md §14.1).
  const before = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      menuTheme: true,
      menuAccentColor: true,
      menuLogoUrl: true,
      menuDesign: true,
      menuCoverVersion: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
  }

  // Build a partial patch — only include keys the client explicitly sent.
  // Mirrors the feature-access endpoint's "no fields → 400" pattern.
  const data: Prisma.RestaurantUpdateInput = {};
  if (parsed.data.menuTheme !== undefined) {
    data.menuTheme = parsed.data.menuTheme;
  }
  if (parsed.data.menuDesign === null) {
    data.menuDesign = Prisma.DbNull;
  } else if (parsed.data.menuTheme !== undefined) {
    // Family consistency: a stored design from another family is rewritten
    // onto the new theme's own preset, keeping the owner's knobs + tagline.
    const stored = readMenuDesign(before.menuDesign);
    if (stored && PRESETS[stored.preset].family !== parsed.data.menuTheme) {
      const rewritten = normalizeMenuDesign(parsed.data.menuTheme, { ...stored, preset: parsed.data.menuTheme });
      data.menuDesign = rewritten ? (rewritten as unknown as Prisma.InputJsonObject) : Prisma.DbNull;
    }
  }
  if (parsed.data.menuCoverUrl === null) {
    data.menuCoverUrl = null;
    data.menuCoverVersion = null;
  }
  if (parsed.data.menuAccentColor !== undefined) {
    data.menuAccentColor = parsed.data.menuAccentColor;
  }
  if (parsed.data.menuLogoUrl !== undefined) {
    data.menuLogoUrl = parsed.data.menuLogoUrl;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  }
  // Always bump menuUpdatedAt — owner panel + admin both rely on this for
  // "Son güncelleme" display and cache invalidation hints.
  data.menuUpdatedAt = new Date();

  const updated = await prisma.restaurant.update({
    where: { id },
    data,
    select: {
      id: true,
      menuTheme: true,
      menuAccentColor: true,
      menuLogoUrl: true,
      menuDesign: true,
      menuCoverVersion: true,
      menuUpdatedAt: true,
      slug: true,
    },
  });

  // Same value in the owner Brand tab (BrandSettings is read first there).
  const brandData: { accentColor?: string | null; logoUrl?: string | null } = {};
  if (parsed.data.menuAccentColor !== undefined) brandData.accentColor = parsed.data.menuAccentColor;
  if (parsed.data.menuLogoUrl !== undefined) brandData.logoUrl = parsed.data.menuLogoUrl;
  if (Object.keys(brandData).length > 0) {
    await prisma.brandSettings.updateMany({ where: { restaurantId: id }, data: brandData }).catch(() => undefined);
  }
  // The public menu is ISR-cached for an hour; show the change now.
  revalidatePublicMenu(updated.slug);

  await writeAudit({
    actorId: String(admin.id),
    action: 'admin.restaurants.menu_theme_update',
    targetId: id,
    payload: {
      before: {
        theme: before.menuTheme,
        accent: before.menuAccentColor,
        hasLogo: Boolean(before.menuLogoUrl),
        hasDesign: before.menuDesign !== null,
        hasCover: Boolean(before.menuCoverVersion),
      },
      after: {
        theme: updated.menuTheme,
        accent: updated.menuAccentColor,
        hasLogo: Boolean(updated.menuLogoUrl),
        hasDesign: updated.menuDesign !== null,
        hasCover: Boolean(updated.menuCoverVersion),
      },
    },
  });

  return NextResponse.json({ restaurant: updated });
}
