/**
 * Marketing animation primitives.
 *
 * Only QRScanLoader is still in use (/solutions/qr-generator imports it
 * directly). The other primitives (LiveTicker, SectionDivider, PulseLine,
 * Marquee, RevealHeadline, FeatureCard, SweepCTA, ToastRow, SentimentDial,
 * BigCounter, StarClimber, LazyMount) were removed in the 2026-11 homepage
 * redesign once they had no callers: several rendered invented "live"
 * activity or testimonial-style quotes, and the word-split headings dropped
 * the spaces between words for crawlers and screen readers. Restore one only
 * with a real caller and true content (CLAUDE.md §34).
 */

export { default as QRScanLoader } from './QRScanLoader';
