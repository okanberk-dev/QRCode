"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { AlertBanner, Eyebrow, ProgressBar } from "@/components/ui";
import { SkBox } from "@/components/ui/skeletons/PageSkeleton";
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
  label: { tr: string; en: string };
}> = [
  { key: "logoUrl", label: { tr: "Logo", en: "Logo" } },
  { key: "faviconUrl", label: { tr: "Favicon", en: "Favicon" } },
  { key: "coverImageUrl", label: { tr: "Kapak görseli", en: "Cover image" } },
  { key: "primaryColor", label: { tr: "Birincil renk", en: "Primary colour" } },
  { key: "secondaryColor", label: { tr: "İkincil renk", en: "Secondary colour" } },
  { key: "accentColor", label: { tr: "Vurgu rengi", en: "Accent colour" } },
  { key: "accentFont", label: { tr: "Yazı tipi", en: "Font" } },
  { key: "slogan", label: { tr: "Slogan", en: "Tagline" } },
];

const COPY = {
  tr: {
    loadFailed: "Marka ayarları yüklenemedi.",
    imageOnly: "Sadece görsel dosyası yükleyebilirsiniz.",
    tooLarge: "Görsel 5 MB'dan büyük olamaz.",
    uploadFailed: "Görsel yüklenemedi. Lütfen tekrar deneyin.",
    saveFailed: "Kapak görseli kaydedilemedi.",
    removeFailed: "Kapak görseli kaldırılamadı.",
    coverUpdated: "Kapak görseli güncellendi.",
    coverRemoved: "Kapak görseli kaldırıldı.",
    completionTitle: "Marka profil tamamlanma",
    loading: "Yükleniyor…",
    complete: "Mükemmel! Tüm marka alanları dolu.",
    progress: (filled: number, total: number) =>
      `${filled} / ${total} alan dolu. Profili tamamla, müşterilerin daha güvenli hissetsin.`,
    missing: "Eksik:",
    coverTitle: "Kapak görseli",
    coverDesc: "16:9 oranında kapak görseli. Müşteri sayfanın üstünde gösterilir.",
    coverAlt: "Kapak görseli önizleme",
    notUploaded: "Henüz yüklenmedi",
    changeCover: "Kapağı değiştir",
    uploadCover: "Kapak yükle",
    removeCover: "Kapağı kaldır",
    fileHint: "JPG / PNG / WebP · 1600×900 önerilir · max 5 MB",
    refresh: "Tamamlanma yüzdesini yenile",
  },
  en: {
    loadFailed: "Could not load brand settings.",
    imageOnly: "Only image files can be uploaded.",
    tooLarge: "The image can't be larger than 5 MB.",
    uploadFailed: "The image couldn't be uploaded. Please try again.",
    saveFailed: "Couldn't save the cover image.",
    removeFailed: "Couldn't remove the cover image.",
    coverUpdated: "Cover image updated.",
    coverRemoved: "Cover image removed.",
    completionTitle: "Brand profile completion",
    loading: "Loading…",
    complete: "Great! Every brand field is filled in.",
    progress: (filled: number, total: number) =>
      `${filled} / ${total} fields filled. Complete your profile so customers feel more confident.`,
    missing: "Missing:",
    coverTitle: "Cover image",
    coverDesc: "16:9 cover image shown at the top of your customer page.",
    coverAlt: "Cover image preview",
    notUploaded: "Not uploaded yet",
    changeCover: "Change cover",
    uploadCover: "Upload cover",
    removeCover: "Remove cover",
    fileHint: "JPG / PNG / WebP · 1600×900 recommended · max 5 MB",
    refresh: "Refresh completion",
  },
};

/** API error bodies carry internal codes (`upload_failed`, `save_failed`…);
 *  show those as the localized fallback, pass human messages through. */
