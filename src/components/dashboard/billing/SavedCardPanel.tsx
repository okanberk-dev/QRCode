'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Lock, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react';
import { Badge, ConfirmDialog, Eyebrow, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import type { PublicSavedCard } from '@/lib/billing/card-types';
import AutoRenewControl from './AutoRenewControl';
import CardVisual from './CardVisual';
import { billingText, formatCardExpiry, formatIstanbulDate, type BillingLocale } from './billing-copy';
import { BillingApiError, useDeleteCard, usePaymentMethod, useRefreshCard } from './usePaymentMethod';

/**
 * "Ödeme yöntemi" card of the owner's billing section (billing spec §12.2):
 * the saved card (or a calm empty state), what it means ("stored by
 * PayNKolay, your card number never reaches Buaze"), replace / refresh /
 * remove, and any unverified card PayNKolay holds for this owner. Shown only
 * when saved cards are on; team members see one line; during a support
 * session everything is visible but nothing can be changed.
 */

function afterMenuCloses(fn: () => void): void {
  // Let the Radix menu restore focus before a dialog takes it.
  window.setTimeout(fn, 120);
}

type Status = { tone: 'ok' | 'error'; text: string } | null;

export default function SavedCardPanel({
  locale,
  renewable,
  onPickPlan,
}: {
  locale: BillingLocale;
  /** The owner has a card subscription (active / past due): replace + "pay and save" renew it. */
  renewable: boolean;
  /** Opens the plan picker (owners without a card subscription). */
  onPickPlan: () => void;
}) {
  const query = usePaymentMethod(true);
  const refresh = useRefreshCard();
  const del = useDeleteCard();
  const [confirm, setConfirm] = useState<PublicSavedCard | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const statusTimer = useRef<number | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => () => {
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
  }, []);

  const announce = (next: Status) => {
    setStatus(next);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    if (next?.tone === 'ok') statusTimer.current = window.setTimeout(() => setStatus(null), 5000);
  };

  if (query.isPending) {
    // Same shape as the loaded panel (card, meta line, actions, status line): nothing below moves.
    return (
      <div className="bz-card p-5" aria-busy="true">
        <Eyebrow>{billingText('pm.eyebrow', locale)}</Eyebrow>
        <div className="mt-3 aspect-[1.586/1] w-full max-w-[340px] animate-pulse rounded-[14px] bg-[#F2F2F2] motion-reduce:animate-none" />
        <div className="mt-3 h-3 w-56 max-w-full animate-pulse rounded bg-[#F2F2F2] motion-reduce:animate-none" />
        <div className="mt-4 h-11 w-32 animate-pulse rounded-full bg-[#F2F2F2] motion-reduce:animate-none sm:h-8" />
        <div className="mt-3 min-h-[18px]" />
      </div>
    );
  }

  if (query.isError) {
    const err = query.error;
    if (err instanceof BillingApiError && err.status === 403) {
      return (
        <div className="bz-card p-5">
          <Eyebrow>{billingText('pm.eyebrow', locale)}</Eyebrow>
          <p className="mt-3 flex items-start gap-2 text-[13px] leading-[1.5] text-[#525252]">
            <Lock size={14} className="mt-0.5 shrink-0 text-[#A3A3A3]" aria-hidden="true" />
            {billingText('pm.teamOnly', locale)}
          </p>
        </div>
      );
    }
    return (
      <div className="bz-card p-5">
        <Eyebrow>{billingText('pm.eyebrow', locale)}</Eyebrow>
        <p className="mt-3 text-[13px] text-[#991B1B]" role="alert">
          {billingText('pm.loadError', locale)}
        </p>
        <button type="button" className="bz-btn-ghost mt-3 min-h-[44px] sm:min-h-[32px]" onClick={() => void query.refetch()}>
          {billingText('pm.retry', locale)}
        </button>
      </div>
    );
  }

  const data = query.data;
  if (!data.enabled) return null;
  const card = data.card;
  const manage = data.canManage;
  const payHref = renewable ? `/billing/${locale}/checkout?intent=renew&saveCard=1` : null;
  const replaceHref = `/billing/${locale}/checkout?intent=replace_card`;

  const onRefresh = async () => {
    try {
      await refresh.mutateAsync();
      announce({ tone: 'ok', text: billingText('pm.refreshed', locale) });
    } catch {
      announce({ tone: 'error', text: billingText('pm.refreshError', locale) });
    }
  };

  const onRemove = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.handle);
      setConfirm(null);
      announce({ tone: 'ok', text: billingText('pm.removed', locale) });
      // The removed card's controls (and the dialog's return target) are gone after the refetch: move
      // keyboard / screen-reader focus to the status line instead of letting it fall to <body>.
      window.setTimeout(() => statusRef.current?.focus(), 150);
    } catch (err) {
      setConfirm(null);
      const code = err instanceof BillingApiError ? err.code : null;
      const key = code === 'delete_unconfirmed' ? 'pm.removeFailed' : code === 'card_not_found' ? 'pm.removeNotListed' : 'pm.removeError';
      announce({ tone: 'error', text: billingText(key, locale) });
    }
  };

  const emptyAction = manage ? (
    payHref ? (
      <a href={payHref} className="bz-btn-primary inline-flex min-h-[44px] items-center sm:min-h-[36px]">
        {billingText(data.saveAllowed ? 'pm.add' : 'pm.pay', locale)}
      </a>
    ) : (
      <button type="button" onClick={onPickPlan} className="bz-btn-primary inline-flex min-h-[44px] items-center sm:min-h-[36px]">
        {billingText(data.saveAllowed ? 'pm.add' : 'pm.pay', locale)}
      </button>
    )
  ) : null;

  return (
    <div className="bz-card p-5">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>{billingText('pm.eyebrow', locale)}</Eyebrow>
        {card?.expired ? <Badge kind="warn">{billingText('pm.expired', locale)}</Badge> : null}
      </div>

      <div className="mt-3">
        <CardVisual
          card={card}
          locale={locale}
          emptyAction={emptyAction}
          emptyHint={!data.saveAllowed && manage ? billingText('pm.saveLater', locale) : null}
        />
      </div>

      {card ? (
        <>
          <p className="mt-3 flex items-center gap-1.5 text-[12px] leading-[1.45] text-[#737373]">
            <Lock size={12} aria-hidden="true" className="shrink-0" />
            {billingText('pm.meta', locale)}
          </p>
          {card.expMonth && card.expYear ? (
            <p className="sr-only">
              {billingText('pm.expires', locale, {
                mm: String(card.expMonth).padStart(2, '0'),
                yy: formatCardExpiry(card.expMonth, card.expYear).slice(3),
              })}
            </p>
          ) : null}
          {card.expiresBeforeNextCharge ? (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-[1.45] text-[#92400E]">
              <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
              {billingText('pm.expiresSoon', locale)}
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            {renewable ? (
              manage ? (
                <a href={replaceHref} className="bz-btn-ghost inline-flex min-h-[44px] items-center sm:min-h-[32px]">
                  {billingText('pm.replace', locale)}
                </a>
              ) : (
                <span aria-disabled="true" className="bz-btn-ghost inline-flex min-h-[44px] cursor-not-allowed items-center opacity-50 sm:min-h-[32px]">
                  {billingText('pm.replace', locale)}
                </span>
              )
            ) : null}
            <PulseMenu
              trigger={
                <button
                  type="button"
                  className="bz-btn-icon inline-flex h-11 w-11 items-center justify-center sm:h-8 sm:w-8"
                  aria-label={billingText('pm.more', locale)}
                >
                  {refresh.isPending ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <MoreHorizontal size={16} aria-hidden="true" />}
                </button>
              }
            >
              <PulseMenuItem icon={<RefreshCw size={14} strokeWidth={2} />} onSelect={() => void onRefresh()}>
                {billingText('pm.refresh', locale)}
              </PulseMenuItem>
              <PulseMenuDivider />
              <PulseMenuItem
                danger
                disabled={!manage}
                icon={<Trash2 size={14} strokeWidth={2} />}
                onSelect={() => afterMenuCloses(() => setConfirm(card))}
              >
                {billingText('pm.remove', locale)}
              </PulseMenuItem>
            </PulseMenu>
          </div>
        </>
      ) : null}

      {data.otherCards.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-[#EDEDED] pt-3">
          {data.otherCards.map((other) => (
            <li key={other.handle} className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-[12px] leading-[1.45] text-[#737373]">
                <p className="flex items-center gap-1.5 font-medium text-[#525252]">
                  {data.renewal?.state === 'needs_action' ? (
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
                  ) : null}
                  {other.verified
                    ? other.last4
                      ? billingText('pm.previous', locale, { last4: other.last4 })
                      : billingText('pm.previousNoDigits', locale)
                    : other.last4
                      ? billingText('pm.other', locale, { last4: other.last4 })
                      : billingText('pm.otherNoDigits', locale)}
                </p>
                <p>{billingText(other.verified ? 'pm.previousHint' : 'pm.otherHint', locale)}</p>
              </div>
              <button
                type="button"
                className="bz-btn-ghost min-h-[44px] shrink-0 sm:min-h-[32px]"
                aria-disabled={!manage}
                disabled={!manage}
                onClick={() => setConfirm(other)}
              >
                {billingText('pm.otherRemove', locale)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <AutoRenewControl locale={locale} data={data} />

      {!manage ? <p className="mt-3 text-[12px] leading-[1.45] text-[#737373]">{billingText('pm.impersonating', locale)}</p> : null}

      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-[18px] text-[12px] leading-[1.45] focus:outline-none ${status?.tone === 'error' ? 'text-[#991B1B]' : 'text-[#4D5C00]'}`}
      >
        {status?.text ?? ''}
      </p>

      <ConfirmDialog
        open={confirm !== null}
        variant="danger"
        loading={del.isPending}
        title={billingText('pm.removeTitle', locale)}
        body={
          confirm?.bound
            ? billingText('pm.removeBodyAuto', locale, { date: formatIstanbulDate(data.accessUntil, locale) })
            : billingText('pm.removeBody', locale)
        }
        confirmLabel={billingText('pm.removeConfirm', locale)}
        cancelLabel={billingText('pm.cancel', locale)}
        onConfirm={onRemove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
