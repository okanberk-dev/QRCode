'use client';

import { useState } from 'react';
import VideoModal from './VideoModal';

interface Props {
  locale: 'tr' | 'en';
  /** Defaults to a silent YouTube placeholder; override with the real demo URL. */
  videoSrc?: string;
  className?: string;
}

/**
 * Client-only "Watch demo" button that launches `VideoModal`. Drop-in
 * replacement for the old server-rendered Link.
 */
export default function WatchDemoButton({
  locale,
  videoSrc = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const isTr = locale === 'tr';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-6 py-4 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F5] sm:w-auto'
        }
      >
        <span aria-hidden className="pulse-icon-badge text-[11px]">
          ▶
        </span>
        {isTr ? 'Demo izle' : 'Watch demo'}
        <span className="font-mono text-[10px] text-[#737373]">
          {isTr ? '2 dk' : '2 min'}
        </span>
      </button>
      <VideoModal
        open={open}
        onClose={() => setOpen(false)}
        src={videoSrc}
        title={isTr ? 'Buaze Demo' : 'Buaze Demo'}
      />
    </>
  );
}