function humanError(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  return /^[a-z0-9_]+$/.test(raw.trim()) ? fallback : raw;
}

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
  const t = isTr ? COPY.tr : COPY.en;
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
          setCoverError(t.loadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // `t` only feeds the error copy — no refetch on a language change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, refreshTick]);

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setCoverError(t.imageOnly);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError(t.tooLarge);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(humanError(data.error, t.uploadFailed));
      // Persist immediately — kapak görseli için tek-tıkla flow.
      setSavingCover(true);
      const saveRes = await fetch("/api/settings/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, coverImageUrl: data.url }),
      });
      const saved = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(humanError(saved.error, t.saveFailed));
      setSnapshot((prev) =>
        prev ? { ...prev, coverImageUrl: saved.coverImageUrl ?? data.url } : prev,
      );
      setCoverSuccess(t.coverUpdated);
    } catch (err) {
      setCoverError(humanError((err as Error).message, t.uploadFailed));
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(humanError(data.error, t.removeFailed));
      setSnapshot((prev) => (prev ? { ...prev, coverImageUrl: null } : prev));
      setCoverSuccess(t.coverRemoved);
    } catch (err) {
      setCoverError(humanError((err as Error).message, t.removeFailed));
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
    ? COMPLETION_FIELDS.filter((f) => !snapshot[f.key]).map((f) => (isTr ? f.label.tr : f.label.en))
    : [];

  return (
    <div className="space-y-5">
      {/* 1. Profil tamamlanma */}
      <SettingsCard
        icon={<Sparkles size={18} />}
        title={t.completionTitle}
        description={
          loading ? (
            // Inline placeholder: the description renders inside a <p>.
            <span
              aria-hidden="true"
              className="inline-block h-3 w-44 max-w-full rounded bg-pn-line align-middle"
            />
          ) : completionPct === 100
              ? t.complete
              : t.progress(filledCount, COMPLETION_FIELDS.length)
        }
        actions={
          <div className="tabular-nums text-[12px] text-pn-ink">
            {loading ? "—" : `%${completionPct}`}
          </div>
        }
      >
        {loading ? (
          // Same shape as the progress bar + "missing" line below.
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">{t.loading}</span>
            <SkBox className="h-2 w-full rounded-full" />
            <SkBox className="h-3 w-56 max-w-full" />
          </div>
        ) : (
          <>
            <ProgressBar value={completionPct} />
            {missing.length > 0 && (
              <p className="mt-3 text-[13px] text-[#525252]">
                <span className="text-pn-ink font-medium">{t.missing}</span>{" "}
                {missing.join(" · ")}
              </p>
            )}
          </>
        )}
      </SettingsCard>

      {/* 2. Kapak görseli (bağımsız PUT) */}
      <SettingsCard
        icon={<ImageIcon size={18} />}
        title={t.coverTitle}
        description={t.coverDesc}
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

        {/* §38.238 — lg'de (1024-1279) sağ sütun ~76px'e sıkışıp "Kapak yükle"
              butonlarını kırpıyordu: sabit 320px shrink-0 önizleme + dar settings
              gövdesi. lg'de dikey yığ, xl'de tasarımdaki yan yana düzen geri. */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4">
          <div
            className="relative shrink-0 w-full sm:w-[320px] lg:w-full xl:w-[320px] overflow-hidden"
            style={{
              aspectRatio: "16 / 9",
              borderRadius: 12,
              background: "#F5F5F8",
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
                alt={t.coverAlt}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#A3A3A3]">
                <ImageIcon size={22} strokeWidth={2} />
                <span className="text-[12px]">{t.notUploaded}</span>
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
              {snapshot?.coverImageUrl ? t.changeCover : t.uploadCover}
            </button>
            {snapshot?.coverImageUrl && (
              <button
                type="button"
                onClick={handleRemoveCover}
                disabled={savingCover}
                className="bz-btn-danger bz-btn-sm self-start disabled:opacity-50"
              >
                <X size={12} strokeWidth={2} aria-hidden="true" />
                {t.removeCover}
              </button>
            )}
            <p className="text-[12px] text-[#A3A3A3] leading-[1.55] mt-1">
              {t.fileHint}
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
          className="text-[12px] text-[#737373] hover:text-pn-ink transition-colors"
        >
          {t.refresh}
        </button>
      </div>
    </div>
  );
}

export default BusinessBrandSettings;
