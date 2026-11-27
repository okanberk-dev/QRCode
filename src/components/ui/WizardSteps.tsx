'use client';

// Panel wizard kit (Pano, Fintora wizard style). One look for every
// "sihirbaz" in the owner and admin panels:
//
//   • WizardSteps   — the stepper. From 640px a row of pills (number circle +
//                     label); the current step is a black pill with a white
//                     number circle, finished steps carry a black check,
//                     upcoming steps are quiet white pills. On phones it folds
//                     into "Adım 2 / 3 · Maddeler" with a thin segmented
//                     progress bar (hatched remainder); the segments stay
//                     tappable where `canSelect` allows.
//   • WizardPanel   — the white step card: 20px title, one grey help line.
//   • WizardChoice  — a choice row (grey, 16px corners, icon circle, title +
//                     grey sub); the chosen one turns light green with a black
//                     ring and a black check.
//   • WizardSummaryRow — "what will be created" breakdown row.
//   • WizardFooter  — the action bar: grey "Geri" pill left, black primary
//                     pill right. Sticky at the bottom on phones (white,
//                     hairline, safe area), a floating white bar from 640px.
//
// Visual only: steps, validation and keyboard behaviour live in the callers.

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';

export interface WizardStep {
  /** Full label. */
  label: string;
  /** Short label; kept for older callers (the phone line uses `label`). */
  short?: string;
}

type WizardLocale = 'tr' | 'en';

/** Where the stepper sits: on the grey canvas (default) or inside a white card / dialog. */
type WizardSurface = 'canvas' | 'card';

