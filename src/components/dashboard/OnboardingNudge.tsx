"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
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

  return (
    <section
      className={`rounded-2xl p-5 sm:p-6 text-white ${className}`}
      style={{ background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)" }}
      aria-label={isTr ? "Başlangıç" : "Getting started"}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="bz-h-tight text-[17px]">
            {isTr ? "Buaze'ye hoş geldin" : "Welcome to Buaze"}
          </h2>
          {description && (
            <p className="mt-1 max-w-[560px] text-[13px] leading-[1.55] text-white/70">
              {description}
            </p>
          )}
          {steps.length > 1 && (
            <p className="mt-1 text-[12px] text-white/60">
              {completed} / {steps.length} {isTr ? "tamamlandı" : "completed"}
            </p>
          )}
        </div>

        {single && (
          <Link
            href={single.href}
            className="bz-btn-lime inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-start text-[13px] sm:min-h-[36px] lg:self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          >
            {single.label}
            <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}

        {steps.length > 1 && (
          <ol className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {steps.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className="flex min-h-[44px] flex-col gap-1.5 rounded-[10px] p-2.5 text-left bz-motion-spring active:scale-[0.97] sm:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                  style={{
                    background: s.done ? "rgba(198,242,78,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${s.done ? "rgba(198,242,78,0.3)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <span className="flex items-center justify-between">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full"
                      style={{
                        background: s.done ? "#C6F24E" : "rgba(255,255,255,0.1)",
                        color: s.done ? "#0A0A0A" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {s.done ? (
                        <Check size={11} strokeWidth={2.5} />
                      ) : (
                        <span className="text-[10px] font-semibold">{s.id}</span>
                      )}
                    </span>
                    {!s.done && (
                      <ArrowRight size={11} color="rgba(255,255,255,0.6)" strokeWidth={2} aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className="text-[11px] leading-[1.3]"
                    style={{
                      color: s.done ? "rgba(255,255,255,0.8)" : "#fff",
                      fontWeight: s.done ? 400 : 500,
                    }}
                  >
                    {s.done && <span className="sr-only">{isTr ? "Tamamlandı: " : "Done: "}</span>}
                    {s.label}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
