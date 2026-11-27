import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import NotFoundContent from '@/components/marketing/NotFoundContent';

/**
 * Branded 404 (deep purple #3B1F8F, ECG line, lavender "404"). Used by
 * app/global-not-found.tsx (unmatched URLs) and the not-found.tsx files of
 * the root segments whose pages call notFound() ([locale], r, embed).
 *
 * Must stay free of dynamic APIs (headers/cookies/searchParams): not-found
 * boundaries are rendered into every route's tree, so one `headers()` call
 * here turns the whole site into per-request rendering (§35.12.3). The
 * locale comes from the URL on the client (NotFoundContent).
 */
export default function BrandedNotFound({
  detectLocaleOnClient = false,
}: {
  /** Set by app/global-not-found.tsx (see NotFoundContent). */
  detectLocaleOnClient?: boolean;
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#3B1F8F] px-6 py-12 text-center text-white font-sans">
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
          stroke="#DCD3F6"
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
            buaze<span className="text-white">.</span>
          </span>
        </Link>

        <div
          className="mt-6 text-[120px] font-medium leading-[0.9] tracking-[-0.05em] text-white sm:text-[160px] lg:text-[180px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          404
        </div>

        <NotFoundContent detectOnClient={detectLocaleOnClient} />
      </div>
    </div>
  );
}
