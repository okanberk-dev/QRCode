"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowLeft,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Link2,
  Lock,
  Palette,
  QrCode,
} from "lucide-react";
import { AlertBanner, BusinessStatusBadge, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { BusinessGeneralSettings } from "@/components/dashboard/settings/sections/BusinessGeneralSettings";
import { BusinessBrandSettings } from "@/components/dashboard/settings/sections/BusinessBrandSettings";
import { BusinessWebsiteSettings } from "@/components/dashboard/settings/sections/BusinessWebsiteSettings";
import { BusinessOperationalSettings } from "@/components/dashboard/settings/sections/BusinessOperationalSettings";
import { BusinessSecuritySettings } from "@/components/dashboard/settings/sections/BusinessSecuritySettings";
import { DangerZone } from "@/components/dashboard/settings/sections/DangerZone";

/**
 * Amber dot rendered next to a tab label when that section has unfilled
 * fields the owner should know about. Reuses the warning palette
 * (#D97706 / #FFFBEB) to stay consistent with `<AlertBanner kind="warn">`.
 */
function IncompleteDot({ count, isTr }: { count: number; isTr: boolean }) {
  return (
    <span
      role="status"
      aria-label={
        isTr
          ? `${count} eksik alan`
          : `${count} field${count > 1 ? 's' : ''} missing`
      }
      title={
        isTr
          ? `${count} eksik alan`
          : `${count} field${count > 1 ? 's' : ''} missing`
      }
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

const SECTION_IDS = ["general", "brand", "website", "operations", "security", "danger"] as const;
type SectionId = (typeof SECTION_IDS)[number];
const VALID_SECTION_IDS = new Set<string>(SECTION_IDS);

interface RestaurantSettingsClientProps {
  initialRestaurant?: RestaurantPayload | null;
}

/**
 * Per-restaurant Business Settings hub. Faz 1 — Genel + Marka.
 * Faz 2-4'te entegrasyonlar, operasyonel, güvenlik, danger zone eklenir;
 * workspace-level (faturalandırma / kullanıcılar / bildirim) `/dashboard/account`
 * rotasında yer alacak.
 *
 * URL sync: `?section=general|brand` — `<SettingsLayout>` aktif tab'ı kontrol
 * eder, `replaceState` ile geri buton hijack'i önlenir.
 *
 * §40.10 server-hydration: parent server component restoran payload'ını
 * `initialRestaurant` prop'uyla geçirir. Owner direct-load yolunda fetch
 * skip edilir; admin impersonation veya team_member fallback senaryolarında
 * client-fetch çalışır (initialRestaurant === undefined).
 */
export default function RestaurantSettingsClient({
  initialRestaurant,
}: RestaurantSettingsClientProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";
  const id = params.id as string;
  const requestedSection = searchParams.get("section");

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
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const initialSection = useMemo<string>(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && VALID_SECTION_IDS.has(fromUrl)) return fromUrl;
    return "general";
  }, [searchParams]);

  const [active, setActive] = useState<string>(initialSection);

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
        brand: 0,
        website: 0,
        operations: 0,
        security: 0,
        danger: 0,
      };
    }
    const generalMissing =
      (restaurant.address ? 0 : 1) +
      (restaurant.phone ? 0 : 1) +
      (restaurant.notificationEmail ? 0 : 1);
    const websiteMissing = restaurant.website ? 0 : 1;
    // workingHours stored as JSON string — empty / null both count as
    // unset. We don't try to parse or validate the JSON shape here;
    // a non-null non-empty value is treated as "owner touched it".
    const operationsMissing = restaurant.workingHours && restaurant.workingHours.trim().length > 0 ? 0 : 1;
    return {
      general: generalMissing,
      brand: 0,
      website: websiteMissing,
      operations: operationsMissing,
      security: 0,
      danger: 0,
    };
  }, [restaurant]);

  const sectionTabs = useMemo<SettingsTab[]>(() => {
    const isTrLabel = locale === "tr";
    const labels: Record<SectionId, { tr: string; en: string }> = {
      general: { tr: "Genel", en: "General" },
      brand: { tr: "Marka", en: "Brand" },
      website: { tr: "Web sitesi", en: "Website" },
      operations: { tr: "Operasyonel", en: "Operations" },
      security: { tr: "Güvenlik", en: "Security" },
      danger: { tr: "Tehlikeli bölge", en: "Danger zone" },
    };
    return SECTION_IDS.map((id) => {
      const issues = sectionIssues[id];
      return {
        id,
        label: isTrLabel ? labels[id].tr : labels[id].en,
        badge: issues > 0 ? <IncompleteDot count={issues} isTr={isTrLabel} /> : undefined,
      };
    });
  }, [locale, sectionIssues]);

  useEffect(() => {
    if (requestedSection === "integrations") {
      router.replace(`/${locale}/dashboard/platforms?restaurantId=${id}`);
    }
  }, [id, locale, requestedSection, router]);

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
          throw new Error(data.error || "İşletme yüklenemedi.");
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
  }, [id]);

  const handleSectionChange = (next: string) => {
    setActive(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState({}, "", url.toString());
  };

  const handleCategoryChange = (category: string) => {
    setRestaurant((prev) => (prev ? { ...prev, category } : prev));
  };

  // Section component'leri kendi alt-tipiyle (RestaurantData) callback yapar.
  // Parent burada Partial olarak kabul edip mevcut state'in üzerine merge eder.
  // Bu sayede General + Brand + Integrations farklı subset'leri bağımsız save'leyebilir.
  const handleSaved = (partial: Partial<RestaurantPayload>) => {
    setRestaurant((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  // §40.10 clean-slate — initialRestaurant boş + henüz fetch dönmedi durumu
  // sadece admin impersonation veya team_member fallback senaryolarında
  // görünür. Direct owner load yolunda bu blok atlanır.
  if (loading) return null;

  if (error || !restaurant) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8">
        <AlertBanner kind="danger">
          {error || "İşletme bulunamadı."}
        </AlertBanner>
        <div className="mt-4">
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="bz-btn-ghost inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            İşletmelere dön
          </Link>
        </div>
      </div>
    );
  }

  // Public review surface URL — used by the quick action chips. Falls back
  // to relative `/r/{slug}` when env app URL is missing or local-host
  // shaped (operator running `npm run dev` shouldn't surface a misleading
  // localhost link to copy).
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  const safePublicBase =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : "https://buaze.com";
  const publicReviewUrl = `${safePublicBase}/r/${restaurant.slug}`;

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicReviewUrl);
      setCopyNotice(locale === "tr" ? "Link kopyalandı." : "Link copied.");
    } catch {
      setCopyNotice(
        locale === "tr"
          ? "Link kopyalanamadı — tarayıcı izin vermedi."
          : "Could not copy link — browser blocked it.",
      );
    }
    setTimeout(() => setCopyNotice(null), 2400);
  };

  const header = (
    <div>
      <Link
        href={`/${locale}/dashboard/restaurants/${id}`}
        className="bz-mono text-[11px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft size={12} />
        {locale === "tr" ? "İşletme özetine dön" : "Back to business summary"}
      </Link>
      <PageHeader
        eyebrow={locale === "tr" ? "İŞLETME AYARLARI" : "BUSINESS SETTINGS"}
        title={restaurant.name}
        description={`/r/${restaurant.slug}`}
        actions={
          <BusinessStatusBadge status={restaurant.isActive ? "active" : "disabled"} />
        }
      />
      {/* Quick action strip — three chip-style links the owner reaches
          from any settings tab. "Görüntüle" opens public review surface
          in a new tab, "Linki kopyala" lands the same URL into clipboard
          with a transient confirmation, "QR oluştur" deep-links into
          the wizard with the restaurant pre-selected. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={publicReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px]"
        >
          <ExternalLink size={12} strokeWidth={2.2} />
          {locale === "tr" ? "Public sayfayı gör" : "View public page"}
        </a>
        <button
          type="button"
          onClick={handleCopyPublicLink}
          className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px]"
        >
          {copyNotice ? (
            <>
              <Check size={12} strokeWidth={2.4} className="text-[#16A34A]" />
              <span>{copyNotice}</span>
            </>
          ) : (
            <>
              <Link2 size={12} strokeWidth={2.2} />
              <span>{locale === "tr" ? "Linki kopyala" : "Copy link"}</span>
            </>
          )}
        </button>
        <Link
          href={`/${locale}/dashboard/qr?new=1&restaurantId=${restaurant.id}`}
          className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
        >
          <QrCode size={12} strokeWidth={2.2} />
          {locale === "tr" ? "QR oluştur" : "Create QR"}
        </Link>
      </div>
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
        eyebrow="01 — KİMLİK"
        title="Genel Bilgiler"
        description="İşletmenin temel kimliği, iletişim bilgileri ve durumu."
        actions={
          <span className="text-[#737373] text-[20px]" aria-hidden="true">
            <Building2 size={18} />
          </span>
        }
      >
        <BusinessGeneralSettings
          restaurant={restaurant}
          onCategoryChange={handleCategoryChange}
          onSaved={handleSaved}
        />
      </SettingsSection>

      <SettingsSection
        id="brand"
        active={active === "brand"}
        eyebrow="02 — MARKA"
        title="Marka Kimliği"
        description="Logo, kapak, renk paleti, font ve slogan — public sayfanın görsel dili."
        actions={
          <span className="text-[#737373] text-[20px]" aria-hidden="true">
            <Palette size={18} />
          </span>
        }
      >
        <BusinessBrandSettings
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          isTr={locale === "tr"}
        />
      </SettingsSection>

      <SettingsSection
        id="website"
        active={active === "website"}
        eyebrow="03 — WEB SİTESİ"
        title="Web sitesi entegrasyonu"
        description="İşletmenizin web sitesine yorum widget'ı yerleştirin."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Globe size={18} />
          </span>
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
        eyebrow="04 — OPERASYONEL"
        title="Operasyonel ayarlar"
        description="Çalışma saatleri ve geçici kapalı durumu."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Clock size={18} />
          </span>
        }
      >
        <BusinessOperationalSettings
          restaurant={restaurant}
          onSaved={handleSaved}
        />
      </SettingsSection>

      <SettingsSection
        id="security"
        active={active === "security"}
        eyebrow="05 — GÜVENLİK"
        title="Güvenlik & erişim"
        description="İşletme aktiflik durumu."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Lock size={18} />
          </span>
        }
      >
        <BusinessSecuritySettings
          restaurant={restaurant}
          onSaved={handleSaved}
        />
      </SettingsSection>

      <SettingsSection
        id="danger"
        active={active === "danger"}
        eyebrow="06 — TEHLİKELİ BÖLGE"
        title="Tehlikeli bölge"
        description="Geri alınamaz veya yıkıcı işlemler. Dikkatli kullan."
        actions={
          <span className="text-[#991B1B]" aria-hidden="true">
            <AlertOctagon size={18} />
          </span>
        }
      >
        <DangerZone
          restaurant={restaurant}
          locale={locale === "tr" ? "tr" : "en"}
          onDeactivated={(next) => handleSaved(next)}
        />
      </SettingsSection>
    </SettingsLayout>
  );
}
