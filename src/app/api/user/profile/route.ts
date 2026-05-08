import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
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
        // §38.37 — Hesabım profile genişletme (phone/position/timezone).
        phoneNumber: true,
        position: true,
        timezone: true,
        // §38.51 — emailVerified UI badge için (tasarım "Doğrulandı" green check).
        emailVerified: true,
        role: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // User.role='team_member' ise TeamMember.role'ü de döndür — frontend
    // role-based UI gate'leri için (viewer butonları disabled vb.). Diğer
    // rol'lerde (restaurant_owner) `teamRole` null kalır; UI tüm yetkileri
    // varsayar.
    let teamRole: string | null = null;
    if (user.role === 'team_member') {
      const member = await prisma.teamMember.findFirst({
        where: { email: user.email.toLowerCase().trim(), status: 'active' },
        select: { role: true },
      });
      teamRole = member?.role ?? null;
    }

    // Stage 87 §38.167 — owner-scoped IDOR-gated profile read; PUT
    // mutation aşağıda intact. Cache-Control private (per-cookie
    // partition) + 60s fresh + 5dk SWR (mutation rare; profile edit
    // owner günlük flow değil). §38.100 paterni reuse.
    return NextResponse.json(
      { ...user, teamRole },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
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

    const body = await req.json();
    const { name, email, phoneNumber, position, timezone, currentPassword, newPassword } = body;

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

    // §38.37 — Lokal Zod validation 3 yeni alan için (CLAUDE.md §28.3.3
    // mix-mode paterni — mevcut elle validation'a dokunmadan yeni alan için
    // lokal safeParse). Tüm 3 alan opsiyonel: undefined → değişmez, null veya
    // empty string → unset (Prisma null kabul eder).
    if (phoneNumber !== undefined) {
      const parsed = z
        .union([z.string().max(32), z.null(), z.literal('')])
        .safeParse(phoneNumber);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Telefon numarası geçersiz (max 32 karakter)' },
          { status: 400 },
        );
      }
      const v = typeof parsed.data === 'string' ? parsed.data.trim() : null;
      updateData.phoneNumber = v && v.length > 0 ? v : null;
    }
    if (position !== undefined) {
      const parsed = z
        .union([z.string().max(100), z.null(), z.literal('')])
        .safeParse(position);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Pozisyon geçersiz (max 100 karakter)' },
          { status: 400 },
        );
      }
      const v = typeof parsed.data === 'string' ? parsed.data.trim() : null;
      updateData.position = v && v.length > 0 ? v : null;
    }
    if (timezone !== undefined) {
      // IANA timezone format (örn. "Europe/Istanbul"). Boş string → null.
      // Yapı kontrol: continent/city pattern, max 64 char.
      const parsed = z
        .union([
          z
            .string()
            .max(64)
            .regex(/^[A-Za-z]+\/[A-Za-z_-]+(?:\/[A-Za-z_-]+)?$/, 'Geçersiz timezone'),
          z.null(),
          z.literal(''),
        ])
        .safeParse(timezone);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Saat dilimi geçersiz (örn. Europe/Istanbul)' },
          { status: 400 },
        );
      }
      const v = typeof parsed.data === 'string' ? parsed.data.trim() : null;
      updateData.timezone = v && v.length > 0 ? v : null;
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

      updateData.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        position: true,
        timezone: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[PROFILE_PUT]', error);
    return NextResponse.json({ error: 'Güncelleme sırasında bir hata oluştu' }, { status: 500 });
  }
}
