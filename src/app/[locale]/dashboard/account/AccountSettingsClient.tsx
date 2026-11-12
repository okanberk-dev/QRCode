"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { AlertBanner, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { AccountOverviewCard } from "@/components/dashboard/account/AccountOverviewCard";
import { BusinessProfileSettings } from "@/components/dashboard/settings/sections/BusinessProfileSettings";
import { BusinessAccountSecuritySettings } from "@/components/dashboard/settings/sections/BusinessAccountSecuritySettings";
import { BusinessNotificationSettings } from "@/components/dashboard/settings/sections/BusinessNotificationSettings";
import { BusinessBillingSettings } from "@/components/dashboard/settings/sections/BusinessBillingSettings";
import { BusinessUsersRolesSettings } from "@/components/dashboard/settings/sections/BusinessUsersRolesSettings";
import { BusinessLegalSettings } from "@/components/dashboard/settings/sections/BusinessLegalSettings";
import { BusinessActivityLogSettings } from "@/components/dashboard/settings/sections/BusinessActivityLogSettings";
import { BusinessPulseAiSettings } from "@/components/dashboard/settings/sections/BusinessPulseAiSettings";
import { AccountDangerZone } from "@/components/dashboard/account/AccountDangerZone";
import { GoogleConnectFlashBanner } from "@/components/dashboard/google/GoogleConnectFlashBanner";
import AdminBackLink from "@/components/dashboard/AdminBackLink";
import AccountLoading from "./loading";

/**
 * Workspace-level settings hub (`/dashboard/account`).
 *
 * Tabs: Profil · Güvenlik · Hesap aktivitesi · Bildirimler · Pulse AI ·
 * Plan ve faturalama · Ekip ve roller · KVKK ve yasal. Each section saves its
 * own form. Per-business settings (name, address, brand, platform links)
 * live at /dashboard/restaurants/[id]/settings.
 *
 * API & Webhook is deliberately absent (Stage 153): owners don't manage API
 * keys; `/api/api-keys` stays admin-only (`/admin/api`).
 */
const TAB_LABELS: Array<{ id: string; tr: string; en: string }> = [
  { id: "profile", tr: "Profil", en: "Profile" },
  { id: "security", tr: "Güvenlik", en: "Security" },
  { id: "activity", tr: "Hesap aktivitesi", en: "Account activity" },
  { id: "notifications", tr: "Bildirimler", en: "Notifications" },
  { id: "ai", tr: "Pulse AI", en: "Pulse AI" },
  { id: "billing", tr: "Plan ve faturalama", en: "Plan & billing" },
  { id: "team", tr: "Ekip ve roller", en: "Team & roles" },
  { id: "legal", tr: "KVKK ve yasal", en: "KVKK & legal" },
];

const VALID_SECTION_IDS = new Set(TAB_LABELS.map((t) => t.id));

interface RestaurantOption {
  id: string;
  name: string;
}

interface UserProfile {
  email: string;
  name: string | null;
  // Wave B4 (CLAUDE.md §38.193) — danger-zone surface state.
  // ISO timestamp from /api/user/profile GET when a delete is scheduled;
  // null otherwise.
  scheduledDeletionAt?: string | null;
}

interface AccountSettingsClientProps {
  initialRestaurants?: RestaurantOption[];
  initialProfile?: UserProfile | null;
  initialTeamCount?: number;
}

