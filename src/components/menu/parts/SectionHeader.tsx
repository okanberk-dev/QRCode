import type { ResolvedMenuDesign } from '@/lib/menu-design';
import type { MenuCopy } from '../menu-labels';

/**
 * Category title in one of four preset styles: `rule` (title + hairline),
 * `chapter` (centred, accent ornament), `numbered` (01 in accent text) and
 * `plain` (title, count, bottom rule).
 */
export default function SectionHeader({
  d, title, description, index, count, copy, titleId,
}: {
  d: ResolvedMenuDesign;
  title: string;
  description: string | null;
  index: number;
  count: number;
  copy: MenuCopy;
  titleId: string;
}) {
  const variant = d.structure.section;
  const showCount = d.structure.showCount;
  const countEl = showCount ? (
    <span className="shrink-0 text-[13px] leading-5 font-medium tabular-nums text-(--m-muted)">{copy.itemCount(count)}</span>
  ) : null;
  const desc = description ? <p className="bzm-catdesc mt-2 max-w-[56ch]">{description}</p> : null;

  if (variant === 'chapter') {
    return (
      <header className="mb-6 flex flex-col items-center text-center">
        <span aria-hidden className="mb-4 flex items-center gap-2 text-(--m-accent-ui)">
          <span className="h-px w-8 bg-current" />
          <span className="size-1.5 rotate-45 bg-current" />
          <span className="h-px w-8 bg-current" />
        </span>
        <h2 id={titleId} className="bzm-section">{title}</h2>
        {desc && <div className="flex justify-center">{desc}</div>}
        {countEl && <div className="mt-2">{countEl}</div>}
      </header>
    );
  }

  if (variant === 'numbered') {
    return (
      <header className="mb-5 border-b border-(--m-rule) pb-4">
        <div className="flex items-baseline gap-3">
          <span aria-hidden className="shrink-0 text-[13px] leading-5 font-semibold tracking-[0.12em] tabular-nums text-(--m-accent-text)">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h2 id={titleId} className="bzm-section min-w-0 flex-1">{title}</h2>
          {countEl}
        </div>
        {desc}
      </header>
    );
  }

  if (variant === 'plain') {
    return (
      <header className="mb-2 border-b border-(--m-rule-strong) pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={titleId} className="bzm-section min-w-0">{title}</h2>
          {countEl}
        </div>
        {desc}
      </header>
    );
  }

  // rule
  return (
    <header className="mb-5">
      <div className="flex items-center gap-4">
        <h2 id={titleId} className="bzm-section min-w-0">{title}</h2>
        <span aria-hidden className="h-px min-w-6 flex-1 bg-(--m-rule)" />
        {countEl}
      </div>
      <span aria-hidden className="mt-3 block h-0.5 w-8 rounded-full bg-(--m-accent-ui)" />
      {desc}
    </header>
  );
}
