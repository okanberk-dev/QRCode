// Surveys Phase 1 — pure aggregation behind GET /api/surveys/[id]/analytics.
//
// No database, no Next, no clock: the route fetches rows, this file turns them
// into the numbers the "Sonuçlar" tab draws, and tests/survey-analytics.test.ts
// pins the behaviour. Keep it that way — the UI only draws, it never recomputes.
//
// NPS has exactly ONE implementation (`npsBreakdown`). The score card, the
// stacked bar and the legend all read the same object, so the on-screen
// "42% − 12% = 30" always adds up. `calculateNpsScore` in surveys.ts delegates
// here and must never grow a second formula.
//
// This file deliberately imports NOTHING from surveys.ts: surveys.ts imports it
// at runtime (calculateNpsScore → npsBreakdown), so importing back would be a
// cycle.

/** Analytics reads at most this many answers (newest first). */
export const ANALYTICS_ANSWER_LIMIT = 10_000;
/** Newest free-text answers returned per text question. */
export const SAMPLE_ITEM_LIMIT = 20;

// ── NPS ─────────────────────────────────────────────────────────────────────

export interface NpsBreakdown {
  /** Number of valid 0–10 answers. */
  total: number;
  /** 9–10 */
  promoters: number;
  /** 7–8 */
  passives: number;
  /** 0–6 */
  detractors: number;
  promoterPct: number;
  /** 100 − promoterPct − detractorPct, never below 0. */
  passivePct: number;
  detractorPct: number;
  /** promoterPct − detractorPct (−100..100). */
  score: number;
}

const EMPTY_NPS: NpsBreakdown = Object.freeze({
  total: 0,
  promoters: 0,
  passives: 0,
  detractors: 0,
  promoterPct: 0,
  passivePct: 0,
  detractorPct: 0,
  score: 0,
});

/**
 * The single NPS calculation.
 *
 * - Only integers 0..10 count; anything else is not an answer and is ignored.
 * - Percentages are rounded INDIVIDUALLY and the score is derived from the
 *   rounded values, so what the owner sees on screen always adds up. This can
 *   differ by ±1 from the exact fraction round((p − d) / n · 100) — deliberate.
 * - passivePct is the remainder. In the rare half-way ties where both rounded
 *   values go up (e.g. 1 promoter + 7 detractors of 8 → 13% + 88%) the
 *   remainder would be −1; it is clamped to 0, so percentages sum to 100, or
 *   to 101 in exactly that tie case.
 * - `Math.round((x * 100) / n)` rather than `Math.round((x / n) * 100)`: the
 *   integer numerator keeps exact halves exact.
 */
export function npsBreakdown(scores: ReadonlyArray<number | null | undefined>): NpsBreakdown {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const s of scores) {
    if (typeof s !== 'number' || !Number.isInteger(s) || s < 0 || s > 10) continue;
    if (s >= 9) promoters += 1;
    else if (s >= 7) passives += 1;
    else detractors += 1;
  }
  const total = promoters + passives + detractors;
  if (total === 0) return { ...EMPTY_NPS };
  const promoterPct = Math.round((promoters * 100) / total);
  const detractorPct = Math.round((detractors * 100) / total);
  const passivePct = Math.max(0, 100 - promoterPct - detractorPct);
  return {
    total,
    promoters,
    passives,
    detractors,
    promoterPct,
    passivePct,
    detractorPct,
    score: promoterPct - detractorPct,
  };
}

// ── Headline questions ──────────────────────────────────────────────────────

/**
 * The summary cards describe ONE rating and ONE recommend-score question: the
 * first of each type in survey order (lowest sortOrder; ties keep input order).
 */
export function pickHeadlineQuestions<T extends { type: string; sortOrder: number }>(
  questions: ReadonlyArray<T>,
): { rating: T | null; nps: T | null } {
  const ordered = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    rating: ordered.find((q) => q.type === 'rating') ?? null,
    nps: ordered.find((q) => q.type === 'nps') ?? null,
  };
}

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface AnalyticsQuestion {
  id: string;
  text: string;
  type: string;
  /** Prisma Json column — a string[] for multiple_choice. */
  options?: unknown;
  sortOrder: number;
}

