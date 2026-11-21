'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AutoRenewOfferPublic, DeleteCardResponse, PaymentMethodResponse, StepUpMethodName } from '@/lib/billing/card-types';

/**
 * React Query hooks of the saved-card panel (billing spec §6.2). The query
 * key is shared: deleting or refreshing a card invalidates it. Errors carry
 * the HTTP status and the API error code only (never a body text).
 */

export const PAYMENT_METHOD_KEY = ['billing-payment-method'] as const;

export class BillingApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** The JSON body of the error (offer on terms_changed, method on step_up_required, reason on not_eligible). */
    readonly body: Record<string, unknown> | null = null,
  ) {
    super(code);
    this.name = 'BillingApiError';
  }
}

async function readJson<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const code = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : 'error';
    throw new BillingApiError(res.status, code, body && typeof body === 'object' ? (body as Record<string, unknown>) : null);
  }
  return body as T;
}

/** The panel's language, so the auto-renew offer text is rendered in the language the owner reads. */
function panelLocale(): 'tr' | 'en' {
  if (typeof window === 'undefined') return 'tr';
  return window.location.pathname.startsWith('/en/') || window.location.pathname === '/en' ? 'en' : 'tr';
}

async function fetchPaymentMethod(refresh: boolean): Promise<PaymentMethodResponse> {
  const params = new URLSearchParams({ locale: panelLocale() });
  if (refresh) params.set('refresh', '1');
  const res = await fetch(`/api/billing/payment-method?${params.toString()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  return readJson<PaymentMethodResponse>(res);
}

export function usePaymentMethod(enabled: boolean) {
  return useQuery({
    queryKey: PAYMENT_METHOD_KEY,
    queryFn: () => fetchPaymentMethod(false),
    enabled,
    staleTime: 30_000,
    retry: (count, err) => !(err instanceof BillingApiError && err.status < 500) && count < 1,
  });
}

/** "Kartı yenile": asks PayNKolay again and replaces the cached answer. */
export function useRefreshCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchPaymentMethod(true),
    onSuccess: (data) => qc.setQueryData(PAYMENT_METHOD_KEY, data),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handle: string) => {
      const res = await fetch(`/api/billing/cards/${encodeURIComponent(handle)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      return readJson<DeleteCardResponse>(res);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEY }),
  });
}

export type StepUpProofInput =
  | { method: 'totp'; code: string }
  | { method: 'password'; password: string }
  | { method: 'google'; idToken: string };

/** POST /api/billing/step-up (D14): 204 sets the short-lived step-up cookie; nothing is kept client-side. */
export function useStepUp() {
  return useMutation({
    mutationFn: async (proof: StepUpProofInput) => {
      const res = await fetch('/api/billing/step-up', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      });
      if (res.status === 204) return true;
      await readJson<unknown>(res);
      return true;
    },
  });
}

export interface AutoRenewChangeResponse {
  ok: true;
  state?: 'on' | 'paused';
  firstChargeDate?: string;
  autoRenew?: 'off';
  accessUntil?: string | null;
  chargeInProgress?: boolean;
}

/** POST /api/billing/auto-renew: enable with the offer the owner confirmed, or disable (one click). */
export function useSetAutoRenew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { enabled: true; offer: AutoRenewOfferPublic } | { enabled: false },
    ): Promise<AutoRenewChangeResponse> => {
      const payload = input.enabled
        ? {
            enabled: true,
            consent: { accepted: true, textVersion: input.offer.textVersion, textHash: input.offer.textHash },
            expected: {
              amountMinor: input.offer.terms.amountMinor,
              planId: input.offer.terms.planId,
              cardHandle: input.offer.cardHandle,
              firstChargeDate: input.offer.terms.firstChargeDate,
            },
          }
        : { enabled: false };
      const res = await fetch('/api/billing/auto-renew', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return readJson<AutoRenewChangeResponse>(res);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEY }),
  });
}

export type { StepUpMethodName };
