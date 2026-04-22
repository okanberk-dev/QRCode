import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';
import { isValidHexColor, isValidMenuTheme } from '@/lib/validations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await requireRestaurantAccess(req, id);
  if (!access.ok) return access.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if ('menuTheme' in b) {
    if (!isValidMenuTheme(b.menuTheme)) {
      return NextResponse.json({ error: 'Geçersiz tema. classic, modern, elegant veya gastronomy olmalı.' }, { status: 400 });
    }
    data.menuTheme = b.menuTheme;
  }

  if ('menuAccentColor' in b) {
    if (b.menuAccentColor === null) {
      data.menuAccentColor = null;
    } else if (!isValidHexColor(b.menuAccentColor)) {
      return NextResponse.json({ error: 'Geçersiz renk. #RGB veya #RRGGBB formatında olmalı.' }, { status: 400 });
    } else {
      data.menuAccentColor = b.menuAccentColor;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan bulunamadı' }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data,
    select: { id: true, menuTheme: true, menuAccentColor: true },
  });

  await touchMenuUpdated(id);

  return NextResponse.json(restaurant);
}
