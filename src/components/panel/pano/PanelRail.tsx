'use client';

import { useEffect, useState, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';
import { MenuLinks, type PanoNavChild } from './PanelTopNav';

/**
 * Pano sidebar (docs/design/DASHBOARD_DESIGN.md §5.1): the left column with
 * the brand, an optional business switcher and labelled sections. It is
 * open (icon + name) on wide screens and folds to a 92px icon rail below
 * 1440px; the person can fold or open it and the choice is remembered.
 * The section list scrolls on its own, so nothing is cut off on short
 * screens. Folded, each button shows its name in a tooltip; a `menu`
 * section folds into one button that opens its pages to the right.
 * Hidden below 1024px, where the mobile drawer lists the same pages.
 */

export interface RailSection {
  id: string;
  label?: string;
  /** Folded look: `flat` keeps one button per page, `menu` shows one button
   *  that opens the section's pages. */
  collapse?: 'flat' | 'menu';
  icon?: LucideIcon;
  items: PanoNavChild[];
}

type CollapsedState = 'auto' | 'true' | 'false';

const STORAGE_KEY = 'buaze:panel:sidebar';
const WIDE_QUERY = '(min-width: 1440px)';

function initial(label: string): string {
  return label.trim().charAt(0).toLocaleUpperCase('tr');
}

function SideLink({ item, newLabel }: { item: PanoNavChild; newLabel?: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.active ? 'page' : undefined}
      data-active={item.active ? 'true' : undefined}
      data-label={item.label}
      className="pn-side-item"
    >
      <span className="pn-side-icon" aria-hidden="true">
        {Icon ? <Icon size={19} /> : initial(item.label)}
      </span>
      <span className="pn-side-label">{item.label}</span>
      {item.badge ? (
        <span className="pn-side-badge" aria-label={item.badgeLabel}>
          {item.badge}
        </span>
      ) : null}
      {item.isNew && newLabel && <span className="pn-side-new">{newLabel}</span>}
    </Link>
  );
}

function SectionMenu({ section, newLabel }: { section: RailSection; newLabel?: string }) {
  const Icon = section.icon;
  const active = section.items.some((item) => item.active);
  const label = section.label ?? '';
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="pn-side-item" data-active={active ? 'true' : undefined} data-label={label} aria-label={label}>
          <span className="pn-side-icon" aria-hidden="true">
            {Icon ? <Icon size={19} /> : initial(label)}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="right" align="start" sideOffset={14} collisionPadding={12} className="bz-menu z-[70] min-w-[240px] focus:outline-none">
          {label && <DropdownMenu.Label className="bz-menu-label">{label}</DropdownMenu.Label>}
          <MenuLinks items={section.items} newLabel={newLabel} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The signed-in person, shown as a card at the foot of the sidebar. */
export interface RailUser {
  name: string;
  /** Second line: plan, role or e-mail. */
  sub?: string;
  initial: string;
  href: string;
  /** Screen-reader / tooltip text, e.g. "Hesabım". */
  label: string;
}

interface PanelRailProps {
  /** Logo link; put the wordmark in a `pn-side-label` span so it folds away. */
  brand: ReactNode;
  /** Shown under the brand when open (e.g. the business switcher). */
  top?: ReactNode;
  /** Shown under the brand when folded (e.g. the switcher's round button). */
  topFolded?: ReactNode;
  sections: RailSection[];
  footer?: PanoNavChild[];
  /** Account card at the foot; footer links then sit next to it as icon buttons. */
  user?: RailUser;
  ariaLabel: string;
  labels: { fold: string; unfold: string };
  newLabel?: string;
}

export function PanelRail({ brand, top, topFolded, sections, footer = [], user, ariaLabel, labels, newLabel }: PanelRailProps) {
  // SSR and first paint follow the screen width (CSS, no layout shift);
  // a remembered choice is applied after mount.
  const [collapsed, setCollapsed] = useState<CollapsedState>('auto');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'open') setCollapsed('false');
      else if (saved === 'folded') setCollapsed('true');
    } catch {
      /* storage blocked: keep the width-based default */
    }
  }, []);

  const toggle = () => {
    const isFolded = collapsed === 'true' || (collapsed === 'auto' && !window.matchMedia(WIDE_QUERY).matches);
    const next = isFolded ? 'false' : 'true';
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next === 'true' ? 'folded' : 'open');
    } catch {
      /* ignore */
    }
  };
  const foldLabel = collapsed === 'true' ? labels.unfold : labels.fold;

  return (
    <aside className="pn-side hidden lg:flex" data-collapsed={collapsed}>
      <div className="pn-side-brand">{brand}</div>
      {top && <div className="pn-side-top pn-side-open-only">{top}</div>}
      {topFolded && <div className="pn-side-top pn-side-folded-only">{topFolded}</div>}
      <nav aria-label={ariaLabel} className="pn-side-scroll">
        {sections.map((section) => (
          <div key={section.id} className="pn-side-section">
            {section.label && <p className="pn-side-heading">{section.label}</p>}
            {section.collapse === 'menu' ? (
              <>
                <div className="pn-side-list pn-side-open-only">
                  {section.items.map((item) => (
                    <SideLink key={item.href} item={item} newLabel={newLabel} />
                  ))}
                </div>
                <div className="pn-side-list pn-side-folded-only">
                  <SectionMenu section={section} newLabel={newLabel} />
                </div>
              </>
            ) : (
              <div className="pn-side-list">
                {section.items.map((item) => (
                  <SideLink key={item.href} item={item} newLabel={newLabel} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      {user ? (
        // Account card: who is signed in, with help and the fold switch as
        // round buttons beside it (folded: stacked under the avatar).
        <div className="pn-side-foot pn-side-foot--user">
          <Link
            href={user.href}
            className="pn-side-user"
            aria-label={`${user.label}: ${user.name}`}
            data-label={user.label}
          >
            <span className="pn-side-avatar" aria-hidden="true">
              {user.initial}
            </span>
            <span className="pn-side-label pn-side-user-text">
              <span className="pn-side-user-name">{user.name}</span>
              {user.sub && <span className="pn-side-user-sub">{user.sub}</span>}
            </span>
          </Link>
          <div className="pn-side-foot-actions">
            {footer.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="pn-side-mini" aria-label={item.label} data-label={item.label}>
                  {Icon ? <Icon size={17} aria-hidden="true" /> : initial(item.label)}
                </Link>
              );
            })}
            <button type="button" onClick={toggle} className="pn-side-mini" aria-label={foldLabel} data-label={foldLabel}>
              <PanelLeftClose size={17} className="pn-side-open-only" aria-hidden="true" />
              <PanelLeftOpen size={17} className="pn-side-folded-only" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="pn-side-foot">
          {footer.map((item) => (
            <SideLink key={item.href} item={item} newLabel={newLabel} />
          ))}
          <button type="button" onClick={toggle} className="pn-side-item" data-label={foldLabel} aria-label={foldLabel}>
            <span className="pn-side-icon" aria-hidden="true">
              <PanelLeftClose size={19} className="pn-side-open-only" />
              <PanelLeftOpen size={19} className="pn-side-folded-only" />
            </span>
            <span className="pn-side-label">{labels.fold}</span>
          </button>
        </div>
      )}
    </aside>
  );
}

export default PanelRail;
