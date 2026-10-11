"use client";

import { Fragment, ReactNode, useMemo } from "react";
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
  /**
   * Optional right rail (plan / invoice widgets). Rendered as a 320px third
   * column only from `2xl` (≥1536px viewport): at xl the 248px shell sidebar
   * + 220px nav + 320px rail crushed the form column to ~340px. Below 2xl the
   * rail stacks under the content instead of disappearing.
   */
  rightRail?: ReactNode;
}

/**
 * Settings hub layout — vertical Tabs (lg) / horizontal Tabs (md) / accordion (<md).
 *
 * - ≥ lg: 220px sticky vertical nav + max-w-[920px] content (+ 320px rail at 2xl).
 * - md: horizontal sticky tab strip above the content.
 * - < md: nav hidden; every `<SettingsSection>` renders as an accordion card.
 *
 * The breakpoint switch is pure CSS and the element tree is the same at every
 * width, so the server render (no viewport) hydrates into the mobile layout
 * without remounting the sections or re-running their fetches.
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
  rightRail,
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
      const item: TabItem = {
        id: t.id,
        label: t.label,
        count: t.count,
        badge: t.badge,
        disabled: t.disabled,
      };
      const bucket = t.group && buckets.get(t.group);
      if (bucket) bucket.push(item);
      else ungrouped.push(item);
    });
    return { buckets, ungrouped };
  }, [tabs, groups]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      {header && <div className="mb-6 sm:mb-8">{header}</div>}

      <div
        className={`grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 ${
          rightRail ? "xl:gap-6 2xl:grid-cols-[220px_minmax(0,1fr)_320px]" : ""
        }`}
      >
        {/* Tab nav — hidden below md (sections become an accordion there),
            horizontal strip on md, vertical card on lg (§38.63 design parity:
            `bz-card` + 12px padding, grouped under eyebrows). With a rail
            stacked under the content (lg–xl) the nav spans both rows so it
            stays sticky while the rail scrolls by. */}
        {/* Sticky lives on the aside itself: it is a `self-start` grid item
            exactly as tall as its content, so a sticky child inside it had no
            room to stick. md: pinned under the 64px mobile topbar; lg: the
            vertical card at `stickyTopClass`. */}
        <aside
          className={`hidden self-start md:sticky md:top-16 md:z-20 md:block lg:z-auto ${stickyTopClass} ${
            rightRail ? "lg:row-span-2 2xl:row-span-1" : ""
          }`}
        >
          <div className="hidden lg:block bz-card p-3">
            {groupedTabs && groups ? (
              <div className="space-y-4">
                {groups.map((g, idx) => {
                  const items = groupedTabs.buckets.get(g.id) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <Fragment key={g.id}>
                      {idx > 0 && <div className="-mx-3 border-t border-[#EDEDED]" aria-hidden />}
                      <div className="space-y-1.5">
                        <div className="px-2.5 pt-1">
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
                    <div className="-mx-3 border-t border-[#EDEDED]" aria-hidden />
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
          {/* Stage 80 §38.160 — md horizontal tab strip pinned under the 64px
              topbar while scrolling. Negative margins mirror the canonical
              page gutter (`px-4 sm:px-7`, §42.4) so the strip runs edge to edge. */}
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

        {/* Right rail — third column from 2xl; below that it stacks under the
            content (two widgets side by side where there is room). */}
        {rightRail && (
          <aside
            className={`space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0 lg:col-start-2 lg:max-w-[920px] lg:grid-cols-1 xl:grid-cols-2 2xl:col-start-3 2xl:row-start-1 2xl:block 2xl:max-w-none 2xl:space-y-3 2xl:sticky ${stickyTopClass} 2xl:self-start`}
          >
            {rightRail}
          </aside>
        )}
      </div>
    </div>
  );
}

export default SettingsLayout;