export default function AccountSettingsClient({
  initialRestaurants,
  initialProfile,
  initialTeamCount,
}: AccountSettingsClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";
  const tabs = useMemo<SettingsTab[]>(
    () =>
      TAB_LABELS.map((t) => ({
        id: t.id,
        label: locale === "tr" ? t.tr : t.en,
      })),
    [locale],
  );

  const initialSection = useMemo(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && VALID_SECTION_IDS.has(fromUrl)) return fromUrl;
    return "profile";
  }, [searchParams]);

  const [active, setActive] = useState<string>(initialSection);
  // Follow `?section=` when it changes without a remount — e.g. the sidebar
  // "Faturalama" / "Bildirimler" links while this page is already open used
  // to change the URL but leave the old tab on screen.
  const [syncedSection, setSyncedSection] = useState(initialSection);
  if (initialSection !== syncedSection) {
    setSyncedSection(initialSection);
    setActive(initialSection);
  }
  // §40.10 server-hydration — initialRestaurants undefined ise client'ta fetch
  // yapılır, doluysa çift skeleton flash önlenir (loading.tsx → mount → data
  // hazır). Account hub'da SSR data tek hop'ta gelir; section component'ler
  // kendi sub-fetch'lerini yapmaya devam eder (intentional, ayrı concern).
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>(
    initialRestaurants ?? [],
  );
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [teamCount, setTeamCount] = useState(initialTeamCount ?? 0);
  const [loading, setLoading] = useState(initialRestaurants === undefined);
  const skipFirstFetchRef = useRef(initialRestaurants !== undefined);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [resR, resP, resT] = await Promise.all([
          // status=all: inactive businesses count too, same set as the
          // server path (owner-scoped by the API).
          fetch("/api/restaurants?limit=100&status=all"),
          fetch("/api/user/profile"),
          fetch("/api/team"),
        ]);
        const restaurantsData = resR.ok ? await resR.json() : { data: [] };
        const profileData = resP.ok ? await resP.json() : null;
        const teamData = resT.ok ? await resT.json() : null;
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
            scheduledDeletionAt: profileData.scheduledDeletionAt ?? null,
          });
        }
        // §38.37 — /api/team response shape farklı kontratlarla dönebilir
        // (data array, members array). Hepsini opsiyonel kabul et.
        if (teamData) {
          const arr =
            Array.isArray(teamData) ? teamData
            : Array.isArray(teamData?.data) ? teamData.data
            : Array.isArray(teamData?.members) ? teamData.members
            : [];
          setTeamCount(arr.length);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : locale === "tr" ? "Yüklenemedi" : "Could not load",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // locale only feeds the error copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSectionChange = (next: string) => {
    setActive(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState({}, "", url.toString());
  };

  const isTr = locale === "tr";
  // One source for each section's name: the tab label and the section
  // heading used to drift ("KVKK & Yasal" vs "KVKK ve yasal").
  const sectionTitle = (id: string): string => {
    const entry = TAB_LABELS.find((t) => t.id === id);
    return entry ? (isTr ? entry.tr : entry.en) : id;
  };

  // KVKK data export. A plain <form method="POST"> navigated the whole tab to
  // the API response: fine for the file download, but the second click
  // within an hour (rate limited) left the owner on a raw JSON error page.
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setError(null);
    setExportNotice(null);
    try {
      const res = await fetch("/api/account/export-data", { method: "POST" });
      if (!res.ok) {
        setError(
          res.status === 429
            ? isTr
              ? "Veri dışa aktarımı saatte bir kez yapılabilir. Lütfen daha sonra tekrar dene."
              : "You can export your data once an hour. Please try again later."
            : isTr
              ? "Veriler indirilemedi. Lütfen tekrar dene."
              : "Could not export your data. Please try again.",
        );
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "buaze-veri.json";
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      setExportNotice(
        isTr
          ? "Verilerin indirildi. Bilgilendirme e-postası da gönderildi."
          : "Your data was downloaded. We also sent you a confirmation email.",
      );
    } catch {
      setError(isTr ? "Bağlantı hatası. Lütfen tekrar dene." : "Connection error. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // One header action: the KVKK data export. (A generic "save" here would be
  // ambiguous — every section saves its own form.)
  const header = (
    <PageHeader
      title={isTr ? "Hesabım" : "Account"}
      description={
        isTr
          ? "Profil, güvenlik, bildirim, ekip ve abonelik ayarların."
          : "Your profile, security, notifications, team and subscription."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin actor → "Admin paneline dön"; renders nothing for owners. */}
          <AdminBackLink />
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            aria-busy={exporting}
            className="bz-btn-ghost min-h-[44px] sm:min-h-[36px] disabled:opacity-60"
            title={
              isTr
                ? "Hesap verilerini indir (saatte bir kez)"
                : "Download your account data (once an hour)"
            }
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            {isTr ? "Verilerimi indir" : "Export my data"}
          </button>
        </div>
      }
    />
  );

  // Client-fetch path only (no SSR data): reuse the segment skeleton so the
  // hand-off matches loading.tsx instead of flashing a spinner.
  if (loading) return <AccountLoading />;

  return (
    <SettingsLayout
      tabs={tabs}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel={isTr ? "Hesap ayarları bölümleri" : "Account settings sections"}
    >
      {/* §38 audit Fix #1 — OAuth callback ?google=* flash banner.
          Default callback target /tr/dashboard/account?section=notifications
          olduğu için bu sayfa connected/cancelled/state-* status'lerini
          en az %50 zamanda yakalar. */}
      <GoogleConnectFlashBanner locale={locale} />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {exportNotice && (
        <AlertBanner kind="success" onDismiss={() => setExportNotice(null)}>
          {exportNotice}
        </AlertBanner>
      )}

      {/* Profile: account summary + the profile form. Team and security
          used to be repeated here on desktop; they are one tab away. */}
      <SettingsSection
        id="profile"
        active={active === "profile"}
        title={sectionTitle("profile")}
        description={
          isTr ? "Adın, e-postan ve panel dilin." : "Your name, email and panel language."
        }
      >
        <div className="space-y-4">
          <AccountOverviewCard locale={locale} profile={profile} />
          <BusinessProfileSettings locale={locale} />
        </div>
      </SettingsSection>

      <SettingsSection
        id="security"
        active={active === "security"}
        title={sectionTitle("security")}
        description={
          isTr
            ? "Şifren, aktif oturumların ve hesabını silme."
            : "Your password, active sessions and account deletion."
        }
      >
        <div className="space-y-4">
          <BusinessAccountSecuritySettings locale={locale} />
          {/* Account deletion (30-day grace, §38.193). Hidden until the
              profile resolves so a stale "no deletion" state never flashes. */}
          {profile && (
            <AccountDangerZone
              locale={locale}
              scheduledDeletionAt={profile.scheduledDeletionAt ?? null}
              accountEmail={profile.email}
            />
          )}
        </div>
      </SettingsSection>

      {/* KVKK transparency: the owner sees their own audit log (§38.95). */}
      <SettingsSection
        id="activity"
        active={active === "activity"}
        keepMounted={false}
        title={sectionTitle("activity")}
        description={
          isTr
            ? "Hesabında yapılan işlemler: senin ve Buaze yöneticilerinin yaptıkları."
            : "Changes made to your account, by you and by Buaze administrators."
        }
      >
        <BusinessActivityLogSettings locale={locale} restaurants={restaurants} />
      </SettingsSection>

      <SettingsSection
        id="notifications"
        active={active === "notifications"}
        title={sectionTitle("notifications")}
        description={
          isTr ? "Hangi e-postaları alacağını seç." : "Choose which emails you receive."
        }
      >
        <BusinessNotificationSettings locale={locale} />
      </SettingsSection>

      <SettingsSection
        id="ai"
        active={active === "ai"}
        title={sectionTitle("ai")}
        description={
          isTr
            ? "Yorumlara otomatik yanıt taslağı ve varsayılan ton, her işletme için ayrı."
            : "Automatic reply drafts for reviews and the default tone, per business."
        }
      >
        <BusinessPulseAiSettings restaurants={restaurants} locale={locale} />
      </SettingsSection>

      <SettingsSection
        id="billing"
        active={active === "billing"}
        keepMounted={false}
        title={sectionTitle("billing")}
        description={
          isTr
            ? "Planın, kullanımın ve faturaların."
            : "Your plan, usage and invoices."
        }
      >
        <BusinessBillingSettings
          locale={locale}
          usage={{ restaurantCount: restaurants.length, teamCount }}
        />
      </SettingsSection>

      <SettingsSection
        id="team"
        active={active === "team"}
        keepMounted={false}
        title={sectionTitle("team")}
        description={
          isTr
            ? "Ekip üyelerin, rolleri ve erişebildikleri işletmeler."
            : "Your team members, their roles and the businesses they can access."
        }
      >
        <BusinessUsersRolesSettings
          restaurants={restaurants}
          ownerEmail={profile?.email ?? ""}
          ownerName={profile?.name ?? null}
          locale={locale}
        />
      </SettingsSection>

      <SettingsSection
        id="legal"
        active={active === "legal"}
        keepMounted={false}
        title={sectionTitle("legal")}
        description={
          isTr
            ? "Aktif yasal metinler ve müşteri akışında nasıl uygulandıkları."
            : "Active legal documents and how they apply in the customer flow."
        }
      >
        <BusinessLegalSettings locale={locale} />
      </SettingsSection>
    </SettingsLayout>
  );
}
