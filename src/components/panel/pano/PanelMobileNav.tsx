'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';
import type { PanoNavEntry } from './PanelTopNav';

/**
 * Pano mobile chrome (docs/design/DASHBOARD_DESIGN.md §7, below 1024px): a
 * floating white bar (brand + actions + menu circle), a full-screen white
 * drawer with pill links, and a floating black bottom tab bar (the daily
 * pages + "Menü", which opens the drawer; active tab = lime circle).
 */

interface PanelMobileNavProps {
  brand: ReactNode;
  entries: PanoNavEntry[];
  /** Round actions before the menu button (notifications, search). */
  actions?: ReactNode;
  /** Above the links in the drawer (business switcher). */
  drawerTop?: ReactNode;
  /** Below the links in the drawer (account, sign out). */
  drawerFooter?: ReactNode;
  /** Bottom tab bar: up to four daily pages (links only). */
  bottomEntries?: PanoNavEntry[];
  labels: { open: string; close: string; dialog: string; more?: string; bottom?: string };
}

function MenuGlyph() {
  // Two short strokes, like the reference's mobile menu button.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 7.5h12M8 12.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PanelMobileNav({ brand, entries, actions, drawerTop, drawerFooter, bottomEntries = [], labels }: PanelMobileNavProps) {
  const tabs = bottomEntries.flatMap((entry) => (entry.type === 'link' ? [entry] : [])).slice(0, 4);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('buaze:mobile-drawer', { detail: { open } }));
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <div className="pn-mobilebar-wrap lg:hidden">
        <div className="pn-mobilebar">
          {brand}
          <div className="flex items-center gap-1.5">
            {actions}
            <button
              type="button"
              className="pn-avatar-btn"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-label={labels.open}
            >
              <MenuGlyph />
            </button>
          </div>
        </div>
      </div>

      {tabs.length > 0 && !open && (
        <nav className="pn-bottomnav lg:hidden" aria-label={labels.bottom ?? labels.dialog}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.active ? 'page' : undefined}
                data-active={tab.active ? 'true' : undefined}
                className="pn-bottomnav-item"
              >
                <span className="pn-bottomnav-icon" aria-hidden="true">
                  {Icon ? <Icon size={20} /> : tab.label.charAt(0)}
                </span>
                <span className="pn-bottomnav-label">{tab.shortLabel ?? tab.label}</span>
              </Link>
            );
          })}
          <button type="button" className="pn-bottomnav-item" onClick={() => setOpen(true)} aria-expanded={open}>
            <span className="pn-bottomnav-icon" aria-hidden="true">
              <Menu size={20} />
            </span>
            <span className="pn-bottomnav-label">{labels.more ?? labels.open}</span>
          </button>
        </nav>
      )}

      {open && (
        <div className="pn-drawer lg:hidden" role="dialog" aria-modal="true" aria-label={labels.dialog}>
          <div className="pn-drawer-head">
            {brand}
            <button type="button" className="pn-icon-btn" onClick={() => setOpen(false)} aria-label={labels.close}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {drawerTop && <div className="px-2 pt-3">{drawerTop}</div>}
          <nav className="flex flex-col gap-1 px-1 pt-3" aria-label={labels.dialog}>
            {entries.map((entry) => {
              if (entry.type === 'link') {
                const Icon = entry.icon;
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    aria-current={entry.active ? 'page' : undefined}
                    className="pn-drawer-link"
                    onClick={() => setOpen(false)}
                  >
                    {Icon && <Icon size={20} aria-hidden="true" />}
                    {entry.label}
                  </Link>
                );
              }
              return (
                <div key={entry.id} className="flex flex-col gap-1">
                  <p className="pn-drawer-section">{entry.label}</p>
                  {entry.children.map((child) => {
                    const Icon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={child.active ? 'page' : undefined}
                        className="pn-drawer-link"
                        onClick={() => setOpen(false)}
                      >
                        {Icon && <Icon size={20} aria-hidden="true" />}
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          {drawerFooter && <div className="mt-auto px-1 pt-6">{drawerFooter}</div>}
        </div>
      )}
    </>
  );
}

export default PanelMobileNav;
