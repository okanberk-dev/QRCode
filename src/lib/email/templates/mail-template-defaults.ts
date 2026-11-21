// Centralized inline-default registry for ALL CMS-editable mail templates.
//
// **Why this file exists** — admin mail template editor (CLAUDE.md §21.26
// + §38.43) shows DB-stored content for each (template, locale). When a row
// is missing or its `content: {}` is empty, the editor used to render
// EMPTY inputs — the operator had to guess the original copy or scroll
// through render fn source. This registry is the single source of truth for
// the **flat string fields** the admin form exposes (the nested arrays
// `steps[]`, `resources[]`, `quickActions[]`, `quotes[]` stay in render fn
// scope — they need typed editing UI which is Phase 3+ scope).
//
// **Used by**:
//   1. `scripts/seed-mail-templates.ts` — DB seed (idempotent upsert)
//   2. `/api/admin/mail-templates/[key]/[locale]` GET — fallback merge when
//      DB content is empty/missing, so editor inputs render pre-filled
//   3. Lifecycle render fns (`qr-not-downloaded`, `first-feedback-tips`,
//      `upgrade-suggestion`) — re-exports from `lifecycle-defaults.ts`
//      ensure drift-free import for the 3 lifecycle templates (their render
//      fns already pull from `lifecycle-defaults`).
//
// **Drift discipline** — the 12 NON-lifecycle templates (welcome, newsletter,
// trial-ending, forgot-password, low-rating-alert, new-review, weekly-report,
// customer-reply, verify-email, roi-customer-report, roi-admin-notification,
// form-confirmation) still keep `inlineDefault` locally inside their render
// fns. Those local defaults are the runtime source of truth; this registry
// is a SECOND copy used only for admin-editor preview. Operationally, when
// a render fn copy is changed:
//   - update render fn (runtime)
//   - update this file (editor preview)
//   - re-run seed script if you want the change to persist to DB
//
// The lifecycle 4 templates avoid this drift by sharing `LIFECYCLE_INLINE_DEFAULTS`
// between render fn imports and this registry. Future PR can apply the same
// pattern to the 12 others — mechanical refactor, drift-free.

import {
  BILLING_CARD_RETENTION_EN,
  BILLING_CARD_RETENTION_TR,
  BILLING_PERIOD_ENDED_EN,
  BILLING_PERIOD_ENDED_TR,
  BILLING_RENEWAL_UPCOMING_EN,
  BILLING_RENEWAL_UPCOMING_TR,
  BILLING_RENEWAL_PAID_EN,
  BILLING_RENEWAL_PAID_TR,
  BILLING_RENEWAL_FAILED_EN,
  BILLING_RENEWAL_FAILED_TR,
  BILLING_AUTO_RENEW_CHANGED_EN,
  BILLING_AUTO_RENEW_CHANGED_TR,
} from './billing-defaults';
import type { MailLocale, MailTemplateKey } from '../copy-loader';
import { SUPPORT_EMAIL } from '@/lib/company-constants';
import { LIFECYCLE_INLINE_DEFAULTS } from './lifecycle-defaults';

type FlatCopy = Record<string, string>;
type VariantCopy = Record<string, FlatCopy>;

// ───────────────────────────────────────────────────────────────────────
// Wave 1 — welcome / newsletter / trial-ending (Phase 1 templates).
// ───────────────────────────────────────────────────────────────────────

const WELCOME_TR: FlatCopy = {
  eyebrow: 'Hoş geldin · Sayı bir',
  titleSub: 'Şimdi başlıyoruz.',
  intro: 'Hesabını oluşturduğun için teşekkürler. Aşağıdaki 4 adımı tamamladığında masandaki ilk QR kod canlıya çıkmış olacak.',
  stepsEyebrow: 'Kurulum · 4 adım',
  nextLabel: 'Sıradaki',
  cta: 'Kuruluma devam et →',
  demoLink: 'Demo videoyu izle (2 dk)',
  resourcesEyebrow: 'İlk gün için',
};

const WELCOME_EN: FlatCopy = {
  eyebrow: 'Welcome · Issue 1',
  titleSub: 'Now we begin.',
  intro: 'Thanks for joining Buaze. Once you finish these 4 steps, your first QR code goes live on a real table.',
  stepsEyebrow: 'Setup · 4 steps',
  nextLabel: 'Next',
  cta: 'Continue setup →',
  demoLink: 'Watch demo (2 min)',
  resourcesEyebrow: 'For your first day',
};

const NEWSLETTER_TR: FlatCopy = {
  titleA: 'Sessiz misafiri',
  titleAccent: 'duyabilmek',
  titleEnd: 'sanatı.',
  intro: 'Müşterilerin yalnızca %4\'ü kötü deneyim yaşadığında konuşur. Geriye kalan %96\'yı duymak için ne gerekiyor — bu sayıda anlatıyoruz.',
  cta: 'Editörün notunu oku →',
  featuredEyebrow: 'Kapak yazısı',
  listEyebrow: 'Bu sayıda',
  statsTitle: 'Bu ayın küçük rakamları',
  futureLabel: 'Önümüzdeki sayıda',
  futureBody: 'Otel sektörü vakası, yeni heatmap görselleri, OAuth entegrasyonları.',
  exploreCta: 'Tüm sayıları gör →',
};

const NEWSLETTER_EN: FlatCopy = {
  titleA: 'The art of',
  titleAccent: 'hearing',
  titleEnd: 'the silent guest.',
  intro: 'Only 4% of customers speak up when they have a bad experience. What does it take to hear the silent 96%? This issue dives in.',
  cta: 'Read the editor\'s note →',
  featuredEyebrow: 'Cover story',
  listEyebrow: 'In this issue',
  statsTitle: 'Small numbers, this month',
  futureLabel: 'Next issue',
  futureBody: 'Hotel sector case, new heatmap visuals, OAuth integrations.',
  exploreCta: 'Browse all issues →',
};

