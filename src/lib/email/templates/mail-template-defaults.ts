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
//      `upgrade-suggestion`, `inactive-reactivation`) — re-exports from
//      `lifecycle-defaults.ts` ensure drift-free import for the 4 lifecycle
//      templates (their render fns already pull from `lifecycle-defaults`).
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

import type { MailLocale, MailTemplateKey } from '../copy-loader';
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
    subject: 'Mesajını aldık — 24 saat içinde döneceğiz',
    preheader: 'Talebin sıraya alındı. İşte özet.',
    eyebrow: 'İletişim · Onay',
    titleA: 'Aldık',
    titleB: 'Sıradayız.',
    intro: 'Mesajın ekibimize ulaştı. Genelde 24 saat içinde dönüyoruz — haftasonu bu süre 48 saate kadar uzayabilir.',
    formEyebrow: 'Form kaydı',
    timelineEyebrow: 'Sırada ne var',
    sideEyebrowA: 'Acil durum',
    sideBodyA: 'Daha hızlı destek için canlı sohbeti kullanabilirsin.',
    sideCtaA: 'Sohbeti aç →',
    sideEyebrowB: 'Beklerken',
    sideBodyB: '10 dakikalık ürün turu — kayıt olmadan.',
    sideCtaB: 'Ürün turunu izle →',
  },
  career: {
    subject: 'Başvurun bize ulaştı',
    preheader: 'Başvurun sıraya alındı. 5 iş gününde dönüyoruz.',
    eyebrow: 'Kariyer · Onay',
    titleA: 'Aldık',
    titleB: 'İnceliyoruz.',
    intro: 'Başvurunu ekibimize ilettik. 5 iş günü içinde mutlaka geri döneceğiz — uygun bir pozisyon yoksa bile haber vereceğiz.',
    formEyebrow: 'Başvuru özeti',
    timelineEyebrow: 'Süreç',
    sideEyebrowA: 'Açık pozisyonlar',
    sideBodyA: 'Diğer rolleri de görmek ister misin?',
    sideCtaA: 'Tüm pozisyonlar →',
    sideEyebrowB: 'Beklerken',
    sideBodyB: 'Buaze ekip kültürünü tanımak için hikâyemizi oku.',
    sideCtaB: 'Ekip blogu →',
  },
  roi: {
    subject: 'ROI hesaplamanı kaydettik',
    preheader: 'Hesabın hazır. Detaylı PDF birazdan inboxuna düşecek.',
    eyebrow: 'ROI · Onay',
    titleA: 'Hesapladık',
    titleB: 'Sıradaki adım: demo.',
    intro: 'Verdiğin bilgilerle aylık potansiyel etkiyi hesapladık. Detaylı raporu ve sektör karşılaştırmasını e-posta ile sana ulaştırıyor olacağız.',
    formEyebrow: 'Hesap özeti',
    timelineEyebrow: 'Sırada ne var',
    sideEyebrowA: 'Demo seç',
    sideBodyA: 'Beklemeden bir slot ayırt edebilirsin.',
    sideCtaA: 'Takvimden seç →',
    sideEyebrowB: 'Bu arada',
    sideBodyB: 'Diğer restoranlar Buaze\'i nasıl kullanıyor?',
    sideCtaB: 'Vakaları gör →',
  },
  newsletter: {
    subject: 'Aboneliğin aktif',
    preheader: 'Pulse bülteni her ayın 1\'inde mailine düşecek.',
    eyebrow: 'Bülten · Onay',
    titleA: 'Aramızdasın',
    titleB: 'Pulse her ay 1\'inde gelir.',
    intro: 'Aboneliğini aktive ettik. Pulse bülteni vakalar, sektör verileri, ürün haberleri — sana ayda bir.',
    formEyebrow: 'Abonelik',
    timelineEyebrow: 'Ne bekleyeceksin',
    sideEyebrowA: 'Bu arada',
    sideBodyA: 'Buaze\'i hâlâ keşfediyorsan kısa turdan başla.',
    sideCtaA: 'Buaze nasıl çalışır →',
    sideEyebrowB: 'Beklerken',
    sideBodyB: '5 dakikalık ürün turu — kayıt yok.',
    sideCtaB: 'Ürün turunu izle →',
  },
};

