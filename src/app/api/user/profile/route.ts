import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyJwt } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('user_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('[PROFILE_GET]', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('user_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (name) updateData.name = name.trim();
    
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda' }, { status: 400 });
      }
      updateData.email = email.toLowerCase().trim();
    }

    // Password change logic
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Mevcut şifrenizi girmeniz gerekmektedir' }, { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Mevcut şifreniz hatalı' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Yeni şifre en az 8 karakter olmalıdır' }, { status: 400 });
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[PROFILE_PUT]', error);
    return NextResponse.json({ error: 'Güncelleme sırasında bir hata oluştu' }, { status: 500 });
  }
}