const TRIAL_ENDING_TR: FlatCopy = {
  titleA: '14 gündür birlikteyiz.',
  titleB: 'Devam edelim mi?',
  usageEyebrow: 'Bu 14 günde Buaze\'de',
  plansEyebrow: 'Plan seç · İlk ay %50',
  starterTitle: 'Pulse Starter',
  starterBody: 'Tek şube, sınırsız QR, 100 AI yanıt/ay.',
  proTitle: 'Pulse Pro',
  proBody: 'Çoklu şube, sınırsız AI, OAuth + webhook, öncelikli destek.',
  proBadge: 'ÖNERİLEN',
  cta: 'Planımı seç →',
  comparisonLink: 'Detaylı karşılaştırma',
};

const TRIAL_ENDING_EN: FlatCopy = {
  titleA: 'We\'ve been at it for 14 days.',
  titleB: 'Keep going?',
  usageEyebrow: 'In your 14 days on Buaze',
  plansEyebrow: 'Pick a plan · 50% off month one',
  starterTitle: 'Pulse Starter',
  starterBody: 'Single location, unlimited QRs, 100 AI replies/mo.',
  proTitle: 'Pulse Pro',
  proBody: 'Multi-location, unlimited AI, OAuth + webhooks, priority support.',
  proBadge: 'RECOMMENDED',
  cta: 'Pick my plan →',
  comparisonLink: 'Detailed comparison',
};

// ───────────────────────────────────────────────────────────────────────
// Wave 2 — Phase 2 templates: forgot-password / low-rating-alert /
// new-review / weekly-report / customer-reply.
// ───────────────────────────────────────────────────────────────────────

const FORGOT_PASSWORD_TR: FlatCopy = {
  eyebrow: '01 · Talep alındı',
  title: 'Şifreni',
  titleAccent: 'sıfırlayalım',
  cardEyebrow: 'Tek kullanımlık link',
  statusText: 'Aktif · 30 dk geçerli',
  cta: 'Yeni şifre belirle →',
  altCodeLabel: 'Uygulamada kullanmak için kod',
  metaTime: 'Talep saati',
  metaIp: 'IP',
  metaDevice: 'Cihaz',
  metaAccount: 'Hesap',
  notYouTitle: 'Sen değil misin?',
  notYouBody: 'Bu maili görmezden gel. Şifren değişmez, hesabın güvende. Kaygılıysan',
  notYouLink: 'destek ekibine yaz',
};

const FORGOT_PASSWORD_EN: FlatCopy = {
  eyebrow: '01 · Request received',
  title: 'Let\'s reset',
  titleAccent: 'your password',
  cardEyebrow: 'One-time link',
  statusText: 'Active · 30 min valid',
  cta: 'Pick a new password →',
  altCodeLabel: 'Or use this code in the app',
  metaTime: 'Request time',
  metaIp: 'IP',
  metaDevice: 'Device',
  metaAccount: 'Account',
  notYouTitle: 'Wasn\'t you?',
  notYouBody: 'Just ignore this email. Your password stays the same. If you\'re worried,',
  notYouLink: 'contact support',
};

const LOW_RATING_ALERT_TR: FlatCopy = {
  eyebrowAlert: 'Anlık uyarı · Düşük puan',
  eyebrowAction: 'Aksiyon gerektiriyor · 1 saat içinde dön',
  titleSub: 'Önce dinleyelim.',
  aiEyebrow: 'Co-Pilot taslağı',
  toneLabel: 'Ton: profesyonel · empati yüksek',
  aiEdit: 'Düzenle',
  aiApprove: 'Onayla & Yanıtla →',
  quickEyebrow: 'Hızlı aksiyon',
  noComment: 'Yorum bırakılmadı.',
};

const LOW_RATING_ALERT_EN: FlatCopy = {
  eyebrowAlert: 'Live alert · Low rating',
  eyebrowAction: 'Action needed · reply within 1 hour',
  titleSub: 'Listen first.',
  aiEyebrow: 'Co-Pilot draft',
  toneLabel: 'Tone: professional · high empathy',
  aiEdit: 'Edit',
  aiApprove: 'Approve & Reply →',
  quickEyebrow: 'Quick actions',
  noComment: 'No comment left.',
};

const NEW_REVIEW_TR: FlatCopy = {
  eyebrow: 'Az önce geldi',
  titleSub: 'Hak ettin.',
  primaryCta: 'Teşekkür yaz →',
  secondaryCta: 'Google\'da paylaş',
  noComment: 'Yorum bırakılmadı.',
};

const NEW_REVIEW_EN: FlatCopy = {
  eyebrow: 'Just now',
  titleSub: 'You earned it.',
  primaryCta: 'Write a thank-you →',
  secondaryCta: 'Share on Google',
  noComment: 'No comment left.',
};

const WEEKLY_REPORT_TR: FlatCopy = {
  titleA: 'Sessiz başlayan hafta,',
  titleEnd: 'yorumla bitti.',
  statTotal: 'Yeni yorum',
  statAvg: 'Ortalama puan',
  statResp: 'Yanıt süresi',
  chartEyebrow: 'Günlük dağılım',
  chartTitle: 'Cumartesi günü zirve yaptın.',
  quotesEyebrow: 'Bu haftanın sözleri',
  aspectFood: 'Yemek',
  aspectService: 'Servis',
  aspectAtm: 'Atmosfer',
  cta: 'Panele git →',
  detailLabel: 'Detaylı analiz seni bekliyor.',
  detailSub: 'Heatmap, sentiment ve aspect kırılımı panelde.',
  segmentEyebrow: 'Müşteri segmentleri',
  segmentTitle: 'Bu hafta kim yorum bıraktı?',
  segmentVip: 'VIP',
  segmentLoyal: 'Düzenli',
  segmentNew: 'Yeni',
  segmentRisk: 'Risk',
  segmentChurned: 'Kayıp',
  segmentHint: 'Sadık + memnuniyetsiz dağılımı tek bakışta.',
};