const FORM_CONFIRMATION_EN: VariantCopy = {
  contact: {
    subject: 'Got your message — we\'ll reply within 24h',
    preheader: 'Your ticket is queued. Here\'s the summary.',
    eyebrow: 'Contact · Confirmation',
    titleA: 'Got it',
    titleB: 'In the queue.',
    intro: 'Your message reached our team. We typically reply within 24 hours — weekends may extend this to 48 hours.',
    formEyebrow: 'Form record',
    timelineEyebrow: 'What happens next',
    sideEyebrowA: 'Need it faster?',
    sideBodyA: 'Open live chat for instant support.',
    sideCtaA: 'Open chat →',
    sideEyebrowB: 'While you wait',
    sideBodyB: '10-min product tour — no signup.',
    sideCtaB: 'Watch tour →',
  },
  career: {
    subject: 'Your application reached us',
    preheader: 'Application queued. We\'ll reply within 5 business days.',
    eyebrow: 'Careers · Confirmation',
    titleA: 'Got it',
    titleB: 'Reviewing now.',
    intro: 'We\'ve forwarded your application to the team. We\'ll get back within 5 business days — even if there\'s no fit, you\'ll hear from us.',
    formEyebrow: 'Application summary',
    timelineEyebrow: 'Process',
    sideEyebrowA: 'Open roles',
    sideBodyA: 'Want to see other positions?',
    sideCtaA: 'All open roles →',
    sideEyebrowB: 'While you wait',
    sideBodyB: 'Read about Buaze culture.',
    sideCtaB: 'Team blog →',
  },
  roi: {
    subject: 'We saved your ROI estimate',
    preheader: 'Estimate ready. Detailed PDF inbound.',
    eyebrow: 'ROI · Confirmation',
    titleA: 'Crunched',
    titleB: 'Next: demo.',
    intro: 'Based on your inputs we estimated monthly potential impact. We\'ll send a detailed PDF report and sector benchmark.',
    formEyebrow: 'Estimate summary',
    timelineEyebrow: 'What happens next',
    sideEyebrowA: 'Pick a demo',
    sideBodyA: 'Reserve a slot without waiting.',
    sideCtaA: 'Pick a time →',
    sideEyebrowB: 'Meanwhile',
    sideBodyB: 'How do other restaurants use Buaze?',
    sideCtaB: 'See cases →',
  },
  newsletter: {
    subject: 'Subscription active',
    preheader: 'Pulse newsletter lands on the 1st of every month.',
    eyebrow: 'Newsletter · Confirmation',
    titleA: 'You\'re in',
    titleB: 'Pulse arrives on the 1st.',
    intro: 'Your subscription is live. Pulse covers cases, sector data, and product news — once a month.',
    formEyebrow: 'Subscription',
    timelineEyebrow: 'What to expect',
    sideEyebrowA: 'Meanwhile',
    sideBodyA: 'Still exploring Buaze? Take the short tour.',
    sideCtaA: 'How Buaze works →',
    sideEyebrowB: 'While you wait',
    sideBodyB: '5-min product tour — no signup.',
    sideCtaB: 'Watch tour →',
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
  subjectTemplate: '${restaurantName} için 12 aylık ROI raporun hazır',
  preheaderPrefix: 'Yıllık net kazanç, ROI çarpanı + Buaze analizi.',
  heroEyebrow: 'BUAZE ROI RAPORU · 12 AY',
  heroIntroPdf: '${restaurantName} için girdiğin senaryoyu, Buaze hesap modeliyle 12 aylık projeksiyona dönüştürdük. Aşağıda ana sonuçlar; detaylı PDF mailin ekinde.',
  heroIntroNoPdf: '${restaurantName} için girdiğin senaryoyu, Buaze hesap modeliyle 12 aylık projeksiyona dönüştürdük. Aşağıda ana sonuçlar; detayları aşağıda.',
  netGainEyebrow: 'YILLIK NET KAZANÇ',
  ctaEyebrow: 'SIRADAKİ ADIM',
  ctaTitle: '30 dk canlı kurulum + soru-cevap',
  ctaBody: 'Bu projeksiyonu birlikte gözden geçirelim. ${planLabel} planını işletmene uyarlayalım, ilk QR\'ı sahanda devreye alalım. Kredi kartı sormuyoruz; 30 gün ücretsiz.',
  ctaPrimary: 'Demo daveti gönder',
  ctaSecondary: '✉ Bize doğrudan yaz · hello@buaze.com',
  ctaPlanLink: 'Ya da planları gör',
  riskFree1: '30 gün ücretsiz',
  riskFree2: 'Kredi kartı yok',
  riskFree3: 'İstediğin an iptal',
  calibrationFooter: 'Bu rapor BrightLocal 2024 yerel arama verileri ve ~2.400 Buaze müşteri kohortu üzerinde kalibre edildi. Tahmini değerlerdir; gerçek sonuçlar işletmenin yorum yanıt disiplinine ve operasyonel uygulamaya göre değişir.',
};

const ROI_CUSTOMER_REPORT_EN: FlatCopy = {
  subjectTemplate: 'Your 12-month ROI report for ${restaurantName} is ready',
  preheaderPrefix: 'Annual net gain, ROI multiple + Buaze analysis.',
  heroEyebrow: 'BUAZE ROI REPORT · 12 MO',
  heroIntroPdf: 'We turned your scenario for ${restaurantName} into a 12-month projection using the Buaze model. Highlights below; detailed PDF is attached.',
  heroIntroNoPdf: 'We turned your scenario for ${restaurantName} into a 12-month projection using the Buaze model. Highlights below; details follow.',
  netGainEyebrow: 'ANNUAL NET GAIN',
  ctaEyebrow: 'NEXT STEP',
  ctaTitle: '30-min live setup & Q&A',
  ctaBody: "Let's walk through this projection together, tailor the ${planLabel} plan, and ship your first QR. No credit card; 30-day free trial.",
  ctaPrimary: 'Schedule a demo',
  ctaSecondary: '✉ Email us directly · hello@buaze.com',
  ctaPlanLink: 'Or browse plans',
  riskFree1: '30-day free',
  riskFree2: 'No credit card',
  riskFree3: 'Cancel anytime',
  calibrationFooter: 'Calibrated on BrightLocal 2024 local search data and ~2,400 Buaze accounts. Numbers are estimates; actuals vary with your reply discipline and operational rollout.',
};

const ROI_ADMIN_NOTIFICATION_TR: FlatCopy = {
  subjectTemplate: '[Lead] ${restaurantName} · ${netGain}/yıl',
  preheaderPrefix: '${restaurantName} ROI hesabı yaptı: ${netGain}/yıl.',
  alertEyebrow: "YENİ ROI LEAD'İ",
  statusPill: '24 saat içinde dön',
  netGainEyebrow: 'YILLIK NET KAZANÇ',
  scenarioH2: 'Senaryosu',
  quickEyebrow: 'HIZLI AKSİYON',
  replyLabel: 'Yanıt yaz',
  replySub: 'E-posta gönder',
  callLabel: 'Telefonla ara',
  callSubYes: 'Numarayı çevir',
  callSubNo: 'Numara yok',
  panelLabel: 'Lead panel',
  panelSub: "Tüm lead'ler",
  footerDisclosure: 'Bu mail, kullanıcı ROI hesaplayıcı formunu doldurduğunda otomatik gönderilir. AI insight kullanıcı raporu mailinde + PDF kapağında da yer alır.',
};

const ROI_ADMIN_NOTIFICATION_EN: FlatCopy = {
  subjectTemplate: '[Lead] ${restaurantName} · ${netGain}/yr',
  preheaderPrefix: '${restaurantName} ran an ROI estimate: ${netGain}/yr.',
  alertEyebrow: 'NEW ROI LEAD',
  statusPill: 'Reply within 24h',
  netGainEyebrow: 'ANNUAL NET GAIN',
  scenarioH2: 'Scenario',
  quickEyebrow: 'QUICK ACTION',
  replyLabel: 'Reply',
  replySub: 'Send email',
  callLabel: 'Call',
  callSubYes: 'Dial number',
  callSubNo: 'No number',
  panelLabel: 'Lead panel',
  panelSub: 'All leads',
  footerDisclosure: 'This message is sent automatically when a user submits the ROI calculator form. The same AI insight appears in the customer report mail + PDF cover.',
};

// ───────────────────────────────────────────────────────────────────────
// Wave 5 — campaign chrome (customer-campaign + owner moderation).
// ───────────────────────────────────────────────────────────────────────

const CUSTOMER_CAMPAIGN_TR: FlatCopy = {
  eyebrow: 'Restoranından mesaj',
  unsubscribeLabel: 'Listeden ayrıl',
  sentLine: 'Buaze',
  sentSuffix: 'üzerinden iletildi.',
};

const CUSTOMER_CAMPAIGN_EN: FlatCopy = {
  eyebrow: 'Message from your restaurant',
  unsubscribeLabel: 'Unsubscribe',
  sentLine: 'Sent via Buaze',
  sentSuffix: '',
};

const OWNER_CAMPAIGN_APPROVED_TR: FlatCopy = {
  eyebrow: 'KAMPANYA ONAYLANDI',
  title: 'Kampanyanız yola çıktı',
  intro: 'Merhaba ${ownerName}, ${restaurantName} adına gönderdiğiniz kampanya admin ekibimiz tarafından onaylandı ve müşterilerinize iletildi. İşte özet:',
  statsLabel: 'Gönderim özeti',
  sentRow: 'Başarılı gönderim',
  failedRow: 'Başarısız',
  ctaLabel: 'Panelden detayları gör',
  footerHint: 'Bu mail otomatik gönderildi. Sonraki kampanyalarınız için panel üzerinden yeni gönderim başlatabilirsiniz.',
};

const OWNER_CAMPAIGN_APPROVED_EN: FlatCopy = {
  eyebrow: 'CAMPAIGN APPROVED',
  title: 'Your campaign is on its way',
  intro: 'Hi ${ownerName}, the campaign you submitted for ${restaurantName} was approved by our admin team and delivered to your customers. Summary below:',
  statsLabel: 'Delivery summary',
  sentRow: 'Delivered',
  failedRow: 'Failed',
  ctaLabel: 'View details in dashboard',
  footerHint: 'This message is automated. Start new campaigns anytime from your panel.',
};

const OWNER_CAMPAIGN_REJECTED_TR: FlatCopy = {
  eyebrow: 'KAMPANYA REDDEDİLDİ',
  title: 'Kampanyanız onaylanmadı',
  intro: 'Merhaba ${ownerName}, ${restaurantName} adına gönderdiğiniz kampanyayı admin ekibimiz inceledi ve onaylayamadı. Aşağıdaki gerekçeyi inceleyip revize edebilirsiniz.',
  noteLabel: 'Reviewer notu',
  nextStepsTitle: 'Sonraki adımlar',
  nextStepsBody: 'Kampanyayı revize edip tekrar gönderebilirsiniz. Şüpheli durumda destek ekibimiz size yardımcı olur.',
  ctaLabel: 'Kampanyayı düzenle',
  footerHint: 'Tek seferde maksimum bir kampanya onayda olabilir. Revize sonrası tekrar yola çıkar.',
};

const OWNER_CAMPAIGN_REJECTED_EN: FlatCopy = {
  eyebrow: 'CAMPAIGN REJECTED',
  title: 'Your campaign was not approved',
  intro: 'Hi ${ownerName}, the admin team reviewed the campaign you submitted for ${restaurantName} and could not approve it. Please review the reason below and revise.',
  noteLabel: 'Reviewer note',
  nextStepsTitle: 'Next steps',
  nextStepsBody: 'You can revise the campaign and resubmit. Our support team is happy to help when in doubt.',
  ctaLabel: 'Edit campaign',
  footerHint: 'Only one campaign may be in review at a time. After your revision it will resume processing.',
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

const TEAM_MEMBER_REMOVED_TR: FlatCopy = {
  eyebrow: 'Ekip · Üye çıkarıldı',
  title: 'Bir üye',
  titleAccent: 'ayrıldı',
  intro:
    '${memberName} ekipten çıkarıldı. Paneline erişimi anında kapatıldı.',
  cardEyebrow: 'Audit kaydı',
  nameLabel: 'İsim',
  emailLabel: 'E-posta',
  roleLabelKey: 'Rol',
  actionLabel: 'Aksiyon',
  actionValue: 'Erişim kapatıldı · Oturumlar sonlandırıldı',
  cta: 'Ekibi gör →',
  note: "Bu işlemi sen yapmadıysan Hesabım → Audit log'undan kaydı inceleyebilirsin.",
};

const TEAM_MEMBER_REMOVED_EN: FlatCopy = {
  eyebrow: 'Team · Member removed',
  title: 'A teammate',
  titleAccent: 'has left',
  intro:
    '${memberName} has been removed from your workspace. Their access was revoked instantly.',
  cardEyebrow: 'Audit record',
  nameLabel: 'Name',
  emailLabel: 'Email',
  roleLabelKey: 'Role',
  actionLabel: 'Action',
  actionValue: 'Access revoked · Sessions ended',
  cta: 'Open team →',
  note: "If you didn't make this change, review the entry under Account → Audit log.",
};

const FIRST_FEEDBACK_CELEBRATION_TR: FlatCopy = {
  eyebrow: 'Aktivasyon · İlk yorum',
  title: 'İlk yorumun',
  titleAccent: 'geldi',
  intro:
    '${restaurantName} için ilk müşteri yorumu panele düştü. Hemen yanıt verirsen müşterinin kalıcı bir hatırasını oluşturmuş olursun.',
  quoteEyebrow: 'Müşterinin sözleri',
  noComment: 'Müşteri yorum yazmadı — sadece yıldız bıraktı.',
  cta: 'Yorumu gör →',
  tipPositive:
    'Yüksek puanlı yorumlara 24 saat içinde teşekkür et — müşteri sadakatini iki katına çıkarır.',
  tipLow:
    'Düşük puanlarda önce dinle, sonra çöz: müşteri hatasını kabul edilen restoranı tekrar dener.',
};

const FIRST_FEEDBACK_CELEBRATION_EN: FlatCopy = {
  eyebrow: 'Activation · First review',
  title: 'Your first review',
  titleAccent: 'is in',
  intro:
    '${restaurantName} just got its first customer review. A reply within the first hours builds lasting customer memory.',
  quoteEyebrow: 'What the customer said',
  noComment: 'No written comment — only the star rating.',
  cta: 'Open the review →',
  tipPositive:
    'Thank high-rated reviews within 24 hours — it doubles repeat-customer loyalty.',
  tipLow:
    'For low ratings, listen first then fix: customers retry a restaurant that admits mistakes.',
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

const QR_NO_SCANS_REMINDER_TR: FlatCopy = {
  eyebrow: 'Aktivasyon · Tarama yok',
  title: 'QR\'ın',
  titleAccent: 'sessiz',
  intro:
    'QR\'ı oluşturduğundan beri ${daysSinceQr} gün geçti. Henüz tek tarama yok — yerleştirme veya tasarımda hızlıca düzeltebileceğin bir şey olabilir.',
  tipsEyebrow: 'Hızlı 4 fikir',
  tip1: 'Masa kartını her masaya tek tek yerleştir, menü tutucusunun arkasında kalmasın.',
  tip2: 'Paket siparişlerin üstüne yapıştır — taşınırken müşterinin gözünden kaçmaz.',
  tip3: 'Karşılama tahtasına yapıştır + yan tarafına "Buradan bir saniyede paylaş" yaz.',
  tip4: 'Tasarımdan kontrast düşükse QR\'ı koyu tasarımla yeniden indir; %20 daha okunur.',
  cta: 'QR\'ı yeniden indir →',
};

const QR_NO_SCANS_REMINDER_EN: FlatCopy = {
  eyebrow: 'Activation · No scans',
  title: 'Your QR is',
  titleAccent: 'silent',
  intro:
    'It\'s been ${daysSinceQr} days since you created the QR and not a single scan. Likely a quick fix in placement or design.',
  tipsEyebrow: '4 quick ideas',
  tip1: 'Place a table card on each table, not hidden behind the menu stand.',
  tip2: 'Stick it on every takeaway package — visible during transport.',
  tip3: 'Mount it on your welcome board with "Share your stay in one second" beside it.',
  tip4: 'Low contrast? Re-download in the dark variant — typically +20% scanability.',
  cta: 'Re-download QR →',
};

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
  action3: 'Memnun müşterilerden Google yorumu iste — yeni 5\'ler ortalamayı hızlı toparlar.',
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
  action3: 'Ask satisfied customers for a Google review — fresh 5-stars rebalance the average quickly.',
};

const FIRST_REPLY_CELEBRATION_TR: FlatCopy = {
  eyebrow: 'Reputation OS · İlk yanıt',
  title: 'İlk Google',
  titleAccent: 'yanıtın gitti',
  intro:
    'Bravo, ${restaurantName} için ilk Google yorum yanıtını gönderdin. Yanıtlanan yorumlar yanıtlanmayanlara göre %33 daha fazla yeni müşteriye dönüşür (Google internal data).',
  habitTitle: 'Sıradaki refleks',
  habitBody:
    'Her sabah 5 dakika ayır: yeni gelen yorumları tara, 5 puanlara teşekkür et, 1-3 puanlara önce dinle sonra çöz yaklaşımıyla yaz.',
  cta: 'Yorum panelini aç →',
  note: 'Pulse AI tonu uyacak şekilde taslakları otomatik hazırlar. Onayla + minik dokunuş + gönder; 60 saniyede biten bir refleks.',
};

const FIRST_REPLY_CELEBRATION_EN: FlatCopy = {
  eyebrow: 'Reputation OS · First reply',
  title: 'Your first Google',
  titleAccent: 'reply is live',
  intro:
    'You just sent the first Google review reply for ${restaurantName}. Replied reviews convert new customers 33% better than unreplied ones (Google internal data).',
  habitTitle: 'The habit that follows',
  habitBody: 'Block 5 minutes every morning: scan new reviews, thank 5-stars, listen-then-fix the 1-3s.',
  cta: 'Open reviews panel →',
  note: 'Pulse AI drafts replies in your tone. Approve + tweak + send — a 60-second daily habit.',
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

const NEW_DEVICE_LOGIN_TR: FlatCopy = {
  eyebrow: 'Güvenlik · Yeni cihaz',
  title: 'Yeni cihazdan',
  titleAccent: 'giriş yapıldı',
  intro:
    'Hesabına daha önce görmediğimiz bir cihaz veya konumdan giriş yapıldı. Bu sen değilsen aşağıdaki adımları hemen uygula.',
  cardEyebrow: 'Giriş detayı',
  statusText: 'Aktif oturum · Yeni cihaz',
  metaTime: 'Giriş saati',
  metaDevice: 'Cihaz',
  metaLocation: 'Konum (IP /16)',
  metaAccount: 'Hesap',
  notYouTitle: 'Sen değil misin?',
  notYouBody: 'Şifreni hemen sıfırla ve diğer oturumlardan çıkış yap. Şüpheli bir durum varsa support@buaze.com\'a yaz.',
  notYouLink: 'Şifreyi sıfırla →',
};

const NEW_DEVICE_LOGIN_EN: FlatCopy = {
  eyebrow: 'Security · New device',
  title: 'New device',
  titleAccent: 'sign-in',
  intro:
    "Your account was just accessed from a device or location we haven't seen before. If this wasn't you, follow the steps below immediately.",
  cardEyebrow: 'Sign-in detail',
  statusText: 'Active session · New device',
  metaTime: 'Signed in at',
  metaDevice: 'Device',
  metaLocation: 'Location (IP /16)',
  metaAccount: 'Account',
  notYouTitle: "Wasn't you?",
  notYouBody: 'Reset your password immediately and sign out of other sessions. Email support@buaze.com if anything looks suspicious.',
  notYouLink: 'Reset password →',
};

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
  'inactive-reactivation': LIFECYCLE_INLINE_DEFAULTS['inactive-reactivation'],
  'customer-campaign': { tr: CUSTOMER_CAMPAIGN_TR, en: CUSTOMER_CAMPAIGN_EN },
  'owner-campaign-approved': { tr: OWNER_CAMPAIGN_APPROVED_TR, en: OWNER_CAMPAIGN_APPROVED_EN },
  'owner-campaign-rejected': { tr: OWNER_CAMPAIGN_REJECTED_TR, en: OWNER_CAMPAIGN_REJECTED_EN },
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
  // Wave B (CLAUDE.md §38.B) — 4 new template defaults registered.
  'password-changed': { tr: PASSWORD_CHANGED_TR, en: PASSWORD_CHANGED_EN },
  'team-member-joined': { tr: TEAM_MEMBER_JOINED_TR, en: TEAM_MEMBER_JOINED_EN },
  'team-member-removed': { tr: TEAM_MEMBER_REMOVED_TR, en: TEAM_MEMBER_REMOVED_EN },
  'first-feedback-celebration': {
    tr: FIRST_FEEDBACK_CELEBRATION_TR,
    en: FIRST_FEEDBACK_CELEBRATION_EN,
  },
  // Wave B4 (CLAUDE.md §38.193) — account deletion lifecycle defaults.
  'account-deletion-scheduled': {
    tr: ACCOUNT_DELETION_SCHEDULED_TR,
    en: ACCOUNT_DELETION_SCHEDULED_EN,
  },
  'account-deletion-canceled': {
    tr: ACCOUNT_DELETION_CANCELED_TR,
    en: ACCOUNT_DELETION_CANCELED_EN,
  },
  // Wave C (CLAUDE.md §38.194) — lifecycle expansion defaults.
  'qr-no-scans-reminder': { tr: QR_NO_SCANS_REMINDER_TR, en: QR_NO_SCANS_REMINDER_EN },
  'rating-drop-alert': { tr: RATING_DROP_ALERT_TR, en: RATING_DROP_ALERT_EN },
  'first-reply-celebration': { tr: FIRST_REPLY_CELEBRATION_TR, en: FIRST_REPLY_CELEBRATION_EN },
  'data-export-confirmation': { tr: DATA_EXPORT_CONFIRMATION_TR, en: DATA_EXPORT_CONFIRMATION_EN },
  // Wave D (CLAUDE.md §38.195) — new-device login security alert.
  'new-device-login': { tr: NEW_DEVICE_LOGIN_TR, en: NEW_DEVICE_LOGIN_EN },
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
