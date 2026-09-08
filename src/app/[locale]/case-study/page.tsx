import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';

const VALID_LOCALES = ['tr', 'en'] as const;

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

type CaseStudyStat = {
  label: { tr: string; en: string };
  value: string;
};

type CaseStudyCard = {
  slug: string;
  brand: string;
  sector: string;
  sectorEn: string | null;
  location: string;
  heroImage: string;
  heroTr: string;
  heroEn: string;
  stats: unknown;
};

const FALLBACK_CASES: CaseStudyCard[] = [
  {
    slug: 'pizza-locale',
    brand: 'Pizza Locale',
    sector: 'Restoran zinciri',
    sectorEn: 'Restaurant chain',
    location: '12 şube',
    heroImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1400&h=900',
    heroTr:
      'Pizza Locale, şube bazlı QR geri bildirim akışıyla yorum operasyonunu standartlaştırdı; merkezi ekip her lokasyondaki servis sinyalini tek panelden takip etmeye başladı.',
    heroEn:
      'Pizza Locale standardized branch-level QR feedback and gave the central team one dashboard for service signals across every location.',
    stats: [
      { value: '+420%', label: { tr: 'geri bildirim artışı', en: 'feedback lift' } },
      { value: '4dk', label: { tr: 'yanıt süresi', en: 'response time' } },
      { value: '12', label: { tr: 'aktif şube', en: 'active branches' } },
    ],
  },
];

async function getPublishedCaseStudies(): Promise<CaseStudyCard[]> {
  try {
    const studies = await prisma.caseStudy.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true,
        brand: true,
        sector: true,
        sectorEn: true,
        location: true,
        heroImage: true,
        heroTr: true,
        heroEn: true,
        stats: true,
      },
    });

    if (studies.length > 0) return studies;
  } catch {
    // Marketing pages should still render if the optional case-study table is empty/unreachable.
  }

  return FALLBACK_CASES;
}

function getStats(stats: unknown): CaseStudyStat[] {
  return Array.isArray(stats) ? (stats as CaseStudyStat[]) : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Vaka Çalışmaları — Buaze müşteri kohortundan örnekler'
    : 'Case Studies — Examples from the Buaze customer cohort';
  const description = isTr
    ? 'Restoran, otel, klinik ve çok şubeli işletmelerin QR geri bildirim, Google yorum yönetimi ve itibar operasyonlarını nasıl büyüttüğünü inceleyin.'
    : 'Explore how restaurants, hotels, clinics and multi-location businesses grow QR feedback, Google review management and reputation operations.';

  return {
    metadataBase: new URL('https://www.buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/case-study`,
      languages: { tr: '/tr/case-study', en: '/en/case-study', 'x-default': '/tr/case-study' },
    },
    openGraph: {
      title,
      description,
      url: `https://www.buaze.com/${locale}/case-study`,
    },
  };
}

