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

// Stage 47 §38.128 — HANDOFF Toggles_Switches_Checkbox visual referansı +
// admin-panel.jsx Inputs section. Indeterminate state desteğiyle native
// input + custom render + lime fill. 4+ callsite (CustomersBulkBar +
// admin/restaurants + admin/members + admin/reviews bulk action toolbar)
// manuel ref-based pattern → primitive entegrasyonu.
export { APCheckbox, type APCheckboxProps } from "./APCheckbox";

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

// Stage 65 §38.146 — HANDOFF JSX prototip (admin/owner panel UI v2
// showcase) tam migrate (multiple PR — 184+ callsite). PR0 base ekle.
// Pulse §11 hex map + synthetic italic Space Grotesk (CLAUDE.md
// §38.112 + §38.122 paterni). 18 yeni primitive ekle; PR1-5'te mevcut
// `bz-btn-*`/Toggle/Badge/Tabs callsite'ları kademeli migrate; PR6'da
// dead utility/primitive'ler silinir (CLAUDE.md §34 + §38.49).
export { APButton, type APButtonProps, type APButtonSize, type APButtonVariant } from "./APButton";
export { APSwitch, type APSwitchProps, type APSwitchSize } from "./APSwitch";
export { APChip, type APChipProps, type APChipTone } from "./APChip";
export {
  APSegmented,
  type APSegmentedProps,
  type APSegmentedOption,
  type APSegmentedSize,
} from "./APSegmented";
export { APFab, type APFabProps, type APFabTone } from "./APFab";
export { APSplitButton, type APSplitButtonProps } from "./APSplitButton";
export {
  APButtonGroup,
  type APButtonGroupProps,
  type APButtonGroupItem,
} from "./APButtonGroup";
export { APToggleCard, type APToggleCardProps } from "./APToggleCard";
export { APCard, type APCardProps } from "./APCard";
export { APKpiCard, type APKpiCardProps } from "./APKpiCard";
export {
  APInboxCard,
  type APInboxCardProps,
  type APInboxItem,
} from "./APInboxCard";
export { APAlertCard, type APAlertCardProps } from "./APAlertCard";
export { APEmptyCard, type APEmptyCardProps } from "./APEmptyCard";
export { APLocationCard, type APLocationCardProps } from "./APLocationCard";
export {
  APTeamCard,
  type APTeamCardProps,
  type APTeamRole,
} from "./APTeamCard";
export { APQRCard, type APQRCardProps } from "./APQRCard";
export {
  APQuickSettingsCard,
  type APQuickSettingsCardProps,
  type APQuickSettingsToggle,
} from "./APQuickSettingsCard";
export {
  APComposerCard,
  type APComposerCardProps,
  type APComposerTag,
} from "./APComposerCard";
