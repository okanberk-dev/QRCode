// SCAFFOLDED: Per-user notification preferences (NotificationPreference).
import { scaffoldedResponse, type NotificationPreferences } from '@/lib/scaffolding';

const DEFAULT_PREFS: NotificationPreferences = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
  slackWebhook: null,
};

export async function GET() {
  // Returns the defaults until wired to Prisma.
  return Response.json(DEFAULT_PREFS);
}

export async function PUT(req: Request) {
  let body: Partial<NotificationPreferences> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/notifications/route.ts', { received: body });
}
