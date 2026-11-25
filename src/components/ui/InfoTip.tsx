'use client';

/**
 * ⓘ next to a metric label: opens its definition (CLAUDE.md §58). Popover,
 * not hover-only, so it works on touch; the button keeps a 44 px hit area.
 */
import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';

export interface InfoTipProps {
  /** Definition text. */
  text: string;
  /** Metric name, for the button's accessible name. */
  label: string;
  isTr?: boolean;
}

export function InfoTip({ text, label, isTr = true }: InfoTipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={isTr ? `${label}: tanım` : `${label}: definition`}
          className="-m-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#737373] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8D62E]"
        >
          <Info size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={4}
          collisionPadding={12}
          className="z-[80] max-w-[280px] rounded-[10px] border border-[#EDEDED] bg-white px-3 py-2.5 text-[12.5px] leading-[1.5] text-[#262626] shadow-[0_12px_32px_rgba(10,10,10,0.12)]"
        >
          {text}
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default InfoTip;
