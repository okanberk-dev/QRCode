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
        className="grid gap-1.5 rounded-2xl bg-[#F5F5F5] p-1.5"
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
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold tabular-nums ${
                  active
                    ? 'bg-[#0A0A0A] text-white'
                    : complete
                      ? 'bg-[#C6F24E] text-[#0A0A0A]'
                      : 'bg-white text-[#737373]'
                }`}
              >
                {complete ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 truncate">
                <span className="sm:hidden">{step.short ?? step.label}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </>
          );
          const base =
            'flex min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[12px] font-semibold transition-colors sm:min-h-[40px] sm:gap-2 sm:px-2.5 sm:text-[12.5px]';
          const tone = active
            ? 'bg-white text-[#0A0A0A] shadow-sm'
            : complete
              ? 'text-[#0A0A0A]'
              : 'text-[#737373]';
          return (
            <li key={i} className="min-w-0" aria-current={active ? 'step' : undefined}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(i)}
                  className={`${base} ${tone} hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C6F24E]`}
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
