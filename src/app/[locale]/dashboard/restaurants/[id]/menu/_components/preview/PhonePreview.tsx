'use client';

import { useEffect, useId, useMemo, useRef, type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { EyeOff } from 'lucide-react';
import type { MenuCategoryView, RestaurantView } from '@/components/menu/PublicMenuView';
import { resolveMenuDesign } from '@/lib/menu-design';
import { useMenuCopy } from '../kit/useMenuCopy';
import { DRAFT_ITEM_ID, isTempId } from '../menu-merge';
import { PHONE_WIDTH, usePhoneFit } from './usePhoneFit';

/** Large and client-only: never part of the builder's first bundle. */
const PublicMenuView = dynamic(() => import('@/components/menu/PublicMenuView').then((m) => m.default), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

function PreviewSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-hidden="true">
      <div className="h-32 rounded-2xl bg-[#EDEDED]" />
      <div className="h-4 w-1/2 rounded bg-[#EDEDED]" />
      <div className="h-16 rounded-xl bg-[#EDEDED]" />
      <div className="h-16 rounded-xl bg-[#EDEDED]" />
    </div>
  );
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Instant scroll of the preview viewport to an element, with a correction for lazy content above it. */
function scrollPreviewTo(viewport: HTMLElement, el: HTMLElement, offset: number) {
  const top = () => el.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  // The zoom sits on the frame around the scroller (see `viewport` below).
  const zoom = parseFloat(viewport.parentElement?.style.zoom || '1') || 1;
  viewport.scrollTop += top() / zoom - offset;
  requestAnimationFrame(() => {
    const residual = top() / zoom - offset;
    if (Math.abs(residual) > 4) viewport.scrollTop += residual;
  });
}

/**
 * The customer's view inside the builder (spec §7.9): the real
 * `PublicMenuView` (analytics off) on in-memory data, so unsaved drafts show.
 * Only ONE instance may be mounted at a time — `PublicMenuView` looks things
 * up on `document` — so every host renders it only while it owns the slot.
 *
 * - Pick to edit: a click on an item opens it in the panel (the product modal is stopped).
 * - Focus: the panel's item / the row being edited is outlined (CSS only, no
 *   DOM changes) and scrolled into view; otherwise the preview follows the
 *   section the outline is on (paused 5 s after the owner scrolls the phone).
 */
export function PhonePreview({
  restaurant, categories, locale, variant, focusItemId, followCategoryId, onPickItem, height, topOffset,
  hiddenNote, scrollTopKey,
}: {
  restaurant: RestaurantView;
  categories: MenuCategoryView[];
  locale: 'tr' | 'en';
  variant: 'framed' | 'bare';
  focusItemId?: string | null;
  followCategoryId?: string | null;
  onPickItem?: (itemId: string) => void;
  height?: number;
  topOffset?: number;
  /** Why the focused item is not in the preview (hidden item / category). */
  hiddenNote?: string | null;
  /** Changing it scrolls the viewport back to the top (the design panel: header, logo, cover…). */
  scrollTopKey?: number;
}) {
  const copy = useMenuCopy();
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pausedUntil = useRef(0);
  const fit = usePhoneFit(stageRef, variant, { topOffset, height });
  // The page colour under the menu (no white edge below a dark or cream menu).
  const pageBg = useMemo(
    () =>
      resolveMenuDesign({
        menuTheme: restaurant.menuTheme,
        menuAccentColor: restaurant.menuAccentColor,
        primaryColor: restaurant.primaryColor,
        menuDesign: restaurant.menuDesign ?? null,
        hasCover: Boolean(restaurant.menuCoverUrl),
      }).colors.bg,
    [restaurant.menuTheme, restaurant.menuAccentColor, restaurant.primaryColor, restaurant.menuDesign, restaurant.menuCoverUrl],
  );

  useEffect(() => {
    if (scrollTopKey === undefined) return;
    viewportRef.current?.scrollTo({ top: 0 });
  }, [scrollTopKey]);

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!onPickItem) return;
    const card = (e.target as Element).closest<HTMLElement>('[data-pid]');
    const id = card?.dataset.pid;
    if (!id || id === DRAFT_ITEM_ID || isTempId(id)) return;
    e.stopPropagation();
    e.preventDefault();
    onPickItem(id);
  };

  // Scroll to the focused item after the preview has rendered it.
  useEffect(() => {
    if (!focusItemId || !SAFE_ID.test(focusItemId)) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const vp = viewportRef.current;
        const el = vp?.querySelector<HTMLElement>(`[data-pid="${focusItemId}"]`);
        if (vp && el) scrollPreviewTo(vp, el, 80);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [focusItemId, categories]);

  // Follow the outline's section when nothing is focused.
  useEffect(() => {
    if (focusItemId || !followCategoryId || !SAFE_ID.test(followCategoryId)) return;
    const timer = window.setTimeout(() => {
      if (Date.now() < pausedUntil.current) return;
      const vp = viewportRef.current;
      const el = vp?.querySelector<HTMLElement>(`[data-cat-id="${followCategoryId}"]`);
      if (vp && el) scrollPreviewTo(vp, el, 64);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [followCategoryId, focusItemId]);

  const pause = () => {
    pausedUntil.current = Date.now() + 5000;
  };

  const highlight =
    focusItemId && SAFE_ID.test(focusItemId) ? (
      <style>{`[data-preview-root="${uid}"] [data-pid="${focusItemId}"]{outline:2px solid #C6F24E;outline-offset:3px;border-radius:14px;box-shadow:0 0 0 6px rgba(198,242,78,.25)}`}</style>
    ) : null;

  // The frame (fixed size, zoom, containment) does not scroll; the scroller inside it does.
  // Containment makes the frame the containing block of the menu's `position: fixed`
  // product sheet and splash, so they pin to the phone instead of scrolling away with
  // the content (a sheet opened after scrolling would otherwise land above the view).
  const viewport = (
    <div style={{ width: PHONE_WIDTH, height: fit.height, zoom: fit.zoom, contain: 'layout paint', backgroundColor: pageBg }} className="relative">
      <div
        ref={viewportRef}
        data-preview-root={uid}
        onClickCapture={onClickCapture}
        onPointerDown={pause}
        onWheel={pause}
        onTouchStart={pause}
        aria-label={copy.preview.label}
        role="region"
        className="h-full overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
      >
        {highlight}
        <PublicMenuView restaurant={restaurant} categories={categories} locale={locale} disableAnalytics />
      </div>
    </div>
  );

  const note = hiddenNote ? (
    <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#525252]">
      <EyeOff size={12} strokeWidth={2} aria-hidden="true" />
      {hiddenNote}
    </p>
  ) : null;

  if (variant === 'bare') {
    return (
      <div ref={stageRef} className="w-full">
        {note}
        <div className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white">{viewport}</div>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="w-full">
      {note}
      <div className="mx-auto w-fit">
        <div className="rounded-[40px] bg-[#0A0A0A] p-2 shadow-[0_22px_50px_-12px_rgba(10,10,10,0.45),0_6px_12px_-3px_rgba(10,10,10,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="relative overflow-hidden rounded-[32px] bg-white">
            <div className="relative flex h-[22px] items-end justify-between bg-white px-4 pb-0.5" aria-hidden="true">
              <span className="z-10 text-[10px] font-semibold tabular-nums text-[#0A0A0A]">9:41</span>
              <span className="absolute left-1/2 top-[4px] h-[13px] w-[54px] -translate-x-1/2 rounded-full bg-[#0A0A0A]" />
              <span className="z-10 h-[8px] w-[16px] rounded-[2px] border border-[#0A0A0A]" />
            </div>
            {viewport}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2" aria-hidden="true">
              <div className="h-[3px] w-[80px] rounded-full bg-[#0A0A0A]/25" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
