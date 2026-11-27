'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { ConfirmDialog } from '@/components/ui';
import CardVisual from '@/components/dashboard/billing/CardVisual';
import { billingText, type BillingCopyKey } from '@/components/dashboard/billing/billing-copy';
import type { PublicSavedCard } from '@/lib/billing/card-types';

export type SavedCardBlocked = 'owner_only' | 'unavailable';

type Status = { tone: 'ok' | 'error'; key: BillingCopyKey } | null;

/**
 * Body of /billing/{locale}/card: the saved card(s) and "Remove card". The
 * delete goes to the same owner-only API as the panel (verified at
 * PayNKolay by a re-list); the page then reloads its server data.
 */
export default function SavedCardClient({
  locale,
  cards,
  canManage,
  blocked,
}: {
  locale: 'tr' | 'en';
  cards: PublicSavedCard[];
  canManage: boolean;
  blocked: SavedCardBlocked | null;
}) {
  const t = (key: BillingCopyKey, vars?: Record<string, string | number>) => billingText(key, locale, vars);
  const router = useRouter();
  const [confirm, setConfirm] = useState<PublicSavedCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const dashboardUrl = `/${locale}/dashboard/account?section=billing`;
  const main = cards.find((c) => c.bound) ?? cards.find((c) => c.verified) ?? cards[0] ?? null;
  const others = cards.filter((c) => c !== main);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    let next: Status;
    try {
      const res = await fetch(`/api/billing/cards/${encodeURIComponent(confirm.handle)}`, { method: 'DELETE', credentials: 'same-origin' });
      let code = '';
      if (!res.ok) {
        try {
          const body = (await res.json()) as { error?: unknown };
          code = typeof body.error === 'string' ? body.error : '';
        } catch {
          code = '';
        }
      }
      next = res.ok
        ? { tone: 'ok', key: 'pm.removed' }
        : {
            tone: 'error',
            key: code === 'delete_unconfirmed' ? 'pm.removeFailed' : code === 'card_not_found' ? 'pm.removeNotListed' : 'pm.removeError',
          };
    } catch {
      next = { tone: 'error', key: 'pm.removeError' };
    }
    setBusy(false);
    setConfirm(null);
    setStatus(next);
    if (next?.tone === 'ok') router.refresh();
    // The removed card's button is gone: focus the result line, never <body>.
    window.setTimeout(() => statusRef.current?.focus(), 150);
  };

  const removeButton = (card: PublicSavedCard) => (
    <button
      type="button"
      className="bz-btn-ghost inline-flex min-h-[44px] items-center sm:min-h-[36px]"
      disabled={!canManage}
      aria-disabled={!canManage}
      onClick={() => setConfirm(card)}
    >
      {t('pm.remove')}
    </button>
  );

  return (
    <main className="min-h-dvh bg-[#FAFAFA] text-[#0A0A0A]">
      <header className="h-14 border-b border-[#EDEDED] bg-white">
        <div className="mx-auto flex h-full w-full max-w-[640px] items-center justify-between gap-3 px-4 sm:px-7">
          <a href={dashboardUrl} className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]">
            <BuazeLogo size={28} />
            <span className="text-[17px] font-semibold tracking-[-0.02em] [font-family:var(--font-heading)]">buaze</span>
          </a>
          <a
            href={dashboardUrl}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-[13px] text-[#525252] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] sm:min-h-0"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t('review.backToPanel')}
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-7">
        <div className="bz-card p-5 sm:p-6">
          <p className="pulse-eyebrow text-[#737373]">{t('pm.eyebrow')}</p>
          <h1 className="mt-2 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] [font-family:var(--font-heading)]">{t('card.title')}</h1>

          {blocked ? (
            <p className="mt-4 text-[14px] leading-[1.6] text-[#404040]" role="status">
              {t(blocked === 'owner_only' ? 'review.ownerOnly' : 'review.err.unavailable')}
            </p>
          ) : (
            <>
              <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-[1.55] text-[#525252]">
                <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-[#737373]" />
                {t('card.body')}
              </p>
              {main ? (
                <div className="mt-5 space-y-4">
                  <CardVisual card={main} locale={locale} />
                  {removeButton(main)}
                </div>
              ) : (
                <p className="mt-5 text-[14px] text-[#525252]">{t('card.none')}</p>
              )}
              {others.length > 0 ? (
                <ul className="mt-5 space-y-2 border-t border-[#EDEDED] pt-4">
                  {others.map((other) => (
                    <li key={other.handle} className="flex items-center justify-between gap-3 text-[13px] text-[#525252]">
                      <span className="min-w-0">
                        {other.last4
                          ? t(other.verified ? 'pm.previous' : 'pm.other', { last4: other.last4 })
                          : t(other.verified ? 'pm.previousNoDigits' : 'pm.otherNoDigits')}
                      </span>
                      {removeButton(other)}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!canManage ? <p className="mt-4 text-[12px] leading-[1.45] text-[#737373]">{t('pm.impersonating')}</p> : null}
            </>
          )}

          <p
            ref={statusRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            className={`mt-4 min-h-[18px] text-[13px] leading-[1.45] focus:outline-none ${status?.tone === 'error' ? 'text-[#991B1B]' : 'text-[#4D5C00]'}`}
          >
            {status ? t(status.key) : ''}
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        variant="danger"
        loading={busy}
        title={t('pm.removeTitle')}
        body={t('pm.removeBody')}
        confirmLabel={t('pm.removeConfirm')}
        cancelLabel={t('pm.cancel')}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(null)}
      />
    </main>
  );
}