const WEEKLY_REPORT_EN: FlatCopy = {
  titleA: 'A quiet week,',
  titleEnd: 'reviews to close.',
  statTotal: 'New reviews',
  statAvg: 'Average rating',
  statResp: 'Response time',
  chartEyebrow: 'Daily distribution',
  chartTitle: 'Saturday hit the peak.',
  quotesEyebrow: 'This week\'s voices',
  aspectFood: 'Food',
  aspectService: 'Service',
  aspectAtm: 'Atmosphere',
  cta: 'See full details →',
  detailLabel: 'Deep-dive analytics inside.',
  detailSub: 'Heatmap, sentiment and aspect breakdown in the panel.',
  segmentEyebrow: 'Customer segments',
  segmentTitle: 'Who reviewed this week?',
  segmentVip: 'VIP',
  segmentLoyal: 'Loyal',
  segmentNew: 'New',
  segmentRisk: 'Risk',
  segmentChurned: 'Churned',
  segmentHint: 'Loyal + at-risk distribution at a glance.',
};

const CUSTOMER_REPLY_TR: FlatCopy = {
  headerEyebrow: 'Sana özel · Kişisel yanıt',
  ownerLabel: 'İŞLETMECİ',
  titleSubA: 'bizi',
  titleSubItalic: 'duyduğun için',
  titleSubB: 'teşekkürler',
  actionsEyebrow: 'Aldığımız aksiyonlar',
  couponEyebrow: 'Sana küçük bir özür',
  couponTitle: 'Bir sonraki ziyaretinde\nkahveler bizden.',
  couponDescDefault: 'Aşağıdaki kodu kasada göster — masa arkadaşınla içtiğin iki kahve ikramımız.',
  couponLabelDefault: 'Kuponun',
  daysSuffix: 'gün',
  callEyebrow: 'Direkt ara',
  mapsEyebrow: 'Yol tarifi',
  sentLine: 'Bu yanıt',
  sentSuffix: 'ile gönderildi',
};

const CUSTOMER_REPLY_EN: FlatCopy = {
  headerEyebrow: 'For you · Personal reply',
  ownerLabel: 'OWNER',
  titleSubA: 'thank you for',
  titleSubItalic: 'hearing us',
  titleSubB: '',
  actionsEyebrow: 'What we changed',
  couponEyebrow: 'A small apology',
  couponTitle: 'Next visit,\ncoffees on us.',
  couponDescDefault: 'Show this code at the counter — two coffees on the house for you and a friend.',
  couponLabelDefault: 'Your coupon',
  daysSuffix: 'days',
  callEyebrow: 'Call us',
  mapsEyebrow: 'Directions',
  sentLine: 'Sent via',
  sentSuffix: '',
};

// ───────────────────────────────────────────────────────────────────────
// Wave 3 — form-confirmation (4-variant nested JSON).
// ───────────────────────────────────────────────────────────────────────

const FORM_CONFIRMATION_TR: VariantCopy = {
  contact: {
    subject: 'Mesajınızı aldık',
    preheader: 'Mesajınız destek ekibimize ulaştı. Hafta içi genellikle bir iş günü içinde yanıt veriyoruz.',
    eyebrow: 'İletişim · Onay',
    titleA: 'Aldık',
    titleB: 'Size yazacağız.',
    intro: 'Mesajınız destek ekibimize ulaştı. Hafta içi 09:00–18:00 (TSİ) arasında çalışıyoruz ve genellikle bir iş günü içinde yanıt veriyoruz.',
    formEyebrow: 'Form kaydı',
    timelineEyebrow: 'Sırada ne var',
    sideEyebrowA: 'Yardım merkezi',
    sideBodyA: 'Sık sorulan soruların yanıtlarını yardım merkezinde bulabilirsiniz.',
    sideCtaA: 'Yardım merkezine git →',
    sideEyebrowB: 'Beklerken',
    sideBodyB: 'QR yorum akışının nasıl çalıştığını adım adım görün.',
    sideCtaB: 'Nasıl çalışır →',
  },
  career: {
    subject: 'Başvurunuz bize ulaştı',
    preheader: 'Başvurunuz ekibimize ulaştı.',
    eyebrow: 'Kariyer · Onay',
    titleA: 'Aldık',
    titleB: 'Teşekkür ederiz.',
    intro: 'Başvurunuzu aldık ve ekibimize ilettik. Uygun bir pozisyon olduğunda sizinle e-postayla iletişime geçeceğiz.',
    formEyebrow: 'Başvuru özeti',
    timelineEyebrow: 'Süreç',
    sideEyebrowA: 'Kariyer',
    sideBodyA: 'Açık pozisyonları kariyer sayfasında duyuruyoruz.',
    sideCtaA: 'Kariyer sayfası →',
    sideEyebrowB: 'Buaze hakkında',
    sideBodyB: 'Ne yaptığımızı ve nasıl çalıştığımızı okuyun.',
    sideCtaB: 'Hakkımızda →',
  },
  roi: {
    subject: 'ROI tahmininiz kaydedildi',
    preheader: 'Girdiğiniz bilgilerle hesaplanan tahmin hazır.',
    eyebrow: 'ROI · Onay',
    titleA: 'Hesapladık',
    titleB: 'Sonuçlar bir tahmindir.',
    intro: 'Girdiğiniz bilgilerle tahmini zaman tasarrufunu hesapladık. Gerçek sonuçlar işletmenize ve yorum hacminize göre değişir.',
    formEyebrow: 'Tahmin özeti',
    timelineEyebrow: 'Sırada ne var',
    sideEyebrowA: 'Planlar',
    sideBodyA: 'Planları ve fiyatları karşılaştırın.',
    sideCtaA: 'Fiyatlandırma →',
    sideEyebrowB: 'Nasıl çalışır',
    sideBodyB: 'QR yorum akışını adım adım görün.',
    sideCtaB: 'Nasıl çalışır →',
  },
  newsletter: {
    subject: 'Bülten aboneliğiniz başladı',
    preheader: 'Son blog yazılarımızı ayda bir e-postayla göndereceğiz.',
    eyebrow: 'Bülten · Onay',
    titleA: 'Aramızdasınız',
    titleB: 'Bülten ayda bir gelir.',
    intro: 'Aboneliğiniz başladı. Pulse bülteniyle son blog yazılarımızı ve ürün haberlerini ayda bir gönderiyoruz. Her e-postada abonelikten çıkma bağlantısı bulunur.',
    formEyebrow: 'Abonelik',
    timelineEyebrow: 'Ne bekleyebilirsiniz',
    sideEyebrowA: 'Bu arada',
    sideBodyA: 'Buaze\'i yeni tanıyorsanız QR yorum akışını adım adım görün.',
    sideCtaA: 'Nasıl çalışır →',
    sideEyebrowB: 'Blog',
    sideBodyB: 'Yorum yönetimi üzerine yazılarımızı blogda okuyabilirsiniz.',
    sideCtaB: 'Bloga git →',
  },
};

