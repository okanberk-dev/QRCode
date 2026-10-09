import { redirect } from "next/navigation";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

/**
 * /dashboard/google, /dashboard/google-reviews'in yetim kopyasıydı (hiçbir
 * yerden link yok). İki ayrı yüzey drift ürettiği için kanonik sayfaya
 * yönlendir; query string (örn. OAuth `?google=` flash) korunur.
 * GoogleReviewsHub bileşeni admin /admin/google tarafından kullanılmaya devam eder.
 */
export default async function OwnerGoogleReviewsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "tr";
  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (typeof value === "string") query.set(key, value);
  }
  const qs = query.toString();
  redirect(`/${locale}/dashboard/google-reviews${qs ? `?${qs}` : ""}`);
}
