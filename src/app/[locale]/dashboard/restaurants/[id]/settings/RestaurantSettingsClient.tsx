"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Link2, MoreHorizontal, QrCode } from "lucide-react";
import {
  AlertBanner,
  Badge,
  PageHeader,
  PulseMenu,
  PulseMenuItem,
} from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { BusinessGeneralSettings } from "@/components/dashboard/settings/sections/BusinessGeneralSettings";
import { BusinessBrandSettings } from "@/components/dashboard/settings/sections/BusinessBrandSettings";
import { BusinessWebsiteSettings } from "@/components/dashboard/settings/sections/BusinessWebsiteSettings";
import { BusinessOperationalSettings } from "@/components/dashboard/settings/sections/BusinessOperationalSettings";
import { BusinessSecuritySettings } from "@/components/dashboard/settings/sections/BusinessSecuritySettings";
import { DangerZone } from "@/components/dashboard/settings/sections/DangerZone";
import { BusinessPlatformLinksSummary } from "@/components/dashboard/settings/sections/BusinessPlatformLinksSummary";
import {
  parseLatestChecksPayload,
  summarizeReviewPlatformLinks,
  type LatestCheckLite,
} from "@/lib/platform-link-status";
import SettingsLoading from "./loading";

/**
 * Amber dot rendered next to a tab label when that section has unfilled
 * fields the owner should know about. Reuses the warning palette
 * (#D97706 / #FFFBEB) to stay consistent with `<AlertBanner kind="warn">`.
 * `label` overrides the default "N eksik alan" text for sections whose
 * issue is not a field count (e.g. no review platform connected).
 */
function IncompleteDot({ count, isTr, label }: { count: number; isTr: boolean; label?: string }) {
  const text =
    label ?? (isTr ? `${count} eksik alan` : `${count} field${count > 1 ? 's' : ''} missing`);
  return (
    <span
      role="status"
      aria-label={text}
      title={text}
      className="inline-block h-1.5 w-1.5 rounded-full bg-[#D97706]"
    />
  );
}

export interface RestaurantPayload {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  googlePlaceId: string | null;
  notificationEmail: string | null;
  isActive: boolean;
  /** Superadmin pause — owner status controls are locked while true. */
  suspendedByAdmin: boolean;
  // Faz 2 — entegrasyon alanları
  googleReviewUrl: string | null;
  googleEnabled: boolean;
  yemekSepetiUrl: string | null;
  yemekSepetiEnabled: boolean;
  getirYemekUrl: string | null;
  getirEnabled: boolean;
  trendyolYemekUrl: string | null;
  trendyolEnabled: boolean;
  tripAdvisorUrl: string | null;
  tripAdvisorEnabled: boolean;
  airbnbUrl: string | null;
  airbnbEnabled: boolean;
  bookingUrl: string | null;
  bookingEnabled: boolean;
  yandexUrl: string | null;
  yandexEnabled: boolean;
  // §38.52 — Yelp + Foursquare yorum platformları
  yelpUrl: string | null;
  yelpEnabled: boolean;
  foursquareUrl: string | null;
  foursquareEnabled: boolean;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  redirectMinRating: number | null;
  otherPlatformUrl: string | null;
  otherPlatformLabel: string | null;
  otherPlatformEnabled: boolean;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  reservationUrl: string | null;
  workingHours: string | null;
  temporarilyClosed: boolean;
  closedReason: string | null;
  // Phase 8c+ §38.26 — Owner-tanımlı hedef puan, Analytics 14-haftalık trend
  // chart için. null = henüz ayarlanmadı (chart 4.0 fallback).
  targetRating: number | null;
}

const SECTION_IDS = [
  "general",
  "platforms",
  "brand",
  "website",
  "operations",
  "status",
] as const;
type SectionId = (typeof SECTION_IDS)[number];
const VALID_SECTION_IDS = new Set<string>(SECTION_IDS);
// One name per section: the tab label and the section heading both read it.
const SECTION_LABELS: Record<SectionId, { tr: string; en: string }> = {
  general: { tr: "Genel bilgiler", en: "General details" },
  platforms: { tr: "Platform bağlantıları", en: "Platform links" },
  brand: { tr: "Marka", en: "Brand" },
  website: { tr: "Web sitesi", en: "Website" },
  operations: { tr: "Çalışma saatleri", en: "Opening hours" },
  status: { tr: "Durum ve silme", en: "Status & deletion" },
};
// Legacy deep links: `?section=integrations` (old "Entegrasyonlar" tab, still
// used by onboarding mails / bookmarks) opens the platforms tab; the former
// "Güvenlik" and "Tehlikeli bölge" tabs were merged into "Durum ve silme".
const SECTION_ALIASES: Record<string, SectionId> = {
  integrations: "platforms",
  security: "status",
  danger: "status",
};

