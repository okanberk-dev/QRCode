import { useEffect, useRef, useState } from 'react';
import {
  Check, Copy, ExternalLink, Eye, EyeOff, Loader2, Lock, MoreHorizontal, Plus,
} from 'lucide-react';
import { AlertBanner, PulseMenu, PulseMenuItem } from '@/components/ui';
import type { MenuReadiness } from '@/lib/menu-readiness';
import { SITE_HOST, SITE_URL } from '@/lib/site';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import type { MenuCopy, MenuFmt } from './menu-copy';
import type { RestaurantShape } from './menu-types';
import { afterMenuCloses, copyText } from './menu-ui';

export type MenuStepId = 'category' | 'items' | 'publish';

/** Why the page is read-only, if it is. `null` while the role is still loading or when the owner can edit. */
export type MenuLockReason = 'locked' | 'viewer' | null;

const DOT = {
  draft: 'bg-[#D97706]',
  live: 'bg-[#16A34A]',
} as const;

/**
 * The one strip that says where the menu stands and what to do next:
 * - draft: three steps (add categories → add items → publish) + "Publish";
 * - live: the link (opens the menu), "Copy link", and "take offline" behind
 *   "⋯". QR and analytics live in the page header — not repeated here;
 * - locked (admin switch) / viewer: the page is read-only, said honestly —
 *   no upgrade promise, just how to ask for editing to be turned on.
 */
