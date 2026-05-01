"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertOctagon, ArrowLeft, Building2, Clock, Globe, Loader2, Lock, Palette, Plug } from "lucide-react";
import { AlertBanner, BusinessStatusBadge, PageHeader } from "@/components/ui";
import { SettingsLayout, type SettingsTab } from "@/components/dashboard/settings/SettingsLayout";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";
import { BusinessGeneralSettings } from "@/components/dashboard/settings/sections/BusinessGeneralSettings";
import { BusinessBrandSettings } from "@/components/dashboard/settings/sections/BusinessBrandSettings";
import { BusinessIntegrationSettings } from "@/components/dashboard/settings/sections/BusinessIntegrationSettings";
import { PlatformRedirectsPanel } from "@/components/dashboard/settings/sections/PlatformRedirectsPanel";
import { BusinessWebsiteSettings } from "@/components/dashboard/settings/sections/BusinessWebsiteSettings";
import { BusinessOperationalSettings } from "@/components/dashboard/settings/sections/BusinessOperationalSettings";
import { BusinessSecuritySettings } from "@/components/dashboard/settings/sections/BusinessSecuritySettings";
import { DangerZone } from "@/components/dashboard/settings/sections/DangerZone";

interface RestaurantPayload {
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
  defaultRedirectPlatform: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  reservationUrl: string | null;
  workingHours: string | null;
  temporarilyClosed: boolean;
  closedReason: string | null;
  kvkkText: string | null;
}

const SECTION_TABS: SettingsTab[] = [
  { id: "general", label: "Genel" },
  { id: "brand", label: "Marka" },
  { id: "integrations", label: "Platform Bağlantıları" },
  { id: "website", label: "Web sitesi" },
  { id: "operations", label: "Operasyonel" },
  { id: "security", label: "Güvenlik" },
  { id: "danger", label: "Tehlikeli bölge" },
];

const VALID_SECTION_IDS = new Set(SECTION_TABS.filter((t) => !t.disabled).map((t) => t.id));

/**
 * Per-restaurant Business Settings hub. Faz 1 — Genel + Marka.
 * Faz 2-4'te entegrasyonlar, operasyonel, güvenlik, danger zone eklenir;
 * workspace-level (faturalandırma / kullanıcılar / bildirim) `/dashboard/account`
 * rotasında yer alacak.
 *
 * URL sync: `?section=general|brand` — `<SettingsLayout>` aktif tab'ı kontrol
 * eder, `replaceState` ile geri buton hijack'i önlenir.
 */
export default function RestaurantSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "tr";
  const id = params.id as string;

  const [restaurant, setRestaurant] = useState<RestaurantPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSection = useMemo<string>(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && VALID_SECTION_IDS.has(fromUrl)) return fromUrl;
    return "general";
  }, [searchParams]);

  const [active, setActive] = useState<string>(initialSection);

  useEffect(() => {
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
          defaultRedirectPlatform: data.defaultRedirectPlatform ?? null,
          instagramUrl: data.instagramUrl ?? null,
          facebookUrl: data.facebookUrl ?? null,
          whatsappUrl: data.whatsappUrl ?? null,
          reservationUrl: data.reservationUrl ?? null,
          workingHours: data.workingHours ?? null,
          temporarilyClosed: data.temporarilyClosed ?? false,
          closedReason: data.closedReason ?? null,
          kvkkText: data.kvkkText ?? null,
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

  if (error || !restaurant) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 sm:px-7 py-8">
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

  const header = (
    <div>
      <Link
        href={`/${locale}/dashboard/restaurants/${id}`}
        className="bz-mono text-[11px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft size={12} />
        İşletme özetine dön
      </Link>
      <PageHeader
        eyebrow="İŞLETME AYARLARI"
        title={restaurant.name}
        description={`/r/${restaurant.slug}`}
        actions={
          <BusinessStatusBadge status={restaurant.isActive ? "active" : "disabled"} />
        }
      />
    </div>
  );

  return (
    <SettingsLayout
      tabs={SECTION_TABS}
      active={active}
      onChange={handleSectionChange}
      header={header}
      ariaLabel="İşletme ayarları bölümleri"
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
        id="integrations"
        active={active === "integrations"}
        eyebrow="03 — PLATFORM BAĞLANTILARI"
        title="Platform Bağlantıları"
        description="Yorum platformları, sosyal medya kanalları ve varsayılan yönlendirme."
        actions={
          <span className="text-[#737373]" aria-hidden="true">
            <Plug size={18} />
          </span>
        }
      >
        <BusinessIntegrationSettings
          restaurant={restaurant}
          locale={locale === "tr" ? "tr" : "en"}
          onSaved={handleSaved}
        />
        <div className="mt-6">
          <PlatformRedirectsPanel
            restaurantId={restaurant.id}
            locale={locale === "tr" ? "tr" : "en"}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        id="website"
        active={active === "website"}
        eyebrow="04 — WEB SİTESİ"
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
        eyebrow="05 — OPERASYONEL"
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
        eyebrow="06 — GÜVENLİK"
        title="Güvenlik & erişim"
        description="KVKK metni ve işletme aktiflik durumu."
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
        eyebrow="07 — TEHLİKELİ BÖLGE"
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
