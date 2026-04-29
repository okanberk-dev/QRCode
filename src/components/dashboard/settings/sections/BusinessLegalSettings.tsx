"use client";

import { Book, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Locale } from "@/lib/translations";
import { SettingsCard } from "../SettingsCard";

interface BusinessLegalSettingsProps {
  locale?: Locale;
}

interface LegalDoc {
  k: string;
  s: string;
  href?: string;
  ok: boolean;
}

/**
 * Section — KVKK & Yasal (Faz unified hub).
 *
 * Read-only display of the active legal posture. The actual KVKK
 * disclosure (Restaurant.kvkkText) is edited per location at
 * /dashboard/restaurants/[id]/settings → Güvenlik tab. Pulse mail
 * templates render these documents per locale; admin-managed versions
 * live at /admin/mail-templates.
 *
 * This section is intentionally informational — it documents what's
 * active for the workspace and points operators to the per-restaurant
 * editor when they need to amend the KVKK text for a specific location.
 */
export function BusinessLegalSettings({ locale = "tr" }: BusinessLegalSettingsProps) {
  const isTr = locale === "tr";

  const docs: LegalDoc[] = isTr
    ? [
        {
          k: "Aydınlatma metni",
          s: "v2.0 · Pulse şablonundan",
          ok: true,
        },
        {
          k: "Açık rıza metni",
          s: "v2.0 · Pulse şablonundan",
          ok: true,
        },
        {
          k: "Ticari elektronik ileti izni",
          s: "Public review formunda toplanır",
          ok: true,
        },
        {
          k: "Çerez politikası",
          s: "v1.0 · Site genelinde aktif",
          ok: true,
        },
      ]
    : [
        { k: "KVKK disclosure", s: "v2.0 · from Pulse template", ok: true },
        { k: "Explicit consent", s: "v2.0 · from Pulse template", ok: true },
        { k: "Commercial email consent", s: "Captured in the public review form", ok: true },
        { k: "Cookie policy", s: "v1.0 · Active site-wide", ok: true },
      ];

  return (
    <div className="space-y-5">
      <SettingsCard
        icon={<ShieldCheck size={18} />}
        title={isTr ? "Yasal metinler" : "Legal documents"}
        description={
          isTr
            ? "Aşağıdaki metinler tüm işletmelerinde aktif olan Pulse şablonları. Bir işletme için özel KVKK metni gerekirse, o işletmenin Güvenlik ayarlarından düzenleyebilirsin."
            : "These Pulse-template documents are active across all your locations. To customize KVKK text for a specific business, edit it from that location's Security tab."
        }
      >
        <div className="flex flex-col gap-2.5">
          {docs.map((d) => (
            <div
              key={d.k}
              className="flex items-center justify-between gap-3"
              style={{
                padding: 14,
                border: "1px solid #EDEDED",
                borderRadius: 10,
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#0A0A0A] truncate">{d.k}</div>
                <div className="text-[11.5px] text-[#737373] mt-0.5 truncate">{d.s}</div>
              </div>
              <Badge kind={d.ok ? "ok" : "off"}>
                {d.ok ? (isTr ? "Aktif" : "Active") : isTr ? "Yok" : "Missing"}
              </Badge>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Book size={18} />}
        title={isTr ? "Müşteri akışı" : "Customer flow"}
        description={
          isTr
            ? "Müşteri yorum formunu ziyaret ettiğinde aydınlatma + açık rıza onayı toplanır. Pazarlama izni opt-in (KVKK Açık Rıza zorunluluğu — CLAUDE.md §19.1)."
            : "When a customer opens the review form, KVKK disclosure + explicit consent are collected. Marketing consent is opt-in (CLAUDE.md §19.1)."
        }
      >
        <ul className="space-y-2 text-[13px] leading-[1.6] text-[#525252]">
          <li className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            <span>
              {isTr
                ? "KVKK metni ön-checked — submit-gate olarak işlev görür."
                : "KVKK consent is pre-checked — acts as a submit gate."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            <span>
              {isTr
                ? "Pazarlama izni opt-in: müşteri kendisi işaretler."
                : "Marketing consent is opt-in: the customer must tick it themselves."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            <span>
              {isTr
                ? "IP retention 90 gün (KVKK data minimization)."
                : "IP retention is 90 days (KVKK data minimization)."}
            </span>
          </li>
        </ul>
      </SettingsCard>

      <p className="text-[11.5px] leading-[1.55] text-[#737373] px-1">
        {isTr ? "Şablonlar Buaze ekibi tarafından sürdürülür. Yasal güncelleme gerektiğinde " : "Templates are maintained by Buaze. For legal updates, contact us at "}
        <a
          href="mailto:legal@buaze.com"
          className="underline inline-flex items-center gap-1 text-[#0A0A0A]"
        >
          legal@buaze.com
          <ExternalLink size={11} strokeWidth={2} />
        </a>
        {isTr ? " adresinden bize yazabilirsin." : "."}
      </p>
    </div>
  );
}

export default BusinessLegalSettings;
