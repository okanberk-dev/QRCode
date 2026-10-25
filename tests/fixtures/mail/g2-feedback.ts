import { renderLowRatingAlert } from '../../../src/lib/email/templates/low-rating-alert';
import { renderNewReview } from '../../../src/lib/email/templates/new-review';
import { renderCustomerReply } from '../../../src/lib/email/templates/customer-reply';
import { renderRatingDropAlert } from '../../../src/lib/email/templates/rating-drop-alert';
import { renderFirstFeedbackCelebration } from '../../../src/lib/email/templates/first-feedback-celebration';
import { renderFirstReplyCelebration } from '../../../src/lib/email/templates/first-reply-celebration';
import { APP_URL, LONG_COMMENT, LONG_NAME, LONG_URL, LONG_WORD, type MailFixture } from './_env';

const REVIEW_URL = `${APP_URL}/tr/dashboard/feedbacks`;
const AT = new Date('2026-10-24T11:32:00Z');

// Hostile input. Every user-supplied field must come out escaped (body, <title>,
// hidden preheader, href attributes); tests/mail-g2-injection.test.ts asserts it.
export const INJECT_TAG = '<img src=x onerror=1>';
export const INJECT_LINK = '</div><a href="https://evil.example/login">Hesabını doğrula</a><div>';
export const INJECT_ATTR = '"><script>alert(1)</script>';
const INJECT_URL = 'https://x.test/review?a=1&b="><script>alert(1)</script>';

const AI_DRAFT =
  'Merhaba Defne, deneyiminiz için çok özür dileriz. Kahvenizin soğuk gelmesi ve bekleme süresi standardımızın altında — bu durumu vardiya ekibimizle paylaştık. Bir sonraki ziyaretinizde sizi tanıyalım.';

const CUSTOMER_MESSAGE =
  'Merhaba Defne,\n\nGeçen Cumartesi öğleden sonra bistroya geldiğinde yaşadığın deneyimi okudum. Kahvenin soğuk gelmesi ve onu ısıttırmaya çalışırken beklemen — bunlar bizim standartlarımızın altında. Bunu seninle paylaştığın için gerçekten teşekkür ederim.\n\nO gün vardiyada olan ekibimizle konuştuk. Sıkıntının ne olduğunu anladık ve servis akışında bir kaç şeyi değiştirdik.';

