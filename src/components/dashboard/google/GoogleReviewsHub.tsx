"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, ShieldCheck, Star, Store } from "lucide-react";
import { AlertBanner, PageHeader } from "@/components/ui";
import { GoogleBusinessIntegrationPanel } from "@/components/dashboard/settings/sections/GoogleBusinessIntegrationPanel";

interface RestaurantSummary {
  id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
  googleEnabled?: boolean;
  googleReviewManagementEnabled?: boolean;
  isActive?: boolean;
}

interface GoogleReviewsHubProps {
  locale: "tr" | "en";
  adminMode?: boolean;
}

export function GoogleReviewsHub({ locale, adminMode = false }: GoogleReviewsHubProps) {
  const isTr = locale === "tr";
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/restaurants?status=all&limit=100");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "İşletmeler yüklenemedi.");
        const rows = (Array.isArray(data?.data) ? data.data : []) as RestaurantSummary[];
        if (cancelled) return;
        setRestaurants(rows);
        setSelectedId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : rows[0]?.id ?? null));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "İşletmeler yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? null,
    [restaurants, selectedId],
  );

  const handleGoogleLinkSelected = (next: {
    googlePlaceId: string | null;
    googleReviewUrl: string | null;
    googleEnabled: boolean;
  }) => {
    if (!selected) return;
    setRestaurants((prev) =>
      prev.map((restaurant) =>
        restaurant.id === selected.id
          ? {
              ...restaurant,
              googlePlaceId: next.googlePlaceId,
              googleReviewUrl: next.googleReviewUrl,
              googleEnabled: next.googleEnabled,
            }
          : restaurant,
      ),
    );
  };

  const emptyTitle = adminMode
    ? isTr ? "Henüz işletme yok" : "No businesses yet"
    : isTr ? "Henüz işletmen yok" : "No businesses yet";

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-5 py-6 sm:px-7 lg:py-8">
      <PageHeader
        eyebrow={isTr ? "GOOGLE İŞLETME" : "GOOGLE BUSINESS"}
        title={isTr ? "Google yorumları" : "Google reviews"}
        description={
          isTr
            ? "Google işletme bağlantısını, Business Profile konumunu ve gelen yorum cevaplarını tek ekrandan yönet."
            : "Manage Google business linking, Business Profile location selection, and review replies from one place."
        }
        actions={
          selected && adminMode ? (
            <Link
              href={`/admin/restaurants/${selected.id}`}
              className="bz-btn-ghost inline-flex items-center gap-1.5 rounded-full text-[12px]"
            >
              <ShieldCheck size={13} />
              {isTr ? "Yetkiyi yönet" : "Manage access"}
            </Link>
          ) : null
        }
      />

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}

      {loading ? (
        <div className="bz-card flex items-center justify-center gap-2 p-12 text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? "Google alanı hazırlanıyor..." : "Preparing Google workspace..."}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="bz-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#0A0A0A]">
            <Store size={20} />
          </div>
          <h2 className="bz-h-tight mt-4 text-[18px]">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#737373]">
            {isTr
              ? "Google yorum yönetimi için önce en az bir işletme oluşturulmalı."
              : "Create at least one business before managing Google reviews."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            <div className="rounded-[24px] border border-[#EDEDED] bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 px-1">
                <Star size={14} className="text-[#0A0A0A]" />
                <p className="pulse-eyebrow text-[#737373]">
                  {isTr ? "İşletme seç" : "Select business"}
                </p>
              </div>
              <div className="space-y-2">
                {restaurants.map((restaurant) => {
                  const active = restaurant.id === selected?.id;
                  const enabled = restaurant.googleReviewManagementEnabled === true;
                  return (
                    <button
                      type="button"
                      key={restaurant.id}
                      onClick={() => setSelectedId(restaurant.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                          : "border-[#EDEDED] bg-[#FAFAFA] text-[#0A0A0A] hover:border-[#D4D4D4] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{restaurant.name}</p>
                          <p className={`mt-1 truncate text-[11px] ${active ? "text-white/65" : "text-[#737373]"}`}>
                            {restaurant.city || restaurant.address || restaurant.slug || restaurant.category}
                          </p>
                        </div>
                        <span
                          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                            enabled ? "bg-[#C6F24E]" : active ? "bg-white/35" : "bg-[#A3A3A3]"
                          }`}
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected ? (
              <div className="rounded-[24px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <p className="pulse-eyebrow text-[#737373]">{isTr ? "Durum" : "Status"}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">
                  {selected.googleReviewManagementEnabled
                    ? isTr
                      ? "Google yorum yönetimi bu işletme için açık."
                      : "Google review management is enabled for this business."
                    : isTr
                      ? "Google yorum yönetimi admin tarafından açılmalı. Places linki yine bağlanabilir."
                      : "Google review management must be enabled by an admin. Places linking still works."}
                </p>
                {selected.googleReviewUrl ? (
                  <a
                    href={selected.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] underline-offset-4"
                  >
                    <ExternalLink size={12} />
                    {isTr ? "Yorum linkini aç" : "Open review link"}
                  </a>
                ) : null}
              </div>
            ) : null}
          </aside>

          {selected ? (
            <GoogleBusinessIntegrationPanel
              key={selected.id}
              restaurant={{
                id: selected.id,
                name: selected.name,
                category: selected.category ?? undefined,
                address: selected.address ?? null,
                city: selected.city ?? null,
                googlePlaceId: selected.googlePlaceId ?? null,
                googleReviewUrl: selected.googleReviewUrl ?? null,
              }}
              locale={locale}
              dirty={false}
              onGoogleLinkSelected={handleGoogleLinkSelected}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default GoogleReviewsHub;
