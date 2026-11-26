// Home-screen icon of a business's loyalty card (CLAUDE.md §61): the
// business logo on a white tile over its brand colour, or a stamp-card
// glyph when there is no logo. Shapes only (no text: the server may have no
// fonts). Public: built from the public logo, cached for an hour.
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { loadPublicLoyaltyProgram } from '@/lib/loyalty-server';
import { normalizePortalImage, portalPalette, readLoyaltyPortal } from '@/lib/loyalty-portal';
import { FILES_URL_PATH } from '@/lib/file-store';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZES = new Set([180, 192, 512]);

function glyph(size: number, band: string, accent: string): string {
  const s = size;
  const cw = s * 0.62;
  const ch = s * 0.42;
  const x = (s - cw) / 2;
  const y = (s - ch) / 2;
  const r = s * 0.05;
  const dots: string[] = [];
  const cols = 3;
  const rows = 2;
  const dr = s * 0.045;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = x + cw * ((col + 1) / (cols + 1));
      const cy = y + ch * (row === 0 ? 0.38 : 0.72);
      const filled = row === 0 && col < 2;
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${dr}" fill="${filled ? accent : 'none'}" stroke="${accent}" stroke-width="${s * 0.012}"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
<rect width="${s}" height="${s}" fill="${band}"/>
<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="${r}" fill="#FFFFFF"/>
${dots.join('\n')}
</svg>`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limit = await rateLimit(`loyalty-icon:ip:${getClientIp(req.headers)}`, 120, 60_000);
  if (!limit.allowed) return new NextResponse(null, { status: 429 });
  const requested = Number(req.nextUrl.searchParams.get('size') ?? '192');
  const size = SIZES.has(requested) ? requested : 192;
  const maskable = req.nextUrl.searchParams.get('maskable') === '1';
  const program = await loadPublicLoyaltyProgram(slug);
  if (!program) return new NextResponse(null, { status: 404 });
  const portal = readLoyaltyPortal(program.portal);
  const pal = portalPalette(portal.theme, program.accentColor);
  // Dots on the white card: the brand colour when it is dark enough, else graphite.
  const dotColor = pal.onBand === '#FFFFFF' ? pal.band : '#0A0A0A';

  let png: Buffer;
  const logoPath = normalizePortalImage(portal.logoUrl);
  const stored = logoPath
    ? await prisma.storedFile.findUnique({ where: { path: logoPath.slice(FILES_URL_PATH.length) }, select: { data: true } })
    : null;
  try {
    if (stored) {
      // Maskable icons keep the important part inside the inner 80 %.
      const tile = Math.round(size * (maskable ? 0.58 : 0.72));
      const pad = Math.round(tile * 0.12);
      const logo = await sharp(Buffer.from(stored.data))
        .resize(tile - pad * 2, tile - pad * 2, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
      const plate = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" rx="${tile * 0.22}" fill="#FFFFFF"/></svg>`,
      );
      const plateImg = await sharp(plate).composite([{ input: logo, top: pad, left: pad }]).png().toBuffer();
      const offset = Math.round((size - tile) / 2);
      png = await sharp({ create: { width: size, height: size, channels: 4, background: pal.band } })
        .composite([{ input: plateImg, top: offset, left: offset }])
        .png()
        .toBuffer();
    } else {
      png = await sharp(Buffer.from(glyph(size, pal.band, dotColor))).png().toBuffer();
    }
  } catch {
    png = await sharp(Buffer.from(glyph(size, '#0A0A0A', '#C6F24E'))).png().toBuffer();
  }
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
