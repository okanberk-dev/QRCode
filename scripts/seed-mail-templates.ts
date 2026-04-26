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
  eyebrow: 'Canlı · Az önce geldi',
  titleSub: 'Hak ettin.',
  primaryCta: 'Teşekkür yaz →',
  secondaryCta: 'Google\'da paylaş',
  noComment: 'Yorum bırakılmadı.',
};

const NEW_REVIEW_EN: Copy = {
  eyebrow: 'Live · Just now',
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
