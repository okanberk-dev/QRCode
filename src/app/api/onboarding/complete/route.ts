import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { validateBody } from '@/lib/api/validate';
import { sendMail } from '@/lib/email';
import { renderOnboardingComplete } from '@/lib/email/templates/onboarding-complete';
import { sectorIdToLabel } from '@/lib/sectors';
import { ensureOnboardingConsents } from '@/lib/legal/consent';
import { isSupportedLegalLocale, type LegalLocale } from '@/lib/legal/keys';
import { getClientIp } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// CLAUDE.md §28.3.1 + §40.5 — bilinen field'lar Zod ile validate, geri kalanı
// `.passthrough()` ile JSON storage'a iletilir (wizard form state ileride
// field eklerse schema güncellemeden çalışır). `.strict()` burada DEĞİL —
// onboarding wizard'ı kırar; mass assignment koruması ise OnboardingProgress
// tablosunun yalnız `data: Json` kolonu olmasıyla doğal sınırlı (Restaurant
// veya User tablolarına yazma yok).
const OnboardingCompleteBody = z
  .object({
    bizName: z.string().trim().max(200).optional(),
    sector: z.string().trim().max(80).optional(),
    city: z.string().trim().max(100).optional(),
    locale: z.string().max(10).optional(),
  })
  .passthrough();

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor || actor.source !== 'user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // Same allowlist as POST /api/restaurants: this endpoint auto-creates a
  // PUBLIC restaurant owned by the caller, so a team_member (incl. viewer)
  // must not be able to mint an orphan live business via onboarding.
  if (actor.role !== 'restaurant_owner') {
    return ApiErrors.forbidden('Bu işlem için yetkiniz yok');
  }

  // Body opsiyonel — finish-later akışında boş POST kabul edilir.
  // Boş body durumunda validate atla — eski davranış intact.
  let body: Record<string, unknown> = {};
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    /* optional */
  }
  if (raw && typeof raw === 'object') {
    // Size cap (audit §38.B) — `.passthrough()` forwards arbitrary wizard
    // state into the JSON column; bound it so an authenticated user can't
    // stuff a multi-MB blob into onboarding_progress.data.
    if (JSON.stringify(raw).length > 50_000) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }
    const parsed = validateBody<z.infer<typeof OnboardingCompleteBody>>(OnboardingCompleteBody, raw);
    if (!parsed.ok) return parsed.response;
    body = parsed.data as Record<string, unknown>;
  }
  const dataJson: Prisma.InputJsonValue | undefined =
    Object.keys(body).length > 0 ? (body as Prisma.InputJsonValue) : undefined;

  const row = await prisma.onboardingProgress.upsert({
    where: { userId: actor.id },
    create: {
      userId: actor.id,
      step: 5,
      ...(dataJson === undefined ? {} : { data: dataJson }),
      completedAt: new Date(),
    },
    update: {
      completedAt: new Date(),
      ...(dataJson === undefined ? {} : { data: dataJson }),
    },
  });

  const bodyObj = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const bizNameRaw = typeof bodyObj.bizName === 'string' ? bodyObj.bizName.trim() : '';
  const sector = typeof bodyObj.sector === 'string' ? bodyObj.sector.trim() : '';
  const city = typeof bodyObj.city === 'string' ? bodyObj.city.trim() : '';

  // Auto-create restaurant ONLY if onboarding data has business name filled in.
  // Skip/finish-later without filling name → no restaurant created.
  let createdRestaurantId: string | null = null;
  if (bizNameRaw.length >= 2) {
    const existing = await prisma.restaurant.findFirst({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (!existing) {
      const baseSlug = slugify(bizNameRaw) || 'restoran';
      const similar = await prisma.restaurant.findMany({
        where: { slug: { startsWith: baseSlug } },
        select: { slug: true },
      });
      const taken = new Set(similar.map((s) => s.slug));
      let finalSlug = baseSlug;
      let counter = 1;
      while (taken.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter++}`;
      }
      const created = await prisma.restaurant.create({
        data: {
          name: bizNameRaw,
          slug: finalSlug,
          userId: actor.id,
          category: sectorIdToLabel(sector),
          primaryColor: '#C6F24E',
          ...(city ? { address: city } : {}),
        },
        select: { id: true },
      });
      createdRestaurantId = created.id;
    }
  }

  if (actor.email) {
    const bizName = bizNameRaw || null;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
    const dashboardUrl = `${appUrl}/tr/dashboard`;
    const rendered = renderOnboardingComplete({ bizName, dashboardUrl }, 'tr');
    sendMail({
      to: actor.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    }).catch((err) => {
      console.error('[onboarding/complete] welcome mail failed', err);
    });
  }

  // Stage 31b §38.108 — Onboarding consent backfill (skip-if-already-recorded).
  // Register flow (4 checkbox UI) zaten log atıyor; bu helper yalnızca eksik
  // belgeler için yazar. Google sign-in akışı LegalConsent oluşturmuyor —
  // onboarding/complete bu boşluğu kapatır. Fire-and-forget; helper içinde
  // try/catch fail-soft (CLAUDE.md §21.27 paterni).
  {
    const ua = req.headers.get('user-agent');
    const localeCandidate =
      typeof bodyObj.locale === 'string' ? bodyObj.locale.toLowerCase() : 'tr';
    const consentLocale: LegalLocale = isSupportedLegalLocale(localeCandidate)
      ? localeCandidate
      : 'tr';
    void ensureOnboardingConsents({
      userId: actor.id,
      locale: consentLocale,
      ipAddress: getClientIp(req.headers) ?? null,
      userAgent: ua,
    });
  }

  return NextResponse.json({
    step: row.step,
    completedAt: row.completedAt,
    createdRestaurantId,
  });
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
