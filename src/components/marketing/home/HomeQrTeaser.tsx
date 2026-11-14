import Link from 'next/link';
import { ArrowRight, QrCode } from 'lucide-react';

/**
 * Free QR generator teaser — the homepage's second (and last) dark block,
 * as a contained card on a light section. Only what the free tool does
 * today: static code, 4 card themes, PNG download or A5 print-to-PDF, no
 * account. The fanned cards on the right are a decorative preview of the
 * generator's card (eyebrow, headline, QR on a white tile, footer line) in
 * three of its themes (aria-hidden).
 */

const COPY = {
  tr: {
    eyebrow: 'Ücretsiz araç',
    title: 'Hesap açmadan QR kod oluşturun',
    lead: 'Web siteniz, menünüz veya Google yorum bağlantınız için statik bir QR kod oluşturun. 4 kart temasından birini seçin, kartı PNG olarak indirin ya da A5 sayfaya PDF olarak yazdırın. Kod herhangi bir hesaba bağlı değildir ve süresi dolmaz.',
    cta: 'QR kod oluşturucuyu açın',
  },
  en: {
    eyebrow: 'Free tool',
    title: 'Create a QR code without an account',
    lead: "Make a static QR code for your website, menu or Google review link. Pick one of 4 card themes, then download the card as a PNG or print it on an A5 page as a PDF. The code isn't tied to any account and never expires.",
    cta: 'Open the QR code generator',
  },
} as const;

/** Three of the generator's four themes: white, dark and lime. */
const THEMES = [
  {
    key: 'white',
    card: '#FFFFFF',
    ink: '#0A0A0A',
    ring: 'ring-[#EDEDED]',
    place: '-translate-x-[92px] translate-y-3 -rotate-[9deg] sm:-translate-x-[124px]',
  },
  {
    key: 'dark',
    card: '#1A1A1A',
    ink: '#FFFFFF',
    ring: 'ring-white/20',
    place: 'translate-x-[92px] translate-y-3 rotate-[9deg] sm:translate-x-[124px]',
  },
  {
    key: 'lime',
    card: '#C6F24E',
    ink: '#0A0A0A',
    ring: 'ring-[#A8D62E]',
    place: '-translate-y-1 z-10',
  },
] as const;

export default function HomeQrTeaser({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];

  return (
    <section aria-labelledby="qr-generator-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
        <div className="relative overflow-hidden rounded-[28px] bg-[#0A0A0A] px-6 py-10 text-white sm:px-12 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 h-[360px] w-[360px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(198,242,78,0.18), transparent 70%)' }}
          />
          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div>
              <p className="pulse-eyebrow text-[#C6F24E]">{copy.eyebrow}</p>
              <h2
                id="qr-generator-title"
                className="mt-4 text-balance text-[28px] leading-[1.08] text-white sm:text-[40px] lg:text-[44px]"
              >
                {copy.title}
              </h2>
              <p className="mt-5 max-w-[560px] text-[16px] leading-[1.6] text-white/75 sm:text-[17px]">{copy.lead}</p>
              <Link
                href={`/${locale}/solutions/qr-generator`}
                className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
              >
                {copy.cta}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto flex h-[200px] w-full max-w-[400px] items-center justify-center sm:h-[240px]"
            >
              {THEMES.map((theme) => (
                <span
                  key={theme.key}
                  className={`absolute flex h-[160px] w-[120px] flex-col items-center rounded-[16px] px-3 pb-3 pt-3.5 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] ring-1 sm:h-[196px] sm:w-[146px] sm:rounded-[18px] sm:px-4 sm:pt-4 ${theme.ring} ${theme.place}`}
                  style={{ backgroundColor: theme.card, color: theme.ink }}
                >
                  <span className="h-1 w-10 rounded-full opacity-50" style={{ backgroundColor: theme.ink }} />
                  <span className="mt-2 h-2 w-16 rounded-full opacity-90 sm:w-20" style={{ backgroundColor: theme.ink }} />
                  <span className="mt-1.5 h-2 w-11 rounded-full opacity-90 sm:w-14" style={{ backgroundColor: theme.ink }} />
                  <span className="my-auto flex items-center justify-center rounded-[10px] bg-white p-2 text-[#0A0A0A] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)]">
                    <QrCode className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.6} />
                  </span>
                  <span className="h-1 w-12 rounded-full opacity-40" style={{ backgroundColor: theme.ink }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
