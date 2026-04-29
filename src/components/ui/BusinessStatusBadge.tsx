import { Badge, type BadgeKind } from "./Badge";

export type BusinessStatusKind =
  | "active"
  | "disabled"
  | "temporarily_closed";

interface BusinessStatusBadgeProps {
  status: BusinessStatusKind;
  /** Hide the leading dot (defaults to visible). */
  hideDot?: boolean;
  className?: string;
}

const LABELS: Record<BusinessStatusKind, string> = {
  active: "Aktif",
  disabled: "Devre dışı",
  temporarily_closed: "Geçici kapalı",
};

const KIND: Record<BusinessStatusKind, BadgeKind> = {
  active: "ok",
  disabled: "off",
  temporarily_closed: "warn",
};

/**
 * Wraps `<Badge>` with the business status mapping shared between admin and
 * owner panels. Single source of truth so list rows, settings header and the
 * public review surface stay aligned.
 */
export function BusinessStatusBadge({
  status,
  hideDot = false,
  className,
}: BusinessStatusBadgeProps) {
  return (
    <Badge kind={KIND[status]} dot={!hideDot} className={className}>
      {LABELS[status]}
    </Badge>
  );
}

export default BusinessStatusBadge;
