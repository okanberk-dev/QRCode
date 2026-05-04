"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Globe, Info, Loader2, Phone, Pin } from "lucide-react";
import {
  AlertBanner,
  BusinessStatusBadge,
  Field,
  PlatformChip,
  Toggle,
  type PlatformId,
} from "@/components/ui";
import { SECTORS, getSectorByLabel } from "@/lib/sectors";
import { getSectorPlatforms } from "@/lib/sector-platforms";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";

interface RestaurantData {
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
  /** Phase 8c+ §38.26 — Owner-tanımlı hedef puan, Analytics 14-haftalık trend
   *  chart için. null = henüz ayarlanmadı (chart 4.0 fallback). */
  targetRating: number | null;
}

interface BusinessGeneralSettingsProps {
  restaurant: RestaurantData;
  /** Notify parent when category changes (Section 3 platform list re-renders). */
  onCategoryChange?: (category: string) => void;
  /** Optional: parent receives the freshly persisted snapshot after save. */
  onSaved?: (next: RestaurantData) => void;
}

const DESCRIPTION_MAX = 280;
const NAME_MAX = 120;

interface FormState {
  name: string;
  slug: string;
  category: string;
  description: string;
  website: string;
  address: string;
  city: string;
  phone: string;
  googlePlaceId: string;
  notificationEmail: string;
  isActive: boolean;
  /** Empty string = "henüz ayarlanmadı" (DB null). Number-string parse save'de. */
  targetRating: string;
}

function toForm(r: RestaurantData): FormState {
  return {
    name: r.name ?? "",
    slug: r.slug ?? "",
    category: r.category ?? "Restoran",
    description: r.description ?? "",
    website: r.website ?? "",
    address: r.address ?? "",
    city: r.city ?? "",
    phone: r.phone ?? "",
    googlePlaceId: r.googlePlaceId ?? "",
    notificationEmail: r.notificationEmail ?? "",
    isActive: r.isActive ?? true,
    targetRating:
      typeof r.targetRating === "number" ? r.targetRating.toFixed(1) : "",
  };
}

function isDirty(a: FormState, b: FormState) {
  return (Object.keys(a) as (keyof FormState)[]).some((k) => a[k] !== b[k]);
}

/**
 * Section 1 — İşletmenin temel bilgileri (Genel Bilgiler).
 *
 * Field'lar tek bir `<form>` içinde, sticky `<UnsavedChangesBar>` `dirty`
 * olduğunda görünür. Kategori değişimi parent'a iletilir → Section 3'ün
 * platform listesi sektör whitelist'ine göre anında re-render olur.
 */
