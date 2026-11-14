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
    <div className={`max-w-[720px] ${center ? 'mx-auto text-center' : ''} ${className}`}>
      <p className={`pulse-eyebrow ${dark ? 'text-[#C6F24E]' : 'text-[#737373]'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`mt-4 text-balance text-[28px] leading-[1.08] sm:text-[40px] lg:text-[48px] ${
          dark ? 'text-white' : 'text-[#0A0A0A]'
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={`mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] sm:text-[18px] ${
            center ? 'mx-auto' : ''
          } ${dark ? 'text-white/75' : 'text-[#525252]'}`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
