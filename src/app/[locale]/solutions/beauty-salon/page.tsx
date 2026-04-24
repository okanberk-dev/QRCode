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
      ? 'Güzellik & Spa İtibar Yönetimi — Buaze'
      : 'Beauty & Spa Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? "Hizmet biter bitmez müşteriniz QR'ı tarar. Instagram, Google ve Foursquare'de puanınız organik büyür."
      : "The moment service ends, your customer scans the QR. Ratings grow organically on Instagram, Google and Foursquare.";
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/beauty-salon`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/beauty-salon',
        en: 'https://buaze.com/en/solutions/beauty-salon',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/beauty-salon` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:SpaSolutionPage (lines 200-241).
 * Light gray hero + mountain illustration + 4-stat grid + 3-feature grid.
 */
export default async function BeautySalonSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '4.9', label: 'Usta bazlı müşteri skoru' },
        { value: '+148%', label: 'Instagram yorum artışı' },
        { value: '%72', label: 'Tekrar randevu oranı' },
        { value: '%18', label: 'Yorum→randevu dönüşüm' },
      ]
    : [
        { value: '4.9', label: 'Per-stylist customer score' },
        { value: '+148%', label: 'Instagram review growth' },
        { value: '72%', label: 'Repeat booking rate' },
        { value: '18%', label: 'Review → booking conversion' },
      ];

  const features = isTr
    ? [
        { t: 'Usta bazlı QR', d: 'Her ustanın masa/bölümüne özel QR. Kim hangi yorumu aldı, tek bakışta.' },
        { t: 'Instagram entegrasyonu', d: "Güzellik sektörünün önde gelen platformu. DM yorumlarını inbox'a çek." },
        { t: 'Randevu tetikleyici', d: 'Randevu yazılımınızla bağlan — hizmet bitince otomatik yorum daveti.' },
      ]
    : [
        { t: 'Per-stylist QR', d: 'Each stylist has their own station QR. Who received which review — at a glance.' },
        { t: 'Instagram integration', d: 'The leading platform for beauty. Pull DM reviews into your inbox.' },
        { t: 'Booking trigger', d: 'Connect to your booking software — auto-send review invites when service ends.' },
      ];

  return (
    <div className="min-h-screen bg-white pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero — light gray bg */}
      <section className="bg-[#FAFAFA] px-6 sm:px-10 py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · GÜZELLİK & SPA' : 'SECTOR · BEAUTY & SPA'}
            </span>
            <h1
              className="mt-3 text-[40px] sm:text-[56px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? (
                <>
                  Randevu sonrası
                  <br />
                  en güçlü
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">an.</span>
                </>
              ) : (
                <>
                  The strongest
                  <br />
                  moment is right
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">after.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? "Hizmet biter bitmez müşteriniz QR'ı tarar. Instagram, Google ve Foursquare'de puanınız organik büyür. Usta bazlı performans raporları."
                : 'The moment service ends, your customer scans the QR. Ratings grow organically on Instagram, Google and Foursquare. Per-stylist performance reports.'}
            </p>
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

          {/* Mountain illustration */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 280 280" className="h-auto w-full max-w-[280px]" aria-hidden>
              <rect x="0" y="0" width="280" height="280" rx="24" fill="#F5F5F5" />
              {/* Back mountain */}
              <path
                d="M30 220 L110 90 L170 170 L220 120 L260 220 Z"
                fill="#EDEDED"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
              {/* Front mountain */}
              <path
                d="M20 230 L90 120 L150 195 L210 145 L270 230 Z"
                fill="#C6F24E"
                stroke="#0A0A0A"
                strokeWidth="2.5"
              />
              {/* Snowcap */}
              <path d="M85 125 L90 120 L100 135 L95 135 Z" fill="#FAFAFA" stroke="#0A0A0A" strokeWidth="1.5" />
              <path d="M205 150 L210 145 L218 158 L212 158 Z" fill="#FAFAFA" stroke="#0A0A0A" strokeWidth="1.5" />
              {/* Sun */}
              <circle cx="220" cy="70" r="22" fill="#FAFAFA" stroke="#0A0A0A" strokeWidth="2.5" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const angle = (i / 8) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1={220 + Math.cos(angle) * 28}
                    y1={70 + Math.sin(angle) * 28}
                    x2={220 + Math.cos(angle) * 36}
                    y2={70 + Math.sin(angle) * 36}
                    stroke="#0A0A0A"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* 4-stat grid */}
      <section className="px-6 sm:px-10 py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-2 gap-5 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
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
            <div key={f.t} className="rounded-[14px] border border-[#EDEDED] bg-white p-6">
              <h3
                className="text-[20px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {f.t}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">{f.d}</p>
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
            {isTr ? 'Her randevu, bir yıldız.' : 'Every appointment, a star.'}
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
