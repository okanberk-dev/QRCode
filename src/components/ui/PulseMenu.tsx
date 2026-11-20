'use client';

/**
 * PulseMenu — Buaze panel action menu primitive (Radix DropdownMenu wrapper).
 *
 * Pulse `bz-menu` styling (globals.css §40.3) + Radix a11y baseline (focus
 * trap, arrow keys, type-ahead, ESC, portal). Tek `<ScopeDropdown>` ile
 * paylaşılan kanonik tasarım — eski 3 elle-yazılmış custom dropdown
 * (`UserDashboardShell` workspace+user menu, `admin/blog` row actions,
 * `admin/restaurants` row actions) bu primitive üzerine kademeli migrate
 * edilir (CLAUDE.md §23.7 Phase log).
 *
 * Davranış:
 *  - Trigger button caller render eder (asChild) — caller existing button
 *    styling + icon korur. Sadece içerik Pulse'a uyar.
 *  - Items `bz-menu-item` styling (lime tint highlight + check icon slot
 *    + danger variant). Selected state `aria-selected`.
 *  - Mobile <640px `bz-menu--sheet` (bottom-sheet) + tap-to-dismiss
 *    backdrop. Desktop dropdown anchored.
 *
 * A11y: Radix native — `role="menu"`, arrow keys, type-ahead, ESC close,
 * portal collision detection, focus restore on close.
 *
 * Form select (single-choice with persistent value) için **PulseSelect**
 * (listbox) kullan; action menu (transient command list) için PulseMenu.
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export type PulseMenuAlign = 'start' | 'center' | 'end';
export type PulseMenuSide = 'top' | 'right' | 'bottom' | 'left';

export interface PulseMenuProps {
  /** Trigger element — caller existing button styling intact (asChild). */
  trigger: ReactNode;
  children: ReactNode;
  /** Anchor alignment on the trigger axis. Default `end` (row actions). */
  align?: PulseMenuAlign;
  /** Side of the trigger to anchor on. Default `bottom`. */
  side?: PulseMenuSide;
  /** Px gap between trigger and content. Default `8`. */
  sideOffset?: number;
  /** Viewport edge padding for collision detection. Default `12`. */
  collisionPadding?: number;
  /** Min width override (Tailwind class). Default `min-w-[180px]`. */
  className?: string;
  /** Forwarded to Radix Root for controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PulseMenu({
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  sideOffset = 8,
  collisionPadding = 12,
  className = '',
  open,
  onOpenChange,
}: PulseMenuProps) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          // Above the mobile bottom nav (z-40) and modals (z-50); Radix copies
          // the content's z-index to its positioning wrapper. Callers can
          // still pass their own z-* class.
          className={`bz-menu focus:outline-none ${/(^|\s)z-/.test(className) ? '' : 'z-[70] '}${className}`}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export interface PulseMenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  /** Show trailing check icon (single-choice menus). */
  selected?: boolean;
  /** Apply danger styling (destructive actions). */
  danger?: boolean;
  disabled?: boolean;
  /** Leading icon slot — lucide-react size ~14 önerilir. */
  icon?: ReactNode;
  /** Trailing slot (shortcut, badge, vb.) — `selected` true ise check öncelikli. */
  trailing?: ReactNode;
  /**
   * `aria-keyshortcuts` for the item's action (e.g. `Shift+N`). The trailing
   * hint is aria-hidden, so this is how assistive tech learns the shortcut.
   */
  ariaKeyShortcuts?: string;
}

export function PulseMenuItem({
  children,
  onSelect,
  selected = false,
  danger = false,
  disabled = false,
  icon,
  trailing,
  ariaKeyShortcuts,
}: PulseMenuItemProps) {
  const classes = ['bz-menu-item', selected ? 'justify-between' : '', danger ? 'danger' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <DropdownMenu.Item
      onSelect={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onSelect?.();
      }}
      disabled={disabled}
      aria-selected={selected || undefined}
      aria-keyshortcuts={ariaKeyShortcuts}
      className={classes}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {selected ? (
        <Check size={13} strokeWidth={2.5} className="!text-[#A8D62E]" aria-hidden="true" />
      ) : trailing ? (
        <span aria-hidden="true">{trailing}</span>
      ) : null}
    </DropdownMenu.Item>
  );
}

/** Eyebrow label — section header inside a menu. */
export function PulseMenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="bz-menu-label">{children}</DropdownMenu.Label>;
}

/** 1px ayırıcı çizgi — `bz-menu-divider` styling. */
export function PulseMenuDivider() {
  return <DropdownMenu.Separator className="bz-menu-divider" />;
}