export default async function CaseStudiesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const studies = await getPublishedCaseStudies();
  const featured = studies[0];
  const featuredStats = getStats(featured.stats);

  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isTr ? 'Buaze vaka çalışmaları' : 'Buaze case studies',
    description: isTr
      ? 'QR geri bildirim ve Google yorum yönetimi vaka çalışmaları.'
      : 'QR feedback and Google review management case studies.',
    url: `https://www.buaze.com/${locale}/case-study`,
    inLanguage: isTr ? 'tr-TR' : 'en-US',
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      <section className="relative overflow-hidden border-b border-[#EDEDED] bg-[#FAFAFA] px-5 py-[56px] sm:px-10 sm:py-20">
        <div
          aria-hidden
          className="absolute left-[-10%] top-[-18%] h-[360px] w-[360px] rounded-full bg-[#C6F24E]/35 blur-[90px]"
        />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'VAKA ÇALIŞMALARI' : 'CASE STUDIES'}
            </span>
            <h1
              className="mt-5 text-[42px] font-medium leading-[0.95] tracking-[-0.045em] text-[#0A0A0A] sm:text-[72px] md:text-[56px] lg:text-[92px]"
            >
              {isTr ? 'Gerçek operasyonlardan ölçülebilir sonuçlar.' : 'Measurable outcomes from real operations.'}
            </h1>
          </div>
          <div className="max-w-[560px] lg:ml-auto">
            <p className="text-[17px] leading-[1.65] text-[#525252] sm:text-[20px]">
              {isTr
                ? 'Buaze vaka çalışmaları; QR geri bildirim, şube takibi, Google yorum yönetimi ve ekip yanıt süreçlerinin işletme içinde nasıl çalıştığını sade, ölçülebilir ve şeffaf şekilde anlatır.'
                : 'Buaze case studies show how QR feedback, branch tracking, Google review management and team response workflows operate inside businesses in a simple, measurable and transparent way.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                isTr ? 'Şeffaf akış' : 'Transparent flow',
                isTr ? 'QR geri bildirim' : 'QR feedback',
                isTr ? 'Şube yönetimi' : 'Branch operations',
              ].map((item) => (
                <span key={item} className="pulse-eyebrow rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[#737373]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-[56px] sm:px-10 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href={`${base}/case-study/${featured.slug}`}
            className="group grid overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white shadow-[0_28px_70px_-55px_rgba(10,10,10,0.55)] transition-transform duration-300 hover:-translate-y-1 lg:grid-cols-[0.95fr_1.05fr]"
          >
            <div className="relative min-h-[320px] overflow-hidden bg-[#0A0A0A]">
              <Image
                src={featured.heroImage}
                alt={featured.brand}
                fill
                sizes="(max-width: 1023px) 100vw, 50vw"
                priority
                className="object-cover opacity-[0.82] transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute bottom-5 left-5 rounded-full bg-[#C6F24E] px-4 py-2">
                <span className="pulse-eyebrow text-[#0A0A0A]">
                  {isTr ? 'ÖNE ÇIKAN VAKA' : 'FEATURED CASE'}
                </span>
              </div>
            </div>
            <div className="flex flex-col p-6 sm:p-8 lg:p-10">
              <p className="pulse-eyebrow text-[#737373]">
                {(isTr ? featured.sector : featured.sectorEn || featured.sector)} · {featured.location}
              </p>
              <h2
                className="mt-3 text-[34px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[52px]"
              >
                {featured.brand}
              </h2>
              <p className="mt-5 text-[15px] leading-[1.75] text-[#525252] sm:text-[17px]">
                {isTr ? featured.heroTr : featured.heroEn}
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {featuredStats.slice(0, 3).map((stat) => (
                  <div key={stat.value} className="border-t-2 border-[#0A0A0A] pt-3">
                    <div
                      className="text-[25px] font-medium leading-none tracking-[-0.03em] sm:text-[34px]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {stat.value}
                    </div>
                    <div className="pulse-eyebrow mt-2 text-[#737373]">
                      {stat.label[isTr ? 'tr' : 'en']}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-3 text-[14px] font-medium text-white">
                  {isTr ? 'Vakayı oku' : 'Read case'} <ArrowRight size={16} />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section aria-label={isTr ? 'Vaka çalışmaları sayıları' : 'Case study figures'} className="border-t border-[#EDEDED] bg-white px-5 py-[40px] sm:px-10 sm:py-14">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {[
            { value: String(studies.length), label: isTr ? 'YAYINDA VAKA' : 'PUBLISHED CASES' },
            { value: '5', label: isTr ? 'FARKLI SEKTÖR' : 'DIFFERENT INDUSTRIES' },
            { value: '+184% – 5×', label: isTr ? 'YORUM HACMİ ARTIŞI' : 'REVIEW VOLUME GAIN' },
            { value: isTr ? '12 dk' : '12 min', label: isTr ? 'ORT. İLK YANIT' : 'AVG. FIRST REPLY' },
          ].map((stat) => (
            <div key={stat.label} className="border-l-2 border-[#0A0A0A] pl-4 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-4">
              <div
                className="text-[28px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A] sm:text-[36px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {stat.value}
              </div>
              <div className="pulse-eyebrow mt-2 text-[#737373]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[56px] sm:px-10 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 max-w-[680px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'METODOLOJİMİZ' : 'OUR METHODOLOGY'}
            </span>
            <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A] sm:text-[36px]">
              {isTr ? 'Vaka çalışmalarını nasıl yazıyoruz?' : 'How we write a case study.'}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <TrendingUp size={18} />,
                title: isTr ? 'Büyüme metriği' : 'Growth metric',
                body: isTr
                  ? 'Her vaka; yorum hacmi, yanıt süresi veya şube performansı gibi ölçülebilir bir iş sonucuna bağlanır.'
                  : 'Every case connects to a measurable business result such as review volume, response time or branch performance.',
              },
              {
                icon: <ShieldCheck size={18} />,
                title: isTr ? 'Politika uyumu' : 'Policy alignment',
                body: isTr
                  ? 'Akışlar teşvik, seçici yorum isteme veya negatif yorumu caydırma üzerine kurulmaz; gerçek deneyim sinyali toplar.'
                  : 'Flows are not built on incentives, selective solicitation or discouraging negative reviews; they collect genuine experience signals.',
              },
              {
                icon: <BarChart3 size={18} />,
                title: isTr ? 'Operasyon görünürlüğü' : 'Operational visibility',
                body: isTr
                  ? 'Geri bildirim sadece pazarlama verisi değil; şube, ekip ve servis kalitesi için günlük yönetim girdisidir.'
                  : 'Feedback is not just marketing data; it becomes daily management input for branches, teams and service quality.',
              },
              {
                icon: <CheckCircle2 size={18} />,
                title: isTr ? 'Şeffaf veri' : 'Transparent data',
                body: isTr
                  ? 'Vakadaki sayılar Buaze panelinden alınır; aynı işletme bu metrikleri her ay kendi panelinde de görür.'
                  : 'The numbers come straight from the Buaze panel; the same metrics are visible to the business in its own dashboard every month.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
                  {item.icon}
                </div>
                <h3 className="mt-5 text-[20px] font-medium tracking-[-0.02em] text-[#0A0A0A]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-[#525252]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-[56px] sm:px-10 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'TÜM VAKALAR' : 'ALL CASES'}
              </span>
              <h2
                className="mt-3 text-[30px] font-medium leading-[1.04] tracking-[-0.035em] text-[#0A0A0A] sm:text-[46px]"
              >
                {isTr ? 'Sektöre göre inceleyin.' : 'Explore by industry.'}
              </h2>
            </div>
            <Link
              href={`${base}/customer-stories`}
              className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] px-5 py-3 text-[14px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A]"
            >
              {isTr ? 'Müşteri hikayeleri' : 'Customer stories'} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => {
              const stats = getStats(study.stats);
              const headlineStat = stats[0];
              return (
                <Link
                  key={study.slug}
                  href={`${base}/case-study/${study.slug}`}
                  className="group overflow-hidden rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] transition-colors hover:border-[#0A0A0A]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#0A0A0A]">
                    <Image
                      src={study.heroImage}
                      alt={study.brand}
                      fill
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      className="object-cover opacity-[0.88] transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <p className="pulse-eyebrow text-[#737373]">
                      {(isTr ? study.sector : study.sectorEn || study.sector)} · {study.location}
                    </p>
                    <h3
                      className="mt-3 text-[25px] font-medium tracking-[-0.025em] text-[#0A0A0A]"
                    >
                      {study.brand}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-[14px] leading-[1.65] text-[#525252]">
                      {isTr ? study.heroTr : study.heroEn}
                    </p>
                    {headlineStat && (
                      <div className="mt-5 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[13px] font-medium text-[#0A0A0A]">
                        <CheckCircle2 size={15} className="text-[#A8D62E]" />
                        <span>{headlineStat.value}</span>
                        <span className="pulse-eyebrow text-[#737373]">
                          {headlineStat.label[isTr ? 'tr' : 'en']}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] px-5 py-[56px] text-white sm:px-10 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'SIRADAKİ VAKA SİZ OLABİLİRSİNİZ' : 'YOUR STORY COULD BE NEXT'}
              </span>
              <h2 className="mt-4 max-w-[640px] text-[30px] font-medium leading-[1.05] tracking-[-0.035em] text-white sm:text-[44px]">
                {isTr ? 'Yorum operasyonunuzu ölçülebilir hâle getirelim.' : 'Let’s make your review operation measurable.'}
              </h2>
              <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-white/70 sm:text-[16px]">
                {isTr
                  ? 'Buaze ile başlangıç görüşmesi 25 dakika sürer; sektörünüzü, mevcut yorum hacminizi ve hedef puanınızı birlikte konuşur, vaka çalışmalarındaki akışın size nasıl uyacağını gösteririz.'
                  : 'A Buaze starter call takes 25 minutes; we discuss your industry, current review volume and target rating, then map how the case-study flow fits your operation.'}
              </p>
            </div>
            <ul className="space-y-3 text-[14px] leading-[1.6] text-white/85">
              {[
                isTr ? 'Sektörünüze en yakın vakayı bir arada inceleriz.' : 'We walk through the case closest to your industry together.',
                isTr ? 'Tek panelden şube ve ekip görünürlüğünü canlı gösteririz.' : 'We demo branch and team visibility from a single live panel.',
                isTr ? 'KVKK ve Google politikalarıyla uyumlu akış konusunda sorularınızı yanıtlarız.' : 'We answer questions on KVKK and Google-policy-aligned flows.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
                    <CheckCircle2 size={13} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="pulse-eyebrow text-white/60">
              {isTr ? 'YANIT 1 İŞ GÜNÜ İÇİNDE' : 'REPLY WITHIN 1 BUSINESS DAY'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`${base}/contact`}
                className="inline-flex items-center justify-center rounded-full bg-[#C6F24E] px-7 py-4 text-[15px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E]"
              >
                {isTr ? 'Görüşme planla' : 'Book a call'} →
              </Link>
              <Link
                href={`${base}/customer-stories`}
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-4 text-[15px] font-medium text-white/90 hover:border-white"
              >
                {isTr ? 'Müşteri hikayeleri' : 'Customer stories'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
