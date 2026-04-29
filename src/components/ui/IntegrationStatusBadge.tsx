import { Badge, type BadgeKind } from "./Badge";

export type IntegrationStatusKind =
  | "connected"
  | "disconnected"
  | "not_configured"
  | "error"
  | "testing";

interface IntegrationStatusBadgeProps {
  status: IntegrationStatusKind;
  /** Optional override label (e.g. "Pasif" instead of "Bağlantı kapalı"). */
  label?: string;
  hideDot?: boolean;
  className?: string;
}

const LABELS: Record<IntegrationStatusKind, string> = {
  connected: "Bağlandı",
  disconnected: "Bağlantı kapalı",
  not_configured: "Henüz bağlanmadı",
  error: "Hata",
  testing: "Test ediliyor",
};

const KIND: Record<IntegrationStatusKind, BadgeKind> = {
  connected: "ok",
  disconnected: "off",
  not_configured: "ghost",
  error: "danger",
  testing: "info",
};

/**
 * Per-integration status indicator (Section 3 — Entegrasyonlar).
 *
 * Mapping:
 *   connected      → ok    (URL doluyken `<Provider>Enabled` toggle aktif)
 *   disconnected   → off   (URL var ama enabled=false)
 *   not_configured → ghost (URL boş)
 *   error          → danger (test endpoint başarısız)
 *   testing        → info  (POST /integrations/[provider]/test pending)
 */
export function IntegrationStatusBadge({
  status,
  label,
  hideDot = false,
  className,
}: IntegrationStatusBadgeProps) {
  return (
    <Badge kind={KIND[status]} dot={!hideDot} className={className}>
      {label ?? LABELS[status]}
    </Badge>
  );
}

export default IntegrationStatusBadge;
