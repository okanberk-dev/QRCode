"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Eyebrow } from "@/components/ui";
import type { Locale } from "@/lib/translations";

export interface OnboardingStep {
  id: number;
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingNudgeProps {
  locale: Locale;
  steps: OnboardingStep[];
  className?: string;
}

export default function OnboardingNudge({ locale, steps, className = "" }: OnboardingNudgeProps) {
  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;
  const isTr = locale === "tr";

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 text-white ${className}`}
      style={{
        background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)",
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="shrink-0">
          <Eyebrow color="#C6F24E">{isTr ? "Kurulum" : "Setup"}</Eyebrow>
          <div
            className="bz-h-tight mt-1"
            style={{ fontSize: 17 }}
          >
            {isTr ? "Buaze'ye hoş geldin" : "Welcome to Buaze"}
          </div>
          <div
            className="mt-1"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
          >
            {completed} / {steps.length} {isTr ? "tamamlandı" : "completed"}
          </div>
        </div>
        <div
          className="flex-1 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        >
          {steps.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="flex flex-col gap-1.5 text-left p-2.5 rounded-[10px] transition-colors"
              style={{
                background: s.done
                  ? "rgba(198,242,78,0.12)"
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${
                  s.done
                    ? "rgba(198,242,78,0.3)"
                    : "rgba(255,255,255,0.1)"
                }`,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: s.done ? "#C6F24E" : "rgba(255,255,255,0.1)",
                    color: s.done ? "#0A0A0A" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {s.done ? (
                    <Check size={11} strokeWidth={2.5} />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{s.id}</span>
                  )}
                </span>
                {!s.done && (
                  <ArrowRight size={11} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  lineHeight: 1.3,
                  color: s.done ? "rgba(255,255,255,0.8)" : "#fff",
                  fontWeight: s.done ? 400 : 500,
                }}
              >
                {s.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
