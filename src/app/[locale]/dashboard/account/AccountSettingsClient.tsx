"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Bell,
  CreditCard,
  Download,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { AlertBanner, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { useCompactSettingsNav } from "@/components/dashboard/settings/useCompactSettingsNav";
import { AccountOverviewCard } from "@/components/dashboard/account/AccountOverviewCard";
import { BusinessProfileSettings } from "@/components/dashboard/settings/sections/BusinessProfileSettings";
import { BusinessAccountSecuritySettings } from "@/components/dashboard/settings/sections/BusinessAccountSecuritySettings";
import { BusinessNotificationSettings } from "@/components/dashboard/settings/sections/BusinessNotificationSettings";
import { BusinessBillingSettings } from "@/components/dashboard/settings/sections/BusinessBillingSettings";
import { BusinessUsersRolesSettings } from "@/components/dashboard/settings/sections/BusinessUsersRolesSettings";
import { BusinessLegalSettings } from "@/components/dashboard/settings/sections/BusinessLegalSettings";
import { BusinessActivityLogSettings } from "@/components/dashboard/settings/sections/BusinessActivityLogSettings";
import { BusinessPulseAiSettings } from "@/components/dashboard/settings/sections/BusinessPulseAiSettings";
import { AccountPlanWidget } from "@/components/dashboard/account/AccountPlanWidget";
import { AccountInvoicesWidget } from "@/components/dashboard/account/AccountInvoicesWidget";
import { AccountDangerZone } from "@/components/dashboard/account/AccountDangerZone";
import { GoogleConnectFlashBanner } from "@/components/dashboard/google/GoogleConnectFlashBanner";
// Stage 79 §38.159 — AccountDangerZone removed (kullanıcı kararı) → §38.193
// Stage 113'te Wave B4 ile geri eklendi (account deletion + 30g grace + cron).
// Wave B4 backend canlı; DangerZone import edilebilir, bu dosya right-rail
// 2 widget'la (Plan + Invoices) intact kalır.
import AdminBackLink from "@/components/dashboard/AdminBackLink";
import AccountLoading from "./loading";

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
 *     3. notifications — low-rating mail + weekly report
 *     4. ai            — Pulse AI auto-draft preferences
 *     5. billing       — read-only plan + invoices
 *     6. team          — members + roles + locations
 *     7. legal         — KVKK + consent posture (read-only)
 *
 * Per-restaurant business identity (name, address, brand) lives at
 * /dashboard/restaurants/[id]/settings — single source of truth.
 */

// §38.59 — Tasarım birebir tek "AYARLAR" group + tasarım terminolojisi
// (kullanıcı ekran görüntüsü Hesabım/Profil & ayarlar). Eski 2-group
// (KİŞİSEL + ÇALIŞMA ALANI) tek group'a sıkıştırıldı; tab label'ları
// tasarımda gösterilen formata align edildi:
//   "Bildirim" → "Bildirimler" (tasarım line 8)
//   "Faturalandırma" → "Plan & Faturalama" (tasarım line 10)
//   "Kullanıcılar" → "Ekip & Roller" (tasarım line 6)
// 3 tasarım tab'ı (İşletme bilgileri / Dil & Bölge / API & Webhook) DEFER
// edildi. API & Webhook owner panelden bilinçle ÇIKARILDI (Stage 153 — kullanıcı
// kararı: restoran sahibi API erişimi görmemeli; geliştirici konusu, owner için
// kafa karıştırıcı). Backend `/api/api-keys` korunuyor ve yalnızca admin
// `/admin/api`'de yönetilir. Prod backend'i olmayan placeholder tab eklemiyoruz.
const TAB_LABELS: Array<{ id: string; tr: string; en: string }> = [
  { id: "profile", tr: "Profil", en: "Profile" },
  { id: "security", tr: "Güvenlik", en: "Security" },
  { id: "activity", tr: "Hesap aktivitesi", en: "Account activity" },
  { id: "notifications", tr: "Bildirimler", en: "Notifications" },
  { id: "ai", tr: "Pulse AI", en: "Pulse AI" },
  { id: "billing", tr: "Plan & Faturalama", en: "Plan & billing" },
  { id: "team", tr: "Ekip & Roller", en: "Team & roles" },
  { id: "legal", tr: "KVKK & Yasal", en: "KVKK & legal" },
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
  const compact = useCompactSettingsNav();
  const tabs = useMemo<SettingsTab[]>(
    () =>
      TAB_LABELS.map((t) => ({
        id: t.id,
        label: locale === "tr" ? t.tr : t.en,
        group: "settings",
      })),
    [locale],
  );
  const groups = useMemo(
    () => [{ id: "settings", label: locale === "tr" ? "AYARLAR" : "SETTINGS" }],
    [locale],
  );

  const initialSection = useMemo(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && VALID_SECTION_IDS.has(fromUrl)) return fromUrl;
    return "profile";
  }, [searchParams]);

  const [active, setActive] = useState<string>(initialSection);
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

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [resR, resP, resT] = await Promise.all([
          fetch("/api/restaurants?limit=100"),
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

  // §38.51 — Header actions tasarım birebir parity. "Değişiklikleri kaydet"
  // header'da SKIP edildi (drift kabul, CLAUDE.md §38.51): mevcut akış
  // her-section-kendi-form paterni — generic header save tetikleyici hangi
  // section aktif belirsiz, UX confusing. UnsavedChangesBar bottom paterni
  // mevcut, redundant olur. Sadece "Veri indir" eklendi (KVKK export).
  const header = (
    <PageHeader
      eyebrow={isTr ? "HESABIM" : "ACCOUNT"}
      title={isTr ? "Hesabım" : "Account"}
      description={
        isTr
          ? "Profilini, işletme bilgilerini, ekibini ve aboneliğini yönet."
          : "Manage your profile, business, team and subscription."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* CLAUDE.md §38.93 (Stage A1) — admin actor için "Admin paneline dön"
              link, owner actor'lar için transparent (component fetch'le karar
              verir). Manager scope'lu admin → /admin/restaurants/[id], superadmin
              → /admin/dashboard. */}
          <AdminBackLink />
          <form action="/api/account/export-data" method="POST" className="inline-flex">
            {/*
              Stage 80 §38.160 — Mobile (<sm) icon-only "Veri indir"; sm:+
              text label görünür. 44px touch target garantisi mobile için
              (`bz-touch-target`). Pulse §11 + WCAG 2.5.5 + §38.74 dense
              chip exception (44×44 minimum action button mobile'da).
            */}
            <button
              type="submit"
              className="bz-btn bz-touch-target sm:min-h-0 sm:min-w-0"
              title={
                isTr
                  ? 'KVKK / GDPR veri dışa aktarımı (saatte 1)'
                  : 'KVKK / GDPR data export (1/hr)'
              }
              aria-label={isTr ? 'Veri indir' : 'Export data'}
            >
              <Download size={13} />
              <span className="hidden sm:inline">
                {isTr ? 'Veri indir' : 'Export data'}
              </span>
            </button>
          </form>
        </div>
      }
    />
  );

  // Client-fetch path only (no SSR data): reuse the segment skeleton so the
  // hand-off matches loading.tsx instead of flashing a spinner.
  if (loading) return <AccountLoading />;

  // §38.37 — Right rail (3. kolon 2xl:+, altında içeriğin altına iner) — tasarım .design-owner-2026/page-account.jsx
  // 320px sağ kolon paterni: Plan dark hero (usage bars) + Recent invoices.
  // Stage 79 §38.159 — AccountDangerZone (Hesabı dondur/sil placeholder)
  // kaldırıldı. Backend yoktu, owner UX confusing idi. 2 widget kalır.
  const rightRail = (
    <>
      <AccountPlanWidget
        locale={locale}
        teamCount={teamCount}
        restaurantCount={restaurants.length}
      />
      <AccountInvoicesWidget locale={locale} />
    </>
  );

  return (
    <SettingsLayout
      tabs={tabs}
      groups={groups}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel={isTr ? "Hesap ayarları bölümleri" : "Account settings sections"}
      rightRail={rightRail}
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

      {/* KİŞİSEL */}
      {/* §38.51 — Profile content aggregation (Apple System Settings paterni,
          tasarım .design-owner-2026/page-account.jsx birebir):
            - Profil Fotoğrafı (AccountOverviewCard, read-only avatar)
            - Kişisel Bilgiler (BusinessProfileSettings, 6-field + emailVerified)
            - Ekip Üyeleri (BusinessUsersRolesSettings, online dot)
            - Güvenlik (BusinessAccountSecuritySettings, Şifre + Sessions)
          Drilldown için Team + Security tab'lar hâlâ var; Profile tab AKTİFKEN
          4 card senkronize scroll. Owner tek bakışta hesabını görür.
          Ekip + Güvenlik kopyaları yalnız desktop'ta ve Profil aktifken:
          mobil accordion'da ayrı Ekip/Güvenlik kartları zaten var (aynı
          liste iki kez görünüyordu); aktif değilken unmount edilir ki Ekip
          sekmesinde yapılan değişiklikten sonra eski listeyi göstermesin. */}
      <SettingsSection
        id="profile"
        active={active === "profile"}
        eyebrow={isTr ? "01 — PROFİL" : "01 — PROFILE"}
        title={isTr ? "Profil" : "Profile"}
        description={
          isTr
            ? "Profilini, ekibini ve güvenlik ayarlarını tek ekranda yönet."
            : "Manage your profile, team and security in one place."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <User size={18} />
          </span>
        }
      >
        <div className="space-y-4">
          <AccountOverviewCard locale={locale} profile={profile} />
          <BusinessProfileSettings locale={locale} />
          {!compact && active === "profile" && (
            <>
              {profile && (
                <BusinessUsersRolesSettings
                  restaurants={restaurants}
                  ownerEmail={profile.email}
                  ownerName={profile.name}
                  locale={locale}
                />
              )}
              <BusinessAccountSecuritySettings locale={locale} />
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="security"
        active={active === "security"}
        eyebrow={isTr ? "02 — GÜVENLİK" : "02 — SECURITY"}
        title={isTr ? "Güvenlik" : "Security"}
        description={
          isTr
            ? "Şifren ve aktif oturumların."
            : "Your password and active sessions."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
        }
      >
        <div className="space-y-4">
          <BusinessAccountSecuritySettings locale={locale} />
          {/* Wave B4 (CLAUDE.md §38.193) — danger zone re-introduced now that
              POST /api/account/delete + POST /api/account/delete/cancel are
              live. Hidden until the profile fetch resolves so the SSR/CSR
              boundary doesn't briefly render the destructive card with stale
              state. */}
          {profile && (
            <AccountDangerZone
              locale={locale}
              scheduledDeletionAt={profile.scheduledDeletionAt ?? null}
              accountEmail={profile.email}
            />
          )}
        </div>
      </SettingsSection>

      {/* Stage A3 §38.95 — KVKK transparency: owner kendi audit log'unu görür. */}
      <SettingsSection
        id="activity"
        active={active === "activity"}
        keepMounted={false}
        eyebrow={isTr ? "03 — HESAP AKTİVİTESİ" : "03 — ACCOUNT ACTIVITY"}
        title={isTr ? "Hesap aktivitesi" : "Account activity"}
        description={
          isTr
            ? "Hesabınla ilgili tüm aksiyonlar — kendi yaptığın veya admin tarafından yapılan. KVKK §13.9 transparency."
            : "All actions on your account — yours or admin-initiated. KVKK §13.9 transparency."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
        }
      >
        <BusinessActivityLogSettings locale={locale} />
      </SettingsSection>

      {/* ÇALIŞMA ALANI */}
      <SettingsSection
        id="notifications"
        active={active === "notifications"}
        eyebrow={isTr ? "04 — BİLDİRİM" : "04 — NOTIFICATIONS"}
        title={isTr ? "Bildirim ayarları" : "Notification settings"}
        description={
          isTr
            ? "Düşük puan e-postası ve haftalık rapor tercihleri."
            : "Low-rating email and weekly report preferences."
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
        id="ai"
        active={active === "ai"}
        eyebrow={isTr ? "05 — PULSE AI" : "05 — PULSE AI"}
        title={isTr ? "Pulse AI yanıt taslakları" : "Pulse AI reply drafts"}
        description={
          isTr
            ? "Düşük puanlı yorumlara otomatik taslak hazırlama ve varsayılan ton seçimi (her işletme için)."
            : "Auto-prepared drafts for low-rating reviews and default tone (per location)."
        }
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Sparkles size={18} />
          </span>
        }
      >
        <BusinessPulseAiSettings restaurants={restaurants} locale={locale} />
      </SettingsSection>

      <SettingsSection
        id="billing"
        active={active === "billing"}
        keepMounted={false}
        eyebrow={isTr ? "06 — FATURALANDIRMA" : "06 — BILLING"}
        title={isTr ? "Plan ve fatura geçmişi" : "Plan & invoices"}
        description={
          isTr
            ? "Planını yükselt, aboneliğini yönet ve fatura geçmişini gör."
            : "Upgrade your plan, manage your subscription and see your invoices."
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
        keepMounted={false}
        eyebrow={isTr ? "07 — KULLANICILAR" : "07 — USERS"}
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
          locale={locale}
        />
      </SettingsSection>

      <SettingsSection
        id="legal"
        active={active === "legal"}
        keepMounted={false}
        eyebrow={isTr ? "08 — KVKK & YASAL" : "08 — LEGAL"}
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
