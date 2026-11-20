'use client';

import type { ReactNode } from 'react';
import { ChevronRight, ClipboardPaste, LayoutTemplate, PencilLine } from 'lucide-react';
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
    { id: 'template', title: copy.setup.templateTitle, body: copy.setup.templateBody, icon: <LayoutTemplate size={18} strokeWidth={2} /> },
    { id: 'paste', title: copy.setup.pasteTitle, body: copy.setup.pasteBody, icon: <ClipboardPaste size={18} strokeWidth={2} /> },
    { id: 'blank', title: copy.setup.blankTitle, body: copy.setup.blankBody, icon: <PencilLine size={18} strokeWidth={2} /> },
  ];
  return (
    <section aria-labelledby="menu-setup-title" className="bz-card @container p-6 sm:p-8">
      <h2 id="menu-setup-title">
        <span className="bz-h-tight text-[24px] text-[#0A0A0A]">{copy.setup.startTitle}</span>
      </h2>
      <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-[#525252]">{copy.setup.startBody}</p>
      <div className="mt-6 grid gap-3 @min-[640px]:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onPick(option.id)}
            className="group flex min-h-[132px] flex-col items-start gap-3 rounded-xl border border-[#E5E5E5] bg-white p-4 text-left transition-[border-color,box-shadow] duration-[120ms] hover:border-[#0A0A0A] hover:shadow-[0_1px_2px_rgba(10,10,10,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
          >
            <span className="flex w-full items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]" aria-hidden="true">
                {option.icon}
              </span>
              <ChevronRight
                size={16}
                strokeWidth={2}
                className="text-[#A3A3A3] transition-transform duration-[120ms] group-hover:text-[#0A0A0A] motion-safe:group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-[#0A0A0A]">{option.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-[#737373]">{option.body}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
