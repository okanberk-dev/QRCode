'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';

/**
 * Pano top navigation (docs/design/DASHBOARD_DESIGN.md §5.1): a floating white
 * bar with the brand on the left, text tabs in the middle and round actions on
 * the right. The active tab is one black pill that slides to the selected tab
 * (420ms, §6). Shared by the owner shell and the admin layout; each passes its
 * own entries with `active` already resolved.
 */

export interface PanoNavChild {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
  isNew?: boolean;
}

export interface PanoNavLink extends PanoNavChild {
  type: 'link';
  /** Shorter tab text for the desktop bar ("Google" for "Google Yorumları"). */
  shortLabel?: string;
  /** Moves into the "More" menu below 1440px. */
  secondary?: boolean;
}

export interface PanoNavGroup {
  type: 'group';
  id: string;
  label: string;
  icon?: LucideIcon;
  children: PanoNavChild[];
}

export type PanoNavEntry = PanoNavLink | PanoNavGroup;

export function groupIsActive(group: PanoNavGroup): boolean {
  return group.children.some((child) => child.active);
}

interface PanelTopNavProps {
  brand: ReactNode;
  entries: PanoNavEntry[];
  actions: ReactNode;
  ariaLabel: string;
  moreLabel: string;
  newLabel?: string;
}

function MenuLinks({ items, newLabel }: { items: PanoNavChild[]; newLabel?: string }) {
  return (
    <>
      {items.map((child) => {
        const Icon = child.icon;
        return (
          <DropdownMenu.Item key={child.href} asChild>
            <Link
              href={child.href}
              aria-current={child.active ? 'page' : undefined}
              className={`bz-menu-item ${child.active ? 'is-selected' : ''}`}
            >
              {Icon && <Icon size={17} aria-hidden="true" />}
              <span className="flex-1 truncate">{child.label}</span>
              {child.isNew && newLabel && (
                <span className="rounded-full bg-pn-accent px-2 py-0.5 text-[12px] font-medium text-pn-ink">
                  {newLabel}
                </span>
              )}
            </Link>
          </DropdownMenu.Item>
        );
      })}
    </>
  );
}

function NavMenu({
  label,
  active,
  className = '',
  children,
}: {
  label: string;
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={`pn-nav-item ${className}`} data-active={active ? 'true' : undefined}>
          {label}
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={14}
          collisionPadding={12}
          className="bz-menu z-[70] min-w-[240px] focus:outline-none"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function PanelTopNav({ brand, entries, actions, ariaLabel, moreLabel, newLabel }: PanelTopNavProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const secondary = entries.filter((entry): entry is PanoNavLink => entry.type === 'link' && !!entry.secondary);
  const moreActive = secondary.some((entry) => entry.active);
  // Changes whenever the active tab changes, so the pill re-measures.
  const activeKey = entries
    .map((entry) => (entry.type === 'link' ? (entry.active ? entry.href : '') : groupIsActive(entry) ? entry.id : ''))
    .join('|');

  useLayoutEffect(() => {
    const nav = navRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;
    let first = nav.dataset.pill !== 'on';

    const measure = () => {
      const candidates = Array.from(track.querySelectorAll<HTMLElement>('.pn-nav-item[data-active="true"]'));
      const active = candidates.find((el) => el.getClientRects().length > 0);
      if (!active) {
        nav.dataset.pill = 'off';
        return;
      }
      if (first) nav.dataset.pillInstant = 'true';
      nav.style.setProperty('--pn-pill-x', `${active.offsetLeft}px`);
      nav.style.setProperty('--pn-pill-w', `${active.offsetWidth}px`);
      nav.dataset.pill = 'on';
      if (first) {
        first = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            delete nav.dataset.pillInstant;
          });
        });
      }
    };

    measure();
    // Tab widths change when the web font arrives and across breakpoints.
    const observer = new ResizeObserver(() => {
      nav.dataset.pillInstant = 'true';
      measure();
      requestAnimationFrame(() => {
        delete nav.dataset.pillInstant;
      });
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeKey]);

  return (
    <header className="pn-topbar hidden lg:flex">
      {brand}
      <nav ref={navRef} aria-label={ariaLabel} className="pn-nav">
        <div ref={trackRef} className="pn-nav-track">
          <span aria-hidden="true" className="pn-nav-pill" />
          {entries.map((entry) => {
            if (entry.type === 'link') {
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={entry.active ? 'page' : undefined}
                  data-active={entry.active ? 'true' : undefined}
                  className={`pn-nav-item ${entry.secondary ? 'hidden min-[1440px]:inline-flex' : ''}`}
                >
                  {entry.shortLabel ?? entry.label}
                </Link>
              );
            }
            return (
              <NavMenu key={entry.id} label={entry.label} active={groupIsActive(entry)}>
                <MenuLinks items={entry.children} newLabel={newLabel} />
              </NavMenu>
            );
          })}
          {secondary.length > 0 && (
            <NavMenu label={moreLabel} active={moreActive} className="min-[1440px]:hidden">
              <MenuLinks items={secondary} newLabel={newLabel} />
            </NavMenu>
          )}
        </div>
      </nav>
      <div className="pn-topbar-actions">{actions}</div>
    </header>
  );
}

export default PanelTopNav;
