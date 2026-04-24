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
          'inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors'
        }
      >
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0A0A] text-[11px] text-[#C6F24E]"
        >
          ▶
        </span>
        {isTr ? 'Demo izle (2 dk)' : 'Watch demo (2 min)'}
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
