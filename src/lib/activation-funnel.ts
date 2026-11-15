/**
 * Setup funnel for new business owners: signup → first business → first QR
 * → first customer rating. Computed from database rows (no tracking
 * script, so it works without cookie consent and is not blocked by ad
 * blockers). The QR and rating steps use the same definitions as the owner
 * activation checklist (§19.5): at least one QrGeneration / Feedback row on
 * one of the owner's businesses.
 *
 * Pure: the DB loader is getActivationFunnel in src/lib/admin-bi.ts.
 */

export type ActivationFunnelStepKey = 'signup' | 'business' | 'qr' | 'feedback';

export interface ActivationFunnelStep {
  key: ActivationFunnelStepKey;
  label: string;
  /** Owners who reached this step. */
  count: number;
  /** Share of the window's signups, rounded to 1 decimal (0 when no signups). */
  pctOfSignups: number;
}

export interface ActivationFunnel {
  /** Owners who signed up in the last `windowDays` days. */
  windowDays: number;
  steps: ActivationFunnelStep[];
}

const LABELS: Record<ActivationFunnelStepKey, string> = {
  signup: 'Kayıt oldu',
  business: 'İşletme ekledi',
  qr: 'QR oluşturdu',
  feedback: 'İlk müşteri puanını aldı',
};

function pct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
}

/**
 * Each step counts owners independently (an owner can collect a rating
 * through a link without generating a QR in the panel), so a later step
 * can occasionally be larger than the one before it.
 */
export function buildActivationFunnel(input: {
  windowDays: number;
  ownerIds: readonly string[];
  /** Businesses of those owners. */
  restaurants: readonly { id: string; userId: string | null }[];
  /** Business ids with at least one generated QR. */
  qrRestaurantIds: Iterable<string>;
  /** Business ids with at least one customer rating. */
  feedbackRestaurantIds: Iterable<string>;
}): ActivationFunnel {
  const owners = new Set(input.ownerIds);
  const qr = new Set(input.qrRestaurantIds);
  const feedback = new Set(input.feedbackRestaurantIds);

  const withBusiness = new Set<string>();
  const withQr = new Set<string>();
  const withFeedback = new Set<string>();
  for (const r of input.restaurants) {
    if (!r.userId || !owners.has(r.userId)) continue;
    withBusiness.add(r.userId);
    if (qr.has(r.id)) withQr.add(r.userId);
    if (feedback.has(r.id)) withFeedback.add(r.userId);
  }

  const total = owners.size;
  const counts: Record<ActivationFunnelStepKey, number> = {
    signup: total,
    business: withBusiness.size,
    qr: withQr.size,
    feedback: withFeedback.size,
  };
  const order: ActivationFunnelStepKey[] = ['signup', 'business', 'qr', 'feedback'];
  return {
    windowDays: input.windowDays,
    steps: order.map((key) => ({
      key,
      label: LABELS[key],
      count: counts[key],
      pctOfSignups: pct(counts[key], total),
    })),
  };
}
