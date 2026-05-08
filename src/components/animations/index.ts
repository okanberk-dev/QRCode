/**
 * Stage 66 §38.147 PR0 base — animation components barrel.
 *
 * Production usage:
 * ```tsx
 * import { LazyMount, PulseLine, SweepCTA, BigCounter } from '@/components/animations';
 * ```
 *
 * Tüm component'ler `'use client'` + framer-motion + react-intersection-observer.
 * LazyMount wrapper viewport gating + reduced-motion + tab pause sağlar.
 *
 * Mevcut counterparts (MarqueeRow, useCountUp, useInView) PR1-5 callsite
 * migrate sırasında silinecek (CLAUDE.md §34 disipline). PR0 sadece base
 * primitive ekler, callsite mount yok.
 *
 * Silinmiş counterparts:
 * - LiveReviewTicker — Stage 68 §38.149 (LiveTicker migrate sonrası)
 * - SocialProofToast — Stage 86 §38.166 (kullanıcı talebi + §35.10 fake
 *   testimonial compliance disipline)
 */

export { default as LazyMount } from './LazyMount';
export { default as PulseLine } from './PulseLine';
export { default as SweepCTA } from './SweepCTA';
export { default as FeatureCard } from './FeatureCard';
export { default as RevealHeadline } from './RevealHeadline';
export { default as BigCounter } from './BigCounter';
export { default as Marquee } from './Marquee';
export { default as LiveTicker, type LiveTickerItem } from './LiveTicker';
export { default as StarClimber } from './StarClimber';
export { default as SentimentDial } from './SentimentDial';
export { default as ToastRow, type ToastRowItem, type ToastTone } from './ToastRow';
export { default as QRScanLoader } from './QRScanLoader';
