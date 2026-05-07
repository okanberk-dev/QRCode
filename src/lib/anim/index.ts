/**
 * Stage 35 §38.115 — animation engine barrel export.
 *
 * Production usage:
 * ```tsx
 * import { Stage, Sprite, useTime, Easing, animate } from '@/lib/anim';
 * ```
 */

export { Easing, type EasingFn, type EasingName } from './easing';
export {
  clamp,
  interpolate,
  animate,
  type AnimateOptions,
  type InterpolateOptions,
} from './interpolate';
export { Stage, useTime, useTimeline, type StageProps } from './stage';
export {
  Sprite,
  useSprite,
  type SpriteProps,
  type SpriteRenderProps,
} from './sprite';
