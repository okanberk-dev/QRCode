/**
 * Timing for the homepage hero stage (HeroStage.tsx). Pure constants so the
 * scene order and overlaps are unit-tested without a DOM
 * (tests/hero-helpers.test.ts).
 *
 * The loop tells the real review flow, in order (spec D1):
 *  1. qr              — the business's QR code (with an optional table label)
 *  2. scan            — the customer scans it
 *  3. rate            — at or above the threshold (default 5★) the chosen
 *                       platform's review page opens
 *  4. privateFeedback — below the threshold the customer can write to the
 *                       business first; the public review link stays on the
 *                       same screen
 *  5. draft           — Pulse AI drafts a reply that waits for approval
 *
 * Each scene overlaps the next by 0.2 s so they cross-fade; the last one
 * ends exactly at the loop duration.
 */
export const CINEMATIC_SCENES = {
  qr: { start: 0, end: 2 },
  scan: { start: 1.8, end: 3.8 },
  rate: { start: 3.6, end: 5.8 },
  privateFeedback: { start: 5.6, end: 8 },
  draft: { start: 7.8, end: 10 },
} as const;

export type CinematicSceneKey = keyof typeof CINEMATIC_SCENES;

/** Scenes in playback order. */
export const CINEMATIC_SCENE_ORDER: readonly CinematicSceneKey[] = [
  'qr',
  'scan',
  'rate',
  'privateFeedback',
  'draft',
];

/** Loop duration in seconds. */
export const CINEMATIC_DURATION = 10;

/** Cross-fade overlap between consecutive scenes, in seconds. */
export const CINEMATIC_OVERLAP = 0.2;

/**
 * Index of the scene the stage is currently showing (the most recent one
 * that has started). Used for the step indicator; at `duration` (the frozen
 * reduced-motion frame) it is the last scene.
 */
export function activeSceneIndex(time: number): number {
  let index = 0;
  CINEMATIC_SCENE_ORDER.forEach((key, i) => {
    if (time >= CINEMATIC_SCENES[key].start) index = i;
  });
  return index;
}
