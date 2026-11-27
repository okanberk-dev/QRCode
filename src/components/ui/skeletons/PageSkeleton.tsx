/**
 * Flat (animation-free) skeleton primitives for `loading.tsx` segment
 * fallbacks across owner + admin panels.
 *
 * Pattern (CLAUDE.md §40.10):
 *   - Next.js shows `loading.tsx` during server-side render of the segment
 *     (auth + Prisma fetch window).
 *   - Once server data is ready, the real page replaces the skeleton —
 *     server-hydrated client components skip their own loading flash
 *     (initialData prop + skipFirstFetchRef pattern).
 *   - These primitives use a flat `#EDEDED` placeholder (Pulse n200 token)
 *     with no shimmer animation, matching the YouTube/Vercel/Linear feel
 *     the operator chose during Stage 102 follow-up.
 *
 * Each `loading.tsx` composes <SkBox> rectangles inside a wrapper that
 * matches the actual page's `mx-auto max-w-[N] px-... py-...` so there's
 * zero layout shift when the real content arrives (CLS=0).
 */

import type { ReactNode } from 'react';

interface BoxProps {
  className?: string;
}

/**
 * Single flat gray rectangle. Use width/height utilities (`h-4`,
 * `w-32`, etc.) in `className` to shape it. `rounded` is included by
 * default — drop with `rounded-none` if a square edge is needed.
 */
