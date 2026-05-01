import { prisma } from '@/lib/prisma';

export interface NotificationPrefs {
  lowRatingEmail: boolean;
  dailyDigestEmail: boolean;
  weeklyReport: boolean;
}

const DEFAULTS: NotificationPrefs = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
};

export async function getNotificationPrefsForUser(
  userId: string | null | undefined,
): Promise<NotificationPrefs> {
  if (!userId) return DEFAULTS;
  try {
    const row = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        lowRatingEmail: true,
        dailyDigestEmail: true,
        weeklyReport: true,
      },
    });
    if (!row) return DEFAULTS;
    return {
      lowRatingEmail: row.lowRatingEmail,
      dailyDigestEmail: row.dailyDigestEmail,
      weeklyReport: row.weeklyReport,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getNotificationPrefsForRestaurant(
  restaurantId: string | null | undefined,
): Promise<NotificationPrefs & { ownerUserId: string | null }> {
  if (!restaurantId) return { ...DEFAULTS, ownerUserId: null };
  try {
    const r = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { userId: true },
    });
    const ownerUserId = r?.userId ?? null;
    const prefs = await getNotificationPrefsForUser(ownerUserId);
    return { ...prefs, ownerUserId };
  } catch {
    return { ...DEFAULTS, ownerUserId: null };
  }
}
