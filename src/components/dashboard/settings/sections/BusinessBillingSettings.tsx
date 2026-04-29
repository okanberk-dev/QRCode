"use client";

import BillingReadOnlyCard from "@/components/dashboard/BillingReadOnlyCard";

interface BusinessBillingSettingsProps {
  locale?: "tr" | "en";
}

/**
 * Section 4 — Faturalandırma (Faz 4 — workspace level, read-only).
 *
 * Mevcut `BillingReadOnlyCard` (448 LOC) doğrudan kullanılır. CLAUDE.md §18 —
 * Iyzico Wave 3.5 deferred; tüm "Yükselt / Değiştir" CTA'lar disabled +
 * tooltip "Plan değişikliği admin panelinden yapılır".
 *
 * Card kendi GET /api/billing/summary + /invoices fetch'ini yapıyor; component
 * sadece wrapper. `adminNotes` field response'unda asla bulunmaz (privacy guard).
 */
export function BusinessBillingSettings({ locale = "tr" }: BusinessBillingSettingsProps) {
  return <BillingReadOnlyCard isTr={locale === "tr"} />;
}

export default BusinessBillingSettings;
