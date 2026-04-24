import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

const TITLE_TR = 'Google yorum politikaları 2026: yeni kurallar ve 7 ipucu';
const TITLE_EN = 'Google review policies 2026: the new rules and 7 tips';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? TITLE_TR : TITLE_EN;
  const description = isTr
    ? "Google 2026'da sahte yorum savaşını yoğunlaştırdı. İki algoritma güncellemesi işletmelerin puanını değiştirdi — ama organik akışı doğru kuran işletmeler için bu bir fırsat."
    : 'Google has intensified the fight against fake reviews in 2026. Two algorithm updates shifted business ratings — but for teams with an organic flow in place, this is an opportunity.';
  return {
    title: `${title} — Buaze Blog`,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/blog/google-2026`,
      languages: {
        tr: 'https://buaze.com/tr/blog/google-2026',
        en: 'https://buaze.com/en/blog/google-2026',
      },
    },
    openGraph: {
      type: 'article',
      url: `https://buaze.com/${locale}/blog/google-2026`,
      title,
      description,
    },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:BlogPostPage (lines 448-533).
 * Lime hero + 2-col body (article + sticky TOC/author sidebar).
 * Static route is matched ahead of the dynamic /blog/[slug] route.
 */
export default async function GoogleTwentyTwentySixPost({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const title = isTr ? TITLE_TR : TITLE_EN;

  const lead = isTr
    ? "Google 2026'da sahte yorum savaşını yoğunlaştırdı. İki algoritma güncellemesi işletmelerin puanını etkiledi — ama sistemi doğru kuran için bu bir fırsat."
    : 'Google has sharpened its stance on fake reviews in 2026. Two algorithm updates shifted business ratings — but for teams with the right setup, it opens a door.';

  const sections = isTr
    ? [
        {
          h: 'Neler değişti?',
          p: 'Google algoritması artık "aynı cihazdan gelen birden fazla yorum" ve "coğrafi eşleşme göstermeyen yorumlar" için daha sıkı filtreleme uyguluyor. Sahte yorum satın alanlar için yıkıcı; organik akışı kurmuş olanlar için ise rakipler arasında öne geçme fırsatı.',
        },
        {
          h: '1. QR tabanlı akış kurun',
          p: "Gerçek müşterinin bıraktığı yorum, Google'ın sensörlerinde şüpheli görünmez. QR ile yorum topladığınızda IP ve cihaz eşleşmesi zaten organiktir. Buaze bu eşleşmeyi tüm platformlarda izler.",
        },
        {
          h: '2. Yorum daveti zamanlaması',
          p: 'Ödeme anında veya hizmet bitiminden 1-4 saat sonra gönderilen davetler en yüksek dönüşümü sağlıyor. 24 saat sonrasına sarkan davetlerde oran yarıya düşüyor.',
        },
        {
          h: '3. Teşvik yasağına dikkat',
          p: "\"Google'da yorum bırakana indirim\" yasak — Google politika ihlali. Yorum silinir, hesap işaretlenir. Teşvik hiçbir zaman platformun yorum linkiyle doğrudan bağlanmamalı.",
        },
      ]
    : [
        {
          h: 'What changed?',
          p: "Google's algorithm now applies stricter filtering to \"multiple reviews from the same device\" and \"reviews without a geographic match.\" Devastating for buyers of fake reviews; an edge for teams built around organic collection.",
        },
        {
          h: '1. Build a QR-based flow',
          p: "Real customers leaving reviews don't look suspicious to Google's sensors. When you collect through QR, the IP and device signals are already organic. Buaze tracks these signals across every platform.",
        },
        {
          h: '2. Time your review invite',
          p: 'Invites sent at checkout, or 1-4 hours after service, produce the highest conversion. Delay past 24 hours and the rate halves.',
        },
        {
          h: '3. Mind the incentive rule',
          p: '"Discount for a Google review" is a Google policy violation — reviews get removed, accounts flagged. Never tie an incentive directly to a platform review link.',
        },
      ];

  const tocItems = isTr
    ? ['Neler değişti?', '1. QR tabanlı akış', '2. Davet zamanlaması', '3. Teşvik yasağı']
    : ['What changed?', '1. QR-based flow', '2. Invite timing', '3. Incentive rule'];

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Lime Hero */}
      <section className="relative overflow-hidden bg-[#C6F24E] px-6 sm:px-10 pt-16 pb-20 sm:pt-20 sm:pb-24">
        <svg
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-6 opacity-[0.15] sm:right-12"
          viewBox="0 0 300 200"
          width="400"
          height="260"
        >
          <path
            d="M0 150 L40 120 L80 140 L120 90 L160 100 L200 60 L240 80 L280 40 L300 30"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="200" cy="60" r="12" fill="#0A0A0A" />
          <circle cx="280" cy="40" r="8" fill="#0A0A0A" />
        </svg>
        <div className="relative mx-auto max-w-[900px]">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {isTr ? 'STRATEJİ · 8 DK OKUMA' : 'STRATEGY · 8 MIN READ'}
          </span>
          <h1
            className="mt-3.5 text-[36px] sm:text-[48px] lg:text-[56px] font-medium leading-[1] tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h1>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                EK
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#0A0A0A]">Emre Kaya</div>
                <div className="text-[12px] text-[#0A0A0A]/70">
                  {isTr ? 'Buaze · Kurucu' : 'Buaze · Founder'}
                </div>
              </div>
            </div>
            <span className="text-[12px] text-[#0A0A0A]/70">
              {isTr ? '14 Nisan 2026' : 'April 14, 2026'}
            </span>
          </div>
        </div>
      </section>

      {/* Body: article + sticky sidebar */}
      <section className="px-6 sm:px-10 py-14 sm:py-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1fr_260px] lg:gap-12">
          <article>
            <p className="mb-8 text-[18px] leading-[1.6] text-[#0A0A0A] sm:text-[20px]">{lead}</p>

            {sections.map((s) => (
              <div key={s.h} className="mb-8">
                <h2
                  className="mb-3 text-[24px] sm:text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {s.h}
                </h2>
                <p className="text-[16px] leading-[1.7] text-[#525252]">{s.p}</p>
              </div>
            ))}

            {/* Dark CTA box */}
            <div className="mt-10 rounded-2xl bg-[#0A0A0A] p-7 text-white sm:p-8">
              <h3
                className="text-[24px] sm:text-[28px] font-medium leading-[1.15] tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr
                  ? 'Google politikalarına uyumlu büyümeye hazır mısınız?'
                  : 'Ready to grow the Google-compliant way?'}
              </h3>
              <p className="mt-2 text-[14px] text-[#A3A3A3]">
                {isTr
                  ? 'Buaze akışın her adımını denetler. 14 gün ücretsiz başlayın.'
                  : 'Buaze audits every step of the flow. Start your 14-day free trial.'}
              </p>
              <Link
                href={`${base}/auth/register`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#C6F24E] px-5 py-3 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </article>

          {/* Sticky sidebar: TOC + Author */}
          <aside className="order-first lg:order-last">
            <div className="lg:sticky lg:top-20 space-y-6">
              {/* TOC */}
              <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
                <p
                  className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-[#737373]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {isTr ? 'İÇERİK' : 'CONTENTS'}
                </p>
                <ul>
                  {tocItems.map((tocText, i) => (
                    <li
                      key={tocText}
                      className={`border-l-2 py-1.5 pl-2.5 text-[13px] ${
                        i === 0
                          ? 'border-[#C6F24E] font-semibold text-[#0A0A0A]'
                          : 'border-transparent text-[#525252]'
                      }`}
                    >
                      {tocText}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Author card */}
              <div className="rounded-xl bg-[#EAF9B8] p-5">
                <p
                  className="mb-2.5 text-[10px] font-semibold tracking-[0.14em] text-[#737373]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {isTr ? 'YAZAR' : 'AUTHOR'}
                </p>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    EK
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">Emre Kaya</div>
                    <div className="text-[12px] text-[#525252]">
                      {isTr ? 'Buaze · Kurucu' : 'Buaze · Founder'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
