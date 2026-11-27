'use client';

import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import {
  AMBIENT_ACTIVE_EVENT,
  AMBIENT_MOTION_EVENT,
  AMBIENT_MOTION_STORAGE_KEY,
} from './scene-types';

/**
 * Pause / play control for the decorative 3D scenes (WCAG 2.2.2: moving
 * content that starts automatically and lasts over 5 s needs a pause). It
 * stays hidden until a scene actually starts animating, so visitors who only
 * see the static fallback never get a button that does nothing. One choice
 * applies to every scene for the rest of the visit (sessionStorage).
 */
export default function AmbientMotionToggle({
  locale,
  className = '',
  tone = 'dark',
}: {
  locale: 'tr' | 'en';
  className?: string;
  /** Background the button sits on. */
  tone?: 'dark' | 'light';
}) {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try {
      setPaused(window.sessionStorage.getItem(AMBIENT_MOTION_STORAGE_KEY) === 'paused');
    } catch {
      /* storage blocked: default to playing */
    }
    const onActive = () => setVisible(true);
    const onMotion = (event: Event) => {
      setPaused(Boolean((event as CustomEvent<{ paused?: boolean }>).detail?.paused));
    };
    window.addEventListener(AMBIENT_ACTIVE_EVENT, onActive);
    window.addEventListener(AMBIENT_MOTION_EVENT, onMotion);
    return () => {
      window.removeEventListener(AMBIENT_ACTIVE_EVENT, onActive);
      window.removeEventListener(AMBIENT_MOTION_EVENT, onMotion);
    };
  }, []);

  if (!visible) return null;

  const toggle = () => {
    const next = !paused;
    try {
      if (next) window.sessionStorage.setItem(AMBIENT_MOTION_STORAGE_KEY, 'paused');
      else window.sessionStorage.removeItem(AMBIENT_MOTION_STORAGE_KEY);
    } catch {
      /* storage blocked: the choice lasts until reload */
    }
    window.dispatchEvent(new CustomEvent(AMBIENT_MOTION_EVENT, { detail: { paused: next } }));
  };

  const label = paused
    ? locale === 'tr'
      ? 'Animasyonu başlat'
      : 'Play animation'
    : locale === 'tr'
      ? 'Animasyonu durdur'
      : 'Pause animation';

  const toneClass =
    tone === 'dark'
      ? 'border-white/20 bg-[#0A0A0A]/70 text-white/85 hover:bg-[#1A1A1A] hover:text-white'
      : 'border-[#D4D4D4] bg-white/85 text-[#333333] hover:bg-white hover:text-[#0A0A0A]';

  return (
    <button
      type="button"
      onClick={toggle}
      // The label itself says what the button will do next, so it carries no
      // aria-pressed (a changing label plus a pressed state contradict each
      // other for screen readers).
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2 ${
        tone === 'dark' ? 'focus-visible:ring-offset-[#0A0A0A]' : 'focus-visible:ring-offset-white'
      } ${toneClass} ${className}`}
    >
      {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
    </button>
  );
}
