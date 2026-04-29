"use client";

import { ReactNode, useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui";

interface SettingsSectionProps {
  /** Anchor id used for `?section=` deep-links and scroll-mt. */
  id: string;
  /** Whether this section is currently active (only rendered on ≥md). */
  active: boolean;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** When true on mobile, renders `<details>`; on ≥md `active` controls visibility. */
  children: ReactNode;
  /** Optional right-aligned actions in section header (e.g. status badge). */
  actions?: ReactNode;
}

/**
 * Per-section wrapper inside `<SettingsLayout>`.
 *
 * Behavior:
 * - ≥ md: only renders children when `active` is true (the parent layout
 *   coordinates active state via `<Tabs>`).
 * - sm: always renders as `<details>` (semantic accordion). The element opens
 *   automatically when this section is the active one.
 */
export function SettingsSection({
  id,
  active,
  eyebrow,
  title,
  description,
  children,
  actions,
}: SettingsSectionProps) {
  const [isCompactNav, setIsCompactNav] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsCompactNav(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (isCompactNav) {
    return (
      <details
        id={`section-${id}`}
        open={active}
        className="bz-card scroll-mt-20"
        style={{ padding: 0 }}
      >
        <summary
          className="flex items-center justify-between px-5 py-4 cursor-pointer list-none"
          style={{ borderRadius: 16 }}
        >
          <div className="min-w-0">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h2 className="bz-h-tight text-[18px] mt-1 truncate">{title}</h2>
          </div>
          {actions && <div className="shrink-0 ml-3">{actions}</div>}
        </summary>
        <div className="px-5 pb-5 pt-1">
          {description && (
            <p className="text-[13px] leading-[1.55] text-[#525252] mb-4">{description}</p>
          )}
          {children}
        </div>
      </details>
    );
  }

  if (!active) return null;

  return (
    <section
      id={`section-${id}`}
      className="scroll-mt-20"
      aria-labelledby={`section-${id}-title`}
    >
      <header className="flex items-start justify-between gap-4 mb-5 sm:mb-6">
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2
            id={`section-${id}-title`}
            className="bz-h-tight-2 text-[24px] sm:text-[28px] mt-1"
          >
            {title}
          </h2>
          {description && (
            <p className="text-[13px] sm:text-[14px] leading-[1.6] text-[#525252] mt-2 max-w-[640px]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="space-y-5 sm:space-y-6">{children}</div>
    </section>
  );
}

export default SettingsSection;
