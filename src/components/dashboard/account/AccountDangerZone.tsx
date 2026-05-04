"use client";

import { AlertTriangle, Pause, Trash2 } from "lucide-react";
import { Eyebrow, Badge } from "@/components/ui";
import type { Locale } from "@/lib/translations";

// §38.37 — Hesabım sağ rail Danger zone widget. Tasarım .design-owner-2026/
// page-account.jsx:227-249: red border + bg + icon + "Hesabı dondur" /
// "Hesabı sil" buttons.
//
// Backend yok (Iyzico Wave 3.5 ile gelecek POS write-side + freeze/delete
// flow). Şu an placeholder: button'lar disabled + "Yakında" badge. CLAUDE.md
// §28 disiplin — UI scope-only, scope creep önleme.

export interface AccountDangerZoneProps {
  locale?: Locale;
}

export function AccountDangerZone({ locale = "tr" }: AccountDangerZoneProps) {
  const isTr = locale === "tr";

  return (
    <div
      className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5"
      role="region"
      aria-label={isTr ? "Tehlikeli bölge" : "Danger zone"}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} strokeWidth={2} className="text-[#991B1B]" />
        <Eyebrow>{isTr ? "TEHLİKELİ BÖLGE" : "DANGER ZONE"}</Eyebrow>
      </div>
      <p className="text-[12px] leading-[1.55] text-[#7F1D1D] mb-3.5">
        {isTr
          ? "Hesap dondurma ve silme yakında geliyor. Şu an için silme talebi için iletişime geç."
          : "Account freeze and delete are coming soon. For now, contact support to request deletion."}
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#FCA5A5] bg-white/60 px-3 py-2 text-[12px] font-medium text-[#7F1D1D] cursor-not-allowed opacity-70"
            aria-disabled="true"
            title={isTr ? "Yakında" : "Coming soon"}
          >
            <Pause size={12} strokeWidth={2} />
            {isTr ? "Hesabı dondur" : "Freeze account"}
          </button>
          <Badge kind="ghost">{isTr ? "Yakında" : "Soon"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#FCA5A5] bg-white/60 px-3 py-2 text-[12px] font-medium text-[#7F1D1D] cursor-not-allowed opacity-70"
            aria-disabled="true"
            title={isTr ? "Yakında" : "Coming soon"}
          >
            <Trash2 size={12} strokeWidth={2} />
            {isTr ? "Hesabı sil" : "Delete account"}
          </button>
          <Badge kind="ghost">{isTr ? "Yakında" : "Soon"}</Badge>
        </div>
      </div>
    </div>
  );
}

export default AccountDangerZone;
