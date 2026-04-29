import { prisma } from '@/lib/prisma';

export interface NotificationPrefs {
  lowRatingEmail: boolean;
  dailyDigestEmail: boolean;
  weeklyReport: boolean;
  slackWebhook: string | null;
}

const DEFAULTS: NotificationPrefs = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
  slackWebhook: null,
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
        slackWebhook: true,
      },
    });
    if (!row) return DEFAULTS;
    return {
      lowRatingEmail: row.lowRatingEmail,
      dailyDigestEmail: row.dailyDigestEmail,
      weeklyReport: row.weeklyReport,
      slackWebhook: row.slackWebhook,
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

export async function postSlackWebhook(
  webhookUrl: string,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (err) {
    console.error('[slack-webhook] post failed', err);
    return false;
  }
}