const FORM_CONFIRMATION_EN: VariantCopy = {
  contact: {
    subject: 'We received your message',
    preheader: 'Your message reached our support team. On weekdays we usually reply within one business day.',
    eyebrow: 'Contact · Confirmation',
    titleA: 'Got it',
    titleB: 'We\'ll write back.',
    intro: 'Your message reached our support team. We work weekdays 09:00–18:00 (Turkey time) and usually reply within one business day.',
    formEyebrow: 'Form record',
    timelineEyebrow: 'What happens next',
    sideEyebrowA: 'Help center',
    sideBodyA: 'Answers to common questions are in the help center.',
    sideCtaA: 'Go to the help center →',
    sideEyebrowB: 'While you wait',
    sideBodyB: 'See how the QR review flow works, step by step.',
    sideCtaB: 'How it works →',
  },
  career: {
    subject: 'Your application reached us',
    preheader: 'Your application reached our team.',
    eyebrow: 'Careers · Confirmation',
    titleA: 'Got it',
    titleB: 'Thank you.',
    intro: 'We received your application and passed it to our team. When there is a suitable role, we\'ll contact you by e-mail.',
    formEyebrow: 'Application summary',
    timelineEyebrow: 'Process',
    sideEyebrowA: 'Careers',
    sideBodyA: 'We announce open roles on our careers page.',
    sideCtaA: 'Careers page →',
    sideEyebrowB: 'About Buaze',
    sideBodyB: 'Read what we do and how we work.',
    sideCtaB: 'About us →',
  },
  roi: {
    subject: 'Your ROI estimate is saved',
    preheader: 'The estimate based on your inputs is ready.',
    eyebrow: 'ROI · Confirmation',
    titleA: 'Calculated',
    titleB: 'The results are an estimate.',
    intro: 'We estimated the time you could save from the figures you entered. Actual results depend on your business and your review volume.',
    formEyebrow: 'Estimate summary',
    timelineEyebrow: 'What happens next',
    sideEyebrowA: 'Plans',
    sideBodyA: 'Compare plans and prices.',
    sideCtaA: 'Pricing →',
    sideEyebrowB: 'How it works',
    sideBodyB: 'See the QR review flow step by step.',
    sideCtaB: 'How it works →',
  },
  newsletter: {
    subject: 'Your newsletter subscription has started',
    preheader: 'We\'ll send our latest blog posts once a month.',
    eyebrow: 'Newsletter · Confirmation',
    titleA: 'You\'re in',
    titleB: 'The newsletter arrives once a month.',
    intro: 'Your subscription has started. The Pulse newsletter brings our latest blog posts and product news once a month. Every e-mail has an unsubscribe link.',
    formEyebrow: 'Subscription',
    timelineEyebrow: 'What to expect',
    sideEyebrowA: 'Meanwhile',
    sideBodyA: 'New to Buaze? See how the QR review flow works, step by step.',
    sideCtaA: 'How it works →',
    sideEyebrowB: 'Blog',
    sideBodyB: 'Read our posts about review management.',
    sideCtaB: 'Go to the blog →',
  },
};

// ───────────────────────────────────────────────────────────────────────
// Wave 4 — verify-email + ROI templates.
// ───────────────────────────────────────────────────────────────────────

const VERIFY_EMAIL_TR: FlatCopy = {
  eyebrow: 'E-POSTA ONAYI',
  title: 'Hesabını birkaç',
  titleAccent: 'saniyede aç',
  intro: 'Merhaba <strong style="color:#0A0A0A;font-weight:500;">${firstName}</strong>. Buaze hesabını oluşturduğun için teşekkürler. Devam edebilmek için aşağıdaki butonla e-posta adresini onayla. Bağlantı 24 saat geçerli.',
  cardEyebrow: 'Tek kullanımlık link',
  cta: 'E-postamı onayla →',
};

