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
          className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3.5 text-[14px] font-medium text-[#0A0A0A]"
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}
        </li>
      ))}
    </ul>
  );
}
