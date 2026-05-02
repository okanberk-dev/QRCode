import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const VALID = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Buaze Pulse AI — Yanıtları saniyelerde yaz | Buaze'
      : 'Buaze Pulse AI — Draft replies in seconds | Buaze';
  const description =
    locale === 'tr'
      ? 'Buaze Pulse AI, her yoruma puan ve tonuna göre özel Türkçe yanıt taslağı üretir. Onay kontrollü, hızlı yanıt akışı.'
      : 'Buaze Pulse AI drafts rating-aware replies for every review. Approval-led, fast response flow.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/features/pulse-ai`,
      languages: {
        tr: 'https://buaze.com/tr/features/pulse-ai',
        en: 'https://buaze.com/en/features/pulse-ai',
      },
    },
  };
}

export default async function PulseAiPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID.includes(locale as typeof VALID[number])) notFound();
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const cards = isTr
    ? [
        {
          title: 'Puan-farkında taslaklar',
          body: 'Müşterinin yıldızına göre ton değişir — 5 yıldıza teşekkür + geri davet, 1-2 yıldıza özür + somut düzeltme. Ücretsiz ikram önermez (platform kuralları).',
        },
        {
          title: 'TR ve EN, saniyeler içinde',
          body: 'Restoran adı, konum, yorum metni ve geçmiş sipariş bağlamı birlikte okunur; Buaze Pulse AI ortalama 1-2 saniyede taslak üretir.',
        },
        {
          title: 'Düzenle & gönder',
          body: 'Taslak doldurulur, sen onaylarsın. İstersen tek tıkla gönder, istersen ayarla. Buaze Pulse AI hiçbir zaman senin yerine publish yapmaz.',
        },
        {
          title: 'Fallback ile güvende',
          body: 'Pulse AI geçici olarak yanıt vermezse sistem otomatik olarak deterministik şablona düşer — yanıt kutun asla boş kalmaz.',
        },
      ]
    : [
        {
          title: 'Rating-aware drafts',
          body: "Tone changes with the star — 5★ gets a thank-you + invite back; 1–2★ gets an apology + concrete fix. Never offers free items (platform rules).",
        },
        {
          title: 'TR and EN, in seconds',
          body: 'Business name, location, review text and order context are read together; Buaze Pulse AI drafts a reply in 1-2 seconds on average.',
        },
        {
          title: 'Edit & send',
          body: 'The draft fills in; you approve. One-click send, or tweak first. Buaze Pulse AI never publishes without you.',
        },
        {
          title: 'Safe fallback',
          body: 'Temporary Pulse AI hiccup? The system falls back to a deterministic template — your reply box never stays empty.',
        },
      ];

  const exampleReview = isTr
    ? {
        name: 'Mert D.',
        stars: 2,
        text:
          'Yemek güzeldi ama servis çok yavaştı. Ana yemek 40 dakikayı geçtikten sonra geldi, bir daha gelir miyim emin değilim.',
      }
    : {
        name: 'Mark D.',
        stars: 2,
        text:
          'Food was decent but service was painfully slow — the main took over 40 minutes. Not sure I\'d return.',
      };

  const exampleReply = isTr
    ? 'Merhaba Mert, 40 dakikalık bekleyiş için özür dileriz — ana yemekler için standart hedefimiz 18 dakika. Aynı akşam servis sorumlumuzla değerlendirdik ve mutfak-salon koordinasyonunda bir iyileştirme planı çıkardık. Bir sonraki ziyaretinde şef özel olarak ilgilenmek ister — rezervasyonda adımı hatırlatman yeterli.'
    : "Hi Mark, we're sorry about the 40-minute wait — our standard target for mains is 18 minutes. We reviewed the service that evening and drew up a kitchen-to-floor coordination fix the same night. On your next visit our head chef would like to look after you personally — just mention my name at booking.";

  const canonicalUrl = `https://buaze.com/${locale}/features/pulse-ai`;
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Buaze Pulse AI',
    description: isTr
      ? 'Yorumlara saniyeler içinde markaya özel taslak yanıt üreten Buaze\'nin AI yanıt asistanı.'
      : "Buaze's AI reply copilot — generates brand-aligned draft responses to reviews in seconds.",
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: isTr ? 'Yorum yönetimi' : 'Review management',
    operatingSystem: 'Web',
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    url: canonicalUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TRY',
      description: isTr
        ? 'Buaze planlarına dahil — ek ücret yok.'
        : 'Included with Buaze plans — no add-on fee.',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      url: 'https://buaze.com',
      logo: { '@type': 'ImageObject', url: 'https://buaze.com/favicon.svg' },
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://buaze.com/${locale}/features` },
      { '@type': 'ListItem', position: 3, name: 'Buaze Pulse AI', item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — dark, dual CTA, live draft mockup (1:1 with .design/site/site-pages4.jsx:FeatureAIPage) */}
      <section className="relative overflow-hidden bg-[#0A0A0A] px-6 sm:px-10 py-20 sm:py-24 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[#C6F24E]/10 blur-[140px]"
        />
        <div className="relative mx-auto max-w-[1200px] grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-3 py-1.5">
              <Sparkles size={12} className="text-[#C6F24E]" />
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'YENİ · BUAZE PULSE AI v2.4' : 'NEW · BUAZE PULSE AI v2.4'}
              </span>
            </div>
            <h1
              className="mt-5 text-[40px] sm:text-[60px] md:text-[48px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-white"
            >
              {isTr ? (
                <>
                  Her yoruma{' '}
                  <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                    30 sn&apos;de
                  </span>{' '}
                  mükemmel yanıt.
                </>
              ) : (
                <>
                  Perfect reply to every review in{' '}
                  <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                    30s
                  </span>
                  .
                </>
              )}
            </h1>
            <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
              {isTr
                ? 'Buaze Pulse AI markanızın sesini öğrenir; puanı, yorum tonunu ve geçmiş sipariş bağlamını dikkate alarak 30 saniye içinde kişiselleştirilmiş bir yanıt taslağı üretir. Onay sizde kalır.'
                : 'Buaze Pulse AI learns your brand voice; it reads the rating, tone and order context to draft a personalised reply in 30 seconds. You stay in control.'}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 py-3 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
              >
                {isTr ? 'Pulse AI\'ı dene' : 'Try Pulse AI'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/how-it-works`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
              >
                {isTr ? 'Nasıl çalışır?' : 'How it works?'}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
              {(isTr
                ? ['Growth planda dahil', 'Aylık 1.000 öneri', 'TR + EN dil desteği']
                : ['Included on Growth', '1,000 drafts / mo', 'TR + EN output']
              ).map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check size={13} className="text-[#C6F24E]" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Live demo mockup — static but feels alive */}
          <div className="relative">
            <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.18)] sm:p-6">
              {/* Incoming review */}
              <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-white">
                      {exampleReview.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">{exampleReview.name}</p>
                      <p className="pulse-eyebrow text-[#737373]">{isTr ? 'GOOGLE · BUGÜN' : 'GOOGLE · TODAY'}</p>
                    </div>
                  </div>
                  <span className="pulse-eyebrow rounded bg-[#0A0A0A] px-1.5 py-0.5 text-[#C6F24E]">
                    {'★'.repeat(exampleReview.stars)}
                    {'☆'.repeat(5 - exampleReview.stars)}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-[1.6] text-[#525252]">{exampleReview.text}</p>
              </div>

              {/* Buaze Pulse AI response */}
              <div className="mt-3 rounded-xl border border-[#C6F24E] bg-[#0A0A0A] p-4 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-[#C6F24E]" />
                  <p className="pulse-eyebrow text-[#C6F24E]">
                    {isTr ? 'BUAZE PULSE AI ÖNERİSİ' : 'BUAZE PULSE AI DRAFT'}
                  </p>
                </div>
                <p className="mt-2.5 text-[13px] leading-[1.65] text-white/85">{exampleReply}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-2 text-[12px] font-semibold text-[#0A0A0A]"
                  >
                    {isTr ? 'Gönder' : 'Send'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-2 text-[12px] font-medium text-white"
                  >
                    {isTr ? 'Düzenle' : 'Edit'}
                  </button>
                </div>
              </div>
            </div>
            <span className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1 text-[11px] font-semibold text-[#0A0A0A]">
              ⚡ 1.4s
            </span>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 sm:px-10 py-16 sm:py-20 bg-[#FAFAFA] border-y border-[#EDEDED]">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[640px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'NASIL ÇALIŞIR' : 'HOW IT WORKS'}
            </span>
            <h2 className="mt-3 text-[32px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A] sm:text-[42px]">
              {isTr ? 'Doğru taslak, ilk seferde.' : 'The right draft, first time.'}
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => (
              <article
                key={c.title}
                className="rounded-2xl border border-[#EDEDED] bg-white p-6"
              >
                <span className="pulse-eyebrow text-[#C6F24E] bg-[#0A0A0A] inline-block rounded px-2 py-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3
                  className="mt-4 text-[18px] font-semibold leading-tight text-[#0A0A0A]"
                >
                  {c.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-[#525252]">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Spec row */}
      <section className="px-6 sm:px-10 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              l: isTr ? 'MODEL' : 'MODEL',
              v: 'Pulse AI',
              sub: isTr ? 'Buaze yanıt motoru' : 'Buaze reply engine',
            },
            {
              l: isTr ? 'ORTALAMA SÜRE' : 'AVG LATENCY',
              v: '1.4s',
              sub: isTr ? 'İlk token ≤ 400ms' : 'First token ≤ 400ms',
            },
            {
              l: isTr ? 'FİYAT / ÖNERİ' : 'COST / DRAFT',
              v: '~$0.0001',
              sub: isTr ? '10.000 öneri ≈ $1' : '10,000 drafts ≈ $1',
            },
          ].map((k) => (
            <div key={k.l} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
              <p className="pulse-eyebrow text-[#737373]">{k.l}</p>
              <p
                className="mt-2 text-[28px] sm:text-[36px] font-medium leading-none tracking-tight text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {k.v}
              </p>
              <p className="mt-2 text-[12px] text-[#525252]">{k.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#C6F24E] px-6 sm:px-10 py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="text-[36px] font-medium tracking-[-0.03em] text-[#0A0A0A] sm:text-[48px]">
            {isTr ? 'Bugün başla, yarın ilk yanıtını gönder.' : 'Start today, send your first reply tomorrow.'}
          </h2>
          <p className="mt-3 text-[15px] text-[#0A0A0A]/80 sm:text-[17px]">
            {isTr
              ? 'Buaze Pulse AI Growth planın bir parçası — 14 gün ücretsiz dene.'
              : 'Buaze Pulse AI is part of the Growth plan — free for 14 days.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Ücretsiz dene' : 'Try free'}
              <ArrowRight size={16} />
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0A0A0A] bg-transparent px-7 py-3.5 text-[15px] font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Plan detayları' : 'Plan details'}
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
