import GoogleReviewsHub from "@/components/dashboard/google/GoogleReviewsHub";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function OwnerGoogleReviewsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "tr";
  return <GoogleReviewsHub locale={locale} />;
}
