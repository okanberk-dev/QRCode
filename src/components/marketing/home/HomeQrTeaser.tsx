import Link from 'next/link';
import { ArrowRight, QrCode } from 'lucide-react';

/**
 * Free QR generator teaser — the homepage's second (and last) dark block,
 * as a contained card on a light section. Only what the free tool does
 * today: static code, 4 card themes, PNG download, no account. The fanned
 * cards on the right preview those 4 themes (decorative, aria-hidden).
 */

const COPY = {
  tr: {
    eyebrow: 'Ücretsiz araç',
    title: 'Hesap açmadan QR kod oluşturun',
    lead: 'Web siteniz, menünüz veya Google yorum bağlantınız için statik bir QR kod oluşturun. 4 kart temasından birini seçip PNG olarak indirin; kod herhangi bir hesaba bağlı değildir ve süresi dolmaz.',
    cta: 'QR kod oluşturucuyu açın',
  },
  en: {
    eyebrow: 'Free tool',
    title: 'Create a QR code without an account',
    lead: "Make a static QR code for your website, menu or Google review link. Pick one of 4 card themes and download it as PNG; the code isn't tied to any account and never expires.",
    cta: 'Open the QR code generator',
  },
} as const;

const THEMES = [
  { card: '#FFFFFF', ink: '#0A0A0A', ring: 'ring-[#EDEDED]', rotate: '-rotate-[10deg]', offset: '-translate-x-[96px] translate-y-4 sm:-translate-x-[118px]' },
  { card: '#FAFAFA', ink: '#0A0A0A', ring: 'ring-[#EDEDED]', rotate: '-rotate-[4deg]', offset: '-translate-x-[34px] -translate-y-1 sm:-translate-x-[42px]' },
  { card: '#1A1A1A', ink: '#FFFFFF', ring: 'ring-white/20', rotate: 'rotate-[4deg]', offset: 'translate-x-[34px] -translate-y-1 sm:translate-x-[42px]' },
  { card: '#C6F24E', ink: '#0A0A0A', ring: 'ring-[#A8D62E]', rotate: 'rotate-[10deg]', offset: 'translate-x-[96px] translate-y-4 sm:translate-x-[118px]' },
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
              <p className="mt-5 max-w-[540px] text-[16px] leading-[1.6] text-white/75 sm:text-[17px]">{copy.lead}</p>
              <Link
                href={`/${locale}/solutions/qr-generator`}
                className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
              >
                {copy.cta}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div aria-hidden="true" className="relative mx-auto flex h-[190px] w-full max-w-[400px] items-center justify-center sm:h-[230px]">
              {THEMES.map((theme) => (
                <span
                  key={theme.card}
                  className={`absolute flex h-[132px] w-[104px] flex-col items-center justify-center gap-3 rounded-[16px] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] ring-1 sm:h-[164px] sm:w-[128px] sm:rounded-[18px] ${theme.ring} ${theme.rotate} ${theme.offset}`}
                  style={{ backgroundColor: theme.card, color: theme.ink }}
                >
                  <QrCode className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={1.5} />
                  <span className="h-1.5 w-10 rounded-full opacity-30" style={{ backgroundColor: theme.ink }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
