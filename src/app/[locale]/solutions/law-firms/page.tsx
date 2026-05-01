import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
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
      ? 'Hukuk Ofisi İtibar Yönetimi — Buaze'
      : 'Law Firm Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil.'
      : 'Collect feedback from clients after every consultation. Rise in Google search rankings. Ethics-compliant, reputable digital presence.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/law-firms`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/law-firms',
        en: 'https://buaze.com/en/solutions/law-firms',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/law-firms` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:LegalSolutionPage (lines 131-195).
 * 2-column hero with document+seal SVG, 4-bullet compliance list, 3-stat grid.
 */
export default async function LawFirmsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const bullets = isTr
    ? [
        'Avukatlık meslek kurallarına uyumlu',
        'Yanıltıcı reklam yok',
        'Müvekkil sırrı korunur',
        'Organik SEO artışı',
      ]
    : [
        'Bar-ethics compliant',
        'No misleading advertising',
        'Client confidentiality preserved',
        'Organic SEO growth',
      ];

  const stats = isTr
    ? [
        { value: '+1.2', label: 'Ortalama Google puan artışı' },
        { value: '+90', label: '90 günde yeni yorum' },
        { value: '%38', label: 'Müvekkil başvuru artışı' },
      ]
    : [
        { value: '+1.2', label: 'Avg. Google rating lift' },
        { value: '+90', label: 'New reviews in 90 days' },
        { value: '38%', label: 'Client inquiry growth' },
      ];

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'law-firms',
    industryLabel: isTr ? 'Hukuk Ofisi' : 'Law Firm',
    serviceName: isTr ? 'Hukuk Ofisi İtibar Yönetimi' : 'Law Firm Reputation Management',
    description: isTr
      ? 'Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil.'
      : 'Collect feedback from clients after every consultation. Rise in Google search rankings. Ethics-compliant, reputable digital presence.',
  });

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — white bg, 2-column with document+seal SVG */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · HUKUK OFİSİ' : 'SECTOR · LAW FIRM'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Müvekkil güveni
                  <br />
                  en güçlü
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">referanstır.</span>
                </>
              ) : (
                <>
                  Client trust is
                  <br />
                  the strongest
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">reference.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil oluşturun.'
                : 'Collect feedback after every consultation. Climb Google search rankings. Build an ethics-compliant, respected digital presence.'}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <div key={b} className="flex items-center gap-2 text-[13px] text-[#1A1A1A]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  {b}
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
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

          {/* Document + seal illustration (1:1 with design SVG) */}
          <div className="flex justify-center lg:justify-end">
            <svg
              viewBox="0 0 320 300"
              className="h-auto w-full max-w-[400px]"
              aria-hidden
            >
              <rect x="60" y="20" width="200" height="260" rx="8" fill="#FAFAFA" stroke="#0A0A0A" strokeWidth="2" />
              <rect x="60" y="20" width="200" height="32" rx="8" fill="#0A0A0A" />
              <rect x="60" y="36" width="200" height="16" fill="#0A0A0A" />
              <rect x="80" y="70" width="100" height="6" rx="3" fill="#0A0A0A" />
              <rect x="80" y="84" width="140" height="4" rx="2" fill="#D4D4D4" />
              <rect x="80" y="96" width="120" height="4" rx="2" fill="#D4D4D4" />
              <rect x="80" y="118" width="120" height="6" rx="3" fill="#0A0A0A" />
              <rect x="80" y="132" width="150" height="4" rx="2" fill="#D4D4D4" />
              <rect x="80" y="144" width="100" height="4" rx="2" fill="#D4D4D4" />
              <path
                d="M80 195 Q100 185 120 195 Q140 205 160 195"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line x1="80" y1="210" x2="200" y2="210" stroke="#0A0A0A" strokeWidth="1" />
              <circle cx="240" cy="240" r="32" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
              <path
                d="M228 240 L236 248 L252 232"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                return (
                  <circle
                    key={i}
                    cx={240 + Math.cos(a) * 26}
                    cy={240 + Math.sin(a) * 26}
                    r="2"
                    fill="#0A0A0A"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="bz-card p-6">
              <div
                className="text-[40px] sm:text-[48px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.value}
              </div>
              <div className="pulse-eyebrow mt-2 text-[#737373]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
          >
            {isTr ? 'Hukuk büronuzun nabzını dinleyin.' : "Listen to your firm's pulse."}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? 'KVKK & GDPR uyumlu · 14 gün ücretsiz · Kredi kartı istemiyoruz'
              : 'KVKK & GDPR compliant · 14-day free · No credit card'}
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
