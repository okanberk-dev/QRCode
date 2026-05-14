import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import {
  INVITE_TOKEN_TTL_DAYS,
  generateInviteToken,
  inviteExpiresAt,
  roleLabel,
} from '@/lib/team-invite';
import { sendTeamInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Wave 4 PR-8 audit fix (A4): Zod `.strict()` schema migration. Eski
// manuel destructure + `body.locations !== undefined` mix-mode validation
// (CLAUDE.md §28.3.1 — yeni endpoint disiplinine aykırıydı, schema
// self-documentation eksikti + yeni field eklenirse silent mass-assignment
// riski). Yeni schema mass-assignment kapatır (`.strict()` schema dışı
// field'lar 400 ile reddedilir) + tip-güvenli `parsed.data`.
//
// `VALID_ROLES` set + manual `isValidEmail` korunmuş yardımcı validation
// yerine Zod literal union + email() refinement → kontrat tek noktada.
const InviteSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(200)
      .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'invalid_email'),
    role: z.enum(['owner', 'manager', 'staff', 'viewer']).optional(),
    name: z
      .string()
      .max(500)
      .transform((v) => v.trim().slice(0, 120))
      .optional()
      .nullable(),
    // `locations` is owner-controlled — IDOR whitelist owner'ın
    // gerçekten sahip olduğu restoranlara karşı `findMany` ile yapılır
    // (CLAUDE.md §37.2 B). Bu schema yalnız tip + boyut kontrolü
    // (max 40 array, her id ≤ 64 char).
    locations: z.array(z.string().max(64)).max(40).optional().nullable(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) {
    return NextResponse.json({ error: 'forbidden', hint: 'team is workspace-scoped' }, { status: 403 });
  }

  // Stage 108 §38.188 — defensive `select` (CLAUDE.md §14.1). Without
  // this, every TeamMember column ships in the response (incl. inviteToken,
  // inviteTokenExpiresAt, locations array, ownerId) — extra bandwidth and
  // accidental token leakage if the response body is ever logged. Schema
  // drift (P2022) also turned into an issue if a future column is added
  // before the migration runs in preview.
  const members = await prisma.teamMember.findMany({
    where: { ownerId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(
    {
      data: members.map((m) => ({
        id: m.id,
        email: m.email,
        name: m.name,
        role: m.role,
        status: m.status,
        lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    {
      headers: {
        // Edge cache (CLAUDE.md §38.100 Stage 24). Team list — invite/remove
        // mutation frequency düşük; 30s fresh + 2min SWR yeterli. `private`
        // directive cookie-isolated.
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // §22 — team_member rolündeki kullanıcı kendi davetlerini yönetemez,
  // sadece restaurant_owner workspace üzerinde davet yetkisine sahip.
  if (actor.source !== 'user' || actor.role !== 'restaurant_owner') {
    return NextResponse.json(
      { error: 'forbidden', hint: 'only workspace owner can invite' },
      { status: 403 },
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof InviteSchema>>(InviteSchema, rawBody);
  if (!parsed.ok) return parsed.response;

  const { email, role: roleInput, name: nameInput, locations: locationsInput } = parsed.data;
  const role = roleInput ?? 'manager';
  const name = nameInput && nameInput.length > 0 ? nameInput : null;

  // IDOR whitelist — owner-controlled `locations` ASLA verbatim DB'ye
  // yazılmaz. Owner'ın gerçek restoranlarıyla intersect; bilinmeyen
  // id'ler sessizce drop. Tüm istek owner'ın hiçbir restoranını
  // kapsamıyorsa 400 (UI hatası — kullanıcı UI'da olmayan bir
  // restoran id'sini gönderemez, gönderiliyorsa client bug).
  let locations: string[] | null = null;
  if (locationsInput !== undefined && locationsInput !== null) {
    const requested = locationsInput;
    if (requested.length > 0) {
      const ownedRows = await prisma.restaurant.findMany({
        where: { id: { in: requested }, userId: actor.id },
        select: { id: true },
      });
      const ownedSet = new Set(ownedRows.map((r) => r.id));
      const filtered = requested.filter((id) => ownedSet.has(id));
      if (filtered.length === 0) {
        return NextResponse.json(
          { error: 'invalid_locations', hint: 'no requested location is owned by you' },
          { status: 400 },
        );
      }
      locations = filtered;
    } else {
      locations = [];
    }
  }

  // Faz 4 — invite token üret + mail tetikle. Token unique, expiresAt 7 gün.
  const inviteToken = await generateInviteToken();
  const inviteTokenExpiresAt = inviteExpiresAt();
  const now = new Date();

  const member = await prisma.teamMember.upsert({
    where: { ownerId_email: { ownerId: actor.id, email } },
    create: {
      ownerId: actor.id,
      email,
      name,
      role,
      locations: locations ?? undefined,
      status: 'invited',
      inviteToken,
      inviteTokenExpiresAt,
      lastInvitedAt: now,
    },
    update: {
      name: name ?? undefined,
      role,
      locations: locations ?? undefined,
      status: 'invited',
      // Re-invite (yeni token + expires yenilenir, eski token geçersiz)
      inviteToken,
      inviteTokenExpiresAt,
      lastInvitedAt: now,
    },
  });

  // Mail gönderim — owner workspace info'su için User'ı oku.
  // Restoran adları locations[] (veya tüm restoranlar) için lookup.
  const owner = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true, locale: true },
  });

  let restaurantNames: string[] = [];
  if (locations && locations.length > 0) {
    const rows = await prisma.restaurant.findMany({
      where: { id: { in: locations }, userId: actor.id },
      select: { name: true },
    });
    restaurantNames = rows.map((r) => r.name);
  } else {
    // Tüm konumlar — owner'ın restoranlarını listele (ad olarak göster).
    const rows = await prisma.restaurant.findMany({
      where: { userId: actor.id },
      select: { name: true },
      take: 6,
    });
    restaurantNames = rows.map((r) => r.name);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const localeStr: 'tr' | 'en' = owner?.locale === 'en' ? 'en' : 'tr';
  const acceptUrl = `${appUrl}/${localeStr}/accept-invite?token=${inviteToken}`;

  // Fire-and-forget — mail başarısız olursa DB row yine yazılı kalır,
  // owner panelinden "Daveti yenile" ile retry edilebilir.
  void sendTeamInviteEmail({
    to: email,
    name: name,
    ownerName: owner?.name || owner?.email || 'Buaze',
    restaurantNames,
    roleLabel: roleLabel({ role, locale: localeStr }),
    acceptUrl,
    expiresInDays: INVITE_TOKEN_TTL_DAYS,
    locale: localeStr,
  }).catch((err) => {
    console.error('[team:invite] mail send failed:', (err as Error).message);
  });

  return NextResponse.json(
    {
      ok: true,
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role,
        status: member.status,
        lastSeenAt: null,
        lastInvitedAt: member.lastInvitedAt?.toISOString() ?? null,
        createdAt: member.createdAt.toISOString(),
      },
    },
    {
      // CLAUDE.md §40.6 — mutation endpoint defansif `no-store`. Auth
      // boundary zaten korur ama explicit yazmak CDN/proxy katmanlarında
      // kaza eseri response cache'lemeyi engeller (§A5 audit fix).
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
