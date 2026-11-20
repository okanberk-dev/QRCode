'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, Maximize2, PanelRightClose, Smartphone, X } from 'lucide-react';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * The right column from 1024 px (spec §7.9, G5): "Müşterinin gördüğü" preview,
 * or — while an item is open — `[Önizleme | Ürün]` tabs, so the outline stays
 * visible and clickable next to the item form. The item form stays mounted
 * (hidden) on the preview tab so nothing typed is lost; the preview is
 * unmounted on the item tab (one preview at a time).
 *
 * Sticky under the toolbar: 1024–1399 two rows (top 184 = topbar 56 +
 * toolbar 112 + 16); ≥1400 one row, the category rail holds the chips
 * (top 128 = 56 + 56 + 16). Without the toolbar (design mode, empty-menu
 * setup) it sticks under the topbar (`stickyTop="page"`: 72 = 56 + 16) and
 * cannot be collapsed (no `onCollapse`).
 */
export function RightPanel({
  itemOpen, itemTitle, tab, onTab, onCloseItem, onCollapse, preview, item, published, openLink, stickyTop = 'toolbar',
}: {
  itemOpen: boolean;
  itemTitle: string | null;
  tab: 'preview' | 'item';
  onTab: (tab: 'preview' | 'item') => void;
  onCloseItem: () => void;
  onCollapse?: () => void;
  stickyTop?: 'toolbar' | 'page';
  preview: ReactNode;
  item: ReactNode;
  published: boolean;
  openLink: { href: string; external: boolean };
}) {
  const copy = useMenuCopy();
  return (
    <>
      {/* Positioned against the page wrapper (not the top of the page), so `.bz-skip-link`'s
          top: -40px would leave it on screen: hidden until it has focus. */}
      <a href="#menu-items-pane" className="bz-skip-link pointer-events-none opacity-0 focus:pointer-events-auto focus:opacity-100">
        {copy.preview.skip}
      </a>
      <aside
        aria-labelledby="right-panel-title"
        className={`bz-card sticky hidden flex-col self-start overflow-hidden p-0 lg:flex ${
          stickyTop === 'page'
            ? 'top-[72px] max-h-[calc(100dvh-88px)]'
            : 'top-[184px] max-h-[calc(100dvh-200px)] min-[1400px]:top-[128px] min-[1400px]:max-h-[calc(100dvh-144px)]'
        }`}
      >
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#EDEDED] px-3">
          {itemOpen ? (
            <>
              <h2 id="right-panel-title" className="sr-only">
                {copy.preview.title}
              </h2>
              <div role="tablist" aria-label={copy.view.label} className="inline-flex gap-0.5 rounded-[10px] bg-[#F2F2F2] p-[3px]">
                {(['preview', 'item'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => onTab(t)}
                    className={`h-7 rounded-[7px] px-3 text-[12.5px] font-medium ${
                      tab === t ? 'bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(10,10,10,0.08),0_0_0_1px_rgba(10,10,10,0.04)]' : 'text-[#525252] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {t === 'preview' ? copy.preview.tabPreview : copy.preview.tabItem}
                    {t === 'item' && itemTitle && <span className="sr-only">: {itemTitle}</span>}
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              <button type="button" onClick={onCloseItem} aria-label={copy.preview.closeItem} className="bz-btn-icon h-8 w-8">
                <X size={15} strokeWidth={2} />
              </button>
            </>
          ) : (
            <>
              <Smartphone size={14} strokeWidth={2} className="shrink-0 text-[#525252]" aria-hidden="true" />
              <h2 id="right-panel-title" className="min-w-0 flex-1 truncate">
                <span className="text-[13px] font-semibold text-[#0A0A0A]">{copy.preview.title}</span>
              </h2>
              {openLink.external ? (
                <a href={openLink.href} target="_blank" rel="noopener noreferrer" aria-label={copy.preview.openLiveAria} className="bz-btn bz-btn-sm shrink-0">
                  <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  {copy.preview.openLive}
                </a>
              ) : (
                <Link href={openLink.href} aria-label={copy.preview.fullScreenAria} className="bz-btn bz-btn-sm shrink-0">
                  <Maximize2 size={12} strokeWidth={2} aria-hidden="true" />
                  {copy.preview.fullScreen}
                </Link>
              )}
              {onCollapse && (
                <button type="button" onClick={onCollapse} aria-label={copy.preview.collapse} title={copy.preview.collapse} className="bz-btn-icon h-8 w-8 shrink-0">
                  <PanelRightClose size={15} strokeWidth={2} />
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {(!itemOpen || tab === 'preview') && preview}
          {itemOpen && (
            <div className="flex min-h-0 flex-1 flex-col" hidden={tab !== 'item'}>
              {item}
            </div>
          )}
        </div>
        <span className="sr-only">{published ? copy.save.live : copy.save.draft}</span>
      </aside>
    </>
  );
}