const VERIFY_EMAIL_EN: FlatCopy = {
  eyebrow: 'EMAIL VERIFICATION',
  title: 'Activate your account',
  titleAccent: 'in seconds',
  intro: 'Hi <strong style="color:#0A0A0A;font-weight:500;">${firstName}</strong>. Thanks for creating a Buaze account. To continue, confirm your email address with the button below. The link is valid for 24 hours.',
  cardEyebrow: 'One-time link',
  cta: 'Verify my email →',
};

const ROI_CUSTOMER_REPORT_TR: FlatCopy = {
  subjectTemplate: '${restaurantName} için tahmini Buaze raporunuz',
  preheaderPrefix: 'Tahmini zaman tasarrufu ve kısa bir özet.',
  heroEyebrow: 'TAHMİNİ RAPOR · ROI HESAPLAYICI',
  heroIntroPdf:
    '${restaurantName} için hesaplayıcıya girdiğiniz değerlerle hazırladığımız tahmin aşağıda; ayrıntılı PDF ektedir. Rakamlar sizin girdiğiniz değerlere dayanır.',
  heroIntroNoPdf:
    '${restaurantName} için hesaplayıcıya girdiğiniz değerlerle hazırladığımız tahmin aşağıda. Rakamlar sizin girdiğiniz değerlere dayanır.',
  netGainEyebrow: 'TAHMİNİ ZAMAN TASARRUFU',
  ctaEyebrow: 'SIRADAKİ ADIM',
  ctaTitle: 'Buaze’yi 14 gün ücretsiz deneyin',
  ctaBody:
    'Kurulumda yardım isterseniz bize yazın; sorularınızı birlikte yanıtlayalım. Deneme için kredi kartı gerekmez.',
  ctaPrimary: 'Ücretsiz deneyin',
  ctaSecondary: `Bize yazın · ${SUPPORT_EMAIL}`,
  ctaPlanLink: 'Planları görün',
  riskFree1: '14 gün ücretsiz',
  riskFree2: 'Kredi kartı gerekmez',
  riskFree3: 'İstediğiniz zaman iptal',
  calibrationFooter:
    'Bu rapor girdiğiniz değerlere dayanan bir tahmindir; Buaze müşteri verisine ya da araştırmaya dayanmaz. Daha fazla yorumun ya da daha iyi bir puanın gelire etkisi hesaba katılmadı.',
};

const ROI_CUSTOMER_REPORT_EN: FlatCopy = {
  subjectTemplate: 'Your Buaze estimate for ${restaurantName}',
  preheaderPrefix: 'Estimated time saved and a short summary.',
  heroEyebrow: 'ESTIMATE · ROI CALCULATOR',
  heroIntroPdf:
    'Here is the estimate for ${restaurantName}, based on the values you entered in the calculator; the detailed PDF is attached. The figures come from your own values.',
  heroIntroNoPdf:
    'Here is the estimate for ${restaurantName}, based on the values you entered in the calculator. The figures come from your own values.',
  netGainEyebrow: 'ESTIMATED TIME SAVED',
  ctaEyebrow: 'NEXT STEP',
  ctaTitle: 'Try Buaze free for 14 days',
  ctaBody:
    'If you would like help with setup, write to us and we will answer your questions. No credit card is needed for the trial.',
  ctaPrimary: 'Start your free trial',
  ctaSecondary: `Write to us · ${SUPPORT_EMAIL}`,
  ctaPlanLink: 'See the plans',
  riskFree1: '14 days free',
  riskFree2: 'No credit card required',
  riskFree3: 'Cancel anytime',
  calibrationFooter:
    'This report is an estimate based on the values you entered, not on Buaze customer data or research. It leaves out any revenue effect of more reviews or a better rating.',
};

const ROI_ADMIN_NOTIFICATION_TR: FlatCopy = {
  subjectTemplate: '[Lead] ${restaurantName} · ROI hesabı',
  preheaderPrefix: '${restaurantName} ROI hesaplayıcıyı kullandı.',
  alertEyebrow: 'YENİ ROI TALEBİ',
  statusPill: '1 iş günü içinde yanıtla',
  netGainEyebrow: 'TAHMİNİ ZAMAN TASARRUFU',
  scenarioH2: 'Girdiği değerler',
  quickEyebrow: 'HIZLI AKSİYON',
  replyLabel: 'Yanıt yaz',
  replySub: 'E-posta gönder',
  callLabel: 'Telefonla ara',
  callSubYes: 'Numarayı çevir',
  callSubNo: 'Numara yok',
  panelLabel: 'Müşteri paneli',
  panelSub: 'Tüm talepler',
  footerDisclosure:
    'ROI hesaplayıcı formu gönderildiğinde otomatik gelir. Rakamlar, ziyaretçinin girdiği değerlerden sunucuda hesaplanan tahminlerdir; aynı özet ziyaretçinin raporunda da yer alır.',
};

const ROI_ADMIN_NOTIFICATION_EN: FlatCopy = {
  subjectTemplate: '[Lead] ${restaurantName} · ROI estimate',
  preheaderPrefix: '${restaurantName} used the ROI calculator.',
  alertEyebrow: 'NEW ROI REQUEST',
  statusPill: 'Reply within 1 business day',
  netGainEyebrow: 'ESTIMATED TIME SAVED',
  scenarioH2: 'Values entered',
  quickEyebrow: 'QUICK ACTION',
  replyLabel: 'Reply',
  replySub: 'Send email',
  callLabel: 'Call',
  callSubYes: 'Dial number',
  callSubNo: 'No number',
  panelLabel: 'Customer panel',
  panelSub: 'All requests',
  footerDisclosure:
    'Sent automatically when someone submits the ROI calculator form. The figures are estimates computed on the server from the visitor’s values; the same summary is in their report.',
};