function resolveSectionId(raw: string | null): SectionId {
  if (!raw) return "general";
  const aliased = Object.prototype.hasOwnProperty.call(SECTION_ALIASES, raw) ? SECTION_ALIASES[raw] : raw;
  return VALID_SECTION_IDS.has(aliased) ? (aliased as SectionId) : "general";
}

interface RestaurantSettingsClientProps {
  initialRestaurant?: RestaurantPayload | null;
  /**
   * Latest link check per provider, loaded with the restaurant on the owner
   * direct-load path. `undefined` → the client fetches
   * `GET /integrations/checks` itself (impersonation / team-member path).
   */
  initialPlatformChecks?: Record<string, LatestCheckLite>;
  /** Server render time — keeps "son kontrol 2 sa önce" SSR-stable. */
  serverNow?: number;
}

/**
 * Per-restaurant Business Settings hub. Faz 1 — Genel + Marka.
 * Faz 2-4'te entegrasyonlar, operasyonel, güvenlik, danger zone eklenir;
 * workspace-level (faturalandırma / kullanıcılar / bildirim) `/dashboard/account`
 * rotasında yer alacak.
 *
 * URL sync: `?section=general|platforms|brand|…` — `<SettingsLayout>` aktif
 * tab'ı kontrol eder, `replaceState` ile geri buton hijack'i önlenir.
 * `?section=integrations` (eski entegrasyon sekmesi) platforms sekmesini açar.
 *
 * §40.10 server-hydration: parent server component restoran payload'ını
 * `initialRestaurant` prop'uyla geçirir. Owner direct-load yolunda fetch
 * skip edilir; admin impersonation veya team_member fallback senaryolarında
 * client-fetch çalışır (initialRestaurant === undefined).
 */
