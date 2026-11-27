"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Eyebrow } from "@/components/ui";
import { useCompactSettingsNav } from "./useCompactSettingsNav";

interface SettingsSectionProps {
  /** Anchor id used for `?section=` deep-links and scroll-mt. */
  id: string;
  /** Whether this section is the active tab (≥md) / initially open (<md). */
  active: boolean;
  /** Optional small label above the title. The settings hubs no longer pass
   *  one (numbered "01 — PROFİL" labels only repeated the tab name). */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Optional right-aligned actions in section header (e.g. status badge). */
  actions?: ReactNode;
  /**
   * Keep the content mounted after it was first shown (default true).
   * Form sections need this: unmounting on tab switch silently threw away
   * unsaved edits. Read-only list sections (team, billing, activity…) can
   * pass `false` so they refetch fresh data every time they are reopened.
   */
  keepMounted?: boolean;
}

/**
 * Per-section wrapper inside `<SettingsLayout>`.
 *
 * - ≥ md: tab panel. Inactive sections are hidden with CSS (`md:hidden`)
 *   instead of being unmounted, so a half-filled form survives a tab switch.
 * - < md: accordion card (button + `aria-expanded`). Seeded open when this is
 *   the active section.
 *
 * The DOM shape is identical in both modes and the switch is pure CSS, so the
 * desktop server render → mobile client hand-off does not remount children.
 * Content is still mounted lazily — the first time the section is shown — so
 * opening the hub does not fire every section's fetch at once.
 */
export function SettingsSection({
  id,
  active,
  eyebrow,
  title,
  description,
  children,
  actions,
  keepMounted = true,
}: SettingsSectionProps) {
  const compact = useCompactSettingsNav();

  // Accordion state (<md). A tab change (deep-link / desktop nav) opens the
  // newly active section so resizing to mobile shows what was on screen.
  const [open, setOpen] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setOpen(true);
  }

  const showing = compact ? open : active;
  const [everShown, setEverShown] = useState(showing);
  if (showing && !everShown) setEverShown(true);
  const mounted = keepMounted ? everShown : showing;

  const titleId = `section-${id}-title`;
  const panelId = `section-${id}-panel`;

  // < md: bring the section into view when it becomes the active one. On a
  // phone the sections are stacked accordions, so a deep link such as the
  // "Faturalama" entry in the bottom-nav sheet (`?section=billing`) opened
  // the right card but left the page at the top with that card off-screen.
  // - Active changes while the page is open (`?section=` sync) → scroll.
  // - First compact render → scroll only for an explicit `?section=` link
  //   (not the default tab), and not while a `?google=` sign-in result
  //   banner sits above the sections.
  const sectionRef = useRef<HTMLElement>(null);
  const seenActiveRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!compact) return;
    if (!active) {
      seenActiveRef.current = false;
      return;
    }
    const previous = seenActiveRef.current;
    if (previous === true) return;
    if (previous === null) {
      const query = new URLSearchParams(window.location.search);
      if (!query.has("section") || query.has("google")) {
        seenActiveRef.current = true;
        return;
      }
    }
    // Next.js restores the scroll position after a navigation commits; wait
    // two frames so this runs after it. The ref is only marked once the
    // scroll ran, so React StrictMode's effect re-run still scrolls.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        seenActiveRef.current = true;
        sectionRef.current?.scrollIntoView({ block: "start" });
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, compact]);

  return (
    <section
      ref={sectionRef}
      id={`section-${id}`}
      aria-labelledby={titleId}
      className={`scroll-mt-20 max-md:rounded-[24px] max-md:border max-md:border-pn-line max-md:bg-white ${
        active ? "" : "md:hidden"
      }`}
    >
      {/* < md — accordion trigger. Heading wraps the button (WAI-ARIA
          accordion pattern); actions sit outside so they may be interactive. */}
      <div className="flex items-center gap-2 md:hidden">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full min-h-[56px] items-center justify-between gap-3 rounded-[24px] px-5 py-4 text-left active:bg-pn-canvas bz-motion-spring"
          >
            <span className="min-w-0">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <span className={`block truncate bz-h-tight text-[16px] ${eyebrow ? "mt-1" : ""}`}>
                {title}
              </span>
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`shrink-0 text-[#737373] transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h2>
        {actions && <div className="shrink-0 pr-5">{actions}</div>}
      </div>

      {/* ≥ md — tab panel header. */}
      <header className="mb-5 hidden items-start justify-between gap-4 sm:mb-6 md:flex">
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2
            id={titleId}
            className={`bz-h-tight-2 text-[20px] sm:text-[22px] ${eyebrow ? "mt-1" : ""}`}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 max-w-[640px] text-[13px] leading-[1.6] text-[#525252]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>

      <div
        id={panelId}
        className={`max-md:px-5 max-md:pb-5 max-md:pt-1 ${open ? "" : "max-md:hidden"}`}
      >
        {description && (
          <p className="mb-4 text-[13px] leading-[1.55] text-[#525252] md:hidden">{description}</p>
        )}
        <div className="space-y-5 sm:space-y-6">{mounted ? children : null}</div>
      </div>
    </section>
  );
}

export default SettingsSection;
