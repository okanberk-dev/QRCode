import { revalidatePath } from 'next/cache';

/**
 * `/menu/[slug]` is ISR-cached for an hour (`revalidate = 3600`). Only the
 * owner publish route used to refresh it, so an admin turning the menu off,
 * unpublishing it or pausing the whole restaurant left the public menu live
 * for up to an hour. Call this after any write that changes what the public
 * menu should show. Fail-soft: a revalidate error must never fail the save.
 */
export function revalidatePublicMenu(slug: string | null | undefined): void {
  if (!slug) return;
  try {
    revalidatePath(`/menu/${slug}`);
  } catch (err) {
    console.warn('[revalidatePublicMenu] failed', { slug, error: (err as Error)?.message });
  }
}
