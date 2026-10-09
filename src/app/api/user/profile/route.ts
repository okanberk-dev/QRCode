import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
import { getPanelActorFromRequest, getUserFromRequest } from '@/lib/auth';
import { writePanelAuditLog } from '@/lib/audit-log';
import { sendPasswordChangedEmail, sendVerifyEmail } from '@/lib/email';
import { getClientIp } from '@/lib/rate-limit';
import { isStrongPassword, isValidEmail } from '@/lib/validations';
import { randomBytes } from 'crypto';

// Mirrors /api/auth/resend-verify — a self-service email change must go
// through the same ownership proof as signup.
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function GET(req: NextRequest) {
  try {
    // §38.189 / §37.2.A — session-aware auth: getUserFromRequest runs the
    // UserSession revoke check, so a logged-out / password-reset session is
    // rejected here (bare verifyJwt would accept it until JWT expiry).
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
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
        // Wave B4 (CLAUDE.md §38.193) — danger-zone surface needs the
        // scheduled deletion countdown to render the "Vazgeç" state inline.
        // Token itself stays server-side; UI never sees it.
        scheduledDeletionAt: true,
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
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }
    const { name, email, phoneNumber, position, timezone, currentPassword, newPassword } = body;
    if (name !== undefined && name !== null && (typeof name !== 'string' || name.length > 120)) {
      return NextResponse.json({ error: 'Ad en fazla 120 karakter olabilir' }, { status: 400 });
    }
    if (newPassword !== undefined && newPassword !== null && typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Geçersiz şifre' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (typeof name === 'string' && name.trim()) updateData.name = name.trim();

    // E-posta değişimi. Eskiden format kontrolü YOKTU ve `emailVerified`
    // sıfırlanmıyordu: owner adresini asla sahip olmadığı bir adrese çevirip
    // "doğrulanmış" kalabiliyor, ya da geçersiz bir string girip tüm
    // transactional mail'ini (fatura, şifre sıfırlama, düşük puan uyarısı)
    // sessizce kaybediyordu. Artık format + uzunluk doğrulanır ve yeni adres
    // yeniden doğrulama gerektirir (signup ile aynı sahiplik ispatı).
    let pendingVerifyEmail: string | null = null;
    let pendingVerifyToken: string | null = null;
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string') {
        return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 });
      }
      const normalized = email.toLowerCase().trim();
      if (normalized !== user.email && user.role === 'team_member') {
        // A team member's workspace access is resolved by e-mail
        // (TeamMember.email ↔ User.email). Letting them retarget their
        // address meant: (a) their old membership row stayed active for an
        // address anyone could now register, and (b) they could point their
        // account at another workspace's orphaned active membership and
        // inherit its restaurants after a token refresh. The owner re-invites
        // the new address instead.
        return NextResponse.json(
          {
            error:
              'Ekip üyeleri e-posta adresini değiştiremez. Yeni adres için işletme sahibinden davet isteyin.',
            code: 'TEAM_MEMBER_EMAIL_LOCKED',
          },
          { status: 403 },
        );
      }
      if (normalized !== user.email) {
        if (!isValidEmail(normalized) || normalized.length > 256) {
          return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 });
        }
        const existingUser = await prisma.user.findUnique({
          where: { email: normalized },
          select: { id: true },
        });
        if (existingUser) {
          return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda' }, { status: 400 });
        }
        pendingVerifyToken = randomBytes(32).toString('hex');
        pendingVerifyEmail = normalized;
        updateData.email = normalized;
        updateData.emailVerified = false;
        updateData.emailVerifyToken = pendingVerifyToken;
        updateData.emailVerifyTokenExpiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
      }
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

      // Match the strength bar used by register / reset (audit §38.B M12) —
      // ≥8 chars with at least one letter and one digit. The old length-only
      // check let an authenticated user set a trivially weak password.
      if (!isStrongPassword(newPassword)) {
        return NextResponse.json(
          { error: 'Yeni şifre en az 8 karakter olmalı ve harf ile rakam içermelidir' },
          { status: 400 },
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    }

    const passwordWasChanged = updateData.passwordHash !== undefined;

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
        locale: true,
      },
    });

    // Wave B1 (CLAUDE.md §38.B + §37.2.A): password change forces UserSession
    // revoke + security-alert mail. Revoke FIRST (defence-in-depth — if the
    // mail send fails the user is still protected). The mail itself fires
    // fire-and-forget; we don't want a Resend hiccup to break the password
    // change UX. The owner stays signed in on this device thanks to the
    // updated cookie they'll receive on the next request? No — we revoke
    // EVERY session (no preserve-current-session carve-out). This mirrors
    // the forgot-password flow and matches user expectation: "I changed
    // my password, log everyone (including me) out and let me sign in
    // fresh with the new credentials."
    if (passwordWasChanged) {
      try {
        await prisma.userSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch (err) {
        // PII redaction (CLAUDE.md §37.7): log userId only.
        console.error('[PROFILE_PUT] session revoke failed', {
          userId: user.id,
          errName: err instanceof Error ? err.name : 'unknown',
        });
      }

      // Fire-and-forget. Failure is non-blocking; sender wires ops alert
      // internally (CLAUDE.md §21.33).
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
      const userLocale: 'tr' | 'en' = updatedUser.locale === 'en' ? 'en' : 'tr';
      const userAgent = req.headers.get('user-agent') ?? null;
      const ip = getClientIp(req.headers);
      sendPasswordChangedEmail({
        to: updatedUser.email,
        firstName: updatedUser.name,
        resetUrl: `${appUrl}/${userLocale}/auth/forgot-password`,
        ip,
        device: userAgent ? userAgent.slice(0, 80) : null,
        account: updatedUser.email,
        locale: userLocale,
      }).catch(() => {
        // sender already logs + ops-alerts on failure
      });
    }

    // Yeni adrese doğrulama maili — fire-and-forget. Kullanıcı linke basana
    // kadar `emailVerified=false` kalır (team_member login gate'i bunu zaten
    // uyguluyor; owner için de "doğrulanmış" rozeti yalan söylemez).
    if (pendingVerifyEmail && pendingVerifyToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
      const mailLocale: 'tr' | 'en' = updatedUser.locale === 'en' ? 'en' : 'tr';
      sendVerifyEmail({
        to: pendingVerifyEmail,
        firstName: updatedUser.name,
        verifyUrl: `${appUrl}/${mailLocale}/auth/verify-email?token=${pendingVerifyToken}`,
        locale: mailLocale,
      }).catch((err) => {
        console.error('[PROFILE_PUT] verify mail send failed:', (err as Error).message);
      });
    }

    // Security-relevant account changes are audit-logged (owner's own
    // /api/account/audit-log + /admin/audit-logs). No values, only what
    // changed; impersonated edits carry the real admin id.
    if (passwordWasChanged || pendingVerifyEmail) {
      const actor = await getPanelActorFromRequest(req);
      await writePanelAuditLog(
        actor ?? { id: user.id, source: 'user' },
        'owner.account.security_update',
        user.id,
        { passwordChanged: passwordWasChanged, emailChanged: Boolean(pendingVerifyEmail) },
      );
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[PROFILE_PUT]', {
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : 'non-error',
    });
    return NextResponse.json({ error: 'Güncelleme sırasında bir hata oluştu' }, { status: 500 });
  }
}
