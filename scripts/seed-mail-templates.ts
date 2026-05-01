/**
 * Idempotent seed for `mail_templates`. Loads the inline default copy from
 * each render function's source and upserts a row per (key, locale). Safe
 * to re-run after every schema/copy update — `upsert` on `(key, locale)`
 * unique pair overwrites existing rows.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts
 *
 * Note: the seed mirrors what's currently inside the template files. If
 * you want admin-edited content to survive a reseed, upgrade this script
 * to fetch existing content first and only fill missing fields. MVP keeps
 * it simple — operator should treat seed as "reset to code defaults".
 */

import { PrismaClient } from '@prisma/client';

type Copy = Record<string, unknown>;

const WELCOME_TR: Copy = {
  eyebrow: 'Hoş geldin · Sayı bir',
  titleSub: 'Şimdi başlıyoruz.',
  intro: 'Hesabını oluşturduğun için teşekkürler. Aşağıdaki 4 adımı tamamladığında masandaki ilk QR kod canlıya çıkmış olacak.',
  stepsEyebrow: 'Kurulum · 4 adım',
  nextLabel: 'Sıradaki',
  cta: 'Kuruluma devam et →',
  demoLink: 'Demo videoyu izle (2 dk)',
  resourcesEyebrow: 'İlk gün için',
};

const WELCOME_EN: Copy = {
  eyebrow: 'Welcome · Issue 1',
  titleSub: 'Now we begin.',
  intro: 'Thanks for joining Buaze. Once you finish these 4 steps, your first QR code goes live on a real table.',
  stepsEyebrow: 'Setup · 4 steps',
  nextLabel: 'Next',
  cta: 'Continue setup →',
  demoLink: 'Watch demo (2 min)',
  resourcesEyebrow: 'For your first day',
};

