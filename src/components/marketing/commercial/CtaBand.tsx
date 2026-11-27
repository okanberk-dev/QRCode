import Link from 'next/link';

export interface CtaLink {
  href: string;
  label: string;
  /** rel="nofollow" — for /auth/* and /api/* targets (spec §5). */
  nofollow?: boolean;
}

/**
 * Closing brand band, the same visual language as the homepage's final CTA:
 * one H2, an optional lead or short list of verifiable facts, at most two
 * calls to action. Server component.
 */
export default function CtaBand({
  id,
  title,
  lead,
  facts,
  primary,
  secondary,
}: {
  id: string;
  title: string;
  lead?: string;
  facts?: readonly string[];
  primary: CtaLink;
  secondary?: CtaLink;
}) {
  return (
    <section aria-labelledby={id} className="rt-container" style={{ paddingBlock: 'clamp(48px, 8vw, 96px)' }}>
      <div className="rt-cta-panel">
        <div className="rt-cta-panel__left">
          <h2 id={id} className="rt-t-h1 text-balance">
            {title}
          </h2>
          {lead ? <p className="rt-t-body-lg text-pretty">{lead}</p> : null}
        </div>
        <div className="rt-cta-panel__right">
          {facts && facts.length > 0 ? (
            <ul className="rt-checklist rt-checklist--white">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
          <div className="rt-btn-group">
            <Link href={primary.href} rel={primary.nofollow ? 'nofollow' : undefined} className="rt-btn rt-btn--white">
              {primary.label}
            </Link>
            {secondary ? (
              <Link href={secondary.href} rel={secondary.nofollow ? 'nofollow' : undefined} className="rt-btn rt-btn--ghost-white">
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