// ───────────────────────────────────────────────────────────────────────
// Wave B (CLAUDE.md §38.B) — 4 new templates: password change confirmation,
// team join / team remove owner notifications, and the first-feedback
// activation moment celebration. Each template's render fn carries the
// same inline default shape; we duplicate the literals here so seed +
// admin GET fallback share one source of truth.
// ───────────────────────────────────────────────────────────────────────

const PASSWORD_CHANGED_TR: FlatCopy = {
  eyebrow: 'Güvenlik · Bildirim',
  title: 'Şifren',
  titleAccent: 'güncellendi',
  intro:
    'Hesabının şifresi az önce başarıyla değiştirildi. Bu işlemi sen yaptıysan ek bir şey yapman gerekmiyor.',
  cardEyebrow: 'Değişiklik detayı',
  statusText: 'Başarılı · Şifre güncel',
  metaTime: 'Değişiklik saati',
  metaIp: 'IP',
  metaDevice: 'Cihaz',
  metaAccount: 'Hesap',
  notYouTitle: 'Sen değil misin?',
  notYouBody:
    'Hesabını hemen koru: linki kullanarak yeni bir şifre belirle ve destek ekibine haber ver.',
  notYouLink: 'Şifreyi sıfırla →',
};

const PASSWORD_CHANGED_EN: FlatCopy = {
  eyebrow: 'Security · Notice',
  title: 'Your password',
  titleAccent: 'was updated',
  intro:
    'The password on your account was just changed successfully. If you made this change, nothing else to do.',
  cardEyebrow: 'Change detail',
  statusText: 'Success · Password current',
  metaTime: 'Changed at',
  metaIp: 'IP',
  metaDevice: 'Device',
  metaAccount: 'Account',
  notYouTitle: "Wasn't you?",
  notYouBody:
    'Protect your account immediately: use the link below to set a new password and reach out to support.',
  notYouLink: 'Reset password →',
};

const TEAM_MEMBER_JOINED_TR: FlatCopy = {
  eyebrow: 'Ekip · Yeni üye',
  title: 'Ekibin',
  titleAccent: 'genişledi',
  intro:
    'Davet ettiğin ${memberName} ekibine katıldı. Bu üyenin yetkilerini istediğin zaman Hesabım → Ekip sekmesinden güncelleyebilirsin.',
  cardEyebrow: 'Yeni üye detayı',
  nameLabel: 'İsim',
  roleLabelKey: 'Rol',
  locationsLabel: 'Erişim',
  cta: 'Ekibi gör →',
  note: 'Bu üyenin yetkilerini istediğin zaman Hesabım → Ekip sekmesinden güncelleyebilirsin.',
};

const TEAM_MEMBER_JOINED_EN: FlatCopy = {
  eyebrow: 'Team · New member',
  title: 'Your team',
  titleAccent: 'just grew',
  intro:
    '${memberName} accepted your invite and joined the workspace. You can update permissions anytime from Account → Team.',
  cardEyebrow: 'Member detail',
  nameLabel: 'Name',
  roleLabelKey: 'Role',
  locationsLabel: 'Access',
  cta: 'Open team →',
  note: "You can update this member's permissions anytime under Account → Team.",
};

// ───────────────────────────────────────────────────────────────────────
// Wave B4 (CLAUDE.md §38.193) — account deletion lifecycle defaults.
// Two mails: schedule confirmation (carries cancel link) + cancel
// confirmation (audit trail).
// ───────────────────────────────────────────────────────────────────────

const ACCOUNT_DELETION_SCHEDULED_TR: FlatCopy = {
  eyebrow: 'Hesap silme · Onay alındı',
  title: 'Hesabın',
  titleAccent: '30 gün içinde silinecek',
  intro:
    'Hesap silme talebini aldık. Aşağıdaki tarihte verin kalıcı olarak silinecek. İstediğin zaman vazgeçebilirsin.',
  cardEyebrow: 'Silme detayı',
  statusText: '30 gün geri sayım · İptal hakkı saklı',
  metaAccountLabel: 'Hesap',
  metaScheduledLabel: 'Silinme tarihi',
  metaCountdownLabel: 'Kalan süre',
  metaCountdownValue: '${daysRemaining} gün',
  cta: 'Hesap silmeyi iptal et →',
  note:
    'Süre dolduğunda restoran kayıtları, yorumlar, QR\'lar ve abonelik geçmişin kalıcı olarak silinir. KVKK m.7 gereği mali kayıtlar anonim biçimde 10 yıl saklanır.',
  notYouTitle: 'Sen bunu yapmadıysan?',
  notYouBody: 'Yukarıdaki "İptal" butonuna hemen tıkla. Aksiyon olmadan hesabın 30 gün içinde silinir.',
};

const ACCOUNT_DELETION_SCHEDULED_EN: FlatCopy = {
  eyebrow: 'Account delete · Confirmed',
  title: 'Your account',
  titleAccent: 'will be deleted in 30 days',
  intro:
    'We received your deletion request. Your data will be permanently removed on the date below — you can cancel any time.',
  cardEyebrow: 'Deletion detail',
  statusText: '30-day countdown · Cancel any time',
  metaAccountLabel: 'Account',
  metaScheduledLabel: 'Deletion date',
  metaCountdownLabel: 'Time remaining',
  metaCountdownValue: '${daysRemaining} days',
  cta: 'Cancel account deletion →',
  note:
    'When the window closes, your restaurant records, reviews, QR codes and subscription history are permanently deleted. Per KVKK Article 7 financial records are retained anonymised for 10 years.',
  notYouTitle: "Didn't request this?",
  notYouBody: 'Click the "Cancel" button above immediately. Without action your account will be deleted in 30 days.',
};

