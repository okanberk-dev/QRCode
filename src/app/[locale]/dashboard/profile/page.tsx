import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/translations";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Legacy redirect — `/dashboard/profile` was merged into `/dashboard/account`
 * (the unified settings hub). All former /profile content (user identity,
 * password change, KVKK display) lives there as named tabs. Restaurant
 * identity & brand cards moved to /dashboard/restaurants/[id]/settings —
 * the per-location single source of truth (CLAUDE.md §10).
 *
 * We surface the user's most likely target (`profile` tab) on landing.
 * Older bookmarks like `/profile#account`, `/profile?tab=brand` are
 * collapsed to the same destination — hash anchors and unknown query
 * params are intentionally dropped.
 */
export default async function ProfileRedirectPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/account?section=profile`);
}
