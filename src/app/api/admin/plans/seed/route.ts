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
//
// Default copy must stay true for today's product (marketing spec D8): no
// plan limits or feature gates are enforced in code, so every plan lists the
// same capabilities and the descriptions only say who the plan is meant for.
// Add tier-specific bullets only together with the code that enforces them.
const SHARED_FEATURES_TR = [
  'Sınırsız QR kod, işletme ve ekip üyesi',
  '10 yorum platformu bağlantısı',
  'Pulse AI yanıt taslakları',
  'Düşük puanda anında e-posta uyarısı',
  'Analitik ve CSV dışa aktarma',
];
const SHARED_FEATURES_EN = [
  'Unlimited QR codes, businesses and team members',
  'Links to 10 review platforms',
  'Pulse AI reply drafts',
  'Instant e-mail alert for low ratings',
  'Analytics and CSV export',
];

const DEFAULTS = [
  {
    nameTr: 'Starter',
    nameEn: 'Starter',
    descriptionTr: 'Tek işletmesi olanlar için.',
    descriptionEn: 'For a single business.',
    priceTry: 0,
    priceUsd: 1,
    period: 'month',
    featuresTr: SHARED_FEATURES_TR,
    featuresEn: SHARED_FEATURES_EN,
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
    descriptionTr: 'Birden çok şubesi olan işletmeler için.',
    descriptionEn: 'For businesses with several locations.',
    priceTry: 0,
    priceUsd: 40,
    period: 'month',
    featuresTr: SHARED_FEATURES_TR,
    featuresEn: SHARED_FEATURES_EN,
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
    descriptionTr: 'Zincirler ve çok sayıda işletmesi olan gruplar için.',
    descriptionEn: 'For chains and groups with many businesses.',
    priceTry: 0,
    priceUsd: 100,
    period: 'month',
    featuresTr: SHARED_FEATURES_TR,
    featuresEn: SHARED_FEATURES_EN,
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
