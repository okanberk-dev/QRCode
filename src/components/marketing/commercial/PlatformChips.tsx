import { REVIEW_PLATFORMS } from './review-platforms';

/**
 * The 10 supported review platforms as plain text chips with a brand-color
 * dot. Text stays in the HTML (indexable, readable by screen readers).
 */
export default function PlatformChips({
  className = '',
  align = 'left',
}: {
  className?: string;
  align?: 'left' | 'center';
}) {
  return (
    <ul className={`flex flex-wrap gap-2 ${align === 'center' ? 'justify-center' : ''} ${className}`}>
      {REVIEW_PLATFORMS.map((p) => (
        <li
          key={p.key}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[var(--rt-cream)] px-4 text-[16px] text-[var(--rt-ink-900)]"
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}
        </li>
      ))}
    </ul>
  );
}
