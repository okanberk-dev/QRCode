'use client';

// Step indicator for panel wizards (audit builder, admin audit template,
// menu setup). One look everywhere: a soft grey track, the current step on a
// white chip, finished steps with a lime check. Steps the user may jump to
// are buttons; the rest are plain labels.

import { Check } from 'lucide-react';

export interface WizardStep {
  /** Full label (sm and up). */
  label: string;
  /** Short label for phones; falls back to `label`. */
  short?: string;
}

export function WizardSteps({
  steps,
  current,
  isComplete,
  canSelect,
  onSelect,
  ariaLabel,
  className = '',
}: {
  steps: readonly WizardStep[];
  current: number;
  /** Finished steps get a check mark. Default: every step before `current`. */
  isComplete?: (index: number) => boolean;
  /** Which steps can be clicked. Default: none (display only). */
  canSelect?: (index: number) => boolean;
  onSelect?: (index: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const done = isComplete ?? ((i: number) => i < current);
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol
        className="grid gap-1 rounded-full bg-pn-canvas p-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => {
          const active = i === current;
          const complete = !active && done(i);
          const clickable = !active && Boolean(onSelect) && (canSelect ? canSelect(i) : false);
          const body = (
            <>
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-medium tabular-nums ${
                  active
                    ? 'bg-pn-accent text-pn-ink'
                    : complete
                      ? 'bg-pn-ink text-pn-accent'
                      : 'bg-white text-[#737373]'
                }`}
              >
                {complete ? <Check size={13} strokeWidth={2.5} /> : i + 1}
              </span>
              <span className="min-w-0 truncate">
                <span className="sm:hidden">{step.short ?? step.label}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </>
          );
          const base =
            'flex min-h-[44px] w-full min-w-0 items-center justify-center gap-2 rounded-full px-2 text-[13px] font-medium transition-colors duration-200 sm:px-3 sm:text-[14px]';
          const tone = active
            ? 'bg-pn-ink text-white'
            : complete
              ? 'text-pn-ink'
              : 'text-[#737373]';
          return (
            <li key={i} className="min-w-0" aria-current={active ? 'step' : undefined}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(i)}
                  className={`${base} ${tone} hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pn-accent`}
                >
                  {body}
                </button>
              ) : (
                <span className={`${base} ${tone}`}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
