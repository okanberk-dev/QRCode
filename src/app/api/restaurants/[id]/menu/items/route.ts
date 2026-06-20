import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMenuModuleAccess, requireRestaurantAccess, touchMenuUpdated } from '@/lib/menu-access';
import { validateMenuItem } from '@/lib/validations';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId') || undefined;

  const items = await prisma.menuItem.findMany({
    where: {
      restaurantId: id,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireMenuModuleAccess(req, id);
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const parsed = validateMenuItem(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const category = await prisma.menuCategory.findUnique({
    where: { id: parsed.data.categoryId! },
    select: { restaurantId: true, deletedAt: true }, // §14.1 defensive select
  });
  if (!category || category.restaurantId !== id || category.deletedAt) {
    return NextResponse.json({ error: 'Kategori bu restorana ait değil' }, { status: 400 });
  }

  const last = await prisma.menuItem.findFirst({
    where: { categoryId: parsed.data.categoryId!, deletedAt: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const nextSort = parsed.data.sortOrder ?? (last ? last.sortOrder + 10 : 0);

  const item = await prisma.menuItem.create({
    data: {
      restaurantId: id,
      categoryId: parsed.data.categoryId!,
      name: parsed.data.name!,
      description: parsed.data.description ?? null,
      priceCents: parsed.data.priceCents ?? 0,
      currency: parsed.data.currency ?? 'TRY',
      imageUrl: parsed.data.imageUrl ?? null,
      badges: parsed.data.badges ?? [],
      allergens: parsed.data.allergens ?? [],
      isAvailable: parsed.data.isAvailable ?? true,
      isOutOfStock: parsed.data.isOutOfStock ?? false,
      sortOrder: nextSort,
    },
  });
  await touchMenuUpdated(id);
  return NextResponse.json({ item }, { status: 201 });
}
