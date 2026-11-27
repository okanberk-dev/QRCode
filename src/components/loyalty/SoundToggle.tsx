'use client';

// Sound on/off for the loyalty pages (CLAUDE.md §61): the customer's card,
// the staff mode of the card and the panel counter. Also unlocks audio on
// the first tap anywhere on the page, so a stamp added later can play its
// sound. One setting per device (`buaze:sound`).
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundOn, playSound, setSoundOn, soundSupported, unlockAudio } from '@/lib/loyalty-sound';

const VARIANTS = {
  /** Over a photo or brand colour (customer panel header). */
  overlay: 'h-11 w-11 rounded-full bg-black/35 text-white backdrop-blur-md hover:bg-black/50 focus-visible:ring-white',
  /** On a coloured bar (staff mode header, purple). */
  dark: 'h-10 w-10 rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white',
  /** On a panel card: grey circle, no border (Pano icon button). */
  panel: 'h-10 w-10 rounded-full bg-pn-canvas text-[#525252] hover:bg-pn-line focus-visible:ring-[#111110]',
} as const;

export default function SoundToggle({
  locale,
  variant = 'overlay',
}: {
  locale: 'tr' | 'en';
  variant?: keyof typeof VARIANTS;
}) {
  const tr = locale === 'tr';
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!soundSupported()) return;
    setReady(true);
    setOn(isSoundOn());
    const unlock = () => unlockAudio();
    document.addEventListener('pointerup', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      document.removeEventListener('pointerup', unlock, { capture: true });
      document.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  if (!ready) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        setOn(next);
        setSoundOn(next);
        if (next) {
          unlockAudio();
          playSound('tap');
        }
      }}
      aria-pressed={on}
      aria-label={tr ? 'Ses' : 'Sound'}
      title={on ? (tr ? 'Ses açık' : 'Sound on') : tr ? 'Ses kapalı' : 'Sound off'}
      className={`bzl-tap inline-flex shrink-0 items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${VARIANTS[variant]}`}
    >
      {on ? <Volume2 size={variant === 'panel' ? 15 : 16} aria-hidden="true" /> : <VolumeX size={variant === 'panel' ? 15 : 16} aria-hidden="true" />}
    </button>
  );
}
