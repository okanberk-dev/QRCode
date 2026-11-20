'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, Download, ExternalLink, EyeOff, Loader2, Lock, Rocket, Share2, X } from 'lucide-react';
import { AlertBanner, Badge } from '@/components/ui';
import { copyToClipboard } from '@/lib/clipboard';
import type { MenuReadiness } from '@/lib/menu-readiness';
import { SITE_HOST, SITE_URL } from '@/lib/site';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import { STORAGE_KEYS, safeLocalGet, safeLocalSet } from '../kit/storage';
import { useMenuCopy } from '../kit/useMenuCopy';
import type { MenuFilter } from '../menu-filter';
import type { MenuNudges } from '../menu-status';
import type { RestaurantShape } from '../menu-types';
import { STATUS_TEXT_COLUMN } from './status-layout';

export type MenuStepId = 'category' | 'items' | 'publish';
export type MenuLockReason = 'locked' | 'viewer' | null;

/**
 * "Can customers see it?" (spec §7.5) — one card, one primary action per
 * state: locked (module off), viewer, draft (3 steps + "Yayına al"), live
 * (link, copy, share, open, quiet "Yayından kaldır"), just published.
 * Nudges (max 2) open the matching filter.
 */
export function MenuStatusCard({
  isTr, restaurant, readiness, nudges, lockReason, canEdit, publishBusy, justPublished, onPublish, onUnpublish,
  onDismissJustPublished, onStep, onNudge, onReopenAllSoldOut, onOpenShare,
}: {
  isTr: boolean;
  restaurant: RestaurantShape;
  readiness: MenuReadiness;
  nudges: MenuNudges;
  lockReason: MenuLockReason;
  canEdit: boolean;
  publishBusy: boolean;
  justPublished: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onDismissJustPublished: () => void;
  onStep: (step: MenuStepId) => void;
  onNudge: (filter: Exclude<MenuFilter, 'all'>) => void;
  onReopenAllSoldOut: () => void;
  onOpenShare: () => void;
}) {
  const copy = useMenuCopy();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [liveHintSeen, setLiveHintSeen] = useState(true);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    setLiveHintSeen(safeLocalGet(STORAGE_KEYS.liveHint) === '1');
  }, []);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const live = restaurant.menuPublished;
  const path = `/menu/${restaurant.slug}`;
  const url = `${SITE_URL}${path}`;
  const updated = restaurant.menuUpdatedAt
    ? copy.fmt.lastChange(formatFullDateTimeInTimeZone(restaurant.menuUpdatedAt, isTr ? 'tr' : 'en'))
    : null;

  const doCopy = async () => {
    if (await copyToClipboard(url)) setCopied(true);
  };
  const doShare = async () => {
    try {
      await navigator.share({ title: restaurant.name, url });
    } catch {
      /* cancelled */
    }
  };

  const shell = (badge: ReactNode, body: ReactNode, tone: 'plain' | 'muted' = 'plain') => (
    <section
      aria-labelledby="menu-status-title"
      className={`bz-card min-h-[164px] p-4 sm:min-h-[128px] sm:p-5 lg:min-h-[112px] ${tone === 'muted' ? 'bg-[#FAFAFA]' : ''}`}
    >
      <div className="mb-2">{badge}</div>
      {body}
    </section>
  );
  const title = (text: string) => (
    <h2 id="menu-status-title" className="min-w-0">
      <span className="bz-h-tight text-[18px] text-[#0A0A0A]">{text}</span>
    </h2>
  );

  const copyButton = (
    <button type="button" onClick={() => void doCopy()} className="bz-btn-ghost shrink-0">
      {copied ? <Check size={14} strokeWidth={2.25} aria-hidden="true" /> : <Copy size={14} strokeWidth={2} aria-hidden="true" />}
      {copied ? copy.status.copied : copy.status.copyLink}
    </button>
  );
  const shareButton = canNativeShare ? (
    <button type="button" onClick={() => void doShare()} className="bz-btn shrink-0">
      <Share2 size={14} strokeWidth={2} aria-hidden="true" />
      {copy.status.nativeShare}
    </button>
  ) : null;
  const linkChip = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${copy.status.openMenu}: ${SITE_HOST}${path}`}
      className="inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-[#FAFAFA] px-2.5 font-mono text-[12.5px] text-[#525252] ring-1 ring-[#EDEDED] hover:text-[#0A0A0A] lg:min-h-[36px]"
    >
      <span className="min-w-0 truncate">{SITE_HOST}{path}</span>
      <ExternalLink size={12} strokeWidth={2} className="shrink-0" aria-hidden="true" />
    </a>
  );

  const nudgeRow = () => {
    if (!canEdit || readiness.items === 0) return null;
    const list: { filter: Exclude<MenuFilter, 'all'>; text: string }[] = [];
    if (nudges.soldOut > 0) list.push({ filter: 'soldOut', text: copy.fmt.nudgeSoldOut(nudges.soldOut) });
    if (nudges.zeroPrice > 0) list.push({ filter: 'zeroPrice', text: copy.fmt.nudgeZeroPrice(nudges.zeroPrice) });
    if (nudges.noPhoto > 0) list.push({ filter: 'noPhoto', text: copy.fmt.nudgeNoPhoto(nudges.noPhoto) });
    if (nudges.noDescription > 0) list.push({ filter: 'noDescription', text: copy.fmt.nudgeNoDescription(nudges.noDescription) });
    if (list.length === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#EDEDED] pt-3" aria-label={copy.status.nudgesLabel} role="group">
        {list.slice(0, 2).map((n) => (
          <span key={n.filter} className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNudge(n.filter)}
              className="min-h-11 text-[13px] font-medium text-[#0A0A0A] underline decoration-[#D4D4D4] underline-offset-4 hover:decoration-[#0A0A0A] pointer-fine:min-h-8"
            >
              {n.text} ›
            </button>
            {n.filter === 'soldOut' && (
              <button type="button" onClick={onReopenAllSoldOut} className="bz-btn bz-btn-sm">
                {copy.status.restockAll}
              </button>
            )}
          </span>
        ))}
      </div>
    );
  };

  if (lockReason === 'locked') {
    return shell(
      <Badge kind="off">
        <Lock size={11} strokeWidth={2.25} aria-hidden="true" /> {copy.status.lockedBadge}
      </Badge>,
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title(copy.status.lockedTitle)}
          <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">{copy.status.lockedBody}</p>
        </div>
        <a href={`mailto:support@buaze.com?subject=${encodeURIComponent(copy.status.contactSubject)}`} className="bz-btn-ghost shrink-0">
          {copy.status.contactUs}
        </a>
      </div>,
      'muted',
    );
  }

  if (lockReason === 'viewer') {
    return shell(
      <Badge kind="info">{copy.status.viewerBadge}</Badge>,
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {title(live ? copy.status.liveTitle : copy.status.draftTitle)}
          <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">{copy.status.viewerOnly}</p>
        </div>
        {live && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {linkChip}
            {copyButton}
          </div>
        )}
      </div>,
      'muted',
    );
  }

  if (justPublished && live) {
    return (
      <section aria-labelledby="menu-status-title" className="bz-card min-h-[164px] border-[#D9EE7A] bg-[#F7FCE6] p-4 sm:min-h-[128px] sm:p-5 lg:min-h-[112px]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] text-[#0A0A0A]">
            <Rocket size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            {title(copy.status.liveTitle)}
            <p aria-live="polite" className="mt-1 text-[13px] leading-relaxed text-[#4D5C00]">
              {copy.status.justPublished}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {copyButton}
              <button type="button" onClick={onOpenShare} className="bz-btn-primary shrink-0">
                <Download size={14} strokeWidth={2} aria-hidden="true" />
                {copy.status.downloadQr}
              </button>
              {shareButton}
            </div>
          </div>
          <button type="button" onClick={onDismissJustPublished} aria-label={copy.status.dismiss} className="bz-btn-icon h-11 w-11 shrink-0 pointer-fine:h-8 pointer-fine:w-8">
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      </section>
    );
  }

  if (live) {
    return shell(
      <Badge kind="ok" dot={false}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] bz-pulse-dot" aria-hidden="true" />
        {copy.status.liveBadge}
      </Badge>,
      <>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <div className={STATUS_TEXT_COLUMN}>
            {title(copy.status.liveTitle)}
            <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">{copy.status.liveBody}</p>
            {updated && <p className="mt-0.5 text-[12px] text-[#737373]">{updated}</p>}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            {linkChip}
            {copyButton}
            {shareButton}
            {canEdit && (
              <button
                type="button"
                onClick={onUnpublish}
                disabled={publishBusy}
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[12.5px] font-medium text-[#737373] underline-offset-2 hover:text-[#B91C1C] hover:underline pointer-fine:min-h-8"
              >
                {publishBusy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <EyeOff size={13} strokeWidth={2} aria-hidden="true" />}
                {publishBusy ? copy.status.unpublishing : copy.status.unpublish}
              </button>
            )}
          </div>
        </div>
        {readiness.publishableItems === 0 && (
          <AlertBanner kind="warn" className="mt-3">
            {copy.status.liveEmpty}
          </AlertBanner>
        )}
        {!liveHintSeen && canEdit && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#FAFAFA] px-3 py-2 text-[12.5px] text-[#525252]">
            <span>{copy.status.liveHint}</span>
            <button
              type="button"
              onClick={() => {
                safeLocalSet(STORAGE_KEYS.liveHint, '1');
                setLiveHintSeen(true);
              }}
              className="min-h-11 shrink-0 font-semibold text-[#0A0A0A] pointer-fine:min-h-8"
            >
              {copy.status.liveHintOk}
            </button>
          </div>
        )}
        {nudgeRow()}
      </>,
    );
  }

  // Draft
  const steps: { id: MenuStepId; label: string; short: string; done: boolean }[] = [
    {
      id: 'category',
      label: readiness.categories > 0 ? copy.fmt.stepCategoryDone(readiness.categories) : copy.status.stepCategory,
      short: copy.status.stepCategoryShort,
      done: readiness.categories > 0,
    },
    {
      id: 'items',
      label: readiness.publishableItems > 0 ? copy.fmt.stepItemsDone(readiness.publishableItems) : copy.status.stepItems,
      short: copy.status.stepItemsShort,
      done: readiness.publishableItems > 0,
    },
    { id: 'publish', label: copy.status.stepPublish, short: copy.status.stepPublishShort, done: false },
  ];
  const blocked = !canEdit || !readiness.canPublish;
  return shell(
    <Badge kind="off">{copy.status.draftBadge}</Badge>,
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className={STATUS_TEXT_COLUMN}>
          {title(copy.status.draftTitle)}
          <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">{copy.status.draftBody}</p>
          {updated && <p className="mt-0.5 text-[12px] text-[#737373]">{updated}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:min-w-0 lg:justify-end">
          <ol aria-label={copy.status.stepsAria} className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {steps.map((step, idx) => {
              const current = readiness.nextStep === step.id;
              const clickable = canEdit && !step.done && (step.id !== 'publish' || readiness.canPublish);
              const marker = step.done ? (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
                  <Check size={10} strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    current ? 'bg-[#0A0A0A] text-white' : 'bg-[#EDEDED] text-[#525252]'
                  }`}
                >
                  {idx + 1}
                </span>
              );
              const cls = `inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border px-2 text-[13px] font-medium sm:h-9 sm:w-auto sm:justify-start sm:px-3.5 ${
                current ? 'border-[#C6F24E] bg-[#EAF9B8]/60 text-[#0A0A0A]' : step.done ? 'border-[#EDEDED] bg-white text-[#0A0A0A]' : 'border-[#EDEDED] bg-[#FAFAFA] text-[#737373]'
              }`;
              const label = (
                <>
                  <span className="truncate sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </>
              );
              return (
                <li key={step.id} className="min-w-0">
                  {clickable ? (
                    <button type="button" onClick={() => onStep(step.id)} className={`${cls} hover:bg-[#EAF9B8]`}>
                      {marker}
                      {label}
                    </button>
                  ) : (
                    <span className={cls}>
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
            onClick={() => !blocked && !publishBusy && onPublish()}
            aria-disabled={blocked || publishBusy || undefined}
            aria-describedby={!readiness.canPublish ? 'menu-publish-reason' : undefined}
            className={`bz-btn-lime min-h-[44px] w-full sm:w-auto ${blocked ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {publishBusy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Rocket size={14} strokeWidth={2} aria-hidden="true" />}
            {publishBusy ? copy.status.publishing : copy.status.publish}
          </button>
        </div>
      </div>
      {!readiness.canPublish && canEdit && (
        <p id="menu-publish-reason" className="mt-2 text-[12px] text-[#737373]">
          {copy.status.publishNeedsItem}
        </p>
      )}
      {nudgeRow()}
    </>,
  );
}
