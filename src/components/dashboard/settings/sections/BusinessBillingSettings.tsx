"use client";

import BillingReadOnlyCard, { type BillingUsageCounts } from "@/components/dashboard/BillingReadOnlyCard";

interface BusinessBillingSettingsProps {
  locale?: "tr" | "en";
  /** Workspace counts shown in the "Kullanım" row (businesses, team members). */
  usage?: BillingUsageCounts;
}

/**
 * Hesabım → Plan & Faturalama. Thin wrapper around `BillingReadOnlyCard`
 * (plan, usage, payment method, billing address, invoices, plan picker).
 * Card payments via PayNKolay (§44); admin manual override intact.
 */
export function BusinessBillingSettings({ locale = "tr", usage }: BusinessBillingSettingsProps) {
  return <BillingReadOnlyCard isTr={locale === "tr"} usage={usage} />;
}

export default BusinessBillingSettings;
