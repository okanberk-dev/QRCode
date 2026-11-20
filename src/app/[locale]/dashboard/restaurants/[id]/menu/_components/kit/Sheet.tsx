'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';
import { useKeyboardInset } from '../menu-ui';
import { useMenuCopy } from './useMenuCopy';

/**
 * Side or bottom sheet on Radix Dialog (focus trap, Esc, outside click,
 * `aria-modal`). Every way of closing goes through `onRequestClose`, so the
 * caller can ask first when there are unsaved changes.
 *
 * Bottom sheets sit above the on-screen keyboard (`useKeyboardInset`, G8).
 * Title text is Buaze chrome (Clash); owner text belongs in an inner
 * `font-body` span passed as `title`.
 */
export function Sheet({
  open,
  onRequestClose,
  side,
  widthClass = 'sm:max-w-[520px]',
  title,
  headerExtra,
  footer,
  children,
  initialFocusRef,
  onCloseAutoFocus,
  bodyClassName = 'flex-1 overflow-y-auto px-4 py-5 sm:px-6',
  overlay,
}: {
  /**
   * Rendered last inside the sheet (`absolute inset-0` content such as an
   * in-place "leave without saving?" confirm). Anything outside a Radix modal
   * is inert while it is open, so confirmations for the sheet live here.
   */
  overlay?: ReactNode;
  open: boolean;
  onRequestClose: () => void;
  side: 'right' | 'bottom';
  widthClass?: string;
  title: ReactNode;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onCloseAutoFocus?: (e: Event) => void;
  bodyClassName?: string;
}) {
  const copy = useMenuCopy();
  const inset = useKeyboardInset();
  const bottom = side === 'bottom';

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onRequestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0A0A0A]/30 backdrop-blur-[2px] bz-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            onRequestClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            onRequestClose();
          }}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            if (initialFocusRef?.current) {
              e.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onCloseAutoFocus={onCloseAutoFocus}
          className={
            bottom
              ? 'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white pb-safe bz-elev-3 focus:outline-none'
              : `fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[#E8E8E8] bg-white bz-elev-3 focus:outline-none ${widthClass}`
          }
          style={
            bottom
              ? {
                  animation: 'bz-mob-sheet-in 220ms cubic-bezier(0.2,0.8,0.2,1)',
                  bottom: inset,
                  maxHeight: `calc(94dvh - ${inset}px)`,
                }
              : { animation: 'cust-drawer-in 220ms cubic-bezier(0.2,0.8,0.2,1)' }
          }
        >
          {bottom && (
            <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
              <span className="h-1 w-9 rounded-full bg-[#D4D4D4]" />
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2 border-b border-[#EDEDED] px-4 py-2.5 sm:px-6">
            <Dialog.Title className="min-w-0 flex-1 truncate bz-h-tight text-[18px] text-[#0A0A0A]">{title}</Dialog.Title>
            {headerExtra}
            <button type="button" onClick={onRequestClose} aria-label={copy.item.close} className="bz-btn-icon-lg shrink-0">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <div className={bodyClassName}>{children}</div>
          {footer && <div className="shrink-0 border-t border-[#EDEDED] px-4 py-3 sm:px-6">{footer}</div>}
          {overlay}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
