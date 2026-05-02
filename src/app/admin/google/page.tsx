"use client";

import GoogleReviewsHub from "@/components/dashboard/google/GoogleReviewsHub";
import { useAdminTranslation } from "@/components/admin/AdminTranslationProvider";

export default function AdminGoogleReviewsPage() {
  const { locale } = useAdminTranslation();
  return <GoogleReviewsHub locale={locale === "en" ? "en" : "tr"} adminMode />;
}
