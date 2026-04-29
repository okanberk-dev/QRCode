// Seed payloads for the dev email preview route. Each entry feeds the
// matching renderer with realistic-looking placeholder data so layout +
// copy can be inspected in a real browser without staging traffic.

import type { ForgotPasswordParams } from '@/lib/email/templates/forgot-password';
import type { WelcomeParams } from '@/lib/email/templates/welcome';
import type { FormConfirmationParams, FormType } from '@/lib/email/templates/form-confirmation';
import type { LowRatingAlertParams } from '@/lib/email/templates/low-rating-alert';
import type { NewReviewParams } from '@/lib/email/templates/new-review';
import type { WeeklyReportParams } from '@/lib/email/templates/weekly-report';
import type { NewsletterParams } from '@/lib/email/templates/newsletter';
import type { CustomerReplyParams } from '@/lib/email/templates/customer-reply';
import type { TrialEndingParams } from '@/lib/email/templates/trial-ending';
import type { ContactAdminParams } from '@/lib/email/templates/contact-admin';
import type { VerifyEmailParams } from '@/lib/email/templates/verify-email';

export const PREVIEW_TEMPLATES = [
  'forgot-password',
  'welcome',
  'form-confirmation',
  'low-rating-alert',
  'new-review',
  'weekly-report',
  'newsletter',
  'customer-reply',
  'trial-ending',
  'contact-admin',
  'verify-email',
] as const;

export type PreviewTemplate = (typeof PREVIEW_TEMPLATES)[number];

