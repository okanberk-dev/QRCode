"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { AlertBanner, Eyebrow, ProgressBar } from "@/components/ui";
import BrandIdentityCard from "@/components/dashboard/BrandIdentityCard";
import { compressImage } from "@/lib/client-image";
import { SettingsCard } from "../SettingsCard";

interface BusinessBrandSettingsProps {
  restaurantId: string;
  restaurantName: string;
  isTr?: boolean;
}

interface BrandSnapshot {
  logoUrl: string | null;
  faviconUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  accentFont: string | null;
  slogan: string | null;
}

const COMPLETION_FIELDS: Array<{
  key: keyof BrandSnapshot;
  label: string;
}> = [
  { key: "logoUrl", label: "Logo" },
  { key: "faviconUrl", label: "Favicon" },
  { key: "coverImageUrl", label: "Kapak görseli" },
  { key: "primaryColor", label: "Birincil renk" },
  { key: "secondaryColor", label: "İkincil renk" },
  { key: "accentColor", label: "Vurgu rengi" },
  { key: "accentFont", label: "Yazı tipi" },
  { key: "slogan", label: "Slogan" },
];

/**
 * Section 2 — Marka kimliği wrapper.
 *
 * Yapı:
 *  1. Profil tamamlanma `<ProgressBar>` (8 alan: logo + favicon + coverImage
 *     + 3 renk + font + slogan).
 *  2. "Kapak görseli" SettingsCard — bağımsız upload + PUT akışı (16:9).
 *  3. Mevcut `<BrandIdentityCard>` (logo + favicon + palette + font + slogan).
 *
 * Cover image için ayrı save — diğer brand alanlarına dokunmadan PUT atar.
 * BrandSettings tek source-of-truth; cover image dahil tüm alanlar
 * `/api/settings/brand?restaurantId=...` GET ile yüklenir.
 */
