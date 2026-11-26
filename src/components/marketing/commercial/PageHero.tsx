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
    <section aria-labelledby="page-title" className="rt-sheet">
      <div className={`${CONTAINER} ${aside ? 'rt-split-hero' : 'rt-page-head'}`}>
        <div className={aside ? 'rt-split-hero__text' : 'rt-page-head__text'} style={center ? { margin: '0 auto', textAlign: 'center', justifyItems: 'center' } : undefined}>
          <p className="rt-eyebrow">{eyebrow}</p>
          <h1 id="page-title" className="rt-t-h1 text-balance">
            {title}
          </h1>
          {lead ? <p className="rt-t-lead text-pretty">{lead}</p> : null}
          {actions ? (
            <div className="rt-btn-group" style={center ? { justifyContent: 'center' } : undefined}>
              {actions}
            </div>
          ) : null}
          {note ? <div className="rt-t-sm rt-t-muted">{note}</div> : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