export function isPreviewTemplate(value: unknown): value is PreviewTemplate {
  return typeof value === 'string' && (PREVIEW_TEMPLATES as readonly string[]).includes(value);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';

export const SEEDS = {
  'forgot-password': (): ForgotPasswordParams => ({
    code: '492851',
    resetUrl: `${APP_URL}/auth/reset-password?token=9c2f4a8ebd71pulse`,
    firstName: 'Mert',
    ip: '88.247.123.42',
    device: 'macOS · Safari 17',
    account: 'mert@kadikoybistro.co',
  }),
  welcome: (): WelcomeParams => ({
    firstName: 'Mert',
    dashboardUrl: `${APP_URL}/tr/dashboard`,
  }),
  'form-confirmation': (): FormConfirmationParams => ({
    formType: 'contact' as FormType,
    name: 'Mert Demir',
    details: [
      { label: 'E-posta', value: 'mert@kadikoybistro.co' },
      { label: 'İşletme', value: 'Kadıköy Bistro' },
      { label: 'Konu', value: 'Demo talebi · 3 şube' },
    ],
    ticketId: 'BUZ-4821',
  }),
  'low-rating-alert': (): LowRatingAlertParams => ({
    rating: 2,
    restaurantName: 'Kadıköy Bistro',
    customerName: 'Defne T.',
    customerSubtitle: 'Google · İlk kez yorum yapıyor',
    comment:
      'Kahve soğuk geldi, ısıttırmaya çalışınca biraz beklettiler. Yemek güzeldi ama servis bu kadar boş bir saatte daha hızlı olmalıydı.',
    branch: 'Kadıköy Şubesi',
    tableNumber: '04',
    reviewUrl: `${APP_URL}/tr/dashboard/feedbacks`,
    aiDraft:
      'Merhaba Defne, deneyiminiz için çok özür dileriz. Kahvenizin soğuk gelmesi ve bekleme süresi standardımızın altında — bu durumu vardiya ekibimizle paylaştık. Bir sonraki ziyaretinizde sizi tanıyalım.',
    aiTone: 'Ton: profesyonel · empati yüksek',
    aiLatencyMs: 1400,
    tags: ['servis-yavaş', 'kahve-soğuk', 'beklemeyi-uzun'],
  }),
  'new-review': (): NewReviewParams => ({
    rating: 5,
    restaurantName: 'Kadıköy Bistro',
    customerName: 'Selin K.',
    comment:
      'Pazar brunch sırası uzundu ama servis hâlâ ilgiliydi. Tatlılar ev yapımı, kahvaltı tabağı çok zengin. Mutlaka tekrar geleceğiz.',
    branch: 'Kadıköy',
    tableNumber: '07',
    platform: 'Google',
    reviewUrl: `${APP_URL}/tr/dashboard/feedbacks`,
    shareUrl: 'https://search.google.com/local/writereview?placeid=DEMO',
  }),
  'weekly-report': (): WeeklyReportParams => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      restaurantName: 'Kadıköy Bistro',
      period: { from: weekAgo, to: now },
      stats: {
        total: 47,
        avgRating: 4.6,
        highRatings: 38,
        lowRatings: 4,
        distribution: { 5: 28, 4: 10, 3: 5, 2: 3, 1: 1 },
        conversionRate: 78,
        aspects: { food: 4.7, service: 4.5, atmosphere: 4.6 },
      },
      trend: [12, 18, 15, 22, 28, 31, 24],
      quotes: [
        { rating: 5, name: 'Selin K.', platform: 'Google', text: 'Pazar brunch sırası uzundu ama servis hâlâ ilgiliydi. Tatlılar ev yapımı.' },
        { rating: 5, name: 'Eren A.', platform: 'Yemeksepeti', text: 'Masa QR\'ı çok pratik. Garson çağırmadan ödedik.' },
        { rating: 2, name: 'Defne T.', platform: 'Google', text: 'Kahve soğuk geldi, ısıttırmaya çalışınca biraz beklettiler.', warn: true },
      ],
      deltas: { totalDelta: '+18%', avgDelta: '+0.2', responseDelta: '−24%' },
      weekNumber: 17,
      dashboardUrl: `${APP_URL}/tr/dashboard`,
    };
  },
  newsletter: (): NewsletterParams => ({
    issueNumber: 4,
    posts: [
      { title: 'Pulse AI 2.0: ses tonun, makinen.', excerpt: 'Yeni model, marka diline göre fine-tune ediliyor. Türkçe hassasiyeti %38 arttı.', url: `${APP_URL}/tr/blog/pulse-ai-2`, category: 'Ürün', readMinutes: 12 },
      { title: 'Vaka: Kadıköy Bistro 6 ayda nasıl 4.2\'den 4.7\'ye çıktı', excerpt: 'Yorum yönetimi pratiği + Google rehberi.', url: `${APP_URL}/tr/blog/kadikoy-vakasi`, category: 'Vaka', readMinutes: 8 },
      { title: '2026 Q1 yorum davranış raporu', excerpt: '12.000 yorum, 4 sektör, 1 net çıkarım.', url: `${APP_URL}/tr/blog/q1-rapor`, category: 'Veri', readMinutes: 6 },
      { title: 'Düşük puanlı yorumlar: tehdit mi, fırsat mı?', excerpt: 'Pulse ekibinden bir görüş yazısı.', url: `${APP_URL}/tr/blog/dusuk-puan`, category: 'Görüş', readMinutes: 7 },
    ],
    unsubscribeUrl: `${APP_URL}/api/newsletter/unsubscribe?token=PREVIEW_TOKEN`,
  }),
  'customer-reply': (): CustomerReplyParams => ({
    customerName: 'Defne T.',
    restaurantName: 'Kadıköy Bistro',
    ownerName: 'Mert D.',
    rating: 2,
    message:
      'Merhaba Defne,\n\nGeçen Cumartesi öğleden sonra bistroya geldiğinde yaşadığın deneyimi okudum. Kahvenin soğuk gelmesi ve onu ısıttırmaya çalışırken beklemen — bunlar bizim standartlarımızın altında. Bunu seninle paylaştığın için gerçekten teşekkür ederim.\n\nO gün vardiyada olan ekibimizle konuştuk. Sıkıntının ne olduğunu anladık ve servis akışında bir kaç şeyi değiştirdik.',
    couponCode: 'DEFNE-2KAHVE',
    couponDays: 30,
    phone: '+90 216 555 00 00',
    mapsUrl: 'https://maps.google.com/?q=Kadikoy+Bistro',
    mapsLabel: 'Caferağa Mh. · Kadıköy',
    signaturePostscript: 'Bir kez daha denemek istersen seni ben karşılamak isterim.',
  }),
  'trial-ending': (): TrialEndingParams => ({
    firstName: 'Mert',
    daysLeft: 3,
    usage: { reviews: 47, avgRating: 4.6, aiReplies: 38, growthPct: 184 },
    upgradeUrl: `${APP_URL}/tr/dashboard/billing`,
  }),
  'contact-admin': (): ContactAdminParams => ({
    name: 'Mert Demir',
    email: 'mert@kadikoybistro.co',
    phone: '+90 532 555 12 34',
    business: 'Kadıköy Bistro',
    message:
      'Merhaba, restoranımızda 3 şubemiz var ve QR ile yorum toplama akışını kurmak istiyoruz. Demo için uygun bir gün ayarlayabilir miyiz?\n\nGetir Yemek + Yemeksepeti entegrasyonu da bizim için kritik. Teşekkürler.',
    marketingConsent: true,
    sourcePath: 'buaze.com/iletisim',
  }),
  'verify-email': (): VerifyEmailParams => ({
    firstName: 'Mert',
    verifyUrl: `${APP_URL}/tr/auth/verify-email?token=4f8e2bd71pulseabc123`,
  }),
} satisfies Record<PreviewTemplate, () => unknown>;