export function MenuStatusBar({
  isTr, copy, fmt, restaurant, readiness, lockReason, readOnly, publishBusy, justPublished,
  onDismissPublished, onPublish, onUnpublish, onStep,
}: {
  isTr: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  restaurant: RestaurantShape;
  readiness: MenuReadiness;
  lockReason: MenuLockReason;
  /** Locked, viewer, or role still loading: nothing here may write. */
  readOnly: boolean;
  publishBusy: boolean;
  /** Show the one-time "your menu is live" banner. */
  justPublished: boolean;
  onDismissPublished: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onStep: (step: MenuStepId) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const menuUrl = `${SITE_URL}/menu/${restaurant.slug}`;
  const shownPath = `/menu/${restaurant.slug}`;
  const shownUrl = `${SITE_HOST}${shownPath}`;
  const live = restaurant.menuPublished;
  const updated = restaurant.menuUpdatedAt
    ? `${copy.lastUpdated}: ${formatFullDateTimeInTimeZone(restaurant.menuUpdatedAt, isTr ? 'tr' : 'en')}`
    : null;

  const doCopy = async () => {
    if (await copyText(menuUrl)) {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyButton = (
    <button type="button" onClick={doCopy} className="bz-btn-ghost flex-1 shrink-0 sm:flex-none" aria-live="polite">
      {copied ? <Check size={14} strokeWidth={2.25} /> : <Copy size={14} strokeWidth={2} />}
      {copied ? copy.copied : copy.copyLink}
    </button>
  );

  const shell = (children: React.ReactNode, tone: 'plain' | 'muted' = 'plain') => (
    <div className="space-y-3">
      <section
        role="status"
        // Same height in every state from 1024px; the content sits in the
        // middle of it instead of leaving an empty band under a one-line state.
        className={`bz-card p-4 sm:px-5 lg:flex lg:min-h-[96px] lg:flex-col lg:justify-center ${tone === 'muted' ? 'bg-[#FAFAFA]' : ''}`}
      >
        {children}
      </section>
      {/* One-time confirmation; the copy button sits in the strip above and
          "Paylaş ve QR" in the page header, so no buttons are repeated here. */}
      {justPublished && live && !lockReason && (
        <AlertBanner kind="lime" onDismiss={onDismissPublished}>
          <span aria-live="polite">{copy.justPublished}</span>
        </AlertBanner>
      )}
    </div>
  );

  // ── Locked by the admin switch ──
  if (lockReason === 'locked') {
    return shell(
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#525252]">
            <Lock size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#0A0A0A]">{copy.lockedTitle}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#525252]">{copy.lockedBody}</p>
          </div>
        </div>
        <a
          href={`mailto:support@buaze.com?subject=${encodeURIComponent(copy.contactSubject)}`}
          className="bz-btn-ghost shrink-0"
        >
          {copy.contactUs}
        </a>
      </div>,
      'muted',
    );
  }

  // ── Viewer: read-only, state still visible ──
  if (lockReason === 'viewer') {
    return shell(
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#525252]">
          <Eye size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] font-medium text-[#0A0A0A]">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? DOT.live : DOT.draft}`} aria-hidden />
            {live ? copy.published : copy.draft}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#525252]">{copy.viewerOnly}</p>
        </div>
      </div>,
      'muted',
    );
  }

  // ── Live ──
  if (live) {
    return shell(
      <>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-medium text-[#166534]">
              <span className={`h-1.5 w-1.5 rounded-full ${DOT.live}`} aria-hidden />
              {copy.published}
              <span className="font-normal text-[#525252]">· {copy.liveHint}</span>
            </p>
            {updated && <p className="mt-0.5 text-[11px] text-[#737373]">{updated}</p>}
          </div>
          {/* Phones: the link chip has its own row, "Linki kopyala" + "⋯"
              below it. From sm they share one row; the chip may shrink (and
              truncate) there, the two buttons never do, so "⋯" (the only way to
              take the menu offline) keeps its full hit area. */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
            <a
              href={menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${copy.openMenu}: ${shownUrl}`}
              className="inline-flex min-h-[44px] w-full min-w-0 items-center gap-1.5 rounded-lg bg-[#FAFAFA] px-2.5 text-[12px] text-[#525252] ring-1 ring-[#EDEDED] hover:text-[#0A0A0A] sm:w-auto sm:flex-1 lg:min-h-[36px] lg:flex-initial"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {/* The slug is the part worth seeing; the host is the same for
                  every business, so it is shown only where there is room (xl). */}
              <span className="min-w-0 truncate xl:hidden">{shownPath}</span>
              <span className="hidden min-w-0 truncate xl:inline">{shownUrl}</span>
              <ExternalLink size={12} strokeWidth={2} className="shrink-0" aria-hidden />
            </a>
            {copyButton}
            <PulseMenu
              trigger={
                <button
                  type="button"
                  disabled={readOnly || publishBusy}
                  aria-label={copy.publishActions}
                  className="bz-btn-icon h-11 w-11 shrink-0 border border-[#EDEDED] disabled:opacity-40 lg:h-9 lg:w-9"
                >
                  {publishBusy ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} strokeWidth={2} />}
                </button>
              }
            >
              <PulseMenuItem danger icon={<EyeOff size={14} strokeWidth={2} />} onSelect={() => afterMenuCloses(onUnpublish)}>
                {copy.unpublish}
              </PulseMenuItem>
            </PulseMenu>
          </div>
        </div>
        {readiness.publishableItems === 0 && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] font-medium text-[#92400E]">{copy.liveButEmpty}</p>
            {!readOnly && (
              <button type="button" onClick={() => onStep('items')} className="bz-btn-ghost shrink-0 bg-white">
                <Plus size={14} strokeWidth={2.25} />
                {copy.addItem}
              </button>
            )}
          </div>
        )}
      </>,
    );
  }

  // ── Draft: three steps + publish ──
  const steps: { id: MenuStepId; label: string; short: string; done: boolean }[] = [
    {
      id: 'category',
      label: readiness.categories > 0 ? fmt.stepCategoryDone(readiness.categories) : copy.stepCategory,
      short: copy.stepCategoryShort,
      done: readiness.categories > 0,
    },
    {
      id: 'items',
      label: readiness.publishableItems > 0 ? fmt.stepItemsDone(readiness.publishableItems) : copy.stepItems,
      short: copy.stepItemsShort,
      done: readiness.publishableItems > 0,
    },
    { id: 'publish', label: copy.stepPublish, short: copy.stepPublishShort, done: false },
  ];
  const reasonId = 'menu-publish-reason';
  const publishDisabled = readOnly || publishBusy || !readiness.canPublish;

  return shell(
    <>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="min-w-0 lg:shrink-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-[#525252] lg:block">
            <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#92400E]">
              <span className={`h-1.5 w-1.5 self-center rounded-full ${DOT.draft}`} aria-hidden />
              {copy.draft}
            </span>
            <span className="lg:mt-0.5 lg:block">{copy.draftHint}</span>
          </p>
          {updated && <p className="mt-0.5 hidden text-[11px] text-[#737373] lg:block">{updated}</p>}
        </div>
        <ol className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {steps.map((step, idx) => {
            const current = readiness.nextStep === step.id;
            const base =
              'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border px-2 text-[13px] font-medium sm:h-9 sm:w-auto sm:justify-start sm:px-3.5';
            const marker = step.done ? (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                <Check size={10} strokeWidth={3} />
              </span>
            ) : (
              <span
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  current ? 'bg-[#0A0A0A] text-white' : 'bg-[#EDEDED] text-[#525252]'
                }`}
              >
                {idx + 1}
              </span>
            );
            const label = (
              <>
                <span className="truncate sm:hidden">{step.short}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </>
            );
            return (
              <li key={step.id} className="min-w-0">
                {/* The publish step is a marker only — the "Yayına al" button next
                    to the steps is the one action, not repeated here. */}
                {current && !readOnly && step.id !== 'publish' ? (
                  <button
                    type="button"
                    onClick={() => onStep(step.id)}
                    className={`${base} border-[#C6F24E] bg-[#EAF9B8]/60 text-[#0A0A0A] hover:bg-[#EAF9B8]`}
                  >
                    {marker}
                    {label}
                  </button>
                ) : (
                  <span
                    className={`${base} ${
                      step.done
                        ? 'border-[#EDEDED] bg-white text-[#0A0A0A]'
                        : current
                          ? 'border-[#C6F24E] bg-[#EAF9B8]/60 text-[#0A0A0A]'
                          : 'border-[#EDEDED] bg-[#FAFAFA] text-[#737373]'
                    }`}
                  >
                    {marker}
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          aria-describedby={!readiness.canPublish ? reasonId : undefined}
          className="bz-btn-lime w-full shrink-0 lg:w-auto"
        >
          {publishBusy ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} strokeWidth={2} />}
          {copy.publish}
        </button>
      </div>
      {!readiness.canPublish && !readOnly && (
        <p id={reasonId} className="mt-2 text-[12px] text-[#737373]">
          {copy.publishNeedsItem}
        </p>
      )}
    </>,
  );
}