export interface AnalyticsAnswer {
  questionId: string;
  textValue: string | null;
  numberValue: number | null;
  optionValue: string | null;
  createdAt: Date;
  responseId?: string;
}

// ── Per-question statistics ─────────────────────────────────────────────────

export interface SampleItem {
  text: string;
  /** ISO timestamp of the answer. */
  at: string;
  /**
   * The same response's headline star rating. Phase 2 fills it in; Phase 1
   * always sends null.
   */
  rating: number | null;
}

export interface RankedOption {
  option: string;
  count: number;
  /** Share of this question's counted answers, 0–100. */
  pct: number;
}

export interface QuestionStats {
  id: string;
  text: string;
  type: string;
  count: number;
  /** rating / nps: mean of the numeric answers (not rounded). */
  avg?: number | null;
  /** nps: score from `npsBreakdown`; null for rating. */
  npsScore?: number | null;
  /** rating 1..5 / nps 0..10 / multiple_choice per option. */
  distribution?: Record<string, number>;
  /** nps only: the segments behind the score. */
  nps?: NpsBreakdown;
  /** multiple_choice only: options by answer count, descending. */
  ranked?: RankedOption[];
  /** Text questions: newest answers first (kept for older clients). */
  samples?: string[];
  /** Text questions: the same answers with their time. */
  sampleItems?: SampleItem[];
}

const RATING_BINS = [1, 2, 3, 4, 5] as const;
const NPS_BINS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function numbersOf(answers: ReadonlyArray<AnalyticsAnswer>): number[] {
  return answers
    .map((a) => a.numberValue)
    .filter((n): n is number => typeof n === 'number');
}

function mean(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function optionList(options: unknown): string[] {
  return Array.isArray(options)
    ? options.filter((o): o is string => typeof o === 'string')
    : [];
}

/**
 * One entry per question, in the order given. Answers may arrive in any order;
 * text samples are sorted newest → oldest here so the route never has to.
 */
export function buildPerQuestionStats(
  questions: ReadonlyArray<AnalyticsQuestion>,
  answers: ReadonlyArray<AnalyticsAnswer>,
): QuestionStats[] {
  const byQuestion = new Map<string, AnalyticsAnswer[]>();
  for (const a of answers) {
    const list = byQuestion.get(a.questionId);
    if (list) list.push(a);
    else byQuestion.set(a.questionId, [a]);
  }

  return questions.map((q): QuestionStats => {
    const qAnswers = byQuestion.get(q.id) ?? [];
    const count = qAnswers.length;

    if (q.type === 'rating' || q.type === 'nps') {
      const numbers = numbersOf(qAnswers);
      const distribution: Record<string, number> = {};
      const bins = q.type === 'rating' ? RATING_BINS : NPS_BINS;
      for (const b of bins) distribution[String(b)] = 0;
      for (const n of numbers) {
        if (distribution[String(n)] !== undefined) distribution[String(n)] += 1;
      }
      const stats: QuestionStats = {
        id: q.id,
        text: q.text,
        type: q.type,
        count,
        avg: mean(numbers),
        npsScore: null,
        distribution,
      };
      if (q.type === 'nps') {
        const nps = npsBreakdown(numbers);
        stats.npsScore = nps.score;
        stats.nps = nps;
      }
      return stats;
    }

    if (q.type === 'multiple_choice') {
      const options = optionList(q.options);
      const distribution: Record<string, number> = {};
      for (const o of options) distribution[o] = 0;
      for (const a of qAnswers) {
        if (a.optionValue && distribution[a.optionValue] !== undefined) {
          distribution[a.optionValue] += 1;
        }
      }
      const counted = options.reduce((sum, o) => sum + distribution[o], 0);
      const ranked = options
        .map((option, index) => ({ option, count: distribution[option], index }))
        .sort((a, b) => b.count - a.count || a.index - b.index)
        .map(({ option, count: c }) => ({
          option,
          count: c,
          pct: counted === 0 ? 0 : Math.round((c * 100) / counted),
        }));
      return { id: q.id, text: q.text, type: q.type, count, distribution, ranked };
    }

    // Short / long text: newest answers only; the full list is the CSV export.
    const newest = qAnswers
      .filter((a) => typeof a.textValue === 'string' && a.textValue.length > 0)
      .map((a, index) => ({ a, index }))
      .sort((x, y) => y.a.createdAt.getTime() - x.a.createdAt.getTime() || x.index - y.index)
      .slice(0, SAMPLE_ITEM_LIMIT)
      .map(({ a }) => a);
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      count,
      samples: newest.map((a) => a.textValue as string),
      sampleItems: newest.map((a) => ({
        text: a.textValue as string,
        at: a.createdAt.toISOString(),
        rating: null,
      })),
    };
  });
}

