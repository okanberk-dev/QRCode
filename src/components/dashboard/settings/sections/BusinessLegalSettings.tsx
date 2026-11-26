"use client";

import { useEffect, useState } from "react";
import { Book, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Locale } from "@/lib/translations";
import { LEGAL_DOCUMENT_KEYS, LEGAL_DOCUMENT_LABELS } from "@/lib/legal/keys";
import { resolveDisplayTimeZone } from "@/lib/timezone";
import { SUPPORT_EMAIL } from "@/lib/company-constants";
import { SettingsCard } from "../SettingsCard";

interface BusinessLegalSettingsProps {
  locale?: Locale;
}

interface DocCard {
  key: string;
  label: string;
  description: string;
  href: string;
  active: boolean;
  version: number;
  effectiveAt: string | null;
}

/**
 * Owner panel — Yasal Metinler.
 *
 * Bu sayfa salt-okunur özet sunar: Buaze tarafından merkezi yönetilen
 * sözleşme ve onay metinlerinin işletmenin akışında kullanıldığını gösterir.
 * Belge düzenlemesi süperadminde (`/admin/legal-documents`).
 *
 * İşletme sahibi linklerden public sayfaya gidip metni doğrudan okuyabilir.
 */
export function BusinessLegalSettings({ locale = "tr" }: BusinessLegalSettingsProps) {
  const isTr = locale === "tr";
  const [docs, setDocs] = useState<DocCard[]>(() =>
    LEGAL_DOCUMENT_KEYS.map((key) => ({
      key,
      label: LEGAL_DOCUMENT_LABELS[key][locale],
      description: "",
      href: linkForKey(key, locale),
      active: false,
      version: 0,
      effectiveAt: null,
    })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/legal-documents?locale=${locale}`);
        if (!res.ok) return;
        const body = await res.json();
        if (!alive) return;
        setDocs((prev) =>
          prev.map((d) => {
            const match = body.docs.find((x: { key: string }) => x.key === d.key);
            return match
              ? {
                  ...d,
                  description: match.description ?? "",
                  active: match.isActive,
                  version: match.version,
                  effectiveAt: match.effectiveAt,
                }
              : d;
          }),
        );
      } catch {
        // public endpoint hatası — yine link kartları gösterilir
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [locale]);

  return (
    <div className="space-y-5">
      <SettingsCard
        icon={<ShieldCheck size={18} />}
        title={isTr ? "Yasal metinler" : "Legal documents"}
        description={
          isTr
            ? "Aşağıdaki sözleşme ve onay metinleri Buaze tarafından merkezi yönetilir; tüm işletmelerinde aynı sürüm geçerlidir. Okumak için karta tıkla (yeni sekmede açılır)."
            : "These documents are managed centrally by Buaze; the same version applies to all your businesses. Click a card to read it (opens in a new tab)."
        }
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" aria-busy={loading || undefined}>
          {docs.map((d) => (
            <a
              key={d.key}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-[10px] border border-[#EDEDED] bg-white px-3.5 py-3 transition-colors hover:border-[#0A0A0A]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-[13px] font-semibold text-[#0A0A0A]">
                    {d.label}
                  </div>
                  {d.version > 0 && (
                    <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3]">
                      v{d.version}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[#737373]">
                  {loading ? (
                    // Badge-sized placeholder until the document status loads.
                    <span
                      aria-hidden="true"
                      className="inline-block h-[18px] w-14 rounded-full bg-[#EDEDED]"
                    />
                  ) : d.active ? (
                    <Badge kind="ok">{isTr ? "Aktif" : "Active"}</Badge>
                  ) : (
                    <Badge kind="ghost">{isTr ? "Taslak" : "Draft"}</Badge>
                  )}
                  {d.effectiveAt && (
                    <span className="hidden sm:inline">
                      · {new Date(d.effectiveAt).toLocaleDateString(isTr ? "tr-TR" : "en-US", { timeZone: resolveDisplayTimeZone() })}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink
                size={14}
                className="shrink-0 text-[#A3A3A3] transition-colors group-hover:text-[#0A0A0A]"
              />
            </a>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Book size={18} />}
        title={isTr ? "Müşteri akışı" : "Customer flow"}
        description={
          isTr
            ? "Yorum formunu dolduran müşteriden KVKK aydınlatma metni ve açık rıza onayı alınır. Pazarlama izni isteğe bağlıdır. Her onay, metnin sürüm numarasıyla birlikte kaydedilir."
            : "Customers who fill in the review form accept the KVKK privacy notice and explicit consent. Marketing consent is optional. Each consent is recorded together with the document version."
        }
      >
        <ul className="space-y-2 text-[13px] leading-[1.6] text-[#525252]">
          <li className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            <span>
              {isTr
                ? "Müşteri, aydınlatma metnini ve açık rızayı onaylamadan formu gönderemez."
                : "The form can't be sent until the customer accepts the privacy notice and explicit consent."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            <span>
              {isTr
                ? "Pazarlama izni kutusu boş gelir; yalnızca müşteri kendisi işaretlerse izin verilmiş olur (Elektronik Ticaret Kanunu ve İYS'ye uygun)."
                : "The marketing consent box starts unticked; consent is given only if the customer ticks it (in line with Turkish e-commerce law and IYS)."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            <span>
              {isTr
                ? "Müşterilerin IP adresleri 90 gün sonra silinir (KVKK veri en aza indirme ilkesi)."
                : "Customer IP addresses are deleted after 90 days (KVKK data minimisation)."}
            </span>
          </li>
        </ul>
      </SettingsCard>

      <p className="px-1 text-[11.5px] leading-[1.55] text-[#737373]">
        {isTr
          ? "Metinler Buaze ekibi tarafından sürdürülür ve hukuk danışmanı onayıyla yayına alınır. Yasal güncelleme talepleri için "
          : "Documents are maintained by the Buaze team and published after legal review. For legal update requests, contact us at "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-1 text-[#0A0A0A] underline"
        >
          {SUPPORT_EMAIL}
          <ExternalLink size={11} strokeWidth={2} />
        </a>
        {isTr ? " adresine yazabilirsin." : "."}
      </p>
    </div>
  );
}

function linkForKey(key: string, locale: Locale): string {
  switch (key) {
    case "kvkk-aydinlatma":
      return `/${locale}/kvkk`;
    case "acik-riza":
      return `/${locale}/acik-riza`;
    case "gizlilik-politikasi":
      return locale === "tr" ? "/tr/gizlilik" : "/en/privacy";
    case "kullanim-sartlari":
      return `/${locale}/terms`;
    case "cerez-politikasi":
      return `/${locale}/cookie`;
    case "ticari-ileti":
      return `/${locale}/ticari-ileti`;
    case "kullanim-sozlesmesi":
      return `/${locale}/kullanim-sozlesmesi`;
    case "mesafeli-hizmet-sozlesmesi":
      return `/${locale}/mesafeli-hizmet-sozlesmesi`;
    case "iade-iptal-politikasi":
      return `/${locale}/iade-iptal-politikasi`;
    case "veri-isleyici-sozlesmesi":
      return `/${locale}/veri-isleyici-sozlesmesi`;
    case "kabul-edilebilir-kullanim":
      return `/${locale}/kabul-edilebilir-kullanim`;
    case "icerik-moderasyon":
      return `/${locale}/icerik-moderasyon`;
    case "veri-ihlali-mudahale":
      return `/${locale}/veri-ihlali-mudahale`;
    default:
      // Loyalty / customer account texts live at /{locale}/{key} (§60, §61).
      return `/${locale}/${key}`;
  }
}

export default BusinessLegalSettings;