export function BusinessGeneralSettings({
  restaurant,
  onCategoryChange,
  onSaved,
}: BusinessGeneralSettingsProps) {
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Sync when parent passes a fresh restaurant prop (e.g. switcher change).
  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  }, [restaurant]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    if (success) setSuccess(null);
    if (key === "category" && typeof value === "string" && onCategoryChange) {
      onCategoryChange(value);
    }
  };

  const visiblePlatforms = useMemo<PlatformId[]>(() => {
    const allowed = getSectorPlatforms(form.category);
    return Array.from(allowed) as PlatformId[];
  }, [form.category]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "İşletme adı zorunlu.";
    else if (form.name.length > NAME_MAX) next.name = `En fazla ${NAME_MAX} karakter.`;
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      next.slug = "Sadece küçük harf, rakam ve tire kullanılabilir.";
    }
    if (form.description.length > DESCRIPTION_MAX) {
      next.description = `En fazla ${DESCRIPTION_MAX} karakter.`;
    }
    if (form.website.trim()) {
      try {
        const u = new URL(form.website.trim());
        if (!/^https?:$/.test(u.protocol)) next.website = "http(s):// ile başlamalı.";
      } catch {
        next.website = "Geçerli bir URL girin.";
      }
    }
    if (form.notificationEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.notificationEmail.trim())) {
      next.notificationEmail = "Geçerli bir e-posta girin.";
    }
    // Phase 8c+ §38.26 — targetRating range validation (1.0–5.0).
    const targetRaw = form.targetRating.trim();
    if (targetRaw) {
      const parsed = Number(targetRaw.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
        next.targetRating = "Hedef puan 1.0 – 5.0 arasında olmalı.";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) {
      setError("Lütfen alanları kontrol edin.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Phase 8c+ §38.26 — boş input → null (henüz ayarlanmadı), aksi halde
      // 1.0–5.0 arası float (validate guard zaten çalıştı).
      const targetRaw = form.targetRating.trim();
      const targetRatingValue = targetRaw
        ? Math.round(Number(targetRaw.replace(',', '.')) * 10) / 10
        : null;

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        category: form.category,
        description: form.description.trim().slice(0, DESCRIPTION_MAX) || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        googlePlaceId: form.googlePlaceId.trim() || null,
        notificationEmail: form.notificationEmail.trim() || null,
        isActive: form.isActive,
        targetRating: targetRatingValue,
      };
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Kaydedilemedi.");
      }
      const updated = await res.json();
      setInitial(form);
      setSuccess("Kaydedildi. Genel bilgiler güncellendi.");
      onSaved?.({
        ...restaurant,
        ...payload,
        ...updated,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  const sectorOption = useMemo(() => getSectorByLabel(form.category), [form.category]);
  const descCount = form.description.length;
  const descNearLimit = descCount >= DESCRIPTION_MAX * 0.9;

  return (
    <div className="space-y-5">
      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {success && <AlertBanner kind="success">{success}</AlertBanner>}

      <SettingsCard
        icon={<Building2 size={18} />}
        title="Kimlik"
        description="Müşteri sayfanda ve panelde görünen temel bilgiler."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="İşletme adı" required error={fieldErrors.name}>
            <input
              className="bz-input"
              type="text"
              value={form.name}
              maxLength={NAME_MAX}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="organization"
              required
            />
          </Field>
          <Field
            label="URL slug"
            hint={`/r/${form.slug || "..."} — değiştirirsen QR linkleri tazelenir.`}
            error={fieldErrors.slug}
          >
            <input
              className="bz-input bz-mono"
              type="text"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
            />
          </Field>
          <Field label="Sektör">
            <select
              className="bz-input"
              value={sectorOption?.id ?? "diger"}
              onChange={(e) => {
                const opt = SECTORS.find((s) => s.id === e.target.value);
                if (opt) set("category", opt.label);
              }}
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display.tr}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Kısa açıklama"
            hint={`${descCount}/${DESCRIPTION_MAX} karakter — public sayfada görünür.`}
            error={fieldErrors.description}
          >
            <textarea
              className="bz-input"
              rows={3}
              value={form.description}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
              style={{ resize: "vertical", minHeight: 76 }}
              aria-describedby={descNearLimit ? "desc-near-limit" : undefined}
            />
          </Field>
        </div>

        {visiblePlatforms.length > 0 && (
          <div
            className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-[10px]"
            style={{ background: "#FAFAFA", border: "1px solid #EDEDED" }}
          >
            <Info size={14} className="shrink-0 mt-0.5 text-[#737373]" aria-hidden="true" />
            <div className="min-w-0">
              <span className="text-[12px] text-[#525252]">
                Bu sektörde görünecek platformlar:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {visiblePlatforms.map((pid) => (
                  <PlatformChip key={pid} id={pid} size={16} withLabel />
                ))}
              </div>
            </div>
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        icon={<Phone size={18} />}
        title="İletişim ve adres"
        description="Müşterilerin sana ulaşması için kullanılacak bilgiler."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telefon" error={fieldErrors.phone}>
            <input
              className="bz-input"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel"
              placeholder="+90 ..."
            />
          </Field>
          <Field label="Bildirim e-postası" error={fieldErrors.notificationEmail}>
            <input
              className="bz-input"
              type="email"
              value={form.notificationEmail}
              onChange={(e) => set("notificationEmail", e.target.value)}
              autoComplete="email"
              placeholder="bildirim@isletmem.com"
            />
          </Field>
          <Field label="Adres">
            <input
              className="bz-input"
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              autoComplete="street-address"
            />
          </Field>
          <Field label="Şehir">
            <input
              className="bz-input"
              type="text"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Globe size={18} />}
        title="Web ve haritalar"
        description="İşletmenin web kimliği ve Google Haritalar konumu."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Web sitesi"
            hint="https:// ile başlamalı."
            error={fieldErrors.website}
          >
            <input
              className="bz-input"
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://isletmem.com"
              autoComplete="url"
            />
          </Field>
          <Field
            label="Google Maps / Place ID"
            hint="Google profil URL'i veya yer (place) kimliği."
          >
            <input
              className="bz-input bz-mono"
              type="text"
              value={form.googlePlaceId}
              onChange={(e) => set("googlePlaceId", e.target.value)}
              placeholder="ChIJ... veya https://maps.app.goo.gl/..."
            />
          </Field>
        </div>
      </SettingsCard>

      {/* Phase 8c+ §38.26 — Owner-tanımlı hedef puan. Analytics 14-haftalık
          trend chart'ında dashed line + delta to target hint için. */}
      <SettingsCard
        icon={<Pin size={18} />}
        title="Performans hedefi"
        description="Analytics 14-haftalık trend grafiğinde hedef puan çizgisi olarak görünür. Ayarlamazsan 4.0 endüstri ortalaması kullanılır."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Hedef ortalama puan"
            error={fieldErrors.targetRating}
            hint="1.0 – 5.0 arası (örn. 4.5). Boş bırakırsan 4.0 fallback."
          >
            <input
              className="bz-input"
              type="text"
              inputMode="decimal"
              value={form.targetRating}
              maxLength={4}
              onChange={(e) => set("targetRating", e.target.value)}
              placeholder="4.5"
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Pin size={18} />}
        title="Durum"
        description="Pasif yaparsan müşteri /r/<slug> sayfası 'aktif değil' uyarısı gösterir."
        actions={
          <BusinessStatusBadge status={form.isActive ? "active" : "disabled"} />
        }
      >
        <div className="flex items-center gap-3">
          <Toggle
            checked={form.isActive}
            onChange={(next) => set("isActive", next)}
            ariaLabel="İşletme aktif"
          />
          <span className="text-[13px] text-[#0A0A0A]">
            {form.isActive ? "İşletme aktif" : "İşletme devre dışı"}
          </span>
        </div>
        {!form.isActive && (
          <p className="text-[12.5px] text-[#92400E] mt-3">
            Devre dışı: yorum kabul edilmez, müşteri sayfası kapalı görünür.
          </p>
        )}
      </SettingsCard>

      <UnsavedChangesBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        error={error}
        success={dirty ? null : success}
      />

      {saving && (
        <div className="sr-only" aria-live="polite">
          <Loader2 aria-hidden="true" />
          Kaydediliyor
        </div>
      )}
    </div>
  );
}

export default BusinessGeneralSettings;
