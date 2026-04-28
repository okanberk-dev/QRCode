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
      ? 'Klinik & Sağlık İtibar Yönetimi — Buaze'
      : 'Clinic & Healthcare Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin.'
      : 'KVKK-compliant patient feedback. Collect experience after treatment via QR and strengthen your Google profile.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/healthcare`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/healthcare',
        en: 'https://buaze.com/en/solutions/healthcare',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/healthcare` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:ClinicSolutionPage (lines 80-128).
 * Light gray hero + shield illustration + KVKK callout + 3-stat grid +
 * 4-feature 2-col grid.
 */
export default async function ClinicSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '+62%', label: 'Randevu artışı (90 gün)' },
        { value: '4.8/5', label: 'Google ort. puan' },
        { value: '%94', label: 'Hasta memnuniyet skoru' },
      ]
    : [
        { value: '+62%', label: 'Appointment growth (90 days)' },
        { value: '4.8/5', label: 'Avg. Google rating' },
        { value: '94%', label: 'Patient satisfaction' },
      ];

  const features = isTr
    ? [
        { t: 'Tedavi sonrası anket', d: 'Randevu sisteminden otomatik tetiklenebilir. Hastaya SMS/QR ile gönderilir.' },
        { t: 'Doktor bazlı raporlama', d: 'Her hekimin bireysel memnuniyet skoru ve yorum dağılımı ayrı görünür.' },
        { t: "Google bağlantısı + opsiyonel iç kanal", d: "Her hastaya Google yorum bağlantısı sunulur; isteyen aynı akışta kliniğe özel geri bildirim de bırakır — KVKK ve Google politikalarıyla uyumlu." },
        { t: 'Çok dilli destek', d: 'Medikal turizm için otomatik dil tespiti, Arapça dahil 12 dil.' },
      ]
    : [
        { t: 'Post-treatment survey', d: 'Auto-triggered from your scheduling system; delivered to the patient via SMS/QR.' },
        { t: 'Per-doctor reporting', d: 'Each clinician sees their own satisfaction score and review distribution.' },
        { t: 'Google link + optional private channel', d: 'Every patient sees the public Google review link; private feedback to the clinic is an optional extra step in the same flow — KVKK and Google policy compliant.' },
        { t: 'Multilingual support', d: 'Auto language detection for medical tourism — 12 languages including Arabic.' },
      ];

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'healthcare',
    industryLabel: isTr ? 'Klinik & Sağlık' : 'Clinic & Healthcare',
    serviceName: isTr ? 'Klinik & Sağlık İtibar Yönetimi' : 'Clinic & Healthcare Reputation Management',
    description: isTr
      ? 'KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin.'
      : 'KVKK-compliant patient feedback. Collect experience after treatment via QR and strengthen your Google profile.',
  });

  return (
    <div className="min-h-screen bg-white pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero — light gray bg */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · KLİNİK & SAĞLIK' : 'SECTOR · CLINIC & HEALTHCARE'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? (
                <>
                  Hasta güveni,
                  <br />
                  dijitale
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">taşınır.</span>
                </>
              ) : (
                <>
                  Patient trust,
                  <br />
                  carried into the
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">digital.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin. Sağlık sektörüne özel hassas akış.'
                : 'KVKK-compliant patient feedback. Capture experience after treatment via QR and strengthen your Google profile. A flow tailored to healthcare.'}
            </p>

            {/* KVKK callout */}
            <div className="mt-5 max-w-[480px] rounded-[10px] bg-[#EAF9B8] p-4 text-[13px] leading-[1.5] text-[#0A0A0A]">
              <strong>{isTr ? 'KVKK Notu:' : 'KVKK Note:'}</strong>{' '}
              {isTr
                ? 'Hasta verileri hiçbir zaman üçüncü tarafla paylaşılmaz. Anket ve yorum akışları anonimleştirilebilir.'
                : 'Patient data is never shared with third parties. Survey and review flows can be anonymised.'}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* IllusShield — exact SVG from .design/site/site-shared.jsx:270-285 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 200 240" className="h-auto w-full max-w-[260px]" aria-hidden>
              <path
                d="M100 15 L175 40 L175 120 Q175 180 100 225 Q25 180 25 120 L25 40 Z"
                fill="#FFFFFF"
                stroke="#0A0A0A"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M100 25 L165 47 L165 120 Q165 172 100 212 Q35 172 35 120 L35 47 Z"
                fill="#C6F24E"
                opacity="0.15"
              />
              {/* Check */}
              <circle cx="100" cy="110" r="34" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
              <path
                d="M82 110 L95 123 L118 98"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              <circle cx="65" cy="165" r="3" fill="#0A0A0A" />
              <circle cx="100" cy="175" r="3" fill="#0A0A0A" />
              <circle cx="135" cy="165" r="3" fill="#0A0A0A" />
              {/* Ribbon */}
              <rect x="70" y="45" width="60" height="14" rx="3" fill="#0A0A0A" />
              <text
                x="100"
                y="56"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="9"
                fill="#C6F24E"
                fontWeight="600"
                letterSpacing="0.1em"
              >
                GOOGLE SAFE
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 md:grid-cols-3">
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

      {/* 4-feature 2-col grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-6">
              <h3
                className="text-[22px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {f.t}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.55] text-[#525252]">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Her hasta, saygı ile.' : 'Every patient, with respect.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? 'KVKK uyumlu · 14 gün ücretsiz · Kredi kartı istemiyoruz'
              : 'KVKK-compliant · 14-day free · No credit card'}
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
