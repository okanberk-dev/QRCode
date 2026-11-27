'use client';

import { useRef, useState, type ComponentProps } from 'react';
import { Smartphone } from 'lucide-react';
import { Sheet } from '../kit/Sheet';
import { useMenuCopy } from '../kit/useMenuCopy';
import { PhonePreview } from './PhonePreview';
import { usePhoneFit } from './usePhoneFit';

type PhoneProps = Omit<ComponentProps<typeof PhonePreview>, 'variant'>;

/**
 * Right-column preview (spec §7.9): the framed phone on a soft stage, a badge
 * when it shows something not saved yet, and the footer hint. On a window too
 * short for a useful phone the footer becomes "Önizlemeyi aç" (a sheet with the
 * bare preview); the framed phone is then not mounted (one preview at a time).
 */
export function PreviewPanel({ badge, ...phone }: PhoneProps & { badge?: string | null }) {
  const copy = useMenuCopy();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fit = usePhoneFit(stageRef, 'framed', { topOffset: phone.topOffset });
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={stageRef} className="min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-pn-canvas to-[#F0F0F0] px-4 py-4">
        {badge && (
          <p className="mb-2 text-center">
            <span className="inline-flex items-center rounded-full bg-pn-accent-soft px-2.5 py-1 text-[12px] font-medium text-pn-accent">{badge}</span>
          </p>
        )}
        {!fit.tooShort && <PhonePreview {...phone} variant="framed" />}
      </div>
      {fit.tooShort ? (
        <div className="border-t border-pn-line px-4 py-3">
          <button type="button" onClick={() => setSheetOpen(true)} className="bz-btn w-full">
            <Smartphone size={14} strokeWidth={2} aria-hidden="true" />
            {copy.preview.open}
          </button>
          {sheetOpen && (
            <Sheet open side="right" widthClass="sm:max-w-[440px]" onRequestClose={() => setSheetOpen(false)} title={copy.preview.title}>
              <PhonePreview {...phone} variant="bare" />
            </Sheet>
          )}
        </div>
      ) : (
        <p className="border-t border-pn-line px-4 py-3 text-[12px] leading-snug text-[#737373]">{copy.preview.footer}</p>
      )}
    </div>
  );
}
