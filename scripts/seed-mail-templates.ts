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

const SEEDS: Array<{ key: string; locale: string; content: Copy }> = [
  { key: 'welcome', locale: 'tr', content: WELCOME_TR },
  { key: 'welcome', locale: 'en', content: WELCOME_EN },
  { key: 'newsletter', locale: 'tr', content: NEWSLETTER_TR },
  { key: 'newsletter', locale: 'en', content: NEWSLETTER_EN },
  { key: 'trial-ending', locale: 'tr', content: TRIAL_ENDING_TR },
  { key: 'trial-ending', locale: 'en', content: TRIAL_ENDING_EN },
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
