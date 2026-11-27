'use client';

import { ArrowRight, Info } from 'lucide-react';
import { luminance } from '@/lib/menu-palette';
import type { ResolvedMenuDesign } from '@/lib/menu-design';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * Tells the owner when the menu uses a different shade of their accent
 * (menu-design-final §11.1, §12.1): shown when the resolver adjusted the text,
 * fill or banner role for the draft. A two-dot pair shows "your pick → on the
 * menu". Nothing is changed on the owner's colour itself.
 */
export function ContrastNote({ resolved, surfaceName }: { resolved: ResolvedMenuDesign; surfaceName: string }) {
  const copy = useMenuCopy();
  const { adjusted, colors } = resolved;
  if (!adjusted.text && !adjusted.fill && !adjusted.banner) return null;
  const used = adjusted.text ? colors.accentText : adjusted.fill ? colors.accentFill : colors.banner;
  const text = adjusted.text
    ? copy.design.contrastText(surfaceName, luminance(colors.accentText) > luminance(colors.accent))
    : copy.design.contrastFill;

  const dot = (hex: string) => (
    <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} aria-hidden="true" />
  );

  return (
    <div role="note" className="flex gap-2.5 rounded-[20px] border border-pn-line-strong bg-pn-canvas p-3">
      <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-[#525252]" aria-hidden="true" />
      <div className="min-w-0 space-y-2">
        <p className="text-[13px] leading-relaxed text-[#404040]">{text}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#525252]">
          <span className="inline-flex items-center gap-1.5">
            {dot(colors.accent)}
            {copy.design.contrastPicked}
            <span className="font-mono text-[12px] text-[#737373]">{colors.accent}</span>
          </span>
          <ArrowRight size={12} strokeWidth={2} className="text-[#A3A3A3]" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            {dot(used)}
            {copy.design.contrastUsed}
            <span className="font-mono text-[12px] text-[#737373]">{used}</span>
          </span>
        </p>
      </div>
    </div>
  );
}
