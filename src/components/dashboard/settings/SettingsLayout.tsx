"use client";

import { ReactNode, useEffect, useState } from "react";
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
  /** Optional header rendered above the 2-column grid (e.g. PageHeader + RestaurantSwitcher). */
  header?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Settings hub layout — vertical Tabs (lg) / horizontal Tabs (md) / accordion (sm).
 *
 * - Desktop ≥ lg: 240px sticky vertical nav + max-w-[920px] form content.
 * - Tablet md: horizontal Tabs at top, content below.
 * - Mobile sm: each `<SettingsSection>` is a `<details>` element (semantic accordion).
 *
 * Mobile fallback: parent passes the section panes as children; only the active
 * one renders on lg/md, while sm shows all sections in `<details>` form (the
 * sections themselves opt-in via their own `mobileAccordion` prop).
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

  // Track viewport so mobile shows all sections (accordion); ≥ md shows only active.
  const [isCompactNav, setIsCompactNav] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsCompactNav(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-5 sm:px-7 py-6 lg:py-8">
      {header && <div className="mb-6 sm:mb-8">{header}</div>}

      {/* Mobile (sm): all sections render as accordion via children */}
      {isCompactNav ? (
        <div className="space-y-3" role="region" aria-label={ariaLabel}>
          {children}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
          {/* Tab nav: horizontal on md, vertical on lg */}
          <aside className={`lg:sticky ${stickyTopClass} self-start`}>
            <div className="hidden lg:block">
              <Tabs
                items={tabItems}
                active={active}
                onChange={onChange}
                variant="vertical"
                ariaLabel={ariaLabel}
              />
            </div>
            <div className="lg:hidden -mx-5 px-5 sm:-mx-7 sm:px-7 overflow-x-auto no-scrollbar">
              <Tabs
                items={tabItems}
                active={active}
                onChange={onChange}
                variant="horizontal"
                ariaLabel={ariaLabel}
              />
            </div>
          </aside>

          <main className="min-w-0 max-w-[920px]">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}

export default SettingsLayout;
