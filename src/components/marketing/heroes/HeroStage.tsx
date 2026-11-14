'use client';

/**
 * Homepage hero stage: a 10 s loop that shows the real review flow (spec D1)
 * as a labelled sample — "Örnek akış" / "Sample flow".
 *
 *   1. QR code (optional table label)
 *   2. the customer scans it
 *   3. 5★ (the default threshold): the Google review page opens
 *   4. below the threshold: private feedback to the business, with the
 *      public "Google üzerinde yorum yaz" link on the same screen
 *   5. Pulse AI drafts a reply that is never sent without approval
 *
 * Decorative: the card is aria-hidden; the hero's H1, subtitle and CTAs are
 * server-rendered by HeroCinematic. The first frame (time 0, the QR card) is
 * what the server HTML shows; reduced motion freezes on the last frame (the
 * draft card). Timing lives in hero-helpers.ts.
 *
 * The loop runs for more than 5 s next to other content, so it has a pause
 * button (WCAG 2.2.2). It shares the site-wide ambient-motion preference with
 * the three.js scenes (same event + sessionStorage key as
 * AmbientMotionToggle): pausing here pauses them too, and vice versa.
 */

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Pause, Play, QrCode, Scan, Sparkles, Star } from 'lucide-react';
import { Stage, useTimeline } from '@/lib/anim/stage';
import {
  AMBIENT_MOTION_EVENT,
  AMBIENT_MOTION_STORAGE_KEY,
} from '@/components/marketing/three/scene-types';
import { Sprite } from '@/lib/anim/sprite';
import { animate, clamp, interpolate } from '@/lib/anim/interpolate';
import { Easing } from '@/lib/anim/easing';
import {
  CINEMATIC_DURATION,
  CINEMATIC_OVERLAP,
  CINEMATIC_SCENES,
  CINEMATIC_SCENE_ORDER,
  activeSceneIndex,
  type CinematicSceneKey,
} from './hero-helpers';

