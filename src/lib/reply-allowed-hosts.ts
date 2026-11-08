// Server-only: the hosts a business may link to in a reply (CLAUDE.md §48).
//
// Every link in a reply e-mail / Google reply must point at an address the
// business has saved in Buaze (website, review platforms, social, other
// platform). `buaze.com` is always allowed by `checkReplyRisk` itself.

import { prisma } from '@/lib/prisma';
import { allowedHostsFromUrls } from '@/lib/reply-risk';

export async function loadReplyAllowedHosts(restaurantId: string | null | undefined): Promise<string[]> {
  if (!restaurantId) return [];
  try {
    const r = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        website: true,
        instagramUrl: true,
        facebookUrl: true,
        whatsappUrl: true,
        reservationUrl: true,
        otherPlatformUrl: true,
        googleReviewUrl: true,
        getirYemekUrl: true,
        yemekSepetiUrl: true,
        trendyolYemekUrl: true,
        tripAdvisorUrl: true,
        airbnbUrl: true,
        bookingUrl: true,
        yandexUrl: true,
        yelpUrl: true,
        foursquareUrl: true,
      },
    });
    if (!r) return [];
    return allowedHostsFromUrls(Object.values(r));
  } catch (err) {
    // Fail closed on links: an empty list means only buaze.com links pass.
    console.error('[reply-allowed-hosts] lookup failed', { restaurantId, err });
    return [];
  }
}
