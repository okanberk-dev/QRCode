'use client';

import { useEffect, useRef, useState } from 'react';
import { Smartphone, ExternalLink, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type {
  MenuCategoryView,
  RestaurantView,
} from '@/components/menu/PublicMenuView';

// PublicMenuView client-only ve büyük (1395 LOC). Ana builder bundle'a
// statik girmesin diye dynamic import.
const PublicMenuView = dynamic(
  () => import('@/components/menu/PublicMenuView').then((m) => m.default ?? m),
  { ssr: false, loading: () => null },
);

// iPhone tarzı device frame: bezel + status bar + scrollable viewport +
// home indicator. Önceki `transform: scale + overflow:hidden` paterni
// içeriği hero'da klipliyordu (owner ürün listesini önizleyemiyordu).
// CSS `zoom` hem layout box hem visual'i scale ettiği için, scrollable
// container içinde owner tüm menüyü 1:1 tipografi sadakatiyle
// gezinebilir (Firefox 126+, Chrome/Safari her zaman destekledi).
//
// 375 native × 0.78 zoom = 292 visual. Bezel padding 8px (p-2), toplam
// 308 + stage padding 16 (px-4) = 340. Grid column `lg:grid-cols-
// [1fr_340px]` ile parity (page.tsx).
const PHONE_NATIVE_WIDTH = 375;
const PHONE_NATIVE_HEIGHT = 660;
const PREVIEW_ZOOM = 0.78;
// The phone frame: 375 × 0.78 viewport + 8px bezel on each side.
const PHONE_FRAME_WIDTH = 308;
// Stage side padding (px-4) — the phone needs this much room on both sides.
const STAGE_PADDING = 32;

interface MenuLivePreviewProps {
  // PublicMenuView ile aynı tipler — type safety için import.
  restaurant: RestaurantView;
  categories: MenuCategoryView[];
  locale: 'tr' | 'en';
  /** Public menu is live (`menuEnabled && menuPublished`). Drafts have no
   *  public page yet, so the header link opens the in-panel preview. */
  published: boolean;
  /**
   * `rail` — the sticky side column of the builder (only from 1400px up).
   * `inline` — plain block for use inside a modal (no sticky, no breakpoint).
   */
  variant?: 'rail' | 'inline';
}

export function MenuLivePreview({ restaurant, categories, locale, published, variant = 'rail' }: MenuLivePreviewProps) {
  const isTr = locale === 'tr';
  // Public menu route is locale-less (`src/app/menu/[slug]`).
  const publicHref = `/menu/${restaurant.slug}`;
  const previewHref = `/${locale}/dashboard/restaurants/${restaurant.id}/menu?preview=1`;

  const label = isTr ? 'Menü canlı önizlemesi' : 'Live menu preview';
  // Masaüstü shell topbar'ı (~71px) da sticky; top-4 önizlemenin üst kısmını
  // onun altına sokuyordu → topbar + 16px boşluk. `self-start`: a stretched
  // grid item is as tall as the row and has no room to stick. The side column
  // exists only from 1400px up (narrower, the item list would shrink to
  // ~376px); between 1024 and 1399 the preview opens in a modal instead.
  const Tag = variant === 'inline' ? 'div' : 'aside';

  // Inside a dialog on a narrow phone the stage is narrower than the frame
  // (a 375px screen leaves ~265px): shrink the frame to fit instead of
  // letting the dialog clip it.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const stage = stageRef.current;
    if (variant !== 'inline' || !stage || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const room = stage.clientWidth - STAGE_PADDING;
      setFit(room > 0 ? Math.min(1, Math.max(0.5, room / PHONE_FRAME_WIDTH)) : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [variant]);
  const wrapperClass = variant === 'inline' ? '' : 'sticky top-[87px] hidden self-start min-[1400px]:block';

  return (
    <Tag className={wrapperClass} aria-label={label} role={variant === 'inline' ? 'group' : undefined}>
      <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        {/* Header — eyebrow + spec + new-tab open shortcut */}
        <header className="flex items-center justify-between gap-2 border-b border-[#EDEDED] px-4 py-3">
          <div className="flex items-center gap-2">
            <Smartphone size={14} className="text-[#525252]" strokeWidth={2} />
            <p className="pulse-eyebrow text-[#525252]">
              {isTr ? 'CANLI ÖNİZLEME' : 'LIVE PREVIEW'}
            </p>
          </div>
          {published ? (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isTr ? 'Yayındaki menüyü yeni sekmede aç' : 'Open the live menu in a new tab'}
              className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-2 py-0.5 text-[10px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            >
              <ExternalLink size={10} strokeWidth={2.25} />
              {isTr ? 'Aç' : 'Open'}
            </a>
          ) : (
            <Link
              href={previewHref}
              aria-label={isTr ? 'Taslak menüyü tam ekran önizle' : 'Preview the draft menu full screen'}
              className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-2 py-0.5 text-[10px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            >
              <Maximize2 size={10} strokeWidth={2.25} />
              {isTr ? 'Tam ekran' : 'Full screen'}
            </Link>
          )}
        </header>

        {/* Device stage — subtle gradient backdrop, like Vercel/Figma previews */}
        <div ref={stageRef} className="relative bg-gradient-to-b from-[#FAFAFA] to-[#F0F0F0] px-4 py-6">
          <div className="relative mx-auto" style={{ width: PHONE_FRAME_WIDTH, ...(fit < 1 ? { zoom: fit } : null) }}>
            {/* Outer bezel — graphite frame, soft drop shadow, inset highlight */}
            <div
              className="rounded-[40px] bg-[#0A0A0A] p-2 shadow-[0_22px_50px_-12px_rgba(10,10,10,0.45),0_6px_12px_-3px_rgba(10,10,10,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              {/* Inner safe area — rounded inset that clips status bar + viewport */}
              <div className="relative overflow-hidden rounded-[32px] bg-white">
                {/* Status bar — iPhone-style with dynamic island substitute */}
                <div className="relative flex h-[26px] items-end justify-between bg-white px-4 pb-1">
                  <span className="z-10 text-[10px] font-semibold tabular-nums text-[#0A0A0A]">
                    9:41
                  </span>
                  {/* Centered dynamic-island pill */}
                  <div
                    className="absolute left-1/2 top-[5px] h-[14px] w-[58px] -translate-x-1/2 rounded-full bg-[#0A0A0A]"
                    aria-hidden="true"
                  />
                  {/* Signal + battery glyph cluster */}
                  <span className="z-10 flex items-center gap-[3px]">
                    <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden="true">
                      <rect x="0" y="6" width="2" height="3" rx="0.5" fill="#0A0A0A" />
                      <rect x="3" y="4" width="2" height="5" rx="0.5" fill="#0A0A0A" />
                      <rect x="6" y="2" width="2" height="7" rx="0.5" fill="#0A0A0A" />
                      <rect x="9" y="0" width="2" height="9" rx="0.5" fill="#0A0A0A" />
                    </svg>
                    <svg width="18" height="9" viewBox="0 0 18 9" fill="none" aria-hidden="true">
                      <rect x="0.5" y="0.5" width="14" height="8" rx="2" stroke="#0A0A0A" />
                      <rect x="2" y="2" width="9" height="5" rx="0.5" fill="#0A0A0A" />
                      <rect x="15.5" y="3" width="1.5" height="3" rx="0.5" fill="#0A0A0A" />
                    </svg>
                  </span>
                </div>

                {/* Scrollable menu viewport — zoom 0.78, layout box + visual
                    her ikisi birden scale (eski transform: scale clip
                    sorununu çözer). overflow-y:auto + overflow-x:hidden
                    horizontal scrollbar görünmesini önler. */}
                <div
                  className="bg-white overflow-y-auto overflow-x-hidden"
                  style={{
                    width: PHONE_NATIVE_WIDTH,
                    height: PHONE_NATIVE_HEIGHT,
                    zoom: PREVIEW_ZOOM,
                    scrollbarGutter: 'stable',
                  }}
                >
                  <PublicMenuView
                    restaurant={restaurant}
                    categories={categories}
                    locale={locale}
                    disableAnalytics
                  />
                </div>

                {/* Home indicator — subtle bottom hint (iOS gesture bar) */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                  <div className="h-[3px] w-[80px] rounded-full bg-[#0A0A0A]/25" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <footer className="border-t border-[#EDEDED] bg-white px-4 py-3">
          <p className="text-[11px] leading-[1.45] text-[#525252]">
            {isTr ? (
              <>
                Müşteri görünümü <strong className="text-[#0A0A0A]">1:1 ölçekte</strong>.
                Tema, renk veya logo değiştirdiğinde anında güncellenir; kaydırarak tüm menüyü gezebilirsin.
              </>
            ) : (
              <>
                Customer view at <strong className="text-[#0A0A0A]">1:1 scale</strong>.
                Updates instantly when you change theme, color, or logo; scroll to preview the entire menu.
              </>
            )}
          </p>
        </footer>
      </div>
    </Tag>
  );
}

export default MenuLivePreview;
