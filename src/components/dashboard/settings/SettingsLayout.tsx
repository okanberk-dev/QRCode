"use client";

import { ReactNode } from "react";
import { Tabs, type TabItem } from "@/components/ui";

export interface SettingsTab {
  id: string;
  label: string;
  count?: number | string;
  badge?: ReactNode;
  disabled?: boolean;
}

interface SettingsLayoutProps {
  tabs: SettingsTab[];
  active: string;
  onChange: (id: string) => void;
  /** Sticky offset for the vertical tab nav (defaults to top-20). */
  stickyTopClass?: string;
  /** Optional header rendered above the 2-column grid (PageHeader + actions). */
  header?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Settings hub layout — vertical Tabs (lg) / horizontal Tabs (md) / accordion (<md).
 *
 * - ≥ lg: 220px sticky vertical nav + max-w-[920px] content.
 * - md: horizontal sticky tab strip above the content.
 * - < md: nav hidden; every `<SettingsSection>` renders as an accordion card.
 *
 * The breakpoint switch is pure CSS and the element tree is the same at every
 * width, so the server render (no viewport) hydrates into the mobile layout
 * without remounting the sections or re-running their fetches.
 *
 * The grouped nav (one "AYARLAR" eyebrow) and the plan/invoice right rail
 * were removed: the single group label repeated the page title and the rail
 * repeated the "Plan & Faturalama" tab on every other tab.
 */
export function SettingsLayout({
  tabs,
  active,
  onChange,
  stickyTopClass = "lg:top-20",
  header,
  children,
  ariaLabel,
}: SettingsLayoutProps) {
  const tabItems: TabItem[] = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.count,
    badge: t.badge,
    disabled: t.disabled,
  }));

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      {header && <div className="mb-5 sm:mb-6">{header}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        {/* Sticky lives on the aside itself: it is a `self-start` grid item
            exactly as tall as its content, so a sticky child inside it had no
            room to stick. md: pinned under the 64px mobile topbar; lg: the
            vertical card at `stickyTopClass`. */}
        <aside
          className={`hidden self-start md:sticky md:top-16 md:z-20 md:block lg:z-auto ${stickyTopClass}`}
        >
          <div className="hidden lg:block bz-card p-2">
            <Tabs
              items={tabItems}
              active={active}
              onChange={onChange}
              variant="vertical"
              ariaLabel={ariaLabel}
            />
          </div>
          {/* md horizontal tab strip pinned under the topbar while scrolling.
              Negative margins mirror the page gutter (`px-4 sm:px-7`, §42.4)
              so the strip runs edge to edge. */}
          <div className="lg:hidden -mx-4 px-4 sm:-mx-7 sm:px-7 overflow-x-auto no-scrollbar md:bg-white/95 md:backdrop-blur md:border-b md:border-[#EDEDED] md:py-2">
            <Tabs
              items={tabItems}
              active={active}
              onChange={onChange}
              variant="horizontal"
              ariaLabel={ariaLabel}
            />
          </div>
        </aside>

        {/* Content column. A plain <div>: the dashboard shell already owns the
            page <main> landmark and nested <main> elements are invalid. */}
        <div
          className="min-w-0 max-w-[920px] space-y-3 md:space-y-0"
          role="region"
          aria-label={ariaLabel}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default SettingsLayout;
