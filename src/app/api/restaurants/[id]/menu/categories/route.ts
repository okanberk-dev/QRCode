import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateMenuCategory } from '@/lib/validations';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      items: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = validateMenuCategory(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const last = await prisma.menuCategory.findFirst({
    where: { restaurantId: id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const nextSort = parsed.data.sortOrder ?? (last ? last.sortOrder + 10 : 0);

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId: id,
      name: parsed.data.name!,
      description: parsed.data.description ?? null,
      isVisible: parsed.data.isVisible ?? true,
      sortOrder: nextSort,
    },
  });
  await touchMenuUpdated(id);
  return NextResponse.json({ category }, { status: 201 });
}
