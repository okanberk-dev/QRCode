'use client';

import { Smartphone } from 'lucide-react';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * Right column (≥1024) while the menu is still empty and the setup has
 * nothing to show yet (spec §10): where the customer's phone will appear.
 */
export function SetupPreviewEmpty() {
  const copy = useMenuCopy();
  return (
    <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#FAFAFA] to-[#F0F0F0] px-6 py-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#525252] ring-1 ring-[#EDEDED]" aria-hidden="true">
        <Smartphone size={20} strokeWidth={1.75} />
      </span>
      <p className="max-w-[240px] text-[13px] leading-relaxed text-[#525252]">{copy.setup.previewEmpty}</p>
    </div>
  );
}
