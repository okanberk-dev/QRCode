/**
 * Section header used by every homepage section (spec §4): eyebrow → H2 →
 * one lead sentence. The H2 carries `id` so the parent <section> can point
 * `aria-labelledby` at it. Headings take their font, weight and tracking
 * from the global `:where(h1…h6)` rule — no inline fontFamily here.
 */
export default function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  tone = 'light',
  className = '',
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const dark = tone === 'dark';
  return (
    <div className={`max-w-[720px] ${className}`}>
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
            dark ? 'text-white/75' : 'text-[#525252]'
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
