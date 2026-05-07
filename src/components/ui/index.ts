/**
 * Buaze panel UI primitives — Pulse 2026-04 design system.
 * Used by admin panel + business panel only. Marketing/blog/help center
 * surfaces continue to use `pulse-*` utilities and existing components.
 */
export { AlertBanner, type AlertKind } from "./AlertBanner";
export { Avatar } from "./Avatar";
export { Badge, type BadgeKind } from "./Badge";
export { BusinessStatusBadge, type BusinessStatusKind } from "./BusinessStatusBadge";
export { IntegrationStatusBadge, type IntegrationStatusKind } from "./IntegrationStatusBadge";
export { BarChart } from "./BarChart";
export { ColorPicker } from "./ColorPicker";
export { ConfirmDialog, useConfirmDialog } from "./ConfirmDialog";
export { BuazeWordmark } from "./BuazeWordmark";
export { EmptyState } from "./EmptyState";
export { ErrorState } from "./ErrorState";
export { Eyebrow } from "./Eyebrow";
export { Field } from "./Field";
export { LegendDot } from "./LegendDot";
export { Modal } from "./Modal";
export { PageHeader } from "./PageHeader";
export { PlatformChip, PLATFORMS, type PlatformId, type PlatformConfig } from "./PlatformChip";
export { ProgressBar } from "./ProgressBar";
export { PulseSelect, type PulseSelectOption } from "./PulseSelect";
export { RadioCard } from "./RadioCard";
export { Skeleton, TableSkeleton, CardSkeleton } from "./Skeleton";
export { Sparkline } from "./Sparkline";
export { StarRow } from "./StarRow";
export { StatCard, StatCardSkeleton, type DeltaKind } from "./StatCard";
export { Tabs, type TabItem } from "./Tabs";
export { Toggle } from "./Toggle";

// Stage 37 §38.117 — HANDOFF §8 step 4 (Panel atomları) — 4 yeni primitive
// (APSlider + APStarInput + APRadioGroup + APIconButton). HANDOFF
// admin-panel.jsx spec birebir + Pulse §11 styling + a11y enhancement.
export { APSlider, type APSliderProps } from "./APSlider";
export { APStarInput, type APStarInputProps } from "./APStarInput";
export {
  APRadioGroup,
  type APRadioGroupProps,
  type APRadioOption,
} from "./APRadioGroup";
export {
  APIconButton,
  type APIconButtonProps,
  type APIconButtonSize,
  type APIconButtonTone,
} from "./APIconButton";

// Stage 38 §38.118 — HANDOFF §8 step 5 (Panel kartları) — 2 yeni card
// (APAIDraftCard + APBillingCard). Mevcut Buaze cardlarıyla %70+
// örtüşen 12 card spec'i skip; sadece yeni implementation gerektiren
// 2 card eklendi. CLAUDE.md §38.49 + §38.118 paterni.
export {
  APAIDraftCard,
  renderStars,
  type APAIDraftCardProps,
  type APAIDraftTone,
} from "./APAIDraftCard";
export {
  APBillingCard,
  computeQuotaPct,
  type APBillingCardProps,
} from "./APBillingCard";
