'use client';

import type { ReactNode } from 'react';
import { ArrowUpRight, ChevronRight, ClipboardPaste, LayoutTemplate, PencilLine } from 'lucide-react';
import { useMenuCopy } from '../kit/useMenuCopy';

export type SetupStartChoice = 'template' | 'paste' | 'blank';

/**
 * Empty menu, first screen (spec §10): three ways in — a ready-made template,
 * the owner's own pasted list, or an empty outline. The status card and the
 * toolbar are hidden until the first category exists; the page header stays.
 */
export function SetupStart({ onPick }: { onPick: (choice: SetupStartChoice) => void }) {
  const copy = useMenuCopy();
  const options: { id: SetupStartChoice; title: string; body: string; icon: ReactNode }[] = [
    { id: 'template', title: copy.setup.templateTitle, body: copy.setup.templateBody, icon: <LayoutTemplate size={17} strokeWidth={1.8} /> },
    { id: 'paste', title: copy.setup.pasteTitle, body: copy.setup.pasteBody, icon: <ClipboardPaste size={17} strokeWidth={1.8} /> },
    { id: 'blank', title: copy.setup.blankTitle, body: copy.setup.blankBody, icon: <PencilLine size={17} strokeWidth={1.8} /> },
  ];
  return (
    <section aria-labelledby="menu-setup-title" className="bz-card @container p-5 sm:p-7">
      <h2 id="menu-setup-title">
        <span className="text-[20px] font-medium leading-[26px] tracking-[-0.015em] text-pn-ink sm:text-[24px] sm:leading-[30px]">
          {copy.setup.startTitle}
        </span>
      </h2>
      <p className="mt-1.5 max-w-[560px] text-[14px] leading-[1.5] text-[#737373]">{copy.setup.startBody}</p>
      <div className="mt-6 grid gap-2.5 @min-[640px]:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onPick(option.id)}
            className="group flex min-h-[64px] items-center gap-3 rounded-[18px] bg-pn-canvas p-3 pr-4 text-left transition-[background-color,transform] duration-200 hover:bg-pn-accent-soft active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 @min-[640px]:min-h-[148px] @min-[640px]:flex-col @min-[640px]:items-start @min-[640px]:p-4"
          >
            <span className="flex shrink-0 items-center justify-between @min-[640px]:w-full">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pn-accent text-white"
                aria-hidden="true"
              >
                {option.icon}
              </span>
              <span
                className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-pn-ink transition-[background-color,color,transform] duration-200 group-hover:rotate-45 group-hover:bg-pn-accent group-hover:text-white motion-reduce:group-hover:rotate-0 @min-[640px]:inline-flex"
                aria-hidden="true"
              >
                <ArrowUpRight size={16} strokeWidth={1.8} />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-pn-ink">{option.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-[#737373]">{option.body}</span>
            </span>
            <ChevronRight size={16} strokeWidth={1.8} className="shrink-0 text-[#9A9A9A] @min-[640px]:hidden" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