// ── Survey summary ──────────────────────────────────────────────────────────

export interface SurveySummary {
  /** Responses inside the selected range. */
  responses: number;
  /** Responses ever received (empty-state wording: "none yet" vs "none in this range"). */
  responsesAllTime: number;
  /** Responses that left an email or phone; null when the survey does not collect contact details. */
  withContact: number | null;
  /** Time of the latest response ever (not limited to the range), ISO. */
  lastResponseAt: string | null;
  /** First rating question: mean rounded to one decimal. null = no such question or no answers. */
  rating: { questionId: string; text: string; avg: number; count: number } | null;
  /** First recommend-score question. null = no such question or no answers. */
  nps: {
    questionId: string;
    text: string;
    score: number;
    count: number;
    promoters: number;
    passives: number;
    detractors: number;
    promoterPct: number;
    passivePct: number;
    detractorPct: number;
  } | null;
  /** True when the answer read hit ANALYTICS_ANSWER_LIMIT, so figures cover the newest answers only. */
  truncated: boolean;
}

export interface SurveySummaryInput {
  questions: ReadonlyArray<AnalyticsQuestion>;
  answers: ReadonlyArray<AnalyticsAnswer>;
  responses: number;
  responsesAllTime: number;
  collectContact: boolean;
  /** Responses with an email or phone. Ignored when `collectContact` is false. */
  contactResponses: number;
  lastResponseAt: Date | string | null;
}

export function buildSurveySummary(input: SurveySummaryInput): SurveySummary {
  const { rating, nps } = pickHeadlineQuestions(input.questions);

  const answersOf = (questionId: string) =>
    numbersOf(input.answers.filter((a) => a.questionId === questionId));

  let ratingBlock: SurveySummary['rating'] = null;
  if (rating) {
    const numbers = answersOf(rating.id);
    const avg = mean(numbers);
    if (avg !== null) {
      ratingBlock = {
        questionId: rating.id,
        text: rating.text,
        avg: Math.round(avg * 10) / 10,
        count: numbers.length,
      };
    }
  }

  let npsBlock: SurveySummary['nps'] = null;
  if (nps) {
    const breakdown = npsBreakdown(answersOf(nps.id));
    if (breakdown.total > 0) {
      npsBlock = {
        questionId: nps.id,
        text: nps.text,
        score: breakdown.score,
        count: breakdown.total,
        promoters: breakdown.promoters,
        passives: breakdown.passives,
        detractors: breakdown.detractors,
        promoterPct: breakdown.promoterPct,
        passivePct: breakdown.passivePct,
        detractorPct: breakdown.detractorPct,
      };
    }
  }

  const last = input.lastResponseAt;
  return {
    responses: input.responses,
    responsesAllTime: input.responsesAllTime,
    withContact: input.collectContact ? input.contactResponses : null,
    lastResponseAt:
      last === null ? null : last instanceof Date ? last.toISOString() : last,
    rating: ratingBlock,
    nps: npsBlock,
    truncated: input.answers.length >= ANALYTICS_ANSWER_LIMIT,
  };
}
