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
        { t: "Google'a yönlendirme", d: "Memnun hasta Google'a, şikayet eden hasta iç forma — KVKK uyumlu akış." },
        { t: 'Çok dilli destek', d: 'Medikal turizm için otomatik dil tespiti, Arapça dahil 12 dil.' },
      ]
    : [
        { t: 'Post-treatment survey', d: 'Auto-triggered from your scheduling system; delivered to the patient via SMS/QR.' },
        { t: 'Per-doctor reporting', d: 'Each clinician sees their own satisfaction score and review distribution.' },
        { t: 'Google redirect', d: 'Happy patients route to Google, complaints stay internal — KVKK-compliant flow.' },
        { t: 'Multilingual support', d: 'Auto language detection for medical tourism — 12 languages including Arabic.' },
      ];

  return (
    <div className="min-h-screen bg-white pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero — light gray bg */}
      <section className="bg-[#FAFAFA] px-6 sm:px-10 py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · KLİNİK & SAĞLIK' : 'SECTOR · CLINIC & HEALTHCARE'}
            </span>
            <h1
              className="mt-3 text-[40px] sm:text-[56px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
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
            <p className="mt-5 max-w-[500px] text-[16px] leading-[1.6] text-[#525252]">
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

          {/* Shield illustration */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 300 300" className="h-auto w-full max-w-[300px]" aria-hidden>
              <rect x="0" y="0" width="300" height="300" rx="24" fill="#F5F5F5" />
              <path
                d="M150 40 L230 75 L230 165 Q230 225 150 260 Q70 225 70 165 L70 75 Z"
                fill="#FAFAFA"
                stroke="#0A0A0A"
                strokeWidth="3"
              />
              <path
                d="M150 90 L200 110 L200 170 Q200 205 150 225 Q100 205 100 170 L100 110 Z"
                fill="#C6F24E"
                stroke="#0A0A0A"
                strokeWidth="2.5"
              />
              {/* Medical cross */}
              <rect x="142" y="130" width="16" height="60" rx="2" fill="#0A0A0A" />
              <rect x="120" y="152" width="60" height="16" rx="2" fill="#0A0A0A" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-6 sm:px-10 py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
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
      <section className="px-6 sm:px-10 pb-20 sm:pb-24">
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
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
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