export default function RestaurantSettingsClient({
  initialRestaurant,
  initialPlatformChecks,
  serverNow,
}: RestaurantSettingsClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";
  const id = params.id as string;

  // §40.10 server-hydration:
  // - initialRestaurant === undefined → admin/impersonation veya cross-token
  //   path, client-fetch yapılır
  // - initialRestaurant === null → SSR auth/IDOR başarısız, error gösterilir
  //   (refetch denenmez; API zaten 403/404 dönecek)
  // - initialRestaurant: payload → hydrated, fetch skip
  const [restaurant, setRestaurant] = useState<RestaurantPayload | null>(initialRestaurant ?? null);
  const [loading, setLoading] = useState(initialRestaurant === undefined);
  const skipFirstFetchRef = useRef(initialRestaurant !== undefined);
  const [error, setError] = useState<string | null>(null);
  // "Linki kopyala" result. Shown as an overlay pill (no layout shift) and
  // announced through an always-mounted live region.
  const [copyNotice, setCopyNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const initialSection = useMemo<string>(
    () => resolveSectionId(searchParams.get("section")),
    [searchParams],
  );

  const [active, setActive] = useState<string>(initialSection);
  // Follow `?section=` when it changes without a remount — e.g. the sidebar
  // "Faturalama" / "Bildirimler" links while this page is already open used
  // to change the URL but leave the old tab on screen.
  const [syncedSection, setSyncedSection] = useState(initialSection);
  if (initialSection !== syncedSection) {
    setSyncedSection(initialSection);
    setActive(initialSection);
  }

  // Platform link checks power the "Platform bağlantıları" tab (summary +
  // tab dot). `null` = still loading → untested until the response lands.
  const [platformChecks, setPlatformChecks] = useState<Record<string, LatestCheckLite> | null>(
    initialPlatformChecks ?? null,
  );
  const checksRequestedRef = useRef(initialPlatformChecks !== undefined);
  const [nowMs, setNowMs] = useState<number>(serverNow ?? 0);
  useEffect(() => setNowMs(Date.now()), []);

  useEffect(() => {
    if (checksRequestedRef.current) return;
    checksRequestedRef.current = true;
    let cancelled = false;
    fetch(`/api/restaurants/${id}/integrations/checks`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setPlatformChecks(parseLatestChecksPayload(data));
      })
      .catch(() => {
        // Checks are advisory: a failed read shows links as "not checked yet".
        if (!cancelled) setPlatformChecks({});
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Same review-link summary the platforms overview shows for this business.
  const reviewLinkSummary = useMemo(
    () => (restaurant ? summarizeReviewPlatformLinks(restaurant, platformChecks ?? {}) : null),
    [restaurant, platformChecks],
  );

  /**
   * Per-section "missing field" count derived from the loaded restaurant
   * payload. Powers the amber dot on each tab so the owner knows where
   * setup is incomplete without opening every section. We only flag
   * sections whose data lives in `RestaurantPayload` — Brand identity is
   * fetched by its own component, so we don't surface a count for it
   * (would require a duplicate API hit).
   */
  const sectionIssues = useMemo<Record<SectionId, number>>(() => {
    if (!restaurant) {
      return {
        general: 0,
        platforms: 0,
        brand: 0,
        website: 0,
        operations: 0,
        status: 0,
      };
    }
    // The website URL is edited in Genel › "Web ve haritalar"; the Website
    // tab is only the embed-widget generator, so the gap is counted here.
    const generalMissing =
      (restaurant.address ? 0 : 1) +
      (restaurant.phone ? 0 : 1) +
      (restaurant.notificationEmail ? 0 : 1) +
      (restaurant.website ? 0 : 1);
    // workingHours stored as JSON string — empty / null both count as
    // unset. We don't try to parse or validate the JSON shape here;
    // a non-null non-empty value is treated as "owner touched it".
    const operationsMissing = restaurant.workingHours && restaurant.workingHours.trim().length > 0 ? 0 : 1;
    return {
      general: generalMissing,
      // Not a field count: flag the tab while no review platform is
      // connected (customers have nowhere to be offered).
      platforms: reviewLinkSummary && reviewLinkSummary.connected === 0 ? 1 : 0,
      brand: 0,
      website: 0,
      operations: operationsMissing,
      status: 0,
    };
  }, [restaurant, reviewLinkSummary]);

  const sectionTabs = useMemo<SettingsTab[]>(() => {
    const isTrLabel = locale === "tr";
    return SECTION_IDS.map((id) => {
      const issues = sectionIssues[id];
      return {
        id,
        label: isTrLabel ? SECTION_LABELS[id].tr : SECTION_LABELS[id].en,
        badge:
          issues > 0 ? (
            <IncompleteDot
              count={issues}
              isTr={isTrLabel}
              label={
                id === "platforms"
                  ? isTrLabel
                    ? "Yorum platformu bağlı değil"
                    : "No review platform connected"
                  : undefined
              }
            />
          ) : undefined,
      };
    });
  }, [locale, sectionIssues]);

  useEffect(() => {
    // §40.10 server-hydration — SSR data hazırsa ilk mount'taki fetch'i atla.
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error || (locale === "tr" ? "İşletme yüklenemedi." : "Could not load the business."),
          );
        }
        const data = await res.json();
        if (cancelled) return;
        setRestaurant({
          id: data.id,
          name: data.name,
          slug: data.slug,
          category: data.category ?? "Restoran",
          description: data.description ?? null,
          website: data.website ?? null,
          address: data.address ?? null,
          city: data.city ?? null,
          phone: data.phone ?? null,
          googlePlaceId: data.googlePlaceId ?? null,
          notificationEmail: data.notificationEmail ?? null,
          isActive: data.isActive ?? true,
          suspendedByAdmin: data.suspendedByAdmin === true,
          googleReviewUrl: data.googleReviewUrl ?? null,
          googleEnabled: data.googleEnabled ?? true,
          yemekSepetiUrl: data.yemekSepetiUrl ?? null,
          yemekSepetiEnabled: data.yemekSepetiEnabled ?? true,
          getirYemekUrl: data.getirYemekUrl ?? null,
          getirEnabled: data.getirEnabled ?? true,
          trendyolYemekUrl: data.trendyolYemekUrl ?? null,
          trendyolEnabled: data.trendyolEnabled ?? true,
          tripAdvisorUrl: data.tripAdvisorUrl ?? null,
          tripAdvisorEnabled: data.tripAdvisorEnabled ?? true,
          airbnbUrl: data.airbnbUrl ?? null,
          airbnbEnabled: data.airbnbEnabled ?? true,
          bookingUrl: data.bookingUrl ?? null,
          bookingEnabled: data.bookingEnabled ?? true,
          yandexUrl: data.yandexUrl ?? null,
          yandexEnabled: data.yandexEnabled ?? true,
          // §38.52 — Yelp + Foursquare yorum platformları (default enabled true,
          // URL boşsa UI "Henüz bağlanmadı" gösterir)
          yelpUrl: data.yelpUrl ?? null,
          yelpEnabled: data.yelpEnabled ?? true,
          foursquareUrl: data.foursquareUrl ?? null,
          foursquareEnabled: data.foursquareEnabled ?? true,
          externalPlatformsEnabled: data.externalPlatformsEnabled ?? true,
          defaultRedirectPlatform: data.defaultRedirectPlatform ?? null,
          redirectMinRating: data.redirectMinRating ?? null,
          otherPlatformUrl: data.otherPlatformUrl ?? null,
          otherPlatformLabel: data.otherPlatformLabel ?? null,
          otherPlatformEnabled: data.otherPlatformEnabled ?? true,
          instagramUrl: data.instagramUrl ?? null,
          facebookUrl: data.facebookUrl ?? null,
          whatsappUrl: data.whatsappUrl ?? null,
          reservationUrl: data.reservationUrl ?? null,
          workingHours: data.workingHours ?? null,
          temporarilyClosed: data.temporarilyClosed ?? false,
          closedReason: data.closedReason ?? null,
          targetRating:
            typeof data.targetRating === 'number' ? data.targetRating : null,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // locale only feeds the error copy; refetching on a language switch isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSectionChange = (next: string) => {
    setActive(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState({}, "", url.toString());
  };

  // Section component'leri kendi alt-tipiyle (RestaurantData) callback yapar.
  // Parent burada Partial olarak kabul edip mevcut state'in üzerine merge eder.
  // Bu sayede General + Brand + Integrations farklı subset'leri bağımsız save'leyebilir.
  const handleSaved = (partial: Partial<RestaurantPayload>) => {
    setRestaurant((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  // Client-fetch path (admin impersonation / team_member fallback): show the
  // same skeleton as the segment's loading.tsx instead of a blank page.
  if (loading) return <SettingsLoading />;

  if (error || !restaurant) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
        <AlertBanner kind="danger">
          {error || (locale === "tr" ? "İşletme bulunamadı." : "Business not found.")}
        </AlertBanner>
        <div className="mt-4">
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="bz-btn-ghost inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            {locale === "tr" ? "İşletmelere dön" : "Back to businesses"}
          </Link>
        </div>
      </div>
    );
  }

  const isTr = locale === "tr";
  const sectionTitle = (sectionId: SectionId) =>
    isTr ? SECTION_LABELS[sectionId].tr : SECTION_LABELS[sectionId].en;

  // Public review surface URL — used by the quick action chips. Falls back
  // to relative `/r/{slug}` when env app URL is missing or local-host
  // shaped (operator running `npm run dev` shouldn't surface a misleading
  // localhost link to copy).
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  const safePublicBase =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : "https://www.buaze.com";
  const publicReviewUrl = `${safePublicBase}/r/${restaurant.slug}`;

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicReviewUrl);
      setCopyNotice({ text: isTr ? "Link kopyalandı." : "Link copied.", ok: true });
    } catch {
      setCopyNotice({
        text: isTr
          ? "Link kopyalanamadı. Tarayıcı izin vermedi."
          : "Could not copy the link. Your browser blocked it.",
        ok: false,
      });
    }
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyNotice(null), 2400);
  };

  // One primary action (QR oluştur) + a "Diğer" menu for the customer-page
  // link actions. The status badge sits with the public URL under the title.
  const header = (
    <div className="relative">
      <Link
        href={`/${locale}/dashboard/restaurants/${id}`}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-[12px] text-[#737373] hover:text-pn-ink mb-2 sm:min-h-[32px]"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        {isTr ? "İşletme özetine dön" : "Back to business summary"}
      </Link>
      <PageHeader
        eyebrow={isTr ? "İŞLETME AYARLARI" : "BUSINESS SETTINGS"}
        // Long names must wrap instead of overflowing at 375px.
        title={<span className="break-words [overflow-wrap:anywhere]">{restaurant.name}</span>}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="tabular-nums text-[12px] text-[#737373] break-all">
              /r/{restaurant.slug}
            </span>
            {/* Local badge: BusinessStatusBadge only has Turkish labels. */}
            <Badge kind={restaurant.isActive ? "ok" : "off"} dot>
              {restaurant.isActive
                ? isTr
                  ? "Aktif"
                  : "Active"
                : isTr
                  ? "Devre dışı"
                  : "Disabled"}
            </Badge>
          </span>
        }
        actions={
          <>
            <Link
              href={`/${locale}/dashboard/qr?new=1&restaurantId=${restaurant.id}`}
              className="bz-btn-primary min-h-[44px] sm:min-h-[36px]"
            >
              <QrCode size={14} strokeWidth={2.2} aria-hidden="true" />
              {isTr ? "QR oluştur" : "Create QR"}
            </Link>
            <PulseMenu
              trigger={
                <button
                  type="button"
                  className="bz-btn-ghost min-h-[44px] min-w-[44px] justify-center sm:min-h-[36px] sm:min-w-0"
                  aria-label={isTr ? "Diğer işlemler" : "More actions"}
                >
                  <MoreHorizontal size={14} strokeWidth={2} aria-hidden="true" />
                  <span className="hidden sm:inline">{isTr ? "Diğer" : "More"}</span>
                </button>
              }
              // Rows meet the 44px touch target on phones.
              className="min-w-[220px]"
            >
              <PulseMenuItem
                icon={<ExternalLink size={13} />}
                onSelect={() => window.open(publicReviewUrl, "_blank", "noopener,noreferrer")}
              >
                {isTr ? "Müşteri sayfasını gör" : "View customer page"}
              </PulseMenuItem>
              <PulseMenuItem icon={<Link2 size={13} />} onSelect={() => void handleCopyPublicLink()}>
                {isTr ? "Linki kopyala" : "Copy link"}
              </PulseMenuItem>
            </PulseMenu>
          </>
        }
      />
      <span role="status" aria-live="polite" className="sr-only">
        {copyNotice?.text ?? ""}
      </span>
      {copyNotice && (
        <p
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-full z-10 mt-1 rounded-full px-3 py-1.5 text-[12px] font-medium sm:left-auto sm:right-0 ${
            copyNotice.ok
              ? "bg-pn-ink text-white"
              : "border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
          }`}
        >
          {copyNotice.text}
        </p>
      )}
    </div>
  );

  return (
    <SettingsLayout
      tabs={sectionTabs}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel={locale === "tr" ? "İşletme ayarları bölümleri" : "Business settings sections"}
    >
      <SettingsSection
        id="general"
        active={active === "general"}
        title={sectionTitle("general")}
        description={
          isTr
            ? "İşletmenin adı, sayfa adresi ve iletişim bilgileri."
            : "Your business name, page address and contact details."
        }
      >
        <BusinessGeneralSettings restaurant={restaurant} locale={locale} onSaved={handleSaved} />
      </SettingsSection>

      <SettingsSection
        id="platforms"
        active={active === "platforms"}
        title={sectionTitle("platforms")}
        description={
          isTr
            ? "Bu işletmenin yorum platformu linkleri ve müşteri yönlendirmesi."
            : "This business's review-platform links and customer routing."
        }
      >
        <BusinessPlatformLinksSummary
          restaurant={restaurant}
          locale={locale}
          checks={platformChecks}
          nowMs={nowMs}
        />
      </SettingsSection>

      <SettingsSection
        id="brand"
        active={active === "brand"}
        title={sectionTitle("brand")}
        description={
          isTr
            ? "Logo, kapak görseli, renkler, yazı tipi ve slogan: müşteri sayfasının görünümü."
            : "Logo, cover image, colours, font and tagline: how your public page looks."
        }
      >
        <BusinessBrandSettings
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          isTr={isTr}
        />
      </SettingsSection>

      <SettingsSection
        id="website"
        active={active === "website"}
        title={sectionTitle("website")}
        description={
          isTr
            ? "Web sitene yorum kutusu yerleştir."
            : "Embed a review widget on your website."
        }
      >
        <BusinessWebsiteSettings
          restaurantId={restaurant.id}
          slug={restaurant.slug}
          businessName={restaurant.name}
          website={restaurant.website}
          locale={locale}
        />
      </SettingsSection>

      <SettingsSection
        id="operations"
        active={active === "operations"}
        title={sectionTitle("operations")}
        description={
          isTr ? "Çalışma saatleri ve geçici kapalı durumu." : "Opening hours and temporary closure."
        }
      >
        <BusinessOperationalSettings restaurant={restaurant} locale={locale} onSaved={handleSaved} />
      </SettingsSection>

      {/* Former "Güvenlik" + "Tehlikeli bölge" tabs: both offered "İşletmeyi
          devre dışı bırak". One switch (on/off, reversible) + permanent delete. */}
      <SettingsSection
        id="status"
        active={active === "status"}
        title={sectionTitle("status")}
        description={
          isTr
            ? "İşletmeyi geçici olarak devre dışı bırak ya da kalıcı olarak sil."
            : "Disable the business for a while, or delete it permanently."
        }
      >
        <BusinessSecuritySettings
          restaurant={restaurant}
          locale={locale}
          onSaved={handleSaved}
          onOpenHours={() => handleSectionChange("operations")}
        />
        <DangerZone restaurant={restaurant} locale={locale} />
      </SettingsSection>
    </SettingsLayout>
  );
}
