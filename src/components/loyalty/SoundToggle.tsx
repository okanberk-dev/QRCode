'use client';

// Sound on/off for the customer's loyalty pages (CLAUDE.md §61). Also
// unlocks audio on the first tap anywhere on the page, so a stamp added at
// the counter later can play its sound.
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundOn, playSound, setSoundOn, soundSupported, unlockAudio } from '@/lib/loyalty-sound';

export default function SoundToggle({ locale }: { locale: 'tr' | 'en' }) {
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
      aria-label={on ? (tr ? 'Sesi kapat' : 'Turn sound off') : tr ? 'Sesi aç' : 'Turn sound on'}
      className="bzl-tap inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/50"
    >
      {on ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
    </button>
  );
}
