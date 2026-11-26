/**
 * Section header for the commercial marketing pages: eyebrow → H2 → one lead
 * sentence (marketing spec §4). Headings take their font, weight and
 * tracking from the global `:where(h1…h6)` rule — no inline fontFamily.
 * The H2 carries `id` so the parent <section> can use `aria-labelledby`.
 */
export default function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  tone = 'light',
  align = 'left',
  className = '',
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
  className?: string;
}) {
  const dark = tone === 'dark';
  const center = align === 'center';
  return (
    <div
      className={`rt-section-head__text ${className}`}
      style={{ ...(center ? { margin: '0 auto', textAlign: 'center' as const } : {}), ...(dark ? { color: '#fff' } : {}) }}
    >
      <p className="rt-eyebrow" style={dark ? { color: 'rgba(255,255,255,.8)' } : undefined}>
        {eyebrow}
      </p>
      <h2 id={id} className="rt-t-h1 text-balance">
        {title}
      </h2>
      {lead ? (
        <p className="rt-t-lead text-pretty" style={dark ? { color: 'rgba(255,255,255,.85)' } : undefined}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