const NEWSLETTER_TR: Copy = {
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

const NEWSLETTER_EN: Copy = {
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

const TRIAL_ENDING_TR: Copy = {
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

const TRIAL_ENDING_EN: Copy = {
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
// Phase 2 templates (forgot-password / low-rating-alert / new-review /
// weekly-report / customer-reply). Inline default mirrors what the
// matching renderXxx() function ships with — keep these in sync when
// shipping new fields. KVKK-locked fields are seeded too (admin can't
// edit them, but the row keeps a known baseline).
// ───────────────────────────────────────────────────────────────────────

const FORGOT_PASSWORD_TR: Copy = {
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

const FORGOT_PASSWORD_EN: Copy = {
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

const LOW_RATING_ALERT_TR: Copy = {
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

const LOW_RATING_ALERT_EN: Copy = {
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

const NEW_REVIEW_TR: Copy = {
  eyebrow: 'Az önce geldi',
  titleSub: 'Hak ettin.',
  primaryCta: 'Teşekkür yaz →',
  secondaryCta: 'Google\'da paylaş',
  noComment: 'Yorum bırakılmadı.',
};

const NEW_REVIEW_EN: Copy = {
  eyebrow: 'Just now',
  titleSub: 'You earned it.',
  primaryCta: 'Write a thank-you →',
  secondaryCta: 'Share on Google',
  noComment: 'No comment left.',
};

const WEEKLY_REPORT_TR: Copy = {
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
};

const WEEKLY_REPORT_EN: Copy = {
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
};

const CUSTOMER_REPLY_TR: Copy = {
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

const CUSTOMER_REPLY_EN: Copy = {
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
// Phase 3 — form-confirmation 4-variant nested JSON. Top-level keys are
// formType variants (`contact / career / roi / newsletter`); inner values
// are the same flat string fields the editor exposes (subject, preheader,
// eyebrow, titleA, titleB, intro, formEyebrow, timelineEyebrow,
// sideEyebrowA, sideBodyA, sideCtaA, sideEyebrowB, sideBodyB, sideCtaB).
// timeline arrays stay in code (structural).
// ───────────────────────────────────────────────────────────────────────

const FORM_CONFIRMATION_TR = {
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

const FORM_CONFIRMATION_EN = {
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

// §22 davet akışı — verify-email gate (welcome'dan farklı: hesap oluşturma
// sonrası ZORUNLU onay maili). Locked field'lar `locked-fields.ts` tarafından
// admin override'dan korunur (statusText/notYouTitle/notYouBody) — tek
// kullanılan editlenebilir alanlar eyebrow/title/intro/cta.
const VERIFY_EMAIL_TR: Copy = {
  eyebrow: 'E-POSTA ONAYI',
  title: 'Hesabını birkaç',
  titleAccent: 'saniyede aç',
  intro: 'Merhaba <strong style="color:#0A0A0A;font-weight:500;">${firstName}</strong>. Buaze hesabını oluşturduğun için teşekkürler. Devam edebilmek için aşağıdaki butonla e-posta adresini onayla. Bağlantı 24 saat geçerli.',
  cardEyebrow: 'Tek kullanımlık link',
  cta: 'E-postamı onayla →',
};

const VERIFY_EMAIL_EN: Copy = {
  eyebrow: 'EMAIL VERIFICATION',
  title: 'Activate your account',
  titleAccent: 'in seconds',
  intro: 'Hi <strong style="color:#0A0A0A;font-weight:500;">${firstName}</strong>. Thanks for creating a Buaze account. To continue, confirm your email address with the button below. The link is valid for 24 hours.',
  cardEyebrow: 'One-time link',
  cta: 'Verify my email →',
};

// ROI calculator akışı — customer report + admin lead notification
// (CLAUDE.md ROI Parça A-E + bu PR Parça 4). Kritik pazarlama copy'si
// admin panelden edit edilebilir; runtime placeholder'lar
// (${restaurantName}, ${planLabel}, ${netGain}, ${roiMultiple}) substitusyonla
// dolar.
const ROI_CUSTOMER_REPORT_TR: Copy = {
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

const ROI_CUSTOMER_REPORT_EN: Copy = {
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

const ROI_ADMIN_NOTIFICATION_TR: Copy = {
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

const ROI_ADMIN_NOTIFICATION_EN: Copy = {
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

const SEEDS: Array<{ key: string; locale: string; content: Copy }> = [
  { key: 'welcome', locale: 'tr', content: WELCOME_TR },
  { key: 'welcome', locale: 'en', content: WELCOME_EN },
  { key: 'newsletter', locale: 'tr', content: NEWSLETTER_TR },
  { key: 'newsletter', locale: 'en', content: NEWSLETTER_EN },
  { key: 'trial-ending', locale: 'tr', content: TRIAL_ENDING_TR },
  { key: 'trial-ending', locale: 'en', content: TRIAL_ENDING_EN },
  { key: 'forgot-password', locale: 'tr', content: FORGOT_PASSWORD_TR },
  { key: 'forgot-password', locale: 'en', content: FORGOT_PASSWORD_EN },
  { key: 'low-rating-alert', locale: 'tr', content: LOW_RATING_ALERT_TR },
  { key: 'low-rating-alert', locale: 'en', content: LOW_RATING_ALERT_EN },
  { key: 'new-review', locale: 'tr', content: NEW_REVIEW_TR },
  { key: 'new-review', locale: 'en', content: NEW_REVIEW_EN },
  { key: 'weekly-report', locale: 'tr', content: WEEKLY_REPORT_TR },
  { key: 'weekly-report', locale: 'en', content: WEEKLY_REPORT_EN },
  { key: 'customer-reply', locale: 'tr', content: CUSTOMER_REPLY_TR },
  { key: 'customer-reply', locale: 'en', content: CUSTOMER_REPLY_EN },
  { key: 'form-confirmation', locale: 'tr', content: FORM_CONFIRMATION_TR },
  { key: 'form-confirmation', locale: 'en', content: FORM_CONFIRMATION_EN },
  { key: 'verify-email', locale: 'tr', content: VERIFY_EMAIL_TR },
  { key: 'verify-email', locale: 'en', content: VERIFY_EMAIL_EN },
  { key: 'roi-customer-report', locale: 'tr', content: ROI_CUSTOMER_REPORT_TR },
  { key: 'roi-customer-report', locale: 'en', content: ROI_CUSTOMER_REPORT_EN },
  { key: 'roi-admin-notification', locale: 'tr', content: ROI_ADMIN_NOTIFICATION_TR },
  { key: 'roi-admin-notification', locale: 'en', content: ROI_ADMIN_NOTIFICATION_EN },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    let upserted = 0;
    for (const row of SEEDS) {
      await prisma.mailTemplate.upsert({
        where: { key_locale: { key: row.key, locale: row.locale } },
        create: { key: row.key, locale: row.locale, content: row.content as object },
        update: { content: row.content as object },
      });
      upserted++;
      console.log(`[seed] upserted ${row.key}:${row.locale}`);
    }
    console.log(`[seed] done. ${upserted} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
