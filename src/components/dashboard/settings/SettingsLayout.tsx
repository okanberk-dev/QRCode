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
  /**
   * Optional right rail rendered xl: (≥1280px) breakpoint'inde 320px sabit
   * kolon olarak. lg ve altında gizli (yer yok). Tasarım .design-pulse-2026
   * page-account.jsx 220|1fr|320 paterni. account/page.tsx kullanır;
   * restaurants/[id]/settings rail geçmediği sürece mevcut 2-col korunur.
   */
  rightRail?: ReactNode;
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
    <div className={`mx-auto px-5 sm:px-7 py-6 lg:py-8 ${rightRail ? 'max-w-[1440px]' : 'max-w-[1200px]'}`}>
      {header && <div className="mb-6 sm:mb-8">{header}</div>}

      {/* Mobile (sm): all sections render as accordion via children */}
      {isCompactNav ? (
        <div className="space-y-3" role="region" aria-label={ariaLabel}>
          {children}
          {rightRail && (
            <div className="space-y-3 pt-2 border-t border-[#EDEDED] mt-3">
              {rightRail}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 lg:gap-10 ${
            rightRail
              ? 'lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_minmax(0,1fr)_320px]'
              : 'lg:grid-cols-[220px_1fr]'
          }`}
        >
          {/* Tab nav: horizontal on md, vertical on lg.
              §38.63 — Tasarım `.design-owner-2026/page-account.jsx` parity:
              vertical nav (lg+) `<div className="bz-card" style={{ padding: 12,
              alignSelf: 'flex-start', position: 'sticky', top: 20 }}>` ile
              kart içinde grup'lanmış. Önceki düz aside (sticky-only) drift'ti.
              `bz-card` wrapper + `p-3` (~12px) padding tasarımdaki ölçüye
              birebir uydu. Horizontal nav (md/sm) kartsız kalır (zaten
              underline strip görünümü). */}
          <aside className={`lg:sticky ${stickyTopClass} self-start`}>
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

          {/* Right rail (xl:+) — opsiyonel; tasarım .design-pulse-2026
              page-account.jsx 320px paterni. Sticky scroll, lg ve altında
              gizli (yer yok), mobil accordion altında inline render edilir. */}
          {rightRail && (
            <aside className={`hidden xl:block xl:sticky ${stickyTopClass} self-start space-y-3`}>
              {rightRail}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

export default SettingsLayout;