export function WizardSteps({
  steps,
  current,
  isComplete,
  canSelect,
  onSelect,
  ariaLabel,
  className = '',
  locale,
  surface = 'canvas',
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
  /** Words on the phone line ("Adım 2 / 3" / "Step 2 of 3"); without it "2 / 3". */
  locale?: WizardLocale;
  /** Idle pills turn grey inside a white card or dialog. */
  surface?: WizardSurface;
}) {
  const done = isComplete ?? ((i: number) => i < current);
  const total = steps.length;
  const clickable = (i: number) => i !== current && Boolean(onSelect) && (canSelect ? canSelect(i) : false);
  const counter =
    locale === 'en'
      ? `Step ${current + 1} of ${total}`
      : locale === 'tr'
        ? `Adım ${current + 1} / ${total}`
        : `${current + 1} / ${total}`;
  const idle = surface === 'card' ? 'bg-[#F6F6F6]' : 'bg-white';
  const idleHover = surface === 'card' ? 'hover:bg-[#EBEBEB]' : 'hover:bg-[#EDEDED]';
  const idleCircle = surface === 'card' ? 'bg-white' : 'bg-[#F6F6F6]';
  const focus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2';

  return (
    <nav aria-label={ariaLabel} className={`min-w-0 ${className}`}>
      {/* Phones: one line + segmented progress. */}
      <div className="sm:hidden">
        <p className="flex min-w-0 items-baseline gap-1.5 text-[14px] leading-5">
          <span className="shrink-0 font-medium tabular-nums text-pn-accent">{counter}</span>
          <span aria-hidden="true" className="text-[#9A9A9A]">
            ·
          </span>
          <span className="min-w-0 truncate font-medium text-pn-ink">{steps[current]?.label}</span>
        </p>
        <ol className="mt-2.5 flex gap-1.5">
          {steps.map((step, i) => {
            const active = i === current;
            const filled = active || (!active && done(i));
            const bar = (
              <span
                aria-hidden="true"
                className={`block h-1.5 w-full rounded-full transition-colors duration-300 ${
                  filled ? 'bg-pn-accent' : 'pn-hatch'
                }`}
              />
            );
            return (
              <li key={i} className="min-w-0 flex-1" aria-current={active ? 'step' : undefined}>
                {clickable(i) ? (
                  <button
                    type="button"
                    onClick={() => onSelect?.(i)}
                    className={`relative flex h-3 w-full items-center rounded-full before:absolute before:inset-x-0 before:-inset-y-4 before:content-[''] ${focus}`}
                  >
                    {bar}
                    <span className="sr-only">
                      {i + 1}. {step.label}
                    </span>
                  </button>
                ) : (
                  <span className="flex h-3 items-center">
                    {bar}
                    <span className="sr-only">
                      {i + 1}. {step.label}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* 640px+: pill row. */}
      <ol className="hidden flex-wrap items-center gap-2 sm:flex">
        {steps.map((step, i) => {
          const active = i === current;
          const complete = !active && done(i);
          const tone = active
            ? 'bg-pn-accent text-white'
            : complete
              ? `${idle} text-pn-ink`
              : `${idle} text-[#737373]`;
          const circle = active
            ? 'bg-white text-pn-accent'
            : complete
              ? 'bg-pn-accent text-white'
              : `${idleCircle} text-[#737373]`;
          const body = (
            <>
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-medium tabular-nums ${circle}`}
              >
                {complete ? <Check size={14} strokeWidth={2.4} /> : i + 1}
              </span>
              <span className="min-w-0 truncate">{step.label}</span>
            </>
          );
          const pill = `inline-flex h-11 min-w-0 max-w-full items-center gap-2.5 rounded-full py-1 pl-2 pr-4 text-[14px] font-medium transition-[background-color,color,transform] duration-200 ${tone}`;
          return (
            <li key={i} className="flex min-w-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
              {clickable(i) ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(i)}
                  className={`${pill} ${idleHover} active:scale-[.97] ${focus}`}
                >
                  {body}
                </button>
              ) : (
                <span className={pill}>{body}</span>
              )}
              {i < total - 1 && <span aria-hidden="true" className="hidden h-px w-5 shrink-0 bg-[#DCDCDC] lg:block" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Step card ──────────────────────────────────────────────────────────

export function WizardPanel({
  title,
  description,
  icon,
  actions,
  headingId,
  headingRef,
  headingAs: Heading = 'h2',
  as: Root = 'section',
  children,
  className = '',
  'aria-label': ariaLabel,
}: {
  title?: ReactNode;
  description?: ReactNode;
  /** Optional black icon circle left of the title. */
  icon?: ReactNode;
  /** Right side of the header row (badge, link…). */
  actions?: ReactNode;
  headingId?: string;
  /** For callers that move focus to the step heading. */
  headingRef?: (el: HTMLHeadingElement | null) => void;
  headingAs?: 'h2' | 'h3';
  /** `div` when an outer <section> already names the step. */
  as?: 'section' | 'div';
  children?: ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <Root
      aria-labelledby={Root === 'section' && !ariaLabel && headingId ? headingId : undefined}
      aria-label={ariaLabel}
      className={`bz-card p-5 sm:p-7 ${className}`}
    >
      {hasHeader && (
        <div className={`flex flex-wrap items-start justify-between gap-3 ${children ? 'mb-5 sm:mb-6' : ''}`}>
          {/* 18rem basis: on phones the actions (badge, link) wrap under the title. */}
          <div className="flex min-w-0 flex-[1_1_18rem] items-start gap-3">
            {icon && (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <Heading
                  id={headingId}
                  ref={headingRef}
                  tabIndex={headingRef ? -1 : undefined}
                  className="text-[20px] font-medium leading-[26px] tracking-[-0.015em] text-pn-ink outline-none"
                >
                  {title}
                </Heading>
              )}
              {description && <p className="mt-1 text-[14px] leading-[1.5] text-[#737373]">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Root>
  );
}

// ─── Choice row ─────────────────────────────────────────────────────────

/** `card`: inside a WizardPanel / bz-card (grey row, white on phones). `plain`: always grey (dialogs, white pages). */
type ChoiceTone = 'card' | 'plain';

/** Row classes, for callers that wrap a native radio in a <label>.
 *  `row`: icon · text · check centred; `row-start`: top-aligned (long text);
 *  `stack`: a gallery tile (header row + preview below). */
export function wizardChoiceClass(
  selected: boolean,
  tone: ChoiceTone = 'card',
  layout: 'row' | 'row-start' | 'stack' = 'row',
): string {
  const shape =
    layout === 'stack'
      ? 'flex-col items-stretch gap-3 p-4'
      : layout === 'row-start'
        ? 'items-start gap-3 p-3 pr-4'
        : 'items-center gap-3 p-3 pr-4';
  const base = `group flex w-full min-h-[64px] ${shape} rounded-[16px] text-left transition-[background-color,box-shadow,transform] duration-200`;
  if (selected) return `${base} bg-pn-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)]`;
  return `${base} ${tone === 'plain' ? 'bg-[#F6F6F6]' : 'bg-pn-canvas'} hover:bg-[#EDEDED]`;
}

/** Icon circle classes inside a choice row. */
export function wizardChoiceIconClass(selected: boolean, tone: ChoiceTone = 'card'): string {
  const base =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200';
  if (selected) return `${base} bg-pn-accent text-white`;
  return `${base} ${tone === 'plain' ? 'bg-white' : 'bg-white max-sm:bg-[#F6F6F6]'} text-pn-ink`;
}

/** Right-hand state mark: black check when chosen, empty ring otherwise. */
export function WizardCheck({ selected, kind = 'radio' }: { selected: boolean; kind?: 'radio' | 'check' }) {
  if (selected) {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
      >
        <Check size={14} strokeWidth={2.6} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`h-6 w-6 shrink-0 border-[1.5px] border-[#D6D6D6] bg-white ${kind === 'radio' ? 'rounded-full' : 'rounded-[8px]'}`}
    />
  );
}

export function WizardChoice({
  selected,
  icon,
  title,
  description,
  trailing,
  indicator = 'radio',
  tone = 'card',
  layout = 'row',
  className = '',
  children,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
  selected: boolean;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Replaces the check circle (e.g. a chevron or a count). */
  trailing?: ReactNode;
  indicator?: 'radio' | 'check' | 'none';
  tone?: ChoiceTone;
  layout?: 'row' | 'row-start';
}) {
  return (
    <button
      type="button"
      {...rest}
      className={`${wizardChoiceClass(selected, tone, layout)} active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${className}`}
    >
      {icon && (
        <span aria-hidden="true" className={wizardChoiceIconClass(selected, tone)}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium leading-5 text-pn-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-[1.45] text-[#737373]">{description}</span>}
        {children}
      </span>
      {trailing ?? (indicator === 'none' ? null : <WizardCheck selected={selected} kind={indicator} />)}
    </button>
  );
}

// ─── Summary row ────────────────────────────────────────────────────────

export function WizardSummaryRow({
  icon,
  label,
  value,
  action,
  tone = 'card',
  stack = false,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  /** Optional trailing control (an edit button). */
  action?: ReactNode;
  tone?: ChoiceTone;
  /** Label above the value at every width (narrow columns). */
  stack?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[64px] min-w-0 items-center gap-3 rounded-[16px] p-3 pr-4 ${
        tone === 'plain' ? 'bg-[#F6F6F6]' : 'bg-pn-canvas'
      }`}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          {icon}
        </span>
      )}
      <div
        className={`flex min-w-0 flex-1 flex-col gap-0.5 ${stack ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-3'}`}
      >
        <span className={`min-w-0 text-[13px] leading-5 text-[#737373] ${stack ? '' : 'sm:text-[14px]'}`}>{label}</span>
        <span
          className={`min-w-0 break-words text-[14px] font-medium leading-5 text-pn-ink ${stack ? '' : 'sm:max-w-[60%] sm:text-right'}`}
        >
          {value}
        </span>
      </div>
      {action}
    </div>
  );
}

// ─── Action bar ─────────────────────────────────────────────────────────

const WIZARD_BACK_BASE =
  'min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#F6F6F6] px-5 text-[14px] font-medium text-pn-ink transition-[background-color,transform] duration-200 hover:bg-[#EBEBEB] active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2';

/** Grey "Geri / İptal" pill (full width share on phones). */
export const WIZARD_BACK_CLASS = `inline-flex ${WIZARD_BACK_BASE} max-sm:flex-1`;

/** Same pill, hidden on phones (a crowded bar keeps only the main actions). */
export const WIZARD_BACK_DESKTOP_CLASS = `hidden sm:inline-flex ${WIZARD_BACK_BASE}`;

/** Black primary pill ("İleri / Devam / Oluştur / Yayınla"). */
export const WIZARD_NEXT_CLASS =
  'bz-btn-primary inline-flex min-h-[44px] shrink-0 items-center justify-center max-sm:flex-1';

/**
 * Sticky action bar. `page`: full-bleed on phones (the page wrapper's 16px
 * gutter), a floating white bar from 640px. `float`: a floating white bar at
 * every width (inside a card). `modal`: pinned to the bottom of a Modal body
 * (px-6 / sm:px-7). `inline`: a plain row at the end of a card.
 */
export function WizardFooter({
  children,
  variant = 'page',
  className = '',
  top,
}: {
  children: ReactNode;
  variant?: 'page' | 'modal' | 'inline' | 'float';
  className?: string;
  /** Extra line above the buttons (progress bar, missing-field message). */
  top?: ReactNode;
}) {
  const shell =
    variant === 'float'
      ? 'sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-30 rounded-[24px] bg-white p-2 shadow-[0_14px_36px_-16px_rgba(17,17,16,0.28)] sm:bottom-3 sm:rounded-[28px]'
      : variant === 'modal'
      ? 'sticky bottom-0 z-20 -mx-6 -mb-5 border-t border-pn-line bg-white px-6 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:-mx-7 sm:px-7 sm:pb-4'
      : variant === 'inline'
        ? 'mt-6 border-t border-pn-line pt-4'
        : 'sticky bottom-0 z-30 -mx-4 border-t border-pn-line bg-white px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:bottom-3 sm:mx-0 sm:rounded-[28px] sm:border-0 sm:p-2 sm:shadow-[0_14px_36px_-16px_rgba(17,17,16,0.28)]';
  return (
    <div className={`${shell} ${className}`}>
      {top && <div className={`mb-2.5 sm:mb-2 ${variant === 'float' ? 'px-2 pt-1' : 'sm:px-2 sm:pt-1'}`}>{top}</div>}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">{children}</div>
    </div>
  );
}

// ─── Skeletons (loading.tsx) ────────────────────────────────────────────

/** Stepper placeholder with the same box as WizardSteps (CLAUDE.md §40.10). */
export function WizardStepsSkeleton({
  count = 3,
  surface = 'canvas',
  className = '',
}: {
  count?: number;
  surface?: WizardSurface;
  className?: string;
}) {
  const pill = surface === 'card' ? 'bg-[#F6F6F6]' : 'bg-white';
  return (
    <div aria-hidden="true" className={className}>
      <div className="sm:hidden">
        <div className="h-5 w-48 max-w-full rounded-full bg-pn-line" />
        <div className="mt-2.5 flex h-3 items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-pn-line" />
          ))}
        </div>
      </div>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`flex h-11 w-36 items-center gap-2.5 rounded-full pl-2 pr-4 ${i === 0 ? 'bg-pn-line' : pill}`}>
            <div className={`h-7 w-7 shrink-0 rounded-full ${i === 0 ? 'bg-white' : 'bg-pn-line'}`} />
            <div className={`h-3 flex-1 rounded-full ${i === 0 ? 'bg-white/70' : 'bg-pn-line'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Action bar placeholder (page variant). */
export function WizardFooterSkeleton({ buttons = 2 }: { buttons?: number }) {
  return (
    <div
      aria-hidden="true"
      className="-mx-4 flex items-center gap-2 border-t border-pn-line bg-white px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:mx-0 sm:rounded-[28px] sm:border-0 sm:p-2"
    >
      <div className="h-11 flex-1 rounded-full bg-pn-line sm:w-28 sm:flex-none" />
      <div className="hidden flex-1 sm:block" />
      {Array.from({ length: Math.max(1, buttons - 1) }).map((_, i) => (
        <div key={i} className="h-11 flex-1 rounded-full bg-pn-line sm:w-36 sm:flex-none" />
      ))}
    </div>
  );
}