const ACCOUNT_DELETION_CANCELED_TR: FlatCopy = {
  eyebrow: 'Hesap silme · İptal edildi',
  title: 'Hesabın',
  titleAccent: 'güvende',
  intro:
    'Hesap silme talebini iptal ettin. Hesabın aktif kalıyor, hiçbir veri silinmedi.',
  cardEyebrow: 'Durum güncellendi',
  accountLabel: 'Hesap',
  statusLabel: 'Durum',
  statusValue: 'Aktif · Veri güvende',
  cta: 'Panele dön →',
  footer: 'Bu maili saklayabilirsin — herhangi bir aksiyon gerekmiyor. İstediğin zaman ayarlardan tekrar başlatabilirsin.',
};

const ACCOUNT_DELETION_CANCELED_EN: FlatCopy = {
  eyebrow: 'Account delete · Canceled',
  title: 'Your account',
  titleAccent: 'is safe',
  intro:
    'You canceled the deletion request. Your account stays active and no data was removed.',
  cardEyebrow: 'Status updated',
  accountLabel: 'Account',
  statusLabel: 'Status',
  statusValue: 'Active · Data safe',
  cta: 'Back to panel →',
  footer: 'You can archive this mail — no action needed. You can restart from settings any time.',
};

// ───────────────────────────────────────────────────────────────────────
// Wave C (CLAUDE.md §38.194) — 4 lifecycle expansion templates.
// ───────────────────────────────────────────────────────────────────────

const RATING_DROP_ALERT_TR: FlatCopy = {
  eyebrow: 'Erken uyarı · Puan düşüşü',
  title: 'Puanın',
  titleAccent: 'düşüyor',
  intro:
    'Son 7 günde puan ortalaman ${currentAvg} oldu. Önceki 4 haftalık baseline ${baselineAvg} idi — düşüş ${delta} puan.',
  cardEyebrow: 'Bu hafta',
  currentLabel: 'Mevcut ortalama',
  baselineLabel: 'Önceki 4 hafta',
  deltaLabel: 'Fark',
  reviewCountLabel: 'Yorum sayısı',
  cta: 'Düşük puanları gör →',
  actionTitle: 'Sıradaki 24 saatte 3 adım',
  action1: 'Son 7 günün 1-3 puanlı yorumlarına yanıt yaz — geç yanıt verilen yorumlar Google\'da kalıcı hasar bırakır.',
  action2: 'Tekrar eden şikayet konularını çıkar (servis, hijyen, hız) — operasyon ekibiyle paylaş.',
  action3: 'Yorum bırakma bağlantını (QR) tüm müşterilerinle paylaşmaya devam et.',
};

const RATING_DROP_ALERT_EN: FlatCopy = {
  eyebrow: 'Early warning · Rating drop',
  title: 'Your rating is',
  titleAccent: 'sliding',
  intro:
    'You averaged ${currentAvg} over the past 7 days. The prior 4-week baseline was ${baselineAvg} — a drop of ${delta} points.',
  cardEyebrow: 'This week',
  currentLabel: 'Current average',
  baselineLabel: 'Prior 4-week',
  deltaLabel: 'Delta',
  reviewCountLabel: 'Reviews',
  cta: 'Open low-rating inbox →',
  actionTitle: 'Three moves in the next 24 hours',
  action1: 'Reply to every 1-3 star review from the last 7 days — late replies leave permanent Google damage.',
  action2: 'Extract recurring complaint themes (service, hygiene, speed) and share with operations.',
  action3: 'Keep making your review link available to every customer.',
};

const DATA_EXPORT_CONFIRMATION_TR: FlatCopy = {
  eyebrow: 'KVKK · Veri indirildi',
  title: 'Veri',
  titleAccent: 'indirildi',
  intro:
    'Hesabınla ilişkili tüm veriler JSON olarak indirildi (KVKK §11 erişim hakkı). Bu işlemi sen yaptıysan ek bir şey yapman gerekmiyor.',
  cardEyebrow: 'İşlem detayı',
  statusText: 'Başarılı · Dosya indirildi',
  metaTime: 'İndirme saati',
  metaIp: 'IP',
  metaDevice: 'Cihaz',
  metaAccount: 'Hesap',
  notYouTitle: 'Sen bunu yapmadıysan?',
  notYouBody: 'Hemen şifreni değiştir (Hesabım → Güvenlik) ve diğer oturumlardan çık. Şüphelendiğin bir durum varsa support@buaze.com\'a yaz.',
};

const DATA_EXPORT_CONFIRMATION_EN: FlatCopy = {
  eyebrow: 'KVKK · Data downloaded',
  title: 'Your data',
  titleAccent: 'was exported',
  intro:
    'All data associated with your account was downloaded as JSON (KVKK §11 / GDPR Art. 20 access right). If this was you, nothing else to do.',
  cardEyebrow: 'Export detail',
  statusText: 'Success · File downloaded',
  metaTime: 'Downloaded at',
  metaIp: 'IP',
  metaDevice: 'Device',
  metaAccount: 'Account',
  notYouTitle: "Wasn't you?",
  notYouBody: 'Change your password immediately (Account → Security) and sign out of other sessions. Email support@buaze.com if anything looks off.',
};

// ───────────────────────────────────────────────────────────────────────
// Wave D (CLAUDE.md §38.195) — new-device login security alert.
// ───────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────
// Combined registry — admin GET endpoint + seed script consume this.
// Lifecycle defaults are re-exported from lifecycle-defaults.ts (no copy)
// so render fns + admin editor share the same object reference.
// ───────────────────────────────────────────────────────────────────────

export const MAIL_INLINE_DEFAULTS: Record<
  MailTemplateKey,
  Record<MailLocale, FlatCopy | VariantCopy>
