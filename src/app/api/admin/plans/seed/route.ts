import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { revalidatePricing } from '@/lib/marketing-revalidate';

const DEFAULTS = [
  {
    nameTr: 'Starter',
    nameEn: 'Starter',
    descriptionTr: 'Küçük işletmeler için ideal başlangıç.',
    descriptionEn: 'Ideal start for small businesses.',
    priceTry: 0,
    priceUsd: 0,
    period: 'month',
    featuresTr: ['Sınırsız QR kod', 'Yorum yönetimi', 'Akıllı filtreleme', 'E-posta desteği'],
    featuresEn: ['Unlimited QR codes', 'Review management', 'Smart filtering', 'Email support'],
    buttonTextTr: 'Ücretsiz başla',
    buttonTextEn: 'Start free',
    buttonHref: '/auth/register',
    isActive: true,
    isFeatured: false,
    sortOrder: 10,
  },
  {
    nameTr: 'Growth',
    nameEn: 'Growth',
    descriptionTr: 'Hızlı büyüyen ve çok şubeli işletmeler için.',
    descriptionEn: 'For fast-growing and multi-location businesses.',
    priceTry: 890,
    priceUsd: 30,
    period: 'month',
    featuresTr: [
      "Starter'daki her şey",
      'Buaze Pulse AI dahil',
      "Çoklu lokasyon (3'e kadar)",
      'Gelişmiş analitik',
      'Öncelikli destek',
    ],
    featuresEn: [
      'Everything in Starter',
      'Buaze Pulse AI included',
      'Multi-location (up to 3)',
      'Advanced analytics',
      'Priority support',
    ],
    buttonTextTr: 'Hemen başla',
    buttonTextEn: 'Get started',
    buttonHref: '/auth/register',
    isActive: true,
    isFeatured: true,
    sortOrder: 20,
  },
  {
    nameTr: 'Scale',
    nameEn: 'Scale',
    descriptionTr: 'Kurumsal ihtiyaçlar ve sınırsız kapasite.',
    descriptionEn: 'Enterprise needs with unlimited capacity.',
    priceTry: 2490,
    priceUsd: 83,
    period: 'month',
    featuresTr: [
      "Growth'daki her şey",
      'Sınırsız şube',
      'API & Webhook erişimi',
      '7/24 öncelikli destek',
      'Özel SLA',
    ],
    featuresEn: [
      'Everything in Growth',
      'Unlimited locations',
      'API & Webhook access',
      '24/7 priority support',
      'Dedicated SLA',
    ],
    buttonTextTr: 'Satışla görüş',
    buttonTextEn: 'Talk to sales',
    buttonHref: '/contact',
    isActive: true,
    isFeatured: false,
    sortOrder: 30,
  },
];

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  try {
    const existing = await prisma.subscriptionPlan.count();
    if (existing > 0 && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        existing,
        message:
          'Tablo zaten dolu (admin değişikliklerini korumak için no-op). Üzerine yazmak için { force: true } gönderin.',
      });
    }
    if (force) await prisma.subscriptionPlan.deleteMany({});
    let seeded = 0;
    for (const plan of DEFAULTS) {
      await prisma.subscriptionPlan.create({ data: plan });
      seeded++;
    }
    revalidatePricing();
    return NextResponse.json({ success: true, seeded, force });
  } catch (error) {
    console.error('[plans seed] failed', error);
    return ApiErrors.internalError('Planlar örneklenemedi');
  }
}
