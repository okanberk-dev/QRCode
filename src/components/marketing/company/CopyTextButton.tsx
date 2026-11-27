'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface Props {
  text: string;
  /** Visible label, e.g. "Kopyala". */
  label: string;
  /** Shown (and announced) for a moment after a successful copy. */
  copiedLabel: string;
  /** Accessible name that says what is copied, e.g. "Kısa tanımı kopyala". */
  ariaLabel: string;
}

/**
 * Copies a press-kit text to the clipboard. The confirmation is announced
 * through a polite live region, so screen-reader users hear it too.
 */
export default function CopyTextButton({ text, label, copiedLabel, ariaLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4D4D4] bg-white px-4 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
      >
        {copied ? (
          <Check size={15} strokeWidth={2.5} className="text-[#0A0A0A]" aria-hidden="true" />
        ) : (
          <Copy size={15} strokeWidth={2} aria-hidden="true" />
        )}
        {copied ? copiedLabel : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ''}
      </span>
    </>
  );
}