> = {
  welcome: { tr: WELCOME_TR, en: WELCOME_EN },
  newsletter: { tr: NEWSLETTER_TR, en: NEWSLETTER_EN },
  'trial-ending': { tr: TRIAL_ENDING_TR, en: TRIAL_ENDING_EN },
  'forgot-password': { tr: FORGOT_PASSWORD_TR, en: FORGOT_PASSWORD_EN },
  'low-rating-alert': { tr: LOW_RATING_ALERT_TR, en: LOW_RATING_ALERT_EN },
  'new-review': { tr: NEW_REVIEW_TR, en: NEW_REVIEW_EN },
  'weekly-report': { tr: WEEKLY_REPORT_TR, en: WEEKLY_REPORT_EN },
  'customer-reply': { tr: CUSTOMER_REPLY_TR, en: CUSTOMER_REPLY_EN },
  'form-confirmation': { tr: FORM_CONFIRMATION_TR, en: FORM_CONFIRMATION_EN },
  'verify-email': { tr: VERIFY_EMAIL_TR, en: VERIFY_EMAIL_EN },
  'roi-customer-report': { tr: ROI_CUSTOMER_REPORT_TR, en: ROI_CUSTOMER_REPORT_EN },
  'roi-admin-notification': { tr: ROI_ADMIN_NOTIFICATION_TR, en: ROI_ADMIN_NOTIFICATION_EN },
  'qr-not-downloaded': LIFECYCLE_INLINE_DEFAULTS['qr-not-downloaded'],
  'first-feedback-tips': LIFECYCLE_INLINE_DEFAULTS['first-feedback-tips'],
  'upgrade-suggestion': LIFECYCLE_INLINE_DEFAULTS['upgrade-suggestion'],
  // CLAUDE.md §42 Phase 3 — audit-completed bildirim.
  'audit-completed': {
    tr: {
      eyebrow: 'Denetim Merkezi · Yeni yanıt',
      titleLine: 'Bir denetim tamamlandı.',
      introLine: '${respondentName}, "${auditTitle}" denetimini tamamladı.',
      scoreLabel: 'Toplam puan',
      passedLabel: 'Sonuç',
      passedYes: 'Geçti',
      passedNo: 'Kaldı',
      passedUnknown: 'Puan hesaplandı',
      ctaLabel: 'Yanıtı incele',
      secondaryLine:
        'Detay sayfasından soru-soru cevapları görüp, gerekirse manuel yeniden puanlama yapabilirsin.',
    },
    en: {
      eyebrow: 'Audit Center · New response',
      titleLine: 'An audit was completed.',
      introLine: '${respondentName} completed "${auditTitle}".',
      scoreLabel: 'Total score',
      passedLabel: 'Result',
      passedYes: 'Passed',
      passedNo: 'Failed',
      passedUnknown: 'Score recorded',
      ctaLabel: 'Review response',
      secondaryLine:
        'Open the detail page to see answers question-by-question and re-score manually if needed.',
    },
  },
  // Wave B (CLAUDE.md §38.B) — security + team defaults.
  'password-changed': { tr: PASSWORD_CHANGED_TR, en: PASSWORD_CHANGED_EN },
  'team-member-joined': { tr: TEAM_MEMBER_JOINED_TR, en: TEAM_MEMBER_JOINED_EN },
  // Wave B4 (CLAUDE.md §38.193) — account deletion lifecycle defaults.
  'account-deletion-scheduled': {
    tr: ACCOUNT_DELETION_SCHEDULED_TR,
    en: ACCOUNT_DELETION_SCHEDULED_EN,
  },
  'account-deletion-canceled': {
    tr: ACCOUNT_DELETION_CANCELED_TR,
    en: ACCOUNT_DELETION_CANCELED_EN,
  },
  // Wave C (CLAUDE.md §38.194) — rating drop + data export defaults.
  'rating-drop-alert': { tr: RATING_DROP_ALERT_TR, en: RATING_DROP_ALERT_EN },
  'data-export-confirmation': { tr: DATA_EXPORT_CONFIRMATION_TR, en: DATA_EXPORT_CONFIRMATION_EN },
  // Saved cards (billing spec §13.4) — shared with the render fns (no copy).
  'billing-renewal-upcoming': { tr: BILLING_RENEWAL_UPCOMING_TR, en: BILLING_RENEWAL_UPCOMING_EN },
  'billing-period-ended': { tr: BILLING_PERIOD_ENDED_TR, en: BILLING_PERIOD_ENDED_EN },
  'billing-card-retention': { tr: BILLING_CARD_RETENTION_TR, en: BILLING_CARD_RETENTION_EN },
  'billing-renewal-paid': { tr: BILLING_RENEWAL_PAID_TR, en: BILLING_RENEWAL_PAID_EN },
  'billing-renewal-failed': { tr: BILLING_RENEWAL_FAILED_TR, en: BILLING_RENEWAL_FAILED_EN },
  'billing-auto-renew-changed': { tr: BILLING_AUTO_RENEW_CHANGED_TR, en: BILLING_AUTO_RENEW_CHANGED_EN },
};

/**
 * Get the flat-or-variant default copy for a (key, locale) pair. Used by:
 *   - Admin API GET → fallback merge when DB content is empty
 *   - Seed script → idempotent upsert
 *
 * Returns null only if the key is unknown (caller should fall through to
 * `404 not_seeded` semantics for legacy callers).
 */
export function getMailTemplateDefault(
  key: MailTemplateKey,
  locale: MailLocale,
): FlatCopy | VariantCopy | null {
  const entry = MAIL_INLINE_DEFAULTS[key];
  if (!entry) return null;
  return entry[locale] ?? null;
}
