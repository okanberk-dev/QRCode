import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildSolutionSchema } from '@/lib/solution-schema';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Restoran & Kafe İtibar Yönetimi — Buaze'
      : 'Restaurant & Café Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Masaya QR koy, ilk hafta Google yorumun 10 kat artsın. Her misafire Google bağlantısı sunulur; isteyen ek olarak işletmene özel geri bildirim de gönderir.'
      : 'Put a QR on the table and watch Google reviews multiply 10x in the first week. Every guest gets the Google review link; private feedback is an optional extra step.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/restaurants`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/restaurants',
        en: 'https://buaze.com/en/solutions/restaurants',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/restaurants` },
  };
}

/**
 * 1:1 with .design/site/site-marketing.jsx:SolutionPage (lines 393-481).
 * Light gray hero + table/QR/coffee/plate/star-bubble SVG + 3-stat grid
 * + 4-use-case grid.
 */
export default async function RestaurantsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { k: '+184%', l: 'Organik Google yorum artışı', d: 'İlk 90 gün ortalaması' },
        { k: '4.8 / 5', l: 'Ortalama Google puanı', d: 'Buaze kullanıcılarının' },
        { k: '12 dk', l: 'Ortalama yanıt süresi', d: 'Takım atama sonrası' },
      ]
    : [
        { k: '+184%', l: 'Organic Google review growth', d: 'First 90-day average' },
        { k: '4.8 / 5', l: 'Avg. Google rating', d: 'Across Buaze customers' },
        { k: '12 min', l: 'Avg. reply time', d: 'After team assignment' },
      ];

  const useCases = isTr
    ? [
        { t: 'Masa QR', d: 'Her masa için özel kod — masa numarasıyla eşleştir.' },
        { t: 'Fatura QR', d: 'Fiş altına kod bas, ödeme sonrası yorum.' },
        { t: 'Kapıda veda', d: 'Kapıdaki stand, çıkışta son dokunuş.' },
        { t: 'Paket siparişte', d: "Pakete sticker'lı kart; evde yorum bırakır." },
      ]
    : [
        { t: 'Table QR', d: 'One code per table — maps to the table number.' },
        { t: 'Receipt QR', d: 'Print the code at the bottom of the bill.' },
        { t: 'Door farewell', d: 'A stand by the exit — the last-touch moment.' },
        { t: 'Inside packaging', d: 'A stickered card in the bag; review from home.' },
      ];

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'restaurants',
    industryLabel: isTr ? 'Restoran & Kafe' : 'Restaurant & Café',
    serviceName: isTr ? 'Restoran & Kafe İtibar Yönetimi' : 'Restaurant & Café Reputation Management',
    description: isTr
      ? 'Masaya QR koy, ilk hafta Google yorumun 10 kat artsın. Her misafire Google bağlantısı sunulur; isteyen ek olarak işletmene özel geri bildirim de gönderir.'
      : 'Put a QR on the table and watch Google reviews multiply 10x in the first week. Every guest gets the Google review link; private feedback is an optional extra step.',
  });

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — light gray bg, 2-column */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow font-semibold text-[#C6F24E]">
              {isTr ? 'ÇÖZÜM · RESTORAN & KAFE' : 'SOLUTION · RESTAURANT & CAFÉ'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Masanın sesi,
                  <br />
                  Google&apos;da.
                </>
              ) : (
                <>
                  Your table&apos;s voice,
                  <br />
                  on Google.
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[520px] text-[15px] leading-[1.55] text-[#525252] sm:text-[18px]">
              {isTr
                ? "Masaya QR koy, ilk hafta Google yorumun 10 kat artsın. Her misafire Google bağlantısını sunuyoruz; ek olarak isteyen, ekibine özel geri bildirim de gönderebiliyor. 1.200+ restoran ve kafe Buaze'i tercih ediyor."
                : 'Put a QR on the table and watch Google reviews grow 10x in the first week. Every guest gets the Google review link; anyone who wants to share private feedback with your team can do so in the same flow. Trusted by 1,200+ restaurants and cafés.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Ücretsiz dene' : 'Try for free'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* Restaurant table scene SVG (1:1 design) */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 320 280" className="h-auto w-full max-w-[420px]" aria-hidden>
              <ellipse cx="160" cy="180" rx="140" ry="30" fill="#0A0A0A" />
              <ellipse cx="160" cy="175" rx="140" ry="30" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M110 190 L100 260 M210 190 L220 260" stroke="#0A0A0A" strokeWidth="3" />
              <rect x="140" y="80" width="60" height="95" rx="4" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <rect x="148" y="90" width="44" height="44" fill="#0A0A0A" rx="3" />
              {[
                [0, 0], [1, 0], [3, 0], [0, 1], [2, 1], [3, 1],
                [0, 3], [2, 3], [1, 2], [3, 2],
              ].map(([x, y], i) => (
                <rect key={i} x={150 + x * 9} y={92 + y * 9} width="7" height="7" fill="#C6F24E" />
              ))}
              <text x="170" y="152" textAnchor="middle" fontFamily="Space Grotesk" fontSize="9" fontWeight="600" fill="#0A0A0A">
                {isTr ? 'TARA' : 'SCAN'}
              </text>
              <text x="170" y="164" textAnchor="middle" fontFamily="Space Grotesk" fontSize="7" fill="#737373">
                buaze.com
              </text>
              <ellipse cx="70" cy="165" rx="20" ry="6" fill="#0A0A0A" />
              <path d="M55 160 L55 145 Q55 140 60 140 L80 140 Q85 140 85 145 L85 160 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M85 146 Q92 146 92 152 Q92 158 85 158" fill="none" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M62 132 Q65 125 68 132 M72 132 Q75 125 78 132" stroke="#A3A3A3" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <ellipse cx="250" cy="165" rx="30" ry="8" fill="#EDEDED" />
              <ellipse cx="250" cy="163" rx="30" ry="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <path
                d="M220 15 Q220 5 230 5 L290 5 Q300 5 300 15 L300 45 Q300 55 290 55 L260 55 L250 65 L250 55 L230 55 Q220 55 220 45 Z"
                fill="#C6F24E"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
              <text x="260" y="34" textAnchor="middle" fontFamily="Inter" fontSize="13" fontWeight="700" fill="#0A0A0A">
                ★★★★★
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-7">
              <div
                className="text-[48px] sm:text-[56px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.k}
              </div>
              <div className="mt-2.5 text-[15px] font-semibold text-[#0A0A0A]">{s.l}</div>
              <div className="mt-1 text-[12px] text-[#737373]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases — 4-col */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <h2
            className="text-[26px] sm:text-[42px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]"
          >
            {isTr
              ? 'Restoranın her noktasında, bir nabız.'
              : 'A pulse at every point in your restaurant.'}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => (
              <div
                key={u.t}
                className="flex flex-col gap-2.5 rounded-[12px] border border-[#EDEDED] p-[22px]"
              >
                <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
                  <path
                    d="M4 6 Q4 2 8 2 L24 2 Q28 2 28 6 L28 18 Q28 22 24 22 L12 22 L6 28 L6 22 Q4 22 4 18 Z"
                    fill="#C6F24E"
                    stroke="#0A0A0A"
                    strokeWidth="1.5"
                  />
                  <circle cx="16" cy="12" r="2" fill="#0A0A0A" />
                </svg>
                <h3
                  className="text-[18px] font-semibold text-[#0A0A0A]"
                >
                  {u.t}
                </h3>
                <p className="text-[13px] leading-[1.55] text-[#525252]">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
          >
            {isTr ? 'Her masa, bir fırsat.' : 'Every table, an opportunity.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · 2 dakikada kurulum'
              : '14-day free · No credit card · 2-minute setup'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
