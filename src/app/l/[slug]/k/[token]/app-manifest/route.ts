// Web app manifest of one customer's card (CLAUDE.md §61): "Add to home
// screen" puts the business's icon on the phone and opens this card like an
// app. The start URL carries the card token, so the manifest is served only
// to whoever already has the card link (same path) and never cached.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadPublicLoyaltyProgram } from '@/lib/loyalty-server';
import { portalPalette, readLoyaltyPortal } from '@/lib/loyalty-portal';
import { loyaltyCardPath } from '@/lib/loyalty';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Content-Type': 'application/manifest+json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex',
  'Referrer-Policy': 'no-referrer',
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });
  const program = await loadPublicLoyaltyProgram(slug);
  if (!program) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });
  const member = await prisma.loyaltyMember.findFirst({ where: { programId: program.id, cardToken: token }, select: { id: true } });
  if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });

  const portal = readLoyaltyPortal(program.portal);
  const pal = portalPalette(portal.theme, program.accentColor);
  const name = program.restaurant.name;
  const cardPath = loyaltyCardPath(slug, token);
  const icon = (size: number, maskable = false) => ({
    src: `/l/${slug}/app-icon?size=${size}${maskable ? '&maskable=1' : ''}`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: maskable ? 'maskable' : 'any',
  });
  const manifest = {
    id: cardPath,
    name: `${name} — ${program.name}`.slice(0, 60),
    short_name: name.slice(0, 24),
    description: program.name,
    start_url: `${cardPath}?via=app`,
    scope: `/l/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: pal.bg,
    theme_color: pal.band,
    lang: 'tr',
    icons: [icon(192), icon(512), icon(512, true)],
  };
  return new NextResponse(JSON.stringify(manifest), { headers: HEADERS });
}
