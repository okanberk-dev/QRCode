"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Bell, Lock, Mail, Users } from "lucide-react";
import { AlertBanner, Badge, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { BusinessNotificationSettings } from "@/components/dashboard/settings/sections/BusinessNotificationSettings";

/**
 * Workspace-level Settings (`/dashboard/account`).
 *
 * Faz 2 — sadece Bildirim Ayarları aktif. Faz 3+'da:
 *  - Billing (read-only — Faz 4)
 *  - Kullanıcılar & Roller (TeamMember CRUD — Faz 4)
 *  - User profile (name/email/password/locale — Faz 4'te /profile redirect ile)
 *
 * Per-restaurant ayarlar `/dashboard/restaurants/[id]/settings`'te.
 */

const FAZ2_TABS: SettingsTab[] = [
  { id: "notifications", label: "Bildirim" },
  { id: "billing", label: "Faturalandırma", badge: <Badge kind="ghost" dot={false}>Yakında</Badge>, disabled: true },
  { id: "team", label: "Kullanıcılar", badge: <Badge kind="ghost" dot={false}>Yakında</Badge>, disabled: true },
];

const VALID_SECTION_IDS = new Set(FAZ2_TABS.filter((t) => !t.disabled).map((t) => t.id));

export default function AccountSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";

  const initialSection = useMemo(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && VALID_SECTION_IDS.has(fromUrl)) return fromUrl;
    return "notifications";
  }, [searchParams]);

  const [active, setActive] = useState<string>(initialSection);

  const handleSectionChange = (next: string) => {
    setActive(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState({}, "", url.toString());
  };

  const header = (
    <PageHeader
      eyebrow="HESAP AYARLARI"
      title="Hesabım"
      description="Faturalandırma, ekibin ve sistem bildirimleri tek yerden yönetilir."
    />
  );

  return (
    <SettingsLayout
      tabs={FAZ2_TABS}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel="Hesap ayarları bölümleri"
    >
      <SettingsSection
        id="notifications"
        active={active === "notifications"}
        eyebrow="01 — BİLDİRİM"
        title="Bildirim ayarları"
        description="Düşük puanda mail, günlük özet, haftalık rapor ve Slack webhook tercihleri."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Bell size={18} />
          </span>
        }
      >
        <BusinessNotificationSettings locale={locale} />
      </SettingsSection>

      <SettingsSection
        id="billing"
        active={active === "billing"}
        eyebrow="02 — FATURALANDIRMA"
        title="Plan ve fatura geçmişi"
        description="Sonraki fazla aktif olur (Faz 4)."
      >
        <AlertBanner kind="info">
          Faturalandırma görünümü ileri faza alındı. Plan değişikliği için
          admin paneliyle iletişime geç.
        </AlertBanner>
      </SettingsSection>

      <SettingsSection
        id="team"
        active={active === "team"}
        eyebrow="03 — KULLANICILAR"
        title="Ekip ve roller"
        description="Sonraki fazla aktif olur (Faz 4)."
      >
        <AlertBanner kind="info">
          Üye davet, rol değişikliği ve oturum yönetimi sonraki fazla geliyor.
        </AlertBanner>
      </SettingsSection>
    </SettingsLayout>
  );
}
