import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { isStrongPassword } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import { ApiErrors } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.adminUser.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          restaurantId: true,
          restaurant: {
            select: { name: true }
          }
        },
        orderBy: { username: 'asc' },
        skip,
        take: limit,
      }),
      prisma.adminUser.count(),
    ]);

    return NextResponse.json({
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return ApiErrors.internalError('Kullanıcılar çekilemedi');
  }
}

export async function POST(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  try {
    const body = await req.json();
    const { username, password, role, restaurantId, isNewRestaurant, restaurantData } = body;

    if (!username || !password || !role) {
      return ApiErrors.badRequest('Kullanıcı adı, şifre ve rol zorunludur', 'MISSING_FIELDS');
    }

    if (username.length < 3) {
      return ApiErrors.badRequest('Kullanıcı adı en az 3 karakter olmalıdır', 'INVALID_USERNAME');
    }

    if (!isStrongPassword(password)) {
      return ApiErrors.badRequest(
        'Şifre en az 8 karakter uzunluğunda olmalı, en az bir büyük harf ve bir rakam içermelidir',
        'WEAK_PASSWORD'
      );
    }

    if (role !== 'superadmin' && role !== 'manager') {
      return ApiErrors.badRequest('Geçersiz rol', 'INVALID_ROLE');
    }

    if (role === 'manager' && isNewRestaurant) {
      if (!restaurantData?.name || !restaurantData?.slug) {
        return ApiErrors.badRequest('Yeni restoran için isim ve URL zorunludur', 'MISSING_RESTAURANT_DATA');
      }
    } else if (role === 'manager' && !restaurantId) {
      return ApiErrors.badRequest('Manager rolü için bir restoran seçilmelidir', 'MISSING_RESTAURANT');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      const newUser = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.adminUser.findUnique({ where: { username } });
        if (existingUser) {
          throw Object.assign(new Error('USERNAME_TAKEN'), { apiCode: 'USERNAME_TAKEN' });
        }

        let finalRestaurantId = restaurantId;

        if (role === 'manager' && isNewRestaurant && restaurantData) {
          const rest = await tx.restaurant.create({
            data: {
              name: restaurantData.name,
              slug: restaurantData.slug,
              address: restaurantData.address || null,
              phone: restaurantData.phone || null,
            },
          });
          finalRestaurantId = rest.id;
        } else if (restaurantId) {
          const rest = await tx.restaurant.findUnique({ where: { id: restaurantId } });
          if (!rest) {
            throw Object.assign(new Error('INVALID_RESTAURANT'), { apiCode: 'INVALID_RESTAURANT' });
          }
        }

        return await tx.adminUser.create({
          data: {
            username,
            passwordHash: hashedPassword,
            role,
            restaurantId: role === 'manager' ? finalRestaurantId : null,
          },
          select: { id: true, username: true, role: true, restaurantId: true },
        });
      });

      return NextResponse.json({ success: true, user: newUser }, { status: 201 });
    } catch (txError: any) {
      if (txError?.apiCode === 'USERNAME_TAKEN') {
        return ApiErrors.conflict('Bu kullanıcı adı zaten kullanılıyor');
      }
      if (txError?.apiCode === 'INVALID_RESTAURANT') {
        return ApiErrors.badRequest('Seçilen restoran bulunamadı', 'INVALID_RESTAURANT');
      }
      if (txError?.code === 'P2002') {
        const target = Array.isArray(txError.meta?.target) ? txError.meta.target.join(',') : String(txError.meta?.target || '');
        if (target.includes('slug')) {
          return ApiErrors.conflict('Bu URL Slug zaten kullanımda');
        }
        if (target.includes('username')) {
          return ApiErrors.conflict('Bu kullanıcı adı zaten kullanılıyor');
        }
        return ApiErrors.conflict('Benzersiz alan çakışması');
      }
      throw txError;
    }
  } catch (error) {
    console.error('Failed to create user:', error);
    return ApiErrors.internalError('Kullanıcı oluşturulamadı');
  }
}

export async function DELETE(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiErrors.badRequest('Kullanıcı ID si gerekli', 'MISSING_ID');
    }

    if (id === admin.id) {
      return ApiErrors.badRequest('Kendi hesabınızı silemezsiniz', 'CANNOT_DELETE_SELF');
    }

    await prisma.adminUser.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return ApiErrors.internalError('Kullanıcı silinemedi');
  }
}
