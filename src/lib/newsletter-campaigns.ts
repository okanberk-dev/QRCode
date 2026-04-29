const MAX_POSTS = 6;
const ALLOWED_LOCALES = new Set(['tr', 'en', 'both']);
const CREATE_STATUSES = new Set(['draft', 'scheduled']);

export interface ValidatedCampaign {
  data: {
    title: string;
    intro: string;
    postIds: string[];
    locale: string;
    status: string;
    scheduledAt: Date | null;
  };
}

export function validateCampaignInput(body: Record<string, unknown>): ValidatedCampaign | { error: string } {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) return { error: 'invalid_title' };

  const intro = typeof body.intro === 'string' ? body.intro.trim() : '';
  if (!intro || intro.length > 2000) return { error: 'invalid_intro' };

  const rawPostIds = Array.isArray(body.postIds) ? body.postIds : [];
  const postIds = rawPostIds.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);
  if (postIds.length === 0 || postIds.length > MAX_POSTS) return { error: 'invalid_post_count' };

  const locale = typeof body.locale === 'string' ? body.locale : 'tr';
  if (!ALLOWED_LOCALES.has(locale)) return { error: 'invalid_locale' };

  const requestedStatus = typeof body.status === 'string' ? body.status : 'draft';
  if (!CREATE_STATUSES.has(requestedStatus)) return { error: 'invalid_status' };

  let scheduledAt: Date | null = null;
  if (body.scheduledAt && (typeof body.scheduledAt === 'string' || typeof body.scheduledAt === 'number')) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) return { error: 'invalid_scheduledAt' };
    if (d.getTime() < Date.now() - 60_000) return { error: 'scheduledAt_in_past' };
    scheduledAt = d;
  }

  // If scheduledAt is provided, status auto-elevates. Pure 'scheduled'
  // without a date is rejected so the UI cannot orphan a campaign.
  const status = scheduledAt ? 'scheduled' : requestedStatus === 'scheduled' ? 'draft' : requestedStatus;

  return {
    data: { title, intro, postIds, locale, status, scheduledAt },
  };
}
