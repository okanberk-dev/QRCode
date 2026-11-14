import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import HeroStage from './HeroStage';

/**
 * Homepage hero. Server component: the H1, subtitle and CTAs are plain HTML
 * (no hydration, no reveal animation), so crawlers and no-JS visitors get
 * the full copy. Only the decorative sample stage on the right is a client
 * island (HeroStage, aria-hidden).
 *
 * H1 per spec D11 (keyword-first, no trailing period). The subtitle uses the
 * D1 wording for the review flow: every customer sees the public review
 * link; below the owner's threshold they can write to the business first.
 */

const COPY = {
  tr: {
    title: 'Google yorumlarınızı\nQR kodla toplayın',
    subtitle:
      'Müşteriniz QR kodu okutup puan verir. Her müşteri Google yorum bağlantınızı görür; belirlediğiniz eşiğin altındaki puanlarda önce size özel geri bildirim yazabilir.',
    primaryCta: '14 gün ücretsiz deneyin',
    secondaryCta: 'Nasıl çalışır',
    facts: ['Kredi kartı gerekmez', '10 yorum platformu', 'Türkçe ve İngilizce'],
  },
  en: {
    title: 'Collect Google reviews\nwith QR codes',
    subtitle:
      'Your customer scans the QR code and gives a rating. Every customer sees your Google review link; below the threshold you set, they can send you private feedback first.',
    primaryCta: 'Start your 14-day free trial',
    secondaryCta: 'See how it works',
    facts: ['No credit card', '10 review platforms', 'Turkish and English'],
  },
} as const;

export default function HeroCinematic({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[#FAFAFA]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[200px] -top-[160px] h-[460px] w-[460px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(198,242,78,0.38), transparent 70%)' }}
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-5 pb-[60px] pt-10 sm:px-10 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:pb-28 lg:pt-20 xl:gap-16">
        <div className="max-w-[640px]">
          <h1
            id="hero-title"
            className="text-balance text-[38px] text-[#0A0A0A] sm:whitespace-pre-line sm:text-[52px] xl:text-[60px]"
            style={{ lineHeight: 1.02, letterSpacing: '-0.035em' }}
          >
            {copy.title}
          </h1>

          <p className="mt-6 max-w-[540px] text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
            {copy.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/auth/register`}
              rel="nofollow"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]"
            >
              {copy.primaryCta}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D4D4D4] bg-white px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]"
            >
              {copy.secondaryCta}
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-[#525252]">
            {copy.facts.map((fact) => (
              <li key={fact} className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#EAF9B8] text-[#3F5408]"
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-[440px] lg:max-w-[480px]">
          <HeroStage locale={locale} />
        </div>
      </div>
    </section>
  );
}
