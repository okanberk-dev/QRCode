import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BarChart3, BrainCircuit, LineChart, MailCheck, MapPinned } from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { IllusChart } from '@/components/marketing/PulseIllustrations';
import { jsonLdString } from '@/lib/seo/json-ld';
import { getTranslations, type Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Analitik & Raporlar — Yorum trendlerini canlı izle | Buaze'
      : 'Analytics & Reports — Track review trends live | Buaze';
  const description =
    locale === 'tr'
      ? 'NPS, trend, platform kırılımı, konum karşılaştırması ve haftalık raporlarla müşteri memnuniyetini ölçün. AI analiz kapalıyken normal analitikler çalışmaya devam eder.'
      : 'Measure customer sentiment with NPS, trends, platform breakdowns, location comparison and weekly reports. Normal analytics continue when AI analysis is disabled.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/features/analytics-reports`,
      languages: {
        tr: '/tr/features/analytics-reports',
        en: '/en/features/analytics-reports',
        'x-default': '/en/features/analytics-reports',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/features/analytics-reports` },
  };
}

export default async function AnalyticsReportsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://buaze.com/${locale}/features/analytics-reports`;

  const metrics = isTr
    ? [
        { label: 'Ortalama puan', value: '4.7', delta: '+0.3' },
        { label: 'Yanıt oranı', value: '%92', delta: '+18%' },
        { label: 'Düşük puan', value: '8', delta: '-31%' },
      ]
    : [
        { label: 'Average rating', value: '4.7', delta: '+0.3' },
        { label: 'Reply rate', value: '92%', delta: '+18%' },
        { label: 'Low ratings', value: '8', delta: '-31%' },
      ];

  const benefits = isTr
    ? [
        { icon: BarChart3, title: 'Normal KPI akışı', body: 'Yorum sayısı, puan, dönüşüm, düşük puan ve yanıt hızı AI bağımlı değildir; her planda çalışır.' },
        { icon: BrainCircuit, title: 'AI tema çıkarımı', body: 'Yetki açıksa yorum metinlerinden şikayet ve övgü temaları çıkarılır; kapalıysa bölüm gizlenir.' },
        { icon: MapPinned, title: 'Konum ve platform kırılımı', body: 'Şube, platform ve zaman penceresine göre trendleri karşılaştır; hangi lokasyon geriliyor hemen gör.' },
        { icon: MailCheck, title: 'Haftalık özet', body: 'Pazartesi raporları normal metrikleri korur; AI insight sadece entitlement açıksa üretilir.' },
      ]
    : [
        { icon: BarChart3, title: 'Core KPIs', body: 'Review count, rating, conversion, low-rating volume and reply speed are not AI-dependent; they keep working on every plan.' },
        { icon: BrainCircuit, title: 'AI theme extraction', body: 'When enabled, review text is clustered into complaints and praise themes; when disabled, the section is hidden.' },
        { icon: MapPinned, title: 'Location and platform splits', body: 'Compare trends by branch, platform and window; see which location is slipping before it becomes a pattern.' },
        { icon: MailCheck, title: 'Weekly digest', body: 'Monday reports keep core metrics; AI insight is generated only when the entitlement is enabled.' },
      ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: isTr ? 'Buaze Analitik & Raporlar' : 'Buaze Analytics & Reports',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    url: canonicalUrl,
    description: isTr
      ? 'Yorum performansını ve müşteri memnuniyeti trendlerini izlemek için Buaze analitik modülü.'
      : 'Buaze analytics module for review performance and customer sentiment trends.',
    publisher: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://buaze.com/${locale}/features` },
      { '@type': 'ListItem', position: 3, name: isTr ? 'Analitik & Raporlar' : 'Analytics & Reports', item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">
        <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-14">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'ANALİTİK & RAPORLAR' : 'ANALYTICS & REPORTS'}
              </span>
              <h1 className="mt-4 max-w-[820px] text-[38px] font-medium leading-[0.96] tracking-[-0.035em] sm:text-[56px] lg:text-[70px]">
                {isTr ? 'Müşteri memnuniyetinin nabzını canlı izle.' : 'Watch customer sentiment pulse live.'}
              </h1>
              <p className="mt-5 max-w-[620px] text-[16px] leading-[1.7] text-[#525252] sm:text-[18px]">
                {isTr
                  ? 'Buaze analitikleri yorum hacmini, puan trendlerini, platform kırılımlarını ve yanıt hızını aynı ekranda gösterir. AI analiz yetkisi kapalı olsa bile normal analitikler çalışmaya devam eder.'
                  : 'Buaze analytics shows review volume, rating trends, platform breakdowns and reply speed in one surface. Normal analytics keep working even when AI analysis is disabled.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`${base}/auth/register`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#1A1A1A]">
                  {isTr ? 'Ücretsiz başla' : 'Start free'}
                  <ArrowRight size={16} />
                </Link>
                <Link href={`${base}/features/review-management`} className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#0A0A0A] px-6 py-3 text-[15px] font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white">
                  {isTr ? 'Yorum yönetimini gör' : 'See review management'}
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'CANLI RAPOR' : 'LIVE REPORT'}
                </span>
                <span className="rounded-full bg-[#C6F24E] px-3 py-1 text-[12px] font-semibold text-[#0A0A0A]">
                  {isTr ? '7 GÜN' : '7 DAYS'}
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-[#EDEDED] bg-white p-3">
                    <p className="text-[11px] leading-tight text-[#737373]">{metric.label}</p>
                    <p className="mt-2 text-[24px] font-semibold leading-none tracking-tight">{metric.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-[#16A34A]">{metric.delta}</p>
                  </div>
                ))}
              </div>
              <svg viewBox="0 0 420 150" className="mt-6 w-full" aria-hidden>
                <defs>
                  <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[35, 70, 105, 140].map((y) => (
                  <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="#EDEDED" />
                ))}
                <path d="M0 118 L52 112 L104 96 L156 78 L208 86 L260 58 L312 64 L364 36 L420 28 L420 150 L0 150 Z" fill="url(#analyticsArea)" />
                <path d="M0 118 L52 112 L104 96 L156 78 L208 86 L260 58 L312 64 L364 36 L420 28" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
                <circle cx="420" cy="28" r="6" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="3" />
              </svg>
              <div className="mt-5 flex justify-center">
                <IllusChart size={190} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <span className="pulse-eyebrow text-[#737373]">{isTr ? 'RAPORLAMA KATMANI' : 'REPORTING LAYER'}</span>
            <h2 className="mt-3 max-w-[760px] text-[30px] font-medium leading-[1.04] tracking-[-0.03em] sm:text-[46px]">
              {isTr ? 'AI kapalıyken bile karar aldıran metrikler.' : 'Decision-grade metrics, even when AI is off.'}
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-4 text-[18px] font-semibold leading-tight">{title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#525252]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#C6F24E] px-5 py-[60px] text-center sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <LineChart className="mx-auto mb-5 text-[#0A0A0A]" size={34} strokeWidth={2.2} />
            <h2 className="text-[30px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'Raporu aç, aksiyonu aynı gün al.' : 'Open the report, act the same day.'}
            </h2>
            <p className="mt-4 text-[15px] text-[#1A1A1A] sm:text-[17px]">
              {isTr ? '14 gün ücretsiz. Kredi kartı gerekmez.' : '14 days free. No credit card required.'}
            </p>
            <Link href={`${base}/auth/register`} className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-4 text-[15px] font-semibold text-white hover:bg-[#1A1A1A]">
              {isTr ? 'Hemen başla' : 'Get started'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