export function BusinessBrandSettings({
  restaurantId,
  restaurantName,
  isTr = true,
}: BusinessBrandSettingsProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<BrandSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverSuccess, setCoverSuccess] = useState<string | null>(null);

  // Re-trigger load after BrandIdentityCard saves (so completion progress refreshes).
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/settings/brand?restaurantId=${restaurantId}`);
        if (!res.ok) throw new Error("load_failed");
        const data = await res.json();
        if (cancelled) return;
        setSnapshot({
          logoUrl: data.logoUrl ?? null,
          faviconUrl: data.faviconUrl ?? null,
          coverImageUrl: data.coverImageUrl ?? null,
          primaryColor: data.primaryColor ?? null,
          secondaryColor: data.secondaryColor ?? null,
          accentColor: data.accentColor ?? null,
          accentFont: data.accentFont ?? null,
          slogan: data.slogan ?? null,
        });
      } catch {
        if (!cancelled) {
          setCoverError("Marka ayarları yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, refreshTick]);

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setCoverError("Sadece görsel dosyası yükleyebilirsiniz.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("Görsel 5 MB'dan büyük olamaz.");
      return;
    }
    setCoverError(null);
    setCoverSuccess(null);
    setUploadingCover(true);
    try {
      const compressed = await compressImage(file, { maxDim: 1600, quality: 0.85 });
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("kind", "cover");
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "upload_failed");
      // Persist immediately — kapak görseli için tek-tıkla flow.
      setSavingCover(true);
      const saveRes = await fetch("/api/settings/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, coverImageUrl: data.url }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || "save_failed");
      setSnapshot((prev) =>
        prev ? { ...prev, coverImageUrl: saved.coverImageUrl ?? data.url } : prev,
      );
      setCoverSuccess("Kapak görseli güncellendi.");
    } catch (err) {
      setCoverError((err as Error).message || "Yükleme başarısız.");
    } finally {
      setUploadingCover(false);
      setSavingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    setCoverError(null);
    setCoverSuccess(null);
    setSavingCover(true);
    try {
      const res = await fetch("/api/settings/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, coverImageUrl: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setSnapshot((prev) => (prev ? { ...prev, coverImageUrl: null } : prev));
      setCoverSuccess("Kapak görseli kaldırıldı.");
    } catch (err) {
      setCoverError((err as Error).message || "Kaldırma başarısız.");
    } finally {
      setSavingCover(false);
    }
  };

  const filledCount =
    snapshot != null
      ? COMPLETION_FIELDS.reduce(
          (acc, f) => acc + (snapshot[f.key] ? 1 : 0),
          0,
        )
      : 0;
  const completionPct = snapshot
    ? Math.round((filledCount / COMPLETION_FIELDS.length) * 100)
    : 0;
  const missing = snapshot
    ? COMPLETION_FIELDS.filter((f) => !snapshot[f.key]).map((f) => f.label)
    : [];

  return (
    <div className="space-y-5">
      {/* 1. Profil tamamlanma */}
      <SettingsCard
        icon={<Sparkles size={18} />}
        title="Marka profil tamamlanma"
        description={
          loading
            ? "Yükleniyor…"
            : completionPct === 100
              ? "Mükemmel! Tüm marka alanları dolu."
              : `${filledCount} / ${COMPLETION_FIELDS.length} alan dolu. Profili tamamla, müşterilerin daha güvenli hissetsin.`
        }
        actions={
          <div className="bz-mono text-[12px] text-[#0A0A0A]">
            {loading ? "—" : `%${completionPct}`}
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            Yükleniyor…
          </div>
        ) : (
          <>
            <ProgressBar value={completionPct} />
            {missing.length > 0 && (
              <p className="mt-3 text-[12.5px] text-[#525252]">
                <span className="text-[#0A0A0A] font-medium">Eksik:</span>{" "}
                {missing.join(" · ")}
              </p>
            )}
          </>
        )}
      </SettingsCard>

      {/* 2. Kapak görseli (bağımsız PUT) */}
      <SettingsCard
        icon={<ImageIcon size={18} />}
        title="Kapak görseli"
        description="16:9 oranında hero görsel. Public sayfanın üstünde gösterilir."
      >
        {coverError && (
          <div className="mb-3">
            <AlertBanner kind="danger" onDismiss={() => setCoverError(null)}>
              {coverError}
            </AlertBanner>
          </div>
        )}
        {coverSuccess && (
          <div className="mb-3">
            <AlertBanner kind="success" onDismiss={() => setCoverSuccess(null)}>
              {coverSuccess}
            </AlertBanner>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div
            className="relative shrink-0 w-full sm:w-[320px] overflow-hidden"
            style={{
              aspectRatio: "16 / 9",
              borderRadius: 12,
              background: "#FAFAFA",
              border: snapshot?.coverImageUrl ? "1px solid #EDEDED" : "1px dashed #D4D4D4",
            }}
          >
            {uploadingCover || savingCover ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-[#737373]" />
              </div>
            ) : snapshot?.coverImageUrl ? (
               
              <img
                src={snapshot.coverImageUrl}
                alt="Kapak görseli önizleme"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#A3A3A3]">
                <ImageIcon size={22} strokeWidth={2} />
                <span className="text-[11px]">Henüz yüklenmedi</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            <Eyebrow>{isTr ? "DOSYA" : "FILE"}</Eyebrow>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCoverUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover || savingCover}
              className="bz-btn-ghost inline-flex items-center gap-1.5 self-start"
            >
              <Upload size={14} strokeWidth={2} aria-hidden="true" />
              {snapshot?.coverImageUrl ? "Kapağı değiştir" : "Kapak yükle"}
            </button>
            {snapshot?.coverImageUrl && (
              <button
                type="button"
                onClick={handleRemoveCover}
                disabled={savingCover}
                className="bz-btn-danger bz-btn-sm self-start disabled:opacity-50"
              >
                <X size={12} strokeWidth={2} aria-hidden="true" />
                Kapağı kaldır
              </button>
            )}
            <p className="text-[11px] text-[#A3A3A3] leading-[1.55] mt-1">
              JPG / PNG / WebP · 1600×900 önerilir · max 5 MB
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* 3. Mevcut BrandIdentityCard (logo + favicon + palette + font + slogan) */}
      <BrandIdentityCard
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        isTr={isTr}
        key={refreshTick}
      />

      {/* Sneaky refresh — her BrandIdentityCard interaction sonrası completion bar'ı tazele.
          Şimdilik sayfa yeniden yüklenmediği için manuel "Yenile" butonu ekleyelim. */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="text-[12px] text-[#737373] hover:text-[#0A0A0A] transition-colors"
        >
          Tamamlanma yüzdesini yenile
        </button>
      </div>
    </div>
  );
}

export default BusinessBrandSettings;
