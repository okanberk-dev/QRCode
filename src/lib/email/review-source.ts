/**
 * Where a review came from, for the owner alert mails (CLAUDE.md §21, §54).
 * The label is code-controlled — admin mail copy cannot change it — so the
 * owner always sees at a glance whether a review was left on Google or
 * through the business's own Buaze QR form.
 */
import { PULSE } from './tokens';

export type ReviewSource = 'buaze' | 'google';

export interface ReviewSourceCopy {
  /** "Google yorumu" / "Buaze yorumu" */
  name: string;
  /** Subject lead: "Google yorumu geldi" / "Buaze yorumu geldi" */
  arrived: string;
  /** Second line under the name: where exactly it was left. */
  detail: string;
  /** Dot colour of the source chip (Google brand blue / Buaze lime). */
  dot: string;
}

export function normalizeReviewSource(value: unknown): ReviewSource {
  return value === 'google' ? 'google' : 'buaze';
}

export function reviewSourceCopy(source: ReviewSource, locale: 'tr' | 'en'): ReviewSourceCopy {
  const tr = locale !== 'en';
  if (source === 'google') {
    return {
      name: tr ? 'Google yorumu' : 'Google review',
      arrived: tr ? 'Google yorumu geldi' : 'New Google review',
      detail: tr ? 'Google işletme profilinizde' : 'On your Google Business Profile',
      dot: '#4285F4',
    };
  }
  return {
    name: tr ? 'Buaze yorumu' : 'Buaze review',
    arrived: tr ? 'Buaze yorumu geldi' : 'New Buaze review',
    detail: tr ? 'QR geri bildirim formunuzdan' : 'From your QR feedback form',
    dot: PULSE.lime,
  };
}

/** Subject line shared by the low-rating alert and the new-review mail. */
export function reviewAlertSubject(args: {
  source: ReviewSource;
  locale: 'tr' | 'en';
  rating: number;
  restaurantName: string;
  branch?: string | null;
  low: boolean;
}): string {
  const tr = args.locale !== 'en';
  const copy = reviewSourceCopy(args.source, args.locale);
  const stars = `${Math.max(0, Math.min(5, Math.round(args.rating)))}★`;
  const branch =
    args.branch && args.branch.trim() && args.branch.trim() !== args.restaurantName.trim()
      ? ` · ${args.branch.trim()}`
      : '';
  const rating = args.low ? `${tr ? 'Düşük puan' : 'Low rating'} ${stars}` : stars;
  return `${copy.arrived} · ${rating} · ${args.restaurantName}${branch}`;
}
