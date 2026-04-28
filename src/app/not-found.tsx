import Link from 'next/link';
import { headers } from 'next/headers';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { detectLocaleFromAcceptLanguage } from '@/lib/translations';

/**
 * 1:1 with .design/site/site-pages4.jsx:NotFoundPage — dark #0A0A0A bg,
 * horizontal ECG waveform at 6% opacity, lime #C6F24E giant "404",
 * Space Grotesk headline, dual CTA (home + help).
 */
export default async function NotFound() {
  const h = await headers();
  const locale = detectLocaleFromAcceptLanguage(h.get('accept-language'));
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] px-6 py-12 text-center text-white font-sans">
      {/* ECG waveform background (design: horizontal pulse line, 6% opacity) */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-1/2 w-full -translate-y-1/2 opacity-[0.06]"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 100 L200 100 L260 40 L320 160 L380 80 L440 120 L600 100 L700 100 L760 40 L820 160 L880 80 L940 120 L1440 100"
          fill="none"
          stroke="#C6F24E"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 max-w-[520px]">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <BuazeLogo size={32} variant="on-dark" />
          <span
            className="text-[18px] font-medium tracking-[-0.03em] text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>

        <div
          className="mt-6 text-[120px] font-medium leading-[0.9] tracking-[-0.05em] text-[#C6F24E] sm:text-[160px] lg:text-[180px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          404
        </div>

        <h1
          className="mt-4 text-[26px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[36px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Bu sayfa nabız vermiyor.
        </h1>

        <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.6] text-[#A3A3A3] sm:text-[16px]">
          Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-6 py-3 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
          >
            Ana sayfaya dön
          </Link>
          <Link
            href={`/${locale}/help`}
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-[#333] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:border-white/60"
          >
            Yardım al
          </Link>
        </div>
      </div>
    </div>
  );
}