export function SkBox({ className = '' }: BoxProps) {
  return (
    <div
      className={`bg-pn-line rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Standard `<PageHeader>` skeleton — eyebrow chip + h1 + description +
 * optional actions slot. Mirrors the spacing the real PageHeader
 * primitive produces.
 */
export function SkPageHeader({
  withActions = false,
  withDescription = true,
  withEyebrow = true,
  titleWidth = 'w-64',
}: {
  withActions?: boolean;
  withDescription?: boolean;
  /** `false` for pages whose PageHeader has no eyebrow line. */
  withEyebrow?: boolean;
  titleWidth?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3 min-w-0 flex-1">
        {withEyebrow && <SkBox className="h-3 w-24" />}
        <SkBox className={`h-9 ${titleWidth} max-w-full`} />
        {withDescription && (
          <SkBox className="h-4 w-80 max-w-full" />
        )}
      </div>
      {withActions && (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <SkBox className="h-9 w-24" />
          <SkBox className="h-9 w-28" />
        </div>
      )}
    </div>
  );
}

/**
 * 4-stat KPI grid (StatCard equivalent). Mobile 2-col, desktop N-col.
 *
 * Inline literal grid-cols-* classes — Tailwind v4 picks up class strings
 * that appear verbatim in source. The previous static `Record` map was
 * also literal but the v4 scanner sometimes missed map values referenced
 * by computed index; this inline branch removes that ambiguity.
 */
export function SkStatGrid({ count = 4 }: { count?: 2 | 3 | 4 }) {
  const cols =
    count === 4
      ? 'grid grid-cols-2 lg:grid-cols-4 gap-3'
      : count === 3
        ? 'grid grid-cols-2 lg:grid-cols-3 gap-3'
        : 'grid grid-cols-2 lg:grid-cols-2 gap-3';
  return (
    <div className={cols}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bz-card p-4 space-y-3">
          <SkBox className="h-3 w-16" />
          <SkBox className="h-7 w-20" />
          <SkBox className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Generic content card — title + body lines. Use multiple for
 * stacked sections.
 */
export function SkCard({
  titleWidth = 'w-40',
  lines = 3,
}: {
  titleWidth?: string;
  lines?: number;
}) {
  return (
    <div className="bz-card p-5 space-y-3">
      <SkBox className={`h-5 ${titleWidth}`} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkBox
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton — header strip + rows. Used by list pages.
 *
 * Inline literal grid-cols-* classes (see SkStatGrid comment).
 */
export function SkTable({
  rows = 6,
  cols = 4,
}: {
  rows?: number;
  cols?: 3 | 4 | 5 | 6;
}) {
  const colsClass =
    cols === 6
      ? 'grid gap-3 grid-cols-6'
      : cols === 5
        ? 'grid gap-3 grid-cols-5'
        : cols === 3
          ? 'grid gap-3 grid-cols-3'
          : 'grid gap-3 grid-cols-4';
  return (
    <div className="bz-card overflow-hidden">
      {/* Header strip */}
      <div className="border-b border-pn-line px-4 py-3">
        <div className={colsClass}>
          {Array.from({ length: cols }).map((_, i) => (
            <SkBox key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-pn-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-4">
            <div className={colsClass}>
              {Array.from({ length: cols }).map((_, c) => (
                <SkBox
                  key={c}
                  className={`h-4 ${c === 0 ? 'w-32' : 'w-20'} max-w-full`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card grid skeleton — N cards arranged in responsive grid.
 * Inline full className per branch — guarantees Tailwind picks every
 * responsive variant up (see SkStatGrid comment).
 */
export function SkCardGrid({
  count = 6,
  cols = 3,
}: {
  count?: number;
  cols?: 2 | 3 | 4;
}) {
  const wrapperClass =
    cols === 4
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
      : cols === 2
        ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  return (
    <div className={wrapperClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bz-card p-4 space-y-3">
          <SkBox className="h-5 w-32" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-4 w-3/4" />
          <div className="flex gap-2 pt-2">
            <SkBox className="h-8 w-20" />
            <SkBox className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Form skeleton — field rows. Each row = label + input rectangle.
 */
export function SkForm({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bz-card p-5 space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkBox className="h-3 w-32" />
          <SkBox className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <SkBox className="h-9 w-20" />
        <SkBox className="h-9 w-24" />
      </div>
    </div>
  );
}

/**
 * Tab strip skeleton (settings hubs, multi-section pages).
 */
export function SkTabStrip({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-pn-line pb-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkBox key={i} className="h-8 w-20" />
      ))}
    </div>
  );
}

/**
 * Wrapper for a complete page skeleton. Caller passes children which
 * sit inside the canonical `mx-auto w-full max-w-[N] px-... py-...
 * space-y-5` shell.
 *
 * `max` defaults to `1200px` (most pages); pass `1100` for settings /
 * forms, `1400` for data-dense tables, `640` for narrow error/empty
 * states.
 *
 * **Width guarantee**: uses inline `style={{ maxWidth }}` instead of a
 * Tailwind arbitrary `max-w-[Npx]` utility. In a `flex flex-col` parent
 * (panel main element), Tailwind v4 sometimes failed to compile
 * arbitrary max-w values pulled from a Record map by computed index —
 * the resulting wrapper collapsed to intrinsic content width and
 * appeared as a narrow stripe centered in the viewport. Inline style
 * is render-time and bypasses the scanner entirely. `w-full` ensures
 * the element stretches to parent width before max-width caps it.
 */
// Literal class map — Tailwind v4 scanner dinamik `space-y-${n}` göremez.
const SHELL_SPACE_CLASS = {
  3: 'space-y-3',
  3.5: 'space-y-3.5',
  4: 'space-y-4',
  5: 'space-y-5',
  6: 'space-y-6',
} as const;

export function SkPageShell({
  max = 1440,
  space = 5,
  children,
}: {
  max?: 640 | 920 | 1100 | 1200 | 1280 | 1400 | 1440 | 1600;
  /** Sayfa wrapper'ının `space-y-*` değeri (CLS parity, §40.10). Default 5. */
  space?: keyof typeof SHELL_SPACE_CLASS;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-7 py-6 lg:py-8 ${SHELL_SPACE_CLASS[space]}`}
      style={{ maxWidth: `${max}px` }}
    >
      {children}
    </div>
  );
}
