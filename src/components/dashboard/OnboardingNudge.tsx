"use client";

import Link from "next/link";
import { ArrowRight, Check, Store } from "lucide-react";
import type { Locale } from "@/lib/translations";

export interface OnboardingStep {
  id: number;
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingNudgeProps {
  locale: Locale;
  /**
   * One step → shown as a single call to action (the dashboard passes only
   * "Add your first business" while the account has no business). Several
   * steps → a numbered step grid. No steps → the card shows the welcome
   * text only (e.g. a team member with no assigned business).
   */
  steps: OnboardingStep[];
  /** Short explanation under the title. */
  description?: string;
  className?: string;
}

export default function OnboardingNudge({
  locale,
  steps,
  description,
  className = "",
}: OnboardingNudgeProps) {
  const isTr = locale === "tr";
  const completed = steps.filter((s) => s.done).length;
  // Nothing left to do → no card. (With no steps at all the card still
  // shows its welcome text.)
  if (steps.length > 0 && completed === steps.length) return null;
  const single = steps.length === 1 ? steps[0] : null;

  // Fintora welcome card: white, black icon circle, title over grey copy,
  // one black call to action; several steps become grey rows.
  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`} aria-label={isTr ? "Başlangıç" : "Getting started"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
          >
            <Store size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="pn-card-title text-pn-ink">
              {isTr ? "Buaze'ye hoş geldin" : "Welcome to Buaze"}
            </h2>
            {description && (
              <p className="mt-1 max-w-[560px] text-[14px] leading-[1.55] text-[#737373]">
                {description}
              </p>
            )}
            {steps.length > 1 && (
              <p className="mt-1 text-[13px] text-[#9A9A9A]">
                {completed} / {steps.length} {isTr ? "tamamlandı" : "completed"}
              </p>
            )}
          </div>
        </div>

        {single && (
          <Link
            href={single.href}
            className="bz-btn-primary inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-stretch sm:self-start lg:self-center"
          >
            {single.label}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}

        {steps.length > 1 && (
          <ol className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => (
              <li key={s.id}>
                <Link href={s.href} className="pn-row min-h-[56px]">
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${
                      s.done ? "bg-pn-accent text-white" : "bg-pn-accent-soft text-pn-accent"
                    }`}
                  >
                    {s.done ? <Check size={15} strokeWidth={2.4} /> : s.id}
                  </span>
                  <span className={`min-w-0 flex-1 text-[14px] ${s.done ? "text-[#9A9A9A]" : "font-medium text-pn-ink"}`}>
                    {s.done && <span className="sr-only">{isTr ? "Tamamlandı: " : "Done: "}</span>}
                    {s.label}
                  </span>
                  {!s.done && <ArrowRight size={14} className="shrink-0 text-[#9A9A9A]" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
