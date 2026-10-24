import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Quote, TrendingUp } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

interface CaseStudyStat {
  label: { tr: string; en: string };
  value: string;
}
interface CaseStudyHighlight {
  tr: string;
  en: string;
}
interface CaseStudyPersonRole {
  tr: string;
  en: string;
}

const VALID = ['tr', 'en'] as const;

const CASE_STUDY_SELECT = {
  slug: true,
  brand: true,
  sector: true,
  sectorEn: true,
  location: true,
  heroImage: true,
  heroTr: true,
  heroEn: true,
  subtitleTr: true,
  subtitleEn: true,
  stats: true,
  highlights: true,
  quoteTr: true,
  quoteEn: true,
  personName: true,
  personRole: true,
  isPublished: true,
} as const;

function resolveSector(study: { sector: string; sectorEn: string | null }, isTr: boolean) {
  return isTr ? study.sector : study.sectorEn || study.sector;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const study = await prisma.caseStudy.findUnique({
    where: { slug },
    select: {
      brand: true,
      heroTr: true,
      heroEn: true,
      isPublished: true,
    },
  });
  if (!study || !study.isPublished) return { title: 'Case study', robots: { index: false, follow: true } };
  const isTr = locale === 'tr';
  const title = isTr ? `${study.brand} başarı hikayesi` : `${study.brand} customer story`;
  return {
    // Illustrative content, not a verified customer — kept out of Google's
    // index (and the sitemap) until real, permissioned stories replace it.
    robots: { index: false, follow: true },
    title,
    description: isTr ? study.heroTr : study.heroEn,
    alternates: {
      canonical: `https://www.buaze.com/${locale}/case-study/${slug}`,
      languages: {
        tr: `https://www.buaze.com/tr/case-study/${slug}`,
        en: `https://www.buaze.com/en/case-study/${slug}`,
        'x-default': `https://www.buaze.com/tr/case-study/${slug}`,
      },
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!VALID.includes(locale as typeof VALID[number])) notFound();

  const study = await prisma.caseStudy.findUnique({
    where: { slug },
    select: CASE_STUDY_SELECT,
  });
  if (!study || !study.isPublished) notFound();

  const others = await prisma.caseStudy.findMany({
    where: { isPublished: true, slug: { not: slug } },
    orderBy: { publishedAt: 'desc' },
    take: 2,
    select: {
      slug: true,
      brand: true,
      sector: true,
      sectorEn: true,
      location: true,
      heroTr: true,
      heroEn: true,
      stats: true,
    },
  });

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = (study.stats as unknown as CaseStudyStat[]) ?? [];
  const highlights = (study.highlights as unknown as CaseStudyHighlight[]) ?? [];
  const personRole = (study.personRole as unknown as CaseStudyPersonRole | null) ?? null;
  const heroText = isTr ? study.heroTr : study.heroEn;
  const subtitleText = isTr ? study.subtitleTr : study.subtitleEn;
  const quoteText = isTr ? study.quoteTr : study.quoteEn;

  const canonicalUrl = `https://www.buaze.com/${locale}/case-study/${slug}`;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Vaka Çalışmaları' : 'Case Studies', item: `https://www.buaze.com/${locale}/case-study` },
      { '@type': 'ListItem', position: 3, name: study.brand, item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Breadcrumb */}
      <div className="border-b border-[#EDEDED] bg-[#FAFAFA] px-5 py-4 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href={`${base}/case-study`}
            className="inline-flex items-center gap-1.5 pulse-eyebrow text-[#737373] hover:text-[#0A0A0A]"
          >
            <ArrowLeft size={12} />
            {isTr ? 'TÜM VAKA ÇALIŞMALARI' : 'ALL CASE STUDIES'}
          </Link>
        </div>
      </div>

      {/* Hero — magazine-style cover photo with text overlay */}
      <section className="relative">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-[3/1] overflow-hidden bg-[#0A0A0A]">
          <Image
            src={study.heroImage}
            alt={study.brand}
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-8 sm:px-10 sm:pb-12">
            <div className="mx-auto max-w-[1000px] text-white">
              <p className="pulse-eyebrow text-[#C6F24E]">
                {resolveSector(study, isTr)} · {study.location}
              </p>
              <h1
                className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em]"
              >
                {study.brand}
              </h1>
            </div>
          </div>
        </div>
        <div className="px-5 sm:px-10 py-[60px] sm:py-16">
          <div className="mx-auto max-w-[1000px]">
            <p className="max-w-[760px] text-[15px] leading-[1.6] text-[#0A0A0A] sm:text-[22px] sm:leading-[1.55]">
              {heroText}
            </p>
            {subtitleText && (
              <p className="mt-4 max-w-[720px] text-[14px] leading-[1.6] text-[#525252] sm:text-[15px] sm:leading-[1.65]">
                {subtitleText}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-[1000px] grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label.en} className="border-t-2 border-[#0A0A0A] pt-3">
                <p className="pulse-eyebrow text-[#737373]">
                  {stat.label[isTr ? 'tr' : 'en']}
                </p>
                <p
                  className="mt-2 text-[28px] font-medium leading-none tracking-tight text-[#0A0A0A] sm:text-[34px]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="px-5 sm:px-10 py-[60px] sm:py-20">
          <div className="mx-auto max-w-[1000px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SÜRECİN ÖZETİ' : 'HOW IT PLAYED OUT'}
            </span>
            <div className="mt-6 space-y-4">
              {highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7 grid grid-cols-[auto_1fr] gap-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[14px] font-semibold text-[#0A0A0A]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className="text-[15px] leading-[1.7] text-[#0A0A0A]">{highlight[isTr ? 'tr' : 'en']}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quote */}
      {quoteText && (
        <section className="bg-[#0A0A0A] px-5 sm:px-10 py-[60px] sm:py-24 text-white">
          <div className="mx-auto max-w-[900px]">
            <Quote size={32} className="text-[#C6F24E]" />
            <blockquote
              className="mt-6 text-[24px] font-medium leading-[1.35] tracking-tight text-white sm:text-[36px] lg:text-[44px]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              &quot;{quoteText}&quot;
            </blockquote>
            {study.personName && (
              <div className="mt-8 flex items-center gap-4">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A] text-[18px] font-semibold"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {study.personName
                    .split(' ')
                    .map((part) => part.charAt(0))
                    .slice(0, 2)
                    .join('')}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-white">{study.personName}</p>
                  {personRole && (
                    <p className="text-[12px] text-white/60">
                      {personRole[isTr ? 'tr' : 'en']} · {study.brand}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Related */}
      {others.length > 0 && (
        <section className="px-5 sm:px-10 py-[60px] sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex items-end justify-between gap-4">
              <h2
                className="text-[26px] font-medium tracking-[-0.025em] text-[#0A0A0A] sm:text-[36px]"
              >
                {isTr ? 'Başka sektörlerden' : 'From other sectors'}
              </h2>
              <Link
                href={`${base}/case-study`}
                className="pulse-eyebrow text-[#737373] hover:text-[#0A0A0A]"
              >
                {isTr ? 'TÜMÜ' : 'ALL'} →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {others.map((o) => {
                const oStats = (o.stats as unknown as CaseStudyStat[]) ?? [];
                const headlineStat = oStats[0];
                return (
                  <Link
                    key={o.slug}
                    href={`${base}/case-study/${o.slug}`}
                    className="rounded-2xl border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#0A0A0A]"
                  >
                    <p className="pulse-eyebrow text-[#737373]">
                      {resolveSector(o, isTr)} · {o.location}
                    </p>
                    <h3
                      className="mt-2 text-[22px] font-medium text-[#0A0A0A]"
                    >
                      {o.brand}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#525252] line-clamp-3">
                      {isTr ? o.heroTr : o.heroEn}
                    </p>
                    {headlineStat && (
                      <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[#0A0A0A]">
                        <TrendingUp size={14} className="text-[#C6F24E]" />
                        <span>{headlineStat.value}</span>
                        <span className="pulse-eyebrow text-[#737373] ml-2">
                          {headlineStat.label[isTr ? 'tr' : 'en']}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
