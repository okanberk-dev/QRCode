// Loyalty QR codes (CLAUDE.md §60).
//  - default: the join link (/l/<slug>) — counter poster, PNG or SVG.
//  - ?member=<id>: that customer's card link, so staff can let a customer
//    who lost the link scan it from the panel screen (counter staff only).
//    `&format=url` returns the link as JSON (written to an NFC key fob, §61).
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { withServerTiming } from '@/lib/server-timing';
import { gateLoyaltyRoute } from '@/lib/loyalty-route';
import { loadLoyaltyProgram, loyaltyPublicBaseUrl } from '@/lib/loyalty-server';
import { loyaltyCardPath, loyaltyJoinPath } from '@/lib/loyalty';
import { composePremiumQrPng, composePremiumQrSvg } from '@/lib/qr-premium-png';

async function handleGET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  const memberId = sp.get('member');
  const gate = await gateLoyaltyRoute(req, id, memberId ? 'operate' : 'read');
  if (!gate.ok) return gate.response;
  const rl = await rateLimit(`loyalty-qr:${gate.actor.id}`, 120, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limit' }, { status: 429 });

  const program = await loadLoyaltyProgram(id);
  if (!program) return NextResponse.json({ error: 'NO_PROGRAM' }, { status: 404 });
  const base = loyaltyPublicBaseUrl();
  const format = sp.get('format') === 'png' ? 'png' : 'svg';

  if (memberId) {
    const member = await prisma.loyaltyMember.findFirst({
      where: { id: memberId, programId: program.id },
      select: { cardToken: true },
    });
    if (!member) return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
    const cardUrl = `${base}${loyaltyCardPath(program.slug, member.cardToken)}`;
    // The card link itself, to write on an NFC key fob / sticker (§61).
    if (sp.get('format') === 'url') {
      // `?via=nfc`: a tap on the fob opens the card with the arrival screen.
      return NextResponse.json({ url: `${cardUrl}?via=nfc` }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    const svg = await QRCode.toString(cardUrl, {
      type: 'svg',
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
    });
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  }

  const url = `${base}${loyaltyJoinPath(program.slug)}?source=qr`;
  const label = `${gate.restaurant.name} · ${program.name}`.slice(0, 80);
  const host = `${new URL(base).hostname.replace(/^www\./, '')}${loyaltyJoinPath(program.slug)}`;
  const plain = sp.get('style') === 'plain';
  const filename = `sadakat-${program.slug}${plain ? '-sade' : ''}.${format}`;

  if (format === 'png') {
    const png = plain
      ? await QRCode.toBuffer(url, { type: 'png', width: 1000, margin: 2, errorCorrectionLevel: 'H' })
      : await composePremiumQrPng({ data: url, size: 1000, dark: '#000000', light: '#ffffff', restaurantName: label, qrHost: host, locale: 'tr' }).catch(
          () => QRCode.toBuffer(url, { type: 'png', width: 1000, margin: 2, errorCorrectionLevel: 'H' }),
        );
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  const svg = plain
    ? await QRCode.toString(url, { type: 'svg', width: 600, margin: 2, errorCorrectionLevel: 'H' })
    : composePremiumQrSvg({ data: url, size: 600, dark: '#000000', light: '#ffffff', restaurantName: label, qrHost: host, locale: 'tr' });
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      ...(sp.get('download') === '1' ? { 'Content-Disposition': `attachment; filename="${filename}"` } : {}),
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = withServerTiming(handleGET);
