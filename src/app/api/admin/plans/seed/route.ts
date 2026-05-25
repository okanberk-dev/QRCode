import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiErrors } from '@/lib/api-errors';
import { getAdminFromRequest } from '@/lib/auth';
import { revalidatePricing } from '@/lib/marketing-revalidate';

// §38.225 — USD-only fiyatlandırma (Stage 145). Buaze 2026-05 itibariyle TR
// pazarındaki TRY fiyatları kaldırdı, tek currency USD. Dodo Payments live
// product ID'leriyle birebir bind. priceTry: 0 (backwards-compat field, UI'da
// gösterilmez); priceUsd Dodo product fiyatlarıyla eşleşir.
//
// Dodo product mapping (test mode + production aynı ID'ler):
//   Starter: pdt_0NfZCuJmSmGXX3FoIkdIu ($1.00 test, sonra prod fiyatı)
//   Growth:  pdt_0NfZD3pbkJVz1Zx0972sy ($39.99)
//   Scale:   pdt_0NfZDHioCEcSDhghMHLae ($99.99)
const DEFAULTS = [
  {
    nameTr: 'Starter',
    nameEn: 'Starter',
    descriptionTr: 'Küçük işletmeler için ideal başlangıç.',
    descriptionEn: 'Ideal start for small businesses.',
    priceTry: 0,
    priceUsd: 1,
    period: 'month',
    featuresTr: ['Sınırsız QR kod', 'Yorum yönetimi', 'Akıllı filtreleme', 'E-posta desteği'],
    featuresEn: ['Unlimited QR codes', 'Review management', 'Smart filtering', 'Email support'],
    buttonTextTr: 'Hemen başla',
    buttonTextEn: 'Get started',
    buttonHref: '/auth/register',
    isActive: true,
    isFeatured: false,
    sortOrder: 10,
    paymentProvider: 'dodo_payments',
    dodoProductId: 'pdt_0NfZCuJmSmGXX3FoIkdIu',
  },
  {
    nameTr: 'Growth',
    nameEn: 'Growth',
    descriptionTr: 'Hızlı büyüyen ve çok şubeli işletmeler için.',
    descriptionEn: 'For fast-growing and multi-location businesses.',
    priceTry: 0,
    priceUsd: 40,
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
    paymentProvider: 'dodo_payments',
    dodoProductId: 'pdt_0NfZD3pbkJVz1Zx0972sy',
  },
  {
    nameTr: 'Scale',
    nameEn: 'Scale',
    descriptionTr: 'Kurumsal ihtiyaçlar ve sınırsız kapasite.',
    descriptionEn: 'Enterprise needs with unlimited capacity.',
    priceTry: 0,
    priceUsd: 100,
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
    buttonTextTr: 'Hemen başla',
    buttonTextEn: 'Get started',
    buttonHref: '/auth/register',
    isActive: true,
    isFeatured: false,
    sortOrder: 30,
    paymentProvider: 'dodo_payments',
    dodoProductId: 'pdt_0NfZDHioCEcSDhghMHLae',
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
