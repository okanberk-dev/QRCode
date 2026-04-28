import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { sendMail } from '@/lib/email';
import { pulseLayout } from '@/lib/email/layout';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '@/lib/email/components';
import { PULSE } from '@/lib/email/tokens';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor || actor.source !== 'user') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* optional */
  }
  const dataJson: Prisma.InputJsonValue | undefined =
    body && typeof body === 'object' ? (body as Prisma.InputJsonValue) : undefined;

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
          category: sector && SECTOR_LABEL[sector] ? SECTOR_LABEL[sector] : 'Restoran',
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
    const dashboardUrl = `${appUrl}/tr/dashboard`;
    const subject = 'Buaze kurulumu tamamlandı — panele hoş geldiniz';
    const innerContent = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td class="bz-pad" style="padding:40px 40px 24px;">
            ${renderEyebrow('Kurulum · Tamamlandı', PULSE.success)}
            ${spacer(14)}
            ${renderH1(bizName ? `${escape(bizName)} hazır.` : 'Hazırsın.', { size: 36 })}
            ${spacer(16)}
            ${renderP('Buaze kurulumun tamamlandı. Panelden QR\'larını indirebilir, yorumlarını izleyebilir, ekibini davet edebilirsin.')}
            ${spacer(28)}
            ${renderButton({ href: dashboardUrl, label: 'Panele git →', size: 'lg' })}
          </td>
        </tr>
      </table>
    `;
    sendMail({
      to: actor.email,
      subject,
      text: `${bizName ? bizName + ' · ' : ''}Buaze kurulumu tamamlandı. Panele git: ${dashboardUrl}`,
      html: pulseLayout({
        subject,
        preheader: 'Panelden QR\'larını indirebilir, yorumlarını izleyebilir, ekibini davet edebilirsin.',
        content: innerContent,
        eyebrow: 'Kurulum',
        footer: { locale: 'tr' },
      }),
    }).catch((err) => {
      console.error('[onboarding/complete] welcome mail failed', err);
    });
  }

  return NextResponse.json({
    step: row.step,
    completedAt: row.completedAt,
    createdRestaurantId,
  });
}

const SECTOR_LABEL: Record<string, string> = {
  restaurant: 'Restoran',
  delivery: 'Paket Servis',
  hotel: 'Otel',
  clinic: 'Klinik',
  legal: 'Hukuk',
  spa: 'Spa',
  retail: 'Perakende',
  fitness: 'Fitness',
  education: 'Eğitim',
  other: 'Diğer',
};

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

function escape(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
