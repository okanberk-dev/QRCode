"use client";

import { Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import { Eyebrow, Tabs, type TabItem } from "@/components/ui";

export interface SettingsTab {
  id: string;
  label: string;
  count?: number | string;
  badge?: ReactNode;
  disabled?: boolean;
  /**
   * Optional group key for the vertical (lg) nav. Tabs in the same group
   * render adjacent under a single eyebrow heading. Tabs without a group
   * fall back to a flat list. Horizontal (md) nav ignores grouping —
   * groups become a sequential strip.
   */
  group?: string;
}

interface SettingsGroup {
  /** Group key matching SettingsTab.group */
  id: string;
  /** Eyebrow label rendered above this group in the vertical nav */
  label: string;
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
  /**
   * Optional group definitions. When provided, the vertical (lg) tab nav
   * renders each group's tabs under that group's eyebrow label. Groups are
   * rendered in array order; tabs without a matching group fall through
   * to a tail-end ungrouped block.
   */
  groups?: SettingsGroup[];
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
  groups,
}: SettingsLayoutProps) {
  const tabItems: TabItem[] = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.count,
    badge: t.badge,
    disabled: t.disabled,
  }));

  // Vertical nav: when groups are provided, slice tabs by group key into
  // distinct <Tabs> instances under their eyebrow header. Each group's
  // <Tabs> is independent so keyboard navigation cycles within the group;
  // we accept that trade-off for the visual separation. Tabs that don't
  // belong to any defined group fall into a final ungrouped block.
  const groupedTabs = useMemo(() => {
    if (!groups || groups.length === 0) return null;
    const buckets = new Map<string, TabItem[]>();
    groups.forEach((g) => buckets.set(g.id, []));
    const ungrouped: TabItem[] = [];
    tabs.forEach((t) => {
      const bucket = t.group && buckets.get(t.group);
      if (bucket) {
        bucket.push({
          id: t.id,
          label: t.label,
          count: t.count,
          badge: t.badge,
          disabled: t.disabled,
        });
      } else {
        ungrouped.push({
          id: t.id,
          label: t.label,
          count: t.count,
          badge: t.badge,
          disabled: t.disabled,
        });
      }
    });
    return { buckets, ungrouped };
  }, [tabs, groups]);

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
              {groupedTabs && groups ? (
                <div className="space-y-5">
                  {groups.map((g, idx) => {
                    const items = groupedTabs.buckets.get(g.id) ?? [];
                    if (items.length === 0) return null;
                    return (
                      <Fragment key={g.id}>
                        {idx > 0 && <div className="border-t border-[#EDEDED]" aria-hidden />}
                        <div className="space-y-2">
                          <div className="px-1">
                            <Eyebrow>{g.label}</Eyebrow>
                          </div>
                          <Tabs
                            items={items}
                            active={active}
                            onChange={onChange}
                            variant="vertical"
                            ariaLabel={`${ariaLabel ?? ""} — ${g.label}`.trim()}
                          />
                        </div>
                      </Fragment>
                    );
                  })}
                  {groupedTabs.ungrouped.length > 0 && (
                    <Fragment>
                      <div className="border-t border-[#EDEDED]" aria-hidden />
                      <Tabs
                        items={groupedTabs.ungrouped}
                        active={active}
                        onChange={onChange}
                        variant="vertical"
                        ariaLabel={ariaLabel}
                      />
                    </Fragment>
                  )}
                </div>
              ) : (
                <Tabs
                  items={tabItems}
                  active={active}
                  onChange={onChange}
                  variant="vertical"
                  ariaLabel={ariaLabel}
                />
              )}
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
