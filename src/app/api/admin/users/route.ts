import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  try {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        restaurantId: true,
        restaurant: {
          select: { name: true }
        }
      },
      orderBy: { username: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcılar getirilemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, password, role, restaurantId, isNewRestaurant, restaurantData } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    if (role === 'manager' && isNewRestaurant) {
      if (!restaurantData?.name || !restaurantData?.slug) {
        return NextResponse.json({ error: 'Yeni restoran için isim ve URL zorunludur' }, { status: 400 });
      }
    }

    const existing = await prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let finalRestaurantId = restaurantId;

    if (role === 'manager' && isNewRestaurant && restaurantData) {
      // Sluğun daha önce kullanılıp kullanılmadığını kontrol et
      const existingRest = await prisma.restaurant.findUnique({ where: { slug: restaurantData.slug } });
      if (existingRest) {
        return NextResponse.json({ error: 'Bu URL Slug zaten kullanımda' }, { status: 400 });
      }

      const rest = await prisma.restaurant.create({
        data: {
          name: restaurantData.name,
          slug: restaurantData.slug,
          address: restaurantData.address || null,
          phone: restaurantData.phone || null,
        }
      });
      finalRestaurantId = rest.id;
    }

    const user = await prisma.adminUser.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role,
        restaurantId: role === 'manager' ? finalRestaurantId : null
      },
      select: { id: true, username: true, role: true }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error('[ADMIN_USER_CREATE]', error);
    return NextResponse.json({ error: error?.message || 'Kullanıcı oluşturulamadı' }, { status: 500 });
  }
}
