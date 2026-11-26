// The business's customer panel settings (/l/<slug>, CLAUDE.md §61): look,
// welcome text, offers, contact blocks and the data-controller details used
// in the legal texts. Managers only; every customer-facing text passes the
// reply risk gate (§48) so no profanity, links or review pressure.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute } from '@/lib/loyalty-route';
import { moderateText } from '@/lib/loyalty-moderation';
import { isValidEmail } from '@/lib/validations';
import { loadLoyaltyProgram, toProgramDto } from '@/lib/loyalty-server';
import { normalizePortalImage, PORTAL_LIMITS as P, readLoyaltyPortal } from '@/lib/loyalty-portal';

const Offer = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/i).optional(),
    title: z.string().trim().min(1).max(P.offerTitleMax),
    body: z.string().trim().max(P.offerBodyMax).default(''),
    badge: z.string().trim().max(P.badgeMax).nullable().default(null),
  })
  .strict();

const Body = z
  .object({
    theme: z.enum(['light', 'dark', 'brand']),
    logoUrl: z.string().max(400).nullable(),
    coverUrl: z.string().max(400).nullable(),
    headline: z.string().trim().max(P.headlineMax).nullable(),
    welcome: z.string().trim().max(P.welcomeMax).nullable(),
    offers: z.array(Offer).max(P.offersMax),
    showMenu: z.boolean(),
    showContact: z.boolean(),
    showSocial: z.boolean(),
    legalName: z.string().trim().max(P.legalNameMax).nullable(),
    legalAddress: z.string().trim().max(P.legalAddressMax).nullable(),
    legalEmail: z.string().trim().max(190).nullable(),
  })
  .strict();

async function handlePUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM', code: 'NO_PROGRAM' }, { status: 404 });

  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  if ((d.logoUrl && !normalizePortalImage(d.logoUrl)) || (d.coverUrl && !normalizePortalImage(d.coverUrl))) {
    return NextResponse.json({ error: 'INVALID_IMAGE', code: 'INVALID_IMAGE' }, { status: 400 });
  }
  if (d.legalEmail && !isValidEmail(d.legalEmail)) {
    return NextResponse.json({ error: 'INVALID_EMAIL', code: 'INVALID_EMAIL' }, { status: 400 });
  }
  const texts = [d.headline ?? '', d.welcome ?? '', ...d.offers.flatMap((o) => [o.title, o.body, o.badge ?? ''])];
  const blocked = moderateText(texts.join('\n'));
  if (blocked) return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED', issues: blocked }, { status: 422 });
  if (moderateText([d.legalName ?? '', d.legalAddress ?? ''].join('\n'))?.some((k) => k !== 'link')) {
    return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED' }, { status: 422 });
  }

  // Read back through the same normaliser the pages use (one shape everywhere).
  const portal = readLoyaltyPortal({
    ...d,
    offers: d.offers.map((o, i) => ({ ...o, id: o.id ?? `offer-${Date.now().toString(36)}-${i}` })),
  });
  await prisma.loyaltyProgram.update({ where: { id: program.id }, data: { portal: portal as object } });
  await writePanelAuditLog(gate.actor, 'owner.loyalty.portal.update', id, {
    restaurantId: id,
    theme: portal.theme,
    offers: portal.offers.length,
    hasLogo: Boolean(portal.logoUrl),
    hasCover: Boolean(portal.coverUrl),
  });
  const saved = await loadLoyaltyProgram(id);
  return NextResponse.json({ program: saved ? toProgramDto(saved) : null });
}

export const PUT = withServerTiming(handlePUT);
