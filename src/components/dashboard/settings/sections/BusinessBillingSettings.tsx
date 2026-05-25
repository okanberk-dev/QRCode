"use client";

import BillingReadOnlyCard from "@/components/dashboard/BillingReadOnlyCard";

interface BusinessBillingSettingsProps {
  locale?: "tr" | "en";
}

/**
 * Section 4 — Faturalandırma (Faz 4 — workspace level, read-only).
 *
 * Mevcut `BillingReadOnlyCard` (448 LOC) doğrudan kullanılır. CLAUDE.md §44 —
 * Dodo Payments self-service canlıda (Stage 142 §38.222); plan picker modal
 * Stage 148 §38.228'de eklendi. Admin manual override (hybrid §44.5) intact.
 *
 * Card kendi GET /api/billing/summary + /invoices fetch'ini yapıyor; component
 * sadece wrapper. `adminNotes` field response'unda asla bulunmaz (privacy guard).
 */
export function BusinessBillingSettings({ locale = "tr" }: BusinessBillingSettingsProps) {
  return <BillingReadOnlyCard isTr={locale === "tr"} />;
}

export default BusinessBillingSettings;
