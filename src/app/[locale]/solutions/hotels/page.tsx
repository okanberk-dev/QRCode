import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlatformLogo from '@/components/marketing/PlatformLogo';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildSolutionSchema } from '@/lib/solution-schema';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Otel & Konaklama İtibar Yönetimi — Buaze'
      : 'Hotel & Hospitality Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? "Booking.com, Tripadvisor, Airbnb ve Google — dört platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör."
      : 'Booking.com, Tripadvisor, Airbnb and Google — manage all four from one panel. Collect reviews at check-out with room QRs.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/hotels`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/hotels',
        en: 'https://buaze.com/en/solutions/hotels',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/hotels` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:HotelSolutionPage (lines 22-75).
 * Light gray hero (#FAFAFA) + lighthouse illustration + PlatformLogo row
 * + 4-stat grid + 6-feature grid.
 */
export default async function HotelsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '8.2→9.1', label: 'Booking puanı artışı (ort.)' },
        { value: '+92%', label: 'Tripadvisor yorum artışı' },
        { value: '%57', label: 'Oda QR dönüşüm oranı' },
        { value: '22sn', label: 'Check-out→yorum süresi' },
      ]
    : [
        { value: '8.2→9.1', label: 'Avg. Booking rating lift' },
        { value: '+92%', label: 'Tripadvisor review growth' },
        { value: '57%', label: 'Room QR conversion' },
        { value: '22s', label: 'Check-out → review time' },
      ];

  const features = isTr
    ? [
        { t: 'Oda QR sistemi', d: 'Her oda numarası kendi QR koduna sahip. Misafir tararken oda bilgisi otomatik eşleşir.' },
        { t: 'Check-out tetikleyici', d: 'PMS entegrasyonu ile check-out anında SMS/WhatsApp ile yorum daveti.' },
        { t: 'Dil tespiti', d: 'Misafirin tarayıcı diline göre form otomatik dil değiştirir. 12 dil desteği.' },
        { t: 'Personel skoru', d: 'Resepsiyonist, temizlik, restoran — her departman ayrı raporlanır.' },
        { t: 'OTA entegrasyonu', d: 'Booking.com, Airbnb, Expedia, Agoda — yorumları panele çeker, yanıt şablonları çalışır.' },
        { t: 'Misafir profili', d: 'Tekrar gelen misafiri tanı, geçmiş yorumlarıyla bağlantı kur.' },
      ]
    : [
        { t: 'Room-level QR', d: 'Each room has its own QR; guest scans auto-match the room.' },
        { t: 'Check-out trigger', d: 'PMS integration sends an SMS/WhatsApp review invite at check-out.' },
        { t: 'Language detection', d: 'Form auto-switches by browser language — 12 languages supported.' },
        { t: 'Staff scoring', d: 'Front desk, housekeeping, F&B — each department reported separately.' },
        { t: 'OTA integration', d: 'Booking.com, Airbnb, Expedia, Agoda — reviews pulled in; reply templates ready.' },
        { t: 'Guest profile', d: 'Recognise returning guests and tie them back to prior reviews.' },
      ];

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'hotels',
    industryLabel: isTr ? 'Otel & Konaklama' : 'Hotel & Hospitality',
    serviceName: isTr ? 'Otel & Konaklama İtibar Yönetimi' : 'Hotel & Hospitality Reputation Management',
    description: isTr
      ? "Booking.com, Tripadvisor, Airbnb ve Google — dört platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör."
      : 'Booking.com, Tripadvisor, Airbnb and Google — manage all four from one panel. Collect reviews at check-out with room QRs.',
  });

  return (
    <div className="min-h-screen bg-white pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — light gray bg */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SEKTÖR · OTEL & KONAKLAMA' : 'SECTOR · HOTEL & HOSPITALITY'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? (
                <>
                  Misafirin sesi,
                  <br />
                  her platformda
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">yankılanır.</span>
                </>
              ) : (
                <>
                  Your guests&apos; voice,
                  <br />
                  echoed on
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5">every platform.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? "Booking.com, Tripadvisor, Airbnb ve Google — dört platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör."
                : 'Booking.com, Tripadvisor, Airbnb and Google — run all four from one panel. Room QRs capture feedback at check-out; you see the negative ones first.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'BAĞLANTI' : 'CONNECT'}
              </span>
              {(['booking', 'tripadvisor', 'google'] as const).map((id) => (
                <PlatformLogo key={id} id={id} size={36} rounded={8} />
              ))}
            </div>
          </div>

          {/* IllusLighthouse — exact SVG from .design/site/site-shared.jsx:114-140 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 240 260" className="h-auto w-full max-w-[280px]" aria-hidden>
              {/* Waves */}
              <path d="M0 220 Q30 215 60 220 T120 220 T180 220 T240 220 L240 260 L0 260 Z" fill="#EAF9B8" />
              <path d="M0 234 Q30 229 60 234 T120 234 T180 234 T240 234 L240 260 L0 260 Z" fill="#C6F24E" opacity="0.6" />
              {/* Rock base */}
              <path d="M70 220 L170 220 L160 205 L80 205 Z" fill="#0A0A0A" />
              {/* Tower */}
              <path d="M100 205 L100 90 L140 90 L140 205 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
              <path
                d="M100 120 L140 120 M100 150 L140 150 M100 180 L140 180"
                stroke="#0A0A0A"
                strokeWidth="1.2"
              />
              {/* Light chamber */}
              <rect x="94" y="70" width="52" height="24" fill="#0A0A0A" />
              <rect x="98" y="74" width="44" height="16" fill="#C6F24E" />
              {/* Roof */}
              <path d="M92 70 L148 70 L142 55 L98 55 Z" fill="#0A0A0A" />
              {/* Spike */}
              <path d="M120 55 L120 38" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="120" cy="32" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              {/* Light beams */}
              <path d="M148 82 L215 50 L215 98 Z" fill="#C6F24E" opacity="0.35" />
              <path d="M92 82 L25 50 L25 98 Z" fill="#C6F24E" opacity="0.2" />
              {/* Stars */}
              <circle cx="200" cy="30" r="2" fill="#0A0A0A" />
              <circle cx="180" cy="18" r="1.5" fill="#0A0A0A" />
              <circle cx="40" cy="25" r="1.5" fill="#0A0A0A" />
            </svg>
          </div>
        </div>
      </section>

      {/* 4-stat grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-2 gap-5 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bz-card p-5 sm:p-6">
              <div
                className="text-[28px] sm:text-[34px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.value}
              </div>
              <div className="pulse-eyebrow mt-2 text-[#737373]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6-feature grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Her oda, bir yıldız.' : 'Every room, a star.'}
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
