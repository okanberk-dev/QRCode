import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Perakende & Mağaza İtibar Yönetimi — Buaze'
      : 'Retail & Store Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Müşteri kasadan çıkarken fişinin altındaki QR\'ı tarar. Google ve Yandex\'e yönlendirilir. Çok mağaza, tek panel.'
      : 'Customers scan the QR under the receipt on the way out. Routed to Google and Yandex. Multi-store, one panel.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/retail`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/retail',
        en: 'https://buaze.com/en/solutions/retail',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/retail` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:RetailSolutionPage (lines 246-292).
 * Dark hero + IllusChart + 4-stat grid + 3-feature grid.
 */
export default async function RetailSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '+210%', label: 'Yorum artışı (ilk 30 gün)' },
        { value: 'Sınırsız', label: 'Çok mağaza desteği' },
        { value: '%88', label: 'Google sıralama iyileşme' },
        { value: '25sn', label: 'Ortalama yorum süresi' },
      ]
    : [
        { value: '+210%', label: 'Review lift (first 30 days)' },
        { value: 'Unlimited', label: 'Multi-store support' },
        { value: '88%', label: 'Google rank improvement' },
        { value: '25s', label: 'Avg. review time' },
      ];

  const features = isTr
    ? [
        {
          title: 'Fiş QR entegrasyonu',
          desc: 'POS sistemine plug-in veya ERP\'den API ile fiş altına otomatik QR basılır.',
        },
        {
          title: 'Mağaza bazlı analiz',
          desc: 'Zincir genelinde en iyi/en kötü mağazayı karşılaştır. Bölge yöneticisine haftalık özet.',
        },
        {
          title: 'Sezonsal kampanya',
          desc: '"Yılbaşı indirimi" gibi dönemsel kampanyalarda anlık yorum takibi.',
        },
      ]
    : [
        {
          title: 'Receipt QR integration',
          desc: 'POS plug-in or ERP API auto-prints the QR at the bottom of every receipt.',
        },
        {
          title: 'Per-store analytics',
          desc: 'Compare best- and worst-performing stores across the chain. Weekly digest to regional managers.',
        },
        {
          title: 'Seasonal campaigns',
          desc: 'Real-time review tracking during seasonal pushes like year-end sales.',
        },
      ];

  return (
    <div className="min-h-screen bg-white pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero — dark */}
      <section className="relative overflow-hidden bg-[#0A0A0A] px-6 sm:px-10 py-16 sm:py-20 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#C6F24E]/10 blur-[140px]"
        />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'SEKTÖR · PERAKENDE & MAĞAZA' : 'SECTOR · RETAIL & STORE'}
            </span>
            <h1
              className="mt-3 text-[44px] sm:text-[56px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? (
                <>
                  Fiş altına koy,
                  <br />
                  yorum
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5 text-[#0A0A0A]">
                    patlasın.
                  </span>
                </>
              ) : (
                <>
                  Put it under the
                  <br />
                  receipt —
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5 text-[#0A0A0A]">
                    reviews boom.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[16px] leading-[1.6] text-white/70">
              {isTr
                ? "Müşteri kasadan çıkarken fişinin altındaki QR'ı tarar. Google ve Yandex'e yönlendirilir. Çok mağaza, tek panel."
                : 'Customers scan the QR under their receipt on the way out — routed to Google and Yandex. Multi-store, one panel.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 py-3.5 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* IllusChart — minimal bar chart SVG */}
          <div className="flex justify-center lg:justify-end">
            <svg
              viewBox="0 0 260 260"
              className="h-auto w-full max-w-[260px]"
              aria-hidden
            >
              <rect x="0" y="0" width="260" height="260" rx="24" fill="#141414" />
              <g>
                {[
                  { x: 30, h: 60, c: '#333' },
                  { x: 65, h: 95, c: '#333' },
                  { x: 100, h: 130, c: '#333' },
                  { x: 135, h: 160, c: '#C6F24E' },
                  { x: 170, h: 185, c: '#C6F24E' },
                  { x: 205, h: 215, c: '#C6F24E' },
                ].map((b) => (
                  <rect
                    key={b.x}
                    x={b.x}
                    y={240 - b.h}
                    width="24"
                    height={b.h}
                    rx="4"
                    fill={b.c}
                  />
                ))}
                <path
                  d="M 30 180 L 65 160 L 100 130 L 135 100 L 170 75 L 205 55"
                  fill="none"
                  stroke="#C6F24E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="205" cy="55" r="6" fill="#C6F24E" />
              </g>
              <text
                x="30"
                y="40"
                fontFamily="JetBrains Mono, monospace"
                fontSize="10"
                letterSpacing="2"
                fill="#A3A3A3"
              >
                REVIEWS · 30D
              </text>
              <text
                x="200"
                y="40"
                fontFamily="Space Grotesk, sans-serif"
                fontSize="18"
                fontWeight="500"
                fill="#C6F24E"
                textAnchor="end"
              >
                +210%
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 sm:px-10 py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-2 gap-5 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6"
            >
              <div
                className="text-[32px] sm:text-[36px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.value}
              </div>
              <div className="pulse-eyebrow mt-2 text-[#737373]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3-feature grid */}
      <section className="px-6 sm:px-10 pb-20 sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[14px] border border-[#EDEDED] bg-white p-6"
            >
              <h3
                className="text-[20px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Mağaza ağınızı itibara çevirin.' : 'Turn your store network into reputation.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · 5 dakikada kurulum'
              : '14-day free · No credit card · 5-minute setup'}
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

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
