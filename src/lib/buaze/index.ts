/**
 * Stage 35 §38.115 — buaze util barrel export.
 *
 * Production usage:
 * ```ts
 * import { useCountUp } from '@/lib/buaze';
 * ```
 *
 * NOT: HANDOFF shared.jsx'teki `BZ` palette + `Mono` + `Pill` + `Star`
 * + `Stars` + `BuazeMark` Buaze Pulse §11 + §23.3 mevcut paterniyle
 * redundant (CLAUDE.md §38.49 dead utility class disipline). Migrate
 * EDİLMEDİ:
 *  - `BZ` palette → Pulse `--color-brand-*` CSS vars + inline hex
 *  - `Mono` → `pulse-eyebrow` Tailwind utility
 *  - `Pill` → `<Badge>` primitive (CLAUDE.md §23.3)
 *  - `Star`/`Stars` → `<StarRow>` primitive
 *  - `BuazeMark` → `<BuazeLogo>` component
 *
 * `useInView` HANDOFF shared.jsx çevirisiydi ama production'da hiçbir
 * callsite tüketmedi (marketing surface'leri `react-intersection-observer`
 * `useInView`'ini doğrudan import ediyor). 2026-05-12 cleanup'ta kaldırıldı.
 */

export { useCountUp } from './use-count-up';
