'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, ChevronsDownUp, ChevronsUpDown, ClipboardPaste, Keyboard, ListOrdered, Maximize2, MoreHorizontal, Palette, QrCode } from 'lucide-react';
import { PageHeader, PulseMenu, PulseMenuDivider, PulseMenuItem } from '@/components/ui';
import { useMenuCopy } from '../kit/useMenuCopy';
import { MENU_TOUCH, afterMenuCloses } from '../menu-ui';

/**
 * Page header (§49: one primary, one secondary, the rest under "Diğer"):
 * primary "Paylaş ve QR", secondary "Görünüm", "Diğer" = Analitik · Tam ekran
 * önizle · (organise items) · Tümünü daralt / genişlet · Klavye kısayolları.
 * Optional entries appear once their chunk wires them. "Yayına al" /
 * "Yayından kaldır" live only in the status card.
 */
export function StudioHeader({
  restaurantName, canDesign, designReady, canShare, designActive, onOpenDesign, onOpenShare, analyticsHref, fullPreview,
  onSortCategories, onPasteList, onCollapseAll, onExpandAll, onShortcuts, designDisabledReason, organiseDisabled = false,
}: {
  restaurantName: string;
  canDesign: boolean;
  /** The design panel exists (chunk 4); until then the button is `aria-disabled`. */
  designReady: boolean;
  canShare: boolean;
  designActive: boolean;
  onOpenDesign: () => void;
  onOpenShare: () => void;
  analyticsHref: string;
  fullPreview: { href: string; external: boolean };
  onSortCategories?: () => void;
  onPasteList?: () => void;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  onShortcuts?: () => void;
  designDisabledReason?: string | null;
  /** Read-only: "Kategorileri sırala" / "Liste yapıştır" stay listed but disabled. */
  organiseDisabled?: boolean;
}) {
  const copy = useMenuCopy();
  const router = useRouter();
  const openFullPreview = () => {
    if (fullPreview.external) window.open(fullPreview.href, '_blank', 'noopener,noreferrer');
    else router.push(fullPreview.href);
  };
  const designOff = !canDesign || !designReady;
  return (
    <div>
      <PageHeader
        className="!mb-0"
        titleScale="compact"
        title={copy.header.title}
        description={<span className="font-medium text-[#0A0A0A]">{restaurantName}</span>}
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              aria-pressed={designActive}
              aria-disabled={designOff || undefined}
              aria-describedby={designOff && designDisabledReason ? 'menu-design-reason' : undefined}
              onClick={() => !designOff && onOpenDesign()}
              className={`bz-btn-ghost min-h-[44px] flex-1 sm:min-h-[36px] sm:flex-none ${designOff ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <Palette size={14} strokeWidth={2} aria-hidden="true" />
              {copy.header.design}
            </button>
            {designOff && designDisabledReason && (
              <span id="menu-design-reason" className="sr-only">
                {designDisabledReason}
              </span>
            )}
            <button
              type="button"
              disabled={!canShare}
              onClick={onOpenShare}
              title={!canShare ? copy.header.shareLockedReason : undefined}
              className="bz-btn-primary min-h-[44px] flex-1 sm:min-h-[36px] sm:flex-none"
            >
              <QrCode size={14} strokeWidth={2} aria-hidden="true" />
              {copy.header.share}
            </button>
            <PulseMenu
              className={`min-w-[220px] ${MENU_TOUCH}`}
              trigger={
                <button
                  type="button"
                  aria-label={copy.header.moreActions}
                  className="bz-btn-ghost min-h-[44px] min-w-[44px] shrink-0 px-0 sm:min-h-[36px] sm:min-w-0 sm:px-3"
                >
                  <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="hidden sm:inline">{copy.header.more}</span>
                </button>
              }
            >
              <PulseMenuItem icon={<BarChart3 size={13} strokeWidth={2} />} onSelect={() => router.push(analyticsHref)}>
                {copy.header.analytics}
              </PulseMenuItem>
              <PulseMenuItem
                icon={<Maximize2 size={13} strokeWidth={2} />}
                onSelect={openFullPreview}
              >
                {copy.header.fullPreview}
              </PulseMenuItem>
              {(onSortCategories || onPasteList || onCollapseAll || onExpandAll) && <PulseMenuDivider />}
              {onSortCategories && (
                <PulseMenuItem
                  icon={<ListOrdered size={13} strokeWidth={2} />}
                  disabled={organiseDisabled}
                  onSelect={() => afterMenuCloses(onSortCategories)}
                >
                  {copy.header.sortCategories}
                </PulseMenuItem>
              )}
              {onPasteList && (
                <PulseMenuItem
                  icon={<ClipboardPaste size={13} strokeWidth={2} />}
                  disabled={organiseDisabled}
                  onSelect={() => afterMenuCloses(onPasteList)}
                >
                  {copy.header.pasteList}
                </PulseMenuItem>
              )}
              {onCollapseAll && (
                <PulseMenuItem icon={<ChevronsDownUp size={13} strokeWidth={2} />} onSelect={onCollapseAll}>
                  {copy.header.collapseAll}
                </PulseMenuItem>
              )}
              {onExpandAll && (
                <PulseMenuItem icon={<ChevronsUpDown size={13} strokeWidth={2} />} onSelect={onExpandAll}>
                  {copy.header.expandAll}
                </PulseMenuItem>
              )}
              {onShortcuts && (
                <PulseMenuItem icon={<Keyboard size={13} strokeWidth={2} />} trailing="?" onSelect={() => afterMenuCloses(onShortcuts)}>
                  {copy.header.shortcuts}
                </PulseMenuItem>
              )}
            </PulseMenu>
          </div>
        }
      />
    </div>
  );
}
