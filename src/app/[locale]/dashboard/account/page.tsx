"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Bell,
  CreditCard,
  Loader2,
  ShieldCheck,
  ShieldQuestion,
  User,
  Users,
} from "lucide-react";
import { AlertBanner, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { BusinessProfileSettings } from "@/components/dashboard/settings/sections/BusinessProfileSettings";
import { BusinessAccountSecuritySettings } from "@/components/dashboard/settings/sections/BusinessAccountSecuritySettings";
import { BusinessNotificationSettings } from "@/components/dashboard/settings/sections/BusinessNotificationSettings";
import { BusinessBillingSettings } from "@/components/dashboard/settings/sections/BusinessBillingSettings";
import { BusinessUsersRolesSettings } from "@/components/dashboard/settings/sections/BusinessUsersRolesSettings";
import { BusinessLegalSettings } from "@/components/dashboard/settings/sections/BusinessLegalSettings";

/**
 * Workspace-level Settings hub (`/dashboard/account`) — unified Hub.
 *
 * 6 grouped tabs replace the legacy split between `/account` (3 tabs)
 * and `/profile` (5 cards). See PR description and CLAUDE.md.
 *
 *   KİŞİSEL
 *     1. profile       — name + email + locale   (BusinessProfileSettings)
 *     2. security      — password + 2FA + sessions (BusinessAccountSecuritySettings)
 *
 *   ÇALIŞMA ALANI
 *     3. notifications — low-rating mail / digest / Slack
 *     4. billing       — read-only plan + invoices
 *     5. team          — members + roles + locations
 *     6. legal         — KVKK + consent posture (read-only)
 *
 * Per-restaurant business identity (name, address, brand) lives at
 * /dashboard/restaurants/[id]/settings — single source of truth.
 */

const TABS: SettingsTab[] = [
  { id: "profile", label: "Profil", group: "personal" },
  { id: "security", label: "Güvenlik", group: "personal" },
  { id: "notifications", label: "Bildirim", group: "workspace" },
  { id: "billing", label: "Faturalandırma", group: "workspace" },
  { id: "team", label: "Kullanıcılar", group: "workspace" },
  { id: "legal", label: "KVKK & Yasal", group: "workspace" },
];

const GROUPS = [
  { id: "personal", label: "KİŞİSEL" },
  { id: "workspace", label: "ÇALIŞMA ALANI" },
];

const VALID_SECTION_IDS = new Set(TABS.map((t) => t.id));

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
    return "profile";
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

  const isTr = locale === "tr";
  const header = (
    <PageHeader
      eyebrow={isTr ? "HESABIM" : "ACCOUNT"}
      title={isTr ? "Hesap & ayarlar" : "Account & settings"}
      description={
        isTr
          ? "Profil, güvenlik, bildirim, faturalandırma, ekip ve yasal metinler — tek ekranda."
          : "Profile, security, notifications, billing, team and legal — all in one place."
      }
    />
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 sm:px-7 py-12">
        <div className="flex items-center justify-center gap-2 text-[#737373] text-[13px]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? "Yükleniyor…" : "Loading…"}
        </div>
      </div>
    );
  }

  return (
    <SettingsLayout
      tabs={TABS}
      groups={GROUPS}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel={isTr ? "Hesap ayarları bölümleri" : "Account settings sections"}
    >
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {/* KİŞİSEL */}
      <SettingsSection
        id="profile"
        active={active === "profile"}
        eyebrow={isTr ? "01 — PROFİL" : "01 — PROFILE"}
        title={isTr ? "Profil" : "Profile"}
        description={
          isTr
            ? "Adın, e-posta adresin ve panel dilin."
            : "Your name, email, and panel language."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <User size={18} />
          </span>
        }
      >
        <BusinessProfileSettings locale={locale} />
      </SettingsSection>

      <SettingsSection
        id="security"
        active={active === "security"}
        eyebrow={isTr ? "02 — GÜVENLİK" : "02 — SECURITY"}
        title={isTr ? "Güvenlik" : "Security"}
        description={
          isTr
            ? "Şifre, iki adımlı doğrulama ve aktif oturumların."
            : "Password, two-factor verification, and active sessions."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
        }
      >
        <BusinessAccountSecuritySettings locale={locale} />
      </SettingsSection>

      {/* ÇALIŞMA ALANI */}
      <SettingsSection
        id="notifications"
        active={active === "notifications"}
        eyebrow={isTr ? "03 — BİLDİRİM" : "03 — NOTIFICATIONS"}
        title={isTr ? "Bildirim ayarları" : "Notification settings"}
        description={
          isTr
            ? "Düşük puan maili, günlük özet, haftalık rapor ve Slack webhook tercihleri."
            : "Low-rating email, daily digest, weekly report and Slack webhook preferences."
        }
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
        eyebrow={isTr ? "04 — FATURALANDIRMA" : "04 — BILLING"}
        title={isTr ? "Plan ve fatura geçmişi" : "Plan & invoices"}
        description={
          isTr
            ? "Plan değişikliği için Buaze ekibiyle iletişime geç. Fatura geçmişi aşağıda."
            : "Contact Buaze to change plans. Invoice history is below."
        }
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
        eyebrow={isTr ? "05 — KULLANICILAR" : "05 — USERS"}
        title={isTr ? "Ekip ve roller" : "Team & roles"}
        description={
          isTr
            ? "Workspace üyeleri, rolleri ve konum erişimleri."
            : "Workspace members, roles, and location access."
        }
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

      <SettingsSection
        id="legal"
        active={active === "legal"}
        eyebrow={isTr ? "06 — KVKK & YASAL" : "06 — LEGAL"}
        title={isTr ? "KVKK & yasal" : "KVKK & legal"}
        description={
          isTr
            ? "Aktif yasal metinler ve müşteri akışında nasıl uygulandıkları."
            : "Active legal documents and how they apply in the customer flow."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <ShieldQuestion size={18} />
          </span>
        }
      >
        <BusinessLegalSettings locale={locale} />
      </SettingsSection>
    </SettingsLayout>
  );
}