const COPY = {
  tr: {
    sample: 'Örnek akış',
    steps: {
      qr: 'QR kodunuz',
      scan: 'Müşteri okutur',
      rate: 'Puan verir',
      privateFeedback: 'Eşiğin altındaki puan',
      draft: 'Pulse AI taslağı',
    },
    tableLabel: 'Masa 12',
    redirect: 'Google yorum sayfası açılıyor',
    privateTitle: 'Size özel geri bildirim',
    privateText: 'Siparişimiz biraz geç geldi.',
    publicLink: 'Google üzerinde yorum yaz',
    draftBadge: 'Pulse AI',
    draftTone: 'Özür dileyen ton',
    draftText:
      'Geri bildiriminiz için teşekkür ederiz. Gecikme için özür dileriz; konuyu ekibimizle hemen ele alıyoruz.',
    draftNote: 'Siz onaylamadan gönderilmez',
    pause: 'Animasyonu durdur',
    play: 'Animasyonu başlat',
  },
  en: {
    sample: 'Sample flow',
    steps: {
      qr: 'Your QR code',
      scan: 'The customer scans',
      rate: 'They give a rating',
      privateFeedback: 'A rating below your threshold',
      draft: 'Pulse AI draft',
    },
    tableLabel: 'Table 12',
    redirect: 'Opening your Google review page',
    privateTitle: 'Private feedback to you',
    privateText: 'Our order came a little late.',
    publicLink: 'Write a review on Google',
    draftBadge: 'Pulse AI',
    draftTone: 'Apologetic tone',
    draftText:
      "Thank you for your feedback, and we're sorry about the delay. We're taking it up with our team right away.",
    draftNote: 'Not sent until you approve it',
    pause: 'Pause animation',
    play: 'Play animation',
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

/** Opacity for a scene: fade in/out over the cross-fade overlap. */
function sceneOpacity(
  key: CinematicSceneKey,
  progress: number,
  { fadeIn = true, fadeOut = true }: { fadeIn?: boolean; fadeOut?: boolean } = {},
): number {
  const { start, end } = CINEMATIC_SCENES[key];
  const span = CINEMATIC_OVERLAP / (end - start);
  const inPart = fadeIn ? clamp(progress / span, 0, 1) : 1;
  const outPart = fadeOut ? clamp((1 - progress) / span, 0, 1) : 1;
  return Math.min(inPart, outPart);
}

function readPausedPreference(): boolean {
  try {
    return window.sessionStorage.getItem(AMBIENT_MOTION_STORAGE_KEY) === 'paused';
  } catch {
    return false;
  }
}

export default function HeroStage({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  // `animating` is only known on the client: no button in the server HTML
  // and none under reduced motion (the stage is a still frame then).
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncReduced = () => setAnimating(!reducedQuery.matches);
    syncReduced();
    setPaused(readPausedPreference());
    const onMotion = (event: Event) => {
      setPaused(Boolean((event as CustomEvent<{ paused?: boolean }>).detail?.paused));
    };
    window.addEventListener(AMBIENT_MOTION_EVENT, onMotion);
    reducedQuery.addEventListener?.('change', syncReduced);
    return () => {
      window.removeEventListener(AMBIENT_MOTION_EVENT, onMotion);
      reducedQuery.removeEventListener?.('change', syncReduced);
    };
  }, []);

  const togglePaused = () => {
    const next = !paused;
    try {
      if (next) window.sessionStorage.setItem(AMBIENT_MOTION_STORAGE_KEY, 'paused');
      else window.sessionStorage.removeItem(AMBIENT_MOTION_STORAGE_KEY);
    } catch {
      /* storage blocked: the choice lasts until reload */
    }
    // Same event the 3D scenes listen to; our own listener updates `paused`.
    window.dispatchEvent(new CustomEvent(AMBIENT_MOTION_EVENT, { detail: { paused: next } }));
  };

  const label = paused ? copy.play : copy.pause;

  return (
    <div className="relative">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white shadow-[0_24px_60px_-34px_rgba(10,10,10,0.28)]"
        aria-hidden="true"
      >
        {/* Stage has no external pause API: a paused stage is remounted with
            autoplay off, which holds its first frame. */}
        <Stage
          key={paused ? 'paused' : 'playing'}
          duration={CINEMATIC_DURATION}
          loop
          autoplay={!paused}
          className="absolute inset-0"
        >
          <StageHeader copy={copy} />

          <Sprite start={CINEMATIC_SCENES.qr.start} end={CINEMATIC_SCENES.qr.end}>
            {({ progress }) => <SceneQr progress={progress} copy={copy} />}
          </Sprite>
          <Sprite start={CINEMATIC_SCENES.scan.start} end={CINEMATIC_SCENES.scan.end}>
            {({ progress }) => <SceneScan progress={progress} copy={copy} />}
          </Sprite>
          <Sprite start={CINEMATIC_SCENES.rate.start} end={CINEMATIC_SCENES.rate.end}>
            {({ progress }) => <SceneRate progress={progress} copy={copy} />}
          </Sprite>
          <Sprite
            start={CINEMATIC_SCENES.privateFeedback.start}
            end={CINEMATIC_SCENES.privateFeedback.end}
          >
            {({ progress }) => <ScenePrivateFeedback progress={progress} copy={copy} />}
          </Sprite>
          <Sprite start={CINEMATIC_SCENES.draft.start} end={CINEMATIC_SCENES.draft.end}>
            {({ progress }) => <SceneDraft progress={progress} copy={copy} />}
          </Sprite>
        </Stage>
      </div>

      {animating ? (
        <button
          type="button"
          onClick={togglePaused}
          aria-label={label}
          title={label}
          className="absolute bottom-3 right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D4D4D4] bg-white/90 text-[#333333] backdrop-blur-sm transition-colors hover:bg-white hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
        >
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Persistent header: "Örnek akış" label + step indicator
// ─────────────────────────────────────────────────────────────

function StageHeader({ copy }: { copy: Copy }) {
  const { time } = useTimeline();
  const active = activeSceneIndex(time);

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A8D62E]" />
        <span className="pulse-eyebrow text-[#737373]">{copy.sample}</span>
      </span>
      <span className="flex items-center gap-1.5">
        {CINEMATIC_SCENE_ORDER.map((key, i) => (
          <span
            key={key}
            className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
              i === active ? 'w-5 bg-[#0A0A0A]' : i < active ? 'w-1.5 bg-[#0A0A0A]/40' : 'w-1.5 bg-[#D4D4D4]'
            }`}
          />
        ))}
      </span>
    </div>
  );
}

function SceneLabel({ index, children }: { index: number; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A0A0A] px-1.5 font-mono text-[10px] font-semibold text-[#C6F24E]">
        {index}
      </span>
      <span className="text-[14px] font-medium text-[#0A0A0A]">{children}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 1 — QR code (visible at full opacity in the server-rendered frame)
// ─────────────────────────────────────────────────────────────

function SceneQr({ progress, copy }: { progress: number; copy: Copy }) {
  const ringScale = animate({ from: 0.82, to: 1.18, ease: Easing.easeOutCubic })(progress);
  const ringOpacity = animate({ from: 0.7, to: 0, start: 0.15, end: 1 })(progress);
  const opacity = sceneOpacity('qr', progress, { fadeIn: false });

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 pt-10" style={{ opacity }}>
      <SceneLabel index={1}>{copy.steps.qr}</SceneLabel>
      <div className="relative flex h-[168px] w-[168px] items-center justify-center">
        <span
          className="absolute inset-0 rounded-[28px] border-2 border-[#C6F24E]"
          style={{ transform: `scale(${ringScale.toFixed(3)})`, opacity: ringOpacity }}
        />
        <div className="relative flex h-[136px] w-[136px] items-center justify-center rounded-[24px] border border-[#EDEDED] bg-white shadow-[0_12px_30px_-18px_rgba(10,10,10,0.35)]">
          <QrCode size={80} strokeWidth={1.5} color="#0A0A0A" />
        </div>
      </div>
      <span className="rounded-full bg-[#EAF9B8] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3F5408]">
        {copy.tableLabel}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2 — the customer scans
// ─────────────────────────────────────────────────────────────

function SceneScan({ progress, copy }: { progress: number; copy: Copy }) {
  const laserY = interpolate([0, 1], [8, 92])(progress);
  const lift = animate({ from: 16, to: 0, ease: Easing.easeOutCubic, end: 0.35 })(progress);
  const opacity = sceneOpacity('scan', progress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pt-10" style={{ opacity }}>
      <SceneLabel index={2}>{copy.steps.scan}</SceneLabel>
      <div
        className="relative h-[196px] w-[116px] overflow-hidden rounded-[26px] border-[6px] border-[#0A0A0A] bg-[#FAFAFA]"
        style={{ transform: `translateY(${lift.toFixed(1)}px)` }}
      >
        <span className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-[#0A0A0A]" />
        <div className="absolute inset-x-3 bottom-3 top-7 flex items-center justify-center rounded-xl bg-white">
          <Scan size={52} strokeWidth={1.4} color="#0A0A0A" />
        </div>
        <span
          className="absolute left-3 right-3 h-[2px] rounded-full bg-[#C6F24E]"
          style={{ top: `${laserY.toFixed(1)}%`, boxShadow: '0 0 12px 2px rgba(198,242,78,0.7)' }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3 — 5★ (default threshold): the platform's review page opens
// ─────────────────────────────────────────────────────────────

function SceneRate({ progress, copy }: { progress: number; copy: Copy }) {
  const filled = Math.round(clamp(progress / 0.42, 0, 1) * 5);
  const chip = animate({ from: 0, to: 1, start: 0.5, end: 0.72, ease: Easing.easeOutCubic })(progress);
  const opacity = sceneOpacity('rate', progress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pt-10" style={{ opacity }}>
      <SceneLabel index={3}>{copy.steps.rate}</SceneLabel>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={34}
            strokeWidth={1.5}
            fill={i < filled ? '#C6F24E' : 'none'}
            color={i < filled ? '#8DB523' : '#D4D4D4'}
          />
        ))}
      </div>
      <div
        className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-[#EDEDED] bg-white py-2 pl-3 pr-3.5 shadow-[0_12px_30px_-18px_rgba(10,10,10,0.35)]"
        style={{ opacity: chip, transform: `translateY(${((1 - chip) * 10).toFixed(1)}px)` }}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#4285F4]" />
        <span className="truncate text-[13px] font-medium text-[#0A0A0A]">
          <span className="font-semibold">5★</span> · {copy.redirect}
        </span>
        <ArrowUpRight size={14} className="shrink-0 text-[#525252]" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4 — below the threshold: private form + the public link on the same screen
// ─────────────────────────────────────────────────────────────

function ScenePrivateFeedback({ progress, copy }: { progress: number; copy: Copy }) {
  const card = animate({ from: 0, to: 1, end: 0.22, ease: Easing.easeOutCubic })(progress);
  const typed = animate({ from: 0, to: 1, start: 0.2, end: 0.62 })(progress);
  const chars = Math.floor(typed * copy.privateText.length);
  const link = animate({ from: 0, to: 1, start: 0.6, end: 0.78 })(progress);
  const opacity = sceneOpacity('privateFeedback', progress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pt-10" style={{ opacity }}>
      <SceneLabel index={4}>{copy.steps.privateFeedback}</SceneLabel>
      <div
        className="w-full max-w-[300px] rounded-[20px] border border-[#EDEDED] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(10,10,10,0.35)]"
        style={{ opacity: card, transform: `translateY(${((1 - card) * 12).toFixed(1)}px)` }}
      >
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={16}
              strokeWidth={1.6}
              fill={i < 3 ? '#0A0A0A' : 'none'}
              color={i < 3 ? '#0A0A0A' : '#D4D4D4'}
            />
          ))}
        </div>
        <p className="mt-3 text-[13px] font-semibold text-[#0A0A0A]">{copy.privateTitle}</p>
        <div className="mt-2 min-h-[44px] rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-[13px] leading-[1.45] text-[#333333]">
          {copy.privateText.slice(0, chars)}
          {chars < copy.privateText.length && (
            <span
              className="ml-0.5 inline-block h-[13px] w-[2px] translate-y-[2px] bg-[#0A0A0A]"
              style={{ animation: 'bzCaretBlink 0.9s steps(2) infinite' }}
            />
          )}
        </div>
        <p
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4"
          style={{ opacity: link }}
        >
          {copy.publicLink}
          <ArrowUpRight size={12} />
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5 — Pulse AI draft (the frozen reduced-motion frame)
// ─────────────────────────────────────────────────────────────

function SceneDraft({ progress, copy }: { progress: number; copy: Copy }) {
  const { reduced } = useTimeline();
  const lift = animate({ from: 14, to: 0, ease: Easing.easeOutCubic, end: 0.3 })(progress);
  const note = animate({ from: 0, to: 1, start: 0.35, end: 0.55 })(progress);
  // Fade out before the loop restarts, except on the frozen reduced-motion frame.
  const opacity = sceneOpacity('draft', progress, { fadeOut: !reduced });

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pt-10" style={{ opacity }}>
      <SceneLabel index={5}>{copy.steps.draft}</SceneLabel>
      <div
        className="w-full max-w-[300px] rounded-[20px] bg-[#0A0A0A] p-4 text-white shadow-[0_24px_60px_-28px_rgba(10,10,10,0.55)]"
        style={{ transform: `translateY(${lift.toFixed(1)}px)` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E]/15 px-2.5 py-1">
            <Sparkles size={12} color="#C6F24E" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C6F24E]">
              {copy.draftBadge}
            </span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70">{copy.draftTone}</span>
        </div>
        <p className="mt-3 text-[13px] leading-[1.55] text-white/90">{copy.draftText}</p>
        <div
          className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[12px] text-white/75"
          style={{ opacity: reduced ? 1 : note }}
        >
          <Check size={13} className="text-[#C6F24E]" />
          {copy.draftNote}
        </div>
      </div>
    </div>
  );
}