export const FIXTURES_G2: MailFixture[] = [
  // ── low-rating-alert ──────────────────────────────────────────────────
  {
    id: 'low-rating-alert',
    template: 'low-rating-alert',
    render: (locale) =>
      renderLowRatingAlert(
        {
          rating: 2,
          restaurantName: 'Kadıköy Bistro',
          customerName: 'Defne Tuncer',
          customerSubtitle: 'Google · İlk kez yorum yapıyor',
          comment:
            'Kahve soğuk geldi, ısıttırmaya çalışınca biraz beklettiler. Yemek güzeldi ama servis bu kadar boş bir saatte daha hızlı olmalıydı.',
          branch: 'Kadıköy Şubesi',
          tableNumber: '04',
          reviewUrl: REVIEW_URL,
          aiDraft: AI_DRAFT,
          aiTone: 'Ton: profesyonel · empati yüksek',
          aiLatencyMs: 1400,
          tags: ['servis-yavaş', 'kahve-soğuk', 'bekleme-uzun'],
          submittedAt: AT,
        },
        locale,
      ),
  },
  {
    id: 'low-rating-alert:stress',
    template: 'low-rating-alert',
    stress: true,
    render: (locale) =>
      renderLowRatingAlert(
        {
          rating: 1,
          restaurantName: LONG_NAME,
          customerName: LONG_WORD,
          customerSubtitle: `Google · ${LONG_WORD}`,
          comment: LONG_COMMENT,
          branch: LONG_NAME,
          tableNumber: '12345',
          reviewUrl: LONG_URL,
          aiDraft: `${AI_DRAFT} ${LONG_WORD}`,
          aiTone: 'Ton: profesyonel · empati yüksek · kısa ve net · resmi değil',
          aiLatencyMs: 12800,
          tags: [LONG_WORD, 'servis-yavaş', 'kahve-soğuk-geldi-ve-degistirilmedi', 'hijyen'],
          platformLabel: LONG_WORD,
          submittedAt: AT,
        },
        locale,
      ),
  },
  {
    // What the production sender actually passes: no AI draft, no tags, no subtitle.
    id: 'low-rating-alert:production',
    template: 'low-rating-alert',
    render: (locale) =>
      renderLowRatingAlert(
        {
          rating: 3,
          restaurantName: 'Kadıköy Bistro',
          customerName: 'Mehmet K.',
          comment: 'Orta karar. Porsiyonlar küçüktü, fiyat biraz yüksek geldi.',
          branch: 'Moda',
          tableNumber: '7',
          reviewUrl: REVIEW_URL,
          submittedAt: AT,
        },
        locale,
      ),
  },
  {
    id: 'low-rating-alert:anon-nocomment',
    template: 'low-rating-alert',
    render: (locale) =>
      renderLowRatingAlert(
        {
          rating: 1,
          restaurantName: 'Kadıköy Bistro',
          customerName: null,
          comment: null,
          reviewUrl: REVIEW_URL,
          platformLabel: 'Buaze QR',
          submittedAt: AT,
        },
        locale,
      ),
  },

  {
    id: 'low-rating-alert:inject',
    template: 'low-rating-alert',
    render: (locale) =>
      renderLowRatingAlert(
        {
          rating: 2,
          restaurantName: INJECT_TAG,
          customerName: INJECT_LINK,
          customerSubtitle: INJECT_TAG,
          comment: INJECT_ATTR,
          branch: INJECT_LINK,
          tableNumber: INJECT_TAG,
          reviewUrl: INJECT_URL,
          aiDraft: INJECT_LINK,
          aiTone: INJECT_TAG,
          tags: [INJECT_TAG, INJECT_LINK],
          platformLabel: INJECT_ATTR,
          submittedAt: AT,
        },
        locale,
      ),
  },

  // ── new-review ────────────────────────────────────────────────────────
  {
    id: 'new-review',
    template: 'new-review',
    render: (locale) =>
      renderNewReview(
        {
          rating: 5,
          restaurantName: 'Kadıköy Bistro',
          customerName: 'Selin Kaya',
          comment:
            'Pazar brunch sırası uzundu ama servis hâlâ ilgiliydi. Tatlılar ev yapımı, kahvaltı tabağı çok zengin. Mutlaka tekrar geleceğiz.',
          branch: 'Kadıköy',
          tableNumber: '07',
          platform: 'Google',
          reviewUrl: REVIEW_URL,
          shareUrl: 'https://search.google.com/local/writereview?placeid=DEMO',
          submittedAt: AT,
        },
        locale,
      ),
  },
  {
    id: 'new-review:stress',
    template: 'new-review',
    stress: true,
    render: (locale) =>
      renderNewReview(
        {
          rating: 4,
          restaurantName: LONG_NAME,
          customerName: LONG_WORD,
          comment: LONG_COMMENT,
          branch: LONG_NAME,
          tableNumber: '12345',
          platform: LONG_WORD,
          reviewUrl: LONG_URL,
          shareUrl: LONG_URL,
          submittedAt: AT,
        },
        locale,
      ),
  },
  {
    id: 'new-review:nocomment',
    template: 'new-review',
    render: (locale) =>
      renderNewReview(
        {
          rating: 5,
          restaurantName: 'Kadıköy Bistro',
          customerName: null,
          comment: null,
          reviewUrl: REVIEW_URL,
        },
        locale,
      ),
  },
  {
    id: 'new-review:4star-noshare',
    template: 'new-review',
    render: (locale) =>
      renderNewReview(
        {
          rating: 4,
          restaurantName: 'Moda Kahve Evi',
          customerName: 'Ayşe Y.',
          comment: 'Kahveler harika, ortam sakin. Tatlı seçenekleri artarsa 5 yıldız olur.',
          platform: 'Buaze QR',
          reviewUrl: REVIEW_URL,
          submittedAt: AT,
        },
        locale,
      ),
  },

  {
    id: 'new-review:inject',
    template: 'new-review',
    render: (locale) =>
      renderNewReview(
        {
          rating: 4,
          restaurantName: INJECT_TAG,
          customerName: INJECT_LINK,
          comment: INJECT_LINK + INJECT_TAG,
          branch: INJECT_ATTR,
          tableNumber: INJECT_TAG,
          platform: INJECT_LINK,
          reviewUrl: INJECT_URL,
          shareUrl: INJECT_URL,
          submittedAt: AT,
        },
        locale,
      ),
  },

  // ── customer-reply ────────────────────────────────────────────────────
  {
    id: 'customer-reply',
    template: 'customer-reply',
    render: (locale) =>
      renderCustomerReply(
        {
          customerName: 'Defne Tuncer',
          restaurantName: 'Kadıköy Bistro',
          ownerName: 'Mert Demir',
          rating: 2,
          message: CUSTOMER_MESSAGE,
          actions: ['Kahve servis sıcaklığını kontrol ediyoruz', 'Vardiya brifingi eklendi', 'Boş saatlerde ek garson'],
          actionDescriptions: {
            'Kahve servis sıcaklığını kontrol ediyoruz': 'Her servis öncesi makine sıcaklığı kayıt altına alınıyor.',
            'Vardiya brifingi eklendi': 'Her vardiya başında 5 dakikalık kısa bir hızlı servis brifingi yapılıyor.',
          },
          couponCode: 'DEFNE-2KAHVE',
          couponDays: 30,
          phone: '+90 216 555 00 00',
          mapsUrl: 'https://maps.google.com/?q=Kadikoy+Bistro',
          mapsLabel: 'Caferağa Mh. · Kadıköy',
          signaturePostscript: 'Bir kez daha denemek istersen seni ben karşılamak isterim.',
        },
        locale,
      ),
  },
  {
    id: 'customer-reply:stress',
    template: 'customer-reply',
    stress: true,
    render: (locale) =>
      renderCustomerReply(
        {
          customerName: LONG_WORD,
          restaurantName: LONG_NAME,
          ownerName: `${LONG_WORD} ${LONG_WORD}`,
          rating: 1,
          message: `${CUSTOMER_MESSAGE}\n\n${LONG_COMMENT}`,
          actions: [LONG_NAME, LONG_WORD, 'Kısa aksiyon'],
          actionDescriptions: { [LONG_NAME]: LONG_COMMENT, [LONG_WORD]: LONG_WORD },
          couponCode: 'COK-UZUN-KUPON-KODU-DEFNE-2KAHVE-12345',
          couponLabel: LONG_NAME,
          couponBody: LONG_COMMENT,
          couponDays: 365,
          phone: '+90 (216) 555 00 00 dahili 1234567',
          mapsUrl: LONG_URL,
          mapsLabel: LONG_NAME,
          signaturePostscript: LONG_COMMENT,
        },
        locale,
      ),
  },
  {
    // Production sender shape (sendCustomerReplyEmail via the reply route): no
    // ownerName, no actions / coupon / phone / maps — only the typed message.
    id: 'customer-reply:minimal',
    template: 'customer-reply',
    render: (locale) =>
      renderCustomerReply(
        {
          customerName: 'Defne',
          restaurantName: 'Kadıköy Bistro',
          rating: 2,
          message: 'Merhaba Defne,\n\nGeri bildirimin için teşekkür ederiz. Konuyu ekibimizle konuştuk.',
        },
        locale,
      ),
  },
  {
    id: 'customer-reply:coupon-only',
    template: 'customer-reply',
    render: (locale) =>
      renderCustomerReply(
        {
          customerName: null,
          restaurantName: 'Moda Kahve Evi',
          ownerName: null,
          message: 'Yaşadığın aksaklık için özür dileriz.',
          couponCode: 'MODA10',
          couponLabel: 'Bir sonraki ziyaretinde\nkahveler bizden.',
          phone: '+90 532 555 12 34',
        },
        locale,
      ),
  },

  {
    // Production shape, anonymous customer + long restaurant name.
    id: 'customer-reply:production-anon',
    template: 'customer-reply',
    render: (locale) =>
      renderCustomerReply(
        {
          customerName: null,
          restaurantName: 'Kadıköy Moda Sahil Balıkçısı',
          message: 'Merhaba,\n\nGeri bildirimin için teşekkür ederiz. Konuyu ekibimizle konuştuk, bir sonraki ziyaretinde seni daha iyi ağırlamak isteriz.',
        },
        locale,
      ),
  },
  {
    id: 'customer-reply:inject',
    template: 'customer-reply',
    render: (locale) =>
      renderCustomerReply(
        {
          customerName: INJECT_LINK,
          restaurantName: INJECT_TAG,
          ownerName: INJECT_LINK,
          message: `${INJECT_TAG}\n\n${INJECT_ATTR}`,
          actions: [INJECT_TAG],
          actionDescriptions: { [INJECT_TAG]: INJECT_LINK },
          couponCode: INJECT_TAG,
          couponLabel: INJECT_LINK,
          couponBody: INJECT_ATTR,
          phone: INJECT_ATTR,
          mapsUrl: INJECT_URL,
          mapsLabel: INJECT_TAG,
          signaturePostscript: INJECT_LINK,
        },
        locale,
      ),
  },

  // ── rating-drop-alert ─────────────────────────────────────────────────
  {
    id: 'rating-drop-alert',
    template: 'rating-drop-alert',
    render: (locale) =>
      renderRatingDropAlert(
        {
          firstName: 'Mert',
          restaurantName: 'Kadıköy Bistro',
          currentAvg: 4.1,
          baselineAvg: 4.7,
          delta: -0.6,
          reviewCount: 23,
          inboxUrl: REVIEW_URL,
        },
        locale,
      ),
  },
  {
    id: 'rating-drop-alert:stress',
    template: 'rating-drop-alert',
    stress: true,
    render: (locale) =>
      renderRatingDropAlert(
        {
          firstName: LONG_WORD,
          restaurantName: LONG_NAME,
          currentAvg: 3.2,
          baselineAvg: 4.8,
          delta: -1.6,
          reviewCount: 12480,
          inboxUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'rating-drop-alert:noname',
    template: 'rating-drop-alert',
    render: (locale) =>
      renderRatingDropAlert(
        {
          restaurantName: 'Moda Kahve Evi',
          currentAvg: 3.9,
          baselineAvg: 4.5,
          delta: -0.6,
          reviewCount: 8,
          inboxUrl: REVIEW_URL,
        },
        locale,
      ),
  },

  {
    id: 'rating-drop-alert:inject',
    template: 'rating-drop-alert',
    render: (locale) =>
      renderRatingDropAlert(
        {
          firstName: INJECT_LINK,
          restaurantName: INJECT_TAG,
          currentAvg: 3.9,
          baselineAvg: 4.5,
          delta: -0.6,
          reviewCount: 8,
          inboxUrl: INJECT_URL,
        },
        locale,
      ),
  },

  // ── first-feedback-celebration ────────────────────────────────────────
  {
    id: 'first-feedback-celebration',
    template: 'first-feedback-celebration',
    render: (locale) =>
      renderFirstFeedbackCelebration(
        {
          ownerName: 'Mert',
          restaurantName: 'Kadıköy Bistro',
          rating: 5,
          comment: 'Brunch tabağı çok zengindi, servis de çok ilgiliydi. Mutlaka tekrar geleceğiz.',
          feedbackUrl: REVIEW_URL,
        },
        locale,
      ),
  },
  {
    id: 'first-feedback-celebration:stress',
    template: 'first-feedback-celebration',
    stress: true,
    render: (locale) =>
      renderFirstFeedbackCelebration(
        {
          ownerName: LONG_WORD,
          restaurantName: LONG_NAME,
          rating: 4,
          comment: LONG_COMMENT,
          feedbackUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'first-feedback-celebration:low',
    template: 'first-feedback-celebration',
    render: (locale) =>
      renderFirstFeedbackCelebration(
        {
          ownerName: 'Mert',
          restaurantName: 'Kadıköy Bistro',
          rating: 2,
          comment: 'Kahve soğuk geldi, servis yavaştı.',
          feedbackUrl: REVIEW_URL,
        },
        locale,
      ),
  },
  {
    id: 'first-feedback-celebration:nocomment',
    template: 'first-feedback-celebration',
    render: (locale) =>
      renderFirstFeedbackCelebration(
        {
          ownerName: null,
          restaurantName: 'Moda Kahve Evi',
          rating: 3,
          comment: null,
          feedbackUrl: REVIEW_URL,
        },
        locale,
      ),
  },

  {
    id: 'first-feedback-celebration:inject',
    template: 'first-feedback-celebration',
    render: (locale) =>
      renderFirstFeedbackCelebration(
        {
          ownerName: INJECT_LINK,
          restaurantName: INJECT_TAG,
          rating: 4,
          comment: INJECT_LINK + INJECT_ATTR,
          feedbackUrl: INJECT_URL,
        },
        locale,
      ),
  },

  // ── first-reply-celebration ───────────────────────────────────────────
  {
    id: 'first-reply-celebration',
    template: 'first-reply-celebration',
    render: (locale) =>
      renderFirstReplyCelebration(
        {
          ownerName: 'Mert',
          restaurantName: 'Kadıköy Bistro',
          reviewsUrl: `${APP_URL}/tr/dashboard/google-reviews`,
        },
        locale,
      ),
  },
  {
    id: 'first-reply-celebration:stress',
    template: 'first-reply-celebration',
    stress: true,
    render: (locale) =>
      renderFirstReplyCelebration(
        {
          ownerName: LONG_WORD,
          restaurantName: LONG_NAME,
          reviewsUrl: LONG_URL,
        },
        locale,
      ),
  },
  {
    id: 'first-reply-celebration:noname',
    template: 'first-reply-celebration',
    render: (locale) =>
      renderFirstReplyCelebration(
        {
          ownerName: null,
          restaurantName: 'Moda Kahve Evi',
          reviewsUrl: `${APP_URL}/tr/dashboard/google-reviews`,
        },
        locale,
      ),
  },
  {
    id: 'first-reply-celebration:inject',
    template: 'first-reply-celebration',
    render: (locale) =>
      renderFirstReplyCelebration(
        {
          ownerName: INJECT_LINK,
          restaurantName: INJECT_TAG,
          reviewsUrl: INJECT_URL,
        },
        locale,
      ),
  },
];
