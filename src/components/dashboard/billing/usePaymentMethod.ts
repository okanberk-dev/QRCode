'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeleteCardResponse, PaymentMethodResponse } from '@/lib/billing/card-types';

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
    throw new BillingApiError(res.status, code);
  }
  return body as T;
}

async function fetchPaymentMethod(refresh: boolean): Promise<PaymentMethodResponse> {
  const res = await fetch(`/api/billing/payment-method${refresh ? '?refresh=1' : ''}`, {
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
