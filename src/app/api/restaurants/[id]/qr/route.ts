import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import QRCode from 'qrcode';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table') || '';
  const format = searchParams.get('format') || 'svg'; // svg or png

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let qrUrl = `${appUrl}/r/${restaurant.slug}?source=qr`;
    if (table) {
      qrUrl += `&table=${encodeURIComponent(table)}`;
    }

    if (format === 'png') {
      const pngBuffer = await QRCode.toBuffer(qrUrl, {
        type: 'png',
        width: 800,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      return new NextResponse(pngBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.png"`,
        },
      });
    }

    // Default: SVG
    const svgString = await QRCode.toString(qrUrl, {
      type: 'svg',
      width: 800,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    return new NextResponse(svgString, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.svg"`,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'QR kod oluşturulamadı' }, { status: 500 });
  }
}
