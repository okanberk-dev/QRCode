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

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'retail',
    industryLabel: isTr ? 'Perakende & Mağaza' : 'Retail & Store',
    serviceName: isTr ? 'Perakende & Mağaza İtibar Yönetimi' : 'Retail & Store Reputation Management',
    description: isTr
      ? "Müşteri kasadan çıkarken fişinin altındaki QR'ı tarar. Google ve Yandex'e yönlendirilir. Çok mağaza, tek panel."
      : 'Customers scan the QR under the receipt on the way out. Routed to Google and Yandex. Multi-store, one panel.',
  });

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — dark (1:1 .design/site/site-pages4.jsx:246-267) */}
      <section className="bg-[#0A0A0A] px-5 sm:px-10 pt-[60px] pb-10 sm:pt-20 text-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'SEKTÖR · PERAKENDE & MAĞAZA' : 'SECTOR · RETAIL & STORE'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-white"
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
            <p className="mt-[18px] max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#A3A3A3]">
              {isTr
                ? "Müşteri kasadan çıkarken fişinin altındaki QR'ı tarar. Google ve Yandex'e yönlendirilir. Çok mağaza, tek panel."
                : 'Customers scan the QR under their receipt on the way out — routed to Google and Yandex. Multi-store, one panel.'}
            </p>
            <div className="mt-6 flex flex-col gap-[10px] sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-[22px] py-[14px] text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#333] px-[22px] py-[14px] text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* IllusChart — exact SVG from .design/site/site-shared.jsx:242-267 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 260 220" className="h-auto w-full max-w-[260px]" aria-hidden>
              <rect x="20" y="20" width="220" height="170" rx="10" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
              {[60, 100, 140, 180].map((y) => (
                <line key={y} x1="20" y1={y} x2="240" y2={y} stroke="#EDEDED" strokeWidth="1" />
              ))}
              {([
                [45, 90],
                [80, 70],
                [115, 100],
                [150, 55],
                [185, 80],
              ] as const).map(([x, h], i) => (
                <rect
                  key={i}
                  x={x - 10}
                  y={180 - h}
                  width="20"
                  height={h}
                  fill={i === 3 ? '#C6F24E' : '#0A0A0A'}
                  rx="3"
                />
              ))}
              <path
                d="M45 110 L80 130 L115 90 L150 60 L185 80"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle cx="150" cy="60" r="10" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M150 60 L220 30 L255 30" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
              <rect x="200" y="5" width="60" height="24" rx="12" fill="#0A0A0A" />
              <text x="230" y="21" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#C6F24E" fontWeight="600">
                +184%
              </text>
              <rect x="30" y="30" width="90" height="10" rx="5" fill="#0A0A0A" />
              <rect x="30" y="44" width="60" height="6" rx="3" fill="#EDEDED" />
              <circle cx="230" cy="170" r="12" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              <path
                d="M215 200 Q230 185 245 200"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-2 gap-5 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bz-card p-5 sm:p-6"
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
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[14px] border border-[#EDEDED] bg-white p-6"
            >
              <h3
                className="text-[20px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
              >
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
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

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
