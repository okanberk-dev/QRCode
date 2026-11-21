import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getTeamMemberRole, resolveOwnerUserId } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Wave A5/A7 (CLAUDE.md §38.A) — `dailyDigestEmail` removed (orphan toggle,
// no consumer cron); `disableTrialReminders` added as a User-level opt-out
// for the conversion-time trial-ending mail (trial-reminders cron filters
// on it). NotificationPreference covers reputation-time toggles; User-level
// flag covers lifecycle-time toggles. Both surface through the same /api
// endpoint for owner UX cohesion.
const DEFAULT_PREFS = {
  lowRatingEmail: true,
  weeklyReport: true,
  disableTrialReminders: false,
};

const PreferencesBody = z.object({
  lowRatingEmail: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  disableTrialReminders: z.boolean().optional(),
}).strict();

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = await resolveOwnerUserId(actor);
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Two independent reads, run at once (was an array $transaction).
  const [pref, user] = await Promise.all([
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: { lowRatingEmail: true, weeklyReport: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { disableTrialReminders: true },
    }),
  ]);

  // Edge cache (CLAUDE.md §38.100 Stage 24). NotificationBell client-side
  // 60s polling ile birleşir; `private` directive Vercel CDN'de user-isolated.
  const CACHE_HEADER = 'private, s-maxage=15, stale-while-revalidate=60';
  return NextResponse.json(
    {
      lowRatingEmail: pref?.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail,
      weeklyReport: pref?.weeklyReport ?? DEFAULT_PREFS.weeklyReport,
      disableTrialReminders: user?.disableTrialReminders ?? DEFAULT_PREFS.disableTrialReminders,
    },
    { headers: { 'Cache-Control': CACHE_HEADER } },
  );
}

export async function PUT(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // CLAUDE.md §37.2.C + §40.4.C — privileged write endpoint'leri
  // `rateLimit('endpoint:actor:${actor.id}', N, 60_000)` ile gate edilmeli.
  // Owner-scoped preference write; 20/dk slider/checkbox burst için yeterli.
  const rl = await rateLimit(`notifications-prefs:${actor.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // `resolveOwnerUserId` bir team_member için WORKSPACE OWNER'ın id'sini döner —
  // yani buradaki write owner'ın kendi bildirim kanalını değiştirir. Read-only
  // 'viewer' rolündeki davetli, owner'ın düşük puan uyarılarını susturabiliyordu.
  // Kod tabanının mevcut write matrisi (canWriteRestaurant / canWriteFeedback)
  // ile aynı kural: viewer yazamaz.
  if (actor.role === 'team_member') {
    const teamRole = await getTeamMemberRole(actor);
    if (teamRole === 'viewer') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const userId = await resolveOwnerUserId(actor);
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = validateBody(PreferencesBody, body);
  if (!parsed.ok) return parsed.response;

  const [currentPref, currentUser] = await Promise.all([
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: { lowRatingEmail: true, weeklyReport: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { disableTrialReminders: true },
    }),
  ]);

  const nextPref = {
    lowRatingEmail: parsed.data.lowRatingEmail ?? currentPref?.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail,
    weeklyReport: parsed.data.weeklyReport ?? currentPref?.weeklyReport ?? DEFAULT_PREFS.weeklyReport,
  };
  const nextDisable = parsed.data.disableTrialReminders
    ?? currentUser?.disableTrialReminders
    ?? DEFAULT_PREFS.disableTrialReminders;

  const [pref, user] = await prisma.$transaction([
    prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...nextPref },
      update: nextPref,
    }),
    prisma.user.update({
      where: { id: userId },
      data: { disableTrialReminders: nextDisable },
      select: { disableTrialReminders: true },
    }),
  ]);

  return NextResponse.json(
    {
      lowRatingEmail: pref.lowRatingEmail,
      weeklyReport: pref.weeklyReport,
      disableTrialReminders: user.disableTrialReminders,
    },
    {
      // Stage 108 §38.188 — mutation response MUST bypass any CDN/browser
      // cache; GET response sets `private, s-maxage=15, stale-while-
      // revalidate=60` so without `no-store` the toggle's prior value can
      // linger in the edge cache for up to 75s after a flip. CLAUDE.md
      // §40.6 mutation row.
      headers: { 'Cache-Control': 'no-store, must-revalidate' },
    },
  );
}
