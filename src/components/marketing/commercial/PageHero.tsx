import type { ReactNode } from 'react';
import { CONTAINER } from './styles';

/**
 * Page hero for the commercial marketing pages: eyebrow → H1 → lead → up to
 * two calls to action. The H1 is plain server-rendered text (no animation,
 * no opacity reveal) so it is in the initial HTML for crawlers.
 *
 * `aside` renders a second column from `lg` up (e.g. the decorative platform
 * orbit on /integrations). It comes after the copy in the HTML, so the H1 and
 * lead are always read first.
 */
export default function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  note,
  aside,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  /** Up to two links/buttons. */
  actions?: ReactNode;
  /** Small line under the actions (e.g. trial terms). */
  note?: ReactNode;
  aside?: ReactNode;
  align?: 'left' | 'center';
}) {
  const center = align === 'center' && !aside;
  return (
    <section aria-labelledby="page-title" className="bg-white pb-[60px] pt-[60px] sm:pb-20 sm:pt-24">
      <div
        className={`${CONTAINER} ${aside ? 'lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14' : ''}`}
      >
        <div className={center ? 'mx-auto max-w-[860px] text-center' : 'max-w-[760px]'}>
          <p className="pulse-eyebrow text-[#737373]">{eyebrow}</p>
          <h1
            id="page-title"
            className="mt-5 text-balance text-[38px] leading-[1.05] text-[#0A0A0A] sm:text-[56px] md:text-[48px] lg:text-[64px]"
          >
            {title}
          </h1>
          {lead ? (
            <p
              className={`mt-6 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px] ${
                center ? 'mx-auto' : ''
              }`}
            >
              {lead}
            </p>
          ) : null}
          {actions ? (
            <div
              className={`mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap ${center ? 'sm:justify-center' : ''}`}
            >
              {actions}
            </div>
          ) : null}
          {note ? <div className={`mt-5 ${center ? 'flex justify-center' : ''}`}>{note}</div> : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
