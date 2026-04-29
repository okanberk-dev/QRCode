"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Bell, CreditCard, Loader2, Users } from "lucide-react";
import { AlertBanner, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { BusinessNotificationSettings } from "@/components/dashboard/settings/sections/BusinessNotificationSettings";
import { BusinessBillingSettings } from "@/components/dashboard/settings/sections/BusinessBillingSettings";
import { BusinessUsersRolesSettings } from "@/components/dashboard/settings/sections/BusinessUsersRolesSettings";

/**
 * Workspace-level Settings (`/dashboard/account`).
 *
 * Faz 2 — Bildirim. Faz 4 — Faturalandırma (read-only) + Kullanıcılar & Roller.
 * Per-restaurant ayarlar `/dashboard/restaurants/[id]/settings`'te.
 */

const FAZ4_TABS: SettingsTab[] = [
  { id: "notifications", label: "Bildirim" },
  { id: "billing", label: "Faturalandırma" },
  { id: "team", label: "Kullanıcılar" },
];

const VALID_SECTION_IDS = new Set(FAZ4_TABS.map((t) => t.id));

interface RestaurantOption {
  id: string;
  name: string;
}

interface UserProfile {
  email: string;
  name: string | null;
}

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
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [resR, resP] = await Promise.all([
          fetch("/api/restaurants?limit=100"),
          fetch("/api/user/profile"),
        ]);
        const restaurantsData = resR.ok ? await resR.json() : { data: [] };
        const profileData = resP.ok ? await resP.json() : null;
        if (cancelled) return;
        const list: RestaurantOption[] = Array.isArray(restaurantsData)
          ? restaurantsData.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }))
          : Array.isArray(restaurantsData?.data)
            ? restaurantsData.data.map((r: { id: string; name: string }) => ({
                id: r.id,
                name: r.name,
              }))
            : [];
        setRestaurants(list);
        if (profileData) {
          setProfile({
            email: profileData.email ?? "",
            name: profileData.name ?? null,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 sm:px-7 py-12">
        <div className="flex items-center justify-center gap-2 text-[#737373] text-[13px]">
          <Loader2 size={14} className="animate-spin" />
          Yükleniyor…
        </div>
      </div>
    );
  }

  return (
    <SettingsLayout
      tabs={FAZ4_TABS}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel="Hesap ayarları bölümleri"
    >
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

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
        description="Plan değişikliği için admin panelle iletişime geç. Fatura geçmişi aşağıda."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <CreditCard size={18} />
          </span>
        }
      >
        <BusinessBillingSettings locale={locale} />
      </SettingsSection>

      <SettingsSection
        id="team"
        active={active === "team"}
        eyebrow="03 — KULLANICILAR"
        title="Ekip ve roller"
        description="Workspace üyeleri, rolleri ve konum erişimleri."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Users size={18} />
          </span>
        }
      >
        <BusinessUsersRolesSettings
          restaurants={restaurants}
          ownerEmail={profile?.email ?? ""}
          ownerName={profile?.name ?? null}
        />
      </SettingsSection>
    </SettingsLayout>
  );
}
