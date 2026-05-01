// Owner activation checklist compute helper (CLAUDE.md §19.5 + §23.7 Phase 11.29).
//
// Saf fonksiyon — DB çağrısı yok, deterministik. Caller restaurant + state +
// feedback count çeker, helper checklist hesaplar.
//
// 5 step: 3'ü compute edilir (mevcut data'dan), 2'si tracking gerektirir
// (RestaurantActivationState):
//   - profile          → restaurant.name + category dolu
//   - google_link      → googleReviewUrl + googleEnabled + domain valid
//   - qr_downloaded    → state.qrDownloadedAt set
//   - qr_printed_shared → state.qrPrintedSharedAt set (owner manual)
//   - first_feedback   → feedbackCount > 0

import { checkProviderUrl } from '@/lib/integration-domains';

export type ActivationStep =
  | 'profile'
  | 'google_link'
  | 'qr_downloaded'
  | 'qr_printed_shared'
  | 'first_feedback';

export interface ActivationStepStatus {
  step: ActivationStep;
  done: boolean;
}

export interface ActivationInput {
  restaurant: {
    name: string | null;
    category: string | null;
    googleReviewUrl: string | null;
    googleEnabled: boolean;
  };
  state: {
    qrPrintedSharedAt: Date | null;
    dismissedAt: Date | null;
  } | null;
  qrGenerationCount: number;
  feedbackCount: number;
}

export interface ActivationResult {
  steps: ActivationStepStatus[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  dismissedAt: string | null;
}

export function computeActivation(input: ActivationInput): ActivationResult {
  const profileDone = Boolean(
    input.restaurant.name?.trim() && input.restaurant.category?.trim(),
  );

  const googleUrl = input.restaurant.googleReviewUrl?.trim() ?? '';
  // Warning severity (homepage / not_review_link) "done" sayılır — Phase 11.22
  // §19.4 disiplini: warning hard block değil, owner bilerek koymuş olabilir.
  // Sadece error severity (invalid_url / wrong_protocol / wrong_domain) skip.
  const googleCheck = googleUrl ? checkProviderUrl('google', googleUrl) : null;
  const googleHardError = googleCheck && !googleCheck.ok && googleCheck.severity === 'error';
  const googleDone = Boolean(
    input.restaurant.googleEnabled && googleUrl && !googleHardError,
  );

  const qrDownloadedDone = input.qrGenerationCount > 0;
  const qrPrintedDone = Boolean(input.state?.qrPrintedSharedAt);
  const feedbackDone = input.feedbackCount > 0;

  const steps: ActivationStepStatus[] = [
    { step: 'profile', done: profileDone },
    { step: 'google_link', done: googleDone },
    { step: 'qr_downloaded', done: qrDownloadedDone },
    { step: 'qr_printed_shared', done: qrPrintedDone },
    { step: 'first_feedback', done: feedbackDone },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  return {
    steps,
    completedCount,
    totalCount,
    percentage,
    isComplete,
    dismissedAt: input.state?.dismissedAt?.toISOString() ?? null,
  };
}

/**
 * Suggested actions — UI'da top 1-3 öneri için. Tamamlanmamış step'lerden
 * en kritik olanları sıralı döner.
 */
export function getSuggestedSteps(
  result: ActivationResult,
  max = 3,
): ActivationStep[] {
  return result.steps
    .filter((s) => !s.done)
    .slice(0, max)
    .map((s) => s.step);
}
