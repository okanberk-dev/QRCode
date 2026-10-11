"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Globe, Info, Loader2, Phone, Pin } from "lucide-react";
import {
  AlertBanner,
  Field,
  PlatformChip,
  PulseSelect,
  type PlatformId,
} from "@/components/ui";
import { SECTORS, getSectorByLabel } from "@/lib/sectors";
import { getSectorPlatforms } from "@/lib/sector-platforms";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";
import { restaurantSaveErrorMessage } from "../restaurant-status";

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
  /** Review link (Platform links / Places search). Shown in the Google field
   *  when no Place ID is stored, so a linked business doesn't look unlinked. */
  googleReviewUrl?: string | null;
  notificationEmail: string | null;
  /** Phase 8c+ §38.26 — Owner-tanımlı hedef puan, Analytics 14-haftalık trend
   *  chart için. null = henüz ayarlanmadı (chart 4.0 fallback). */
  targetRating: number | null;
}

interface BusinessGeneralSettingsProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
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
  /** Empty string = "henüz ayarlanmadı" (DB null). Number-string parse save'de. */
  targetRating: string;
}

/** Google field value: stored Place ID → `placeid` from the review link →
 *  the review link itself. */
function googleInputFrom(r: RestaurantData): string {
  if (r.googlePlaceId?.trim()) return r.googlePlaceId;
  const url = r.googleReviewUrl?.trim();
  if (!url) return "";
  try {
    const placeId = new URL(url).searchParams.get("placeid");
    if (placeId) return placeId;
  } catch {
    /* not a URL — show as stored */
  }
  return url;
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
    googlePlaceId: googleInputFrom(r),
    notificationEmail: r.notificationEmail ?? "",
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
 * olduğunda görünür. Sektör değişimi yalnız local form state'ini günceller;
 * parent kaydetten sonra `onSaved` ile haberdar olur.
 *
 * Aktiflik durumu (isActive) bilinçli olarak burada YOK — tek kontrol
 * Güvenlik sekmesinde. Bu form da `isActive` gönderiyordu; başka sekmede
 * yapılan devre dışı bırakma, burada eski değerle kaydedilince geri açılıyordu.
 */
export function BusinessGeneralSettings({
  restaurant,
  locale = "tr",
  onSaved,
}: BusinessGeneralSettingsProps) {
  const isTr = locale !== "en";
  const t = isTr ? COPY.tr : COPY.en;
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Resync ONLY when a different business is loaded. Keying on the object
  // re-ran after every parent merge (our own onSaved, another section's
  // save), which wiped unsaved edits and the "Kaydedildi" confirmation.
  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    if (success) setSuccess(null);
  };

  const visiblePlatforms = useMemo<PlatformId[]>(() => {
    const allowed = getSectorPlatforms(form.category);
    return Array.from(allowed) as PlatformId[];
  }, [form.category]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = t.nameRequired;
    else if (form.name.length > NAME_MAX) next.name = t.maxChars(NAME_MAX);
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      next.slug = t.slugInvalid;
    }
    if (form.description.length > DESCRIPTION_MAX) {
      next.description = t.maxChars(DESCRIPTION_MAX);
    }
    if (form.website.trim()) {
      try {
        const u = new URL(form.website.trim());
        if (!/^https?:$/.test(u.protocol)) next.website = t.websiteProtocol;
      } catch {
        next.website = t.urlInvalid;
      }
    }
    if (form.notificationEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.notificationEmail.trim())) {
      next.notificationEmail = t.emailInvalid;
    }
    // Phase 8c+ §38.26 — targetRating range validation (1.0–5.0).
    const targetRaw = form.targetRating.trim();
    if (targetRaw) {
      const parsed = Number(targetRaw.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
        next.targetRating = t.targetRange;
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) {
      setError(t.checkFields);
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
        notificationEmail: form.notificationEmail.trim() || null,
        targetRating: targetRatingValue,
        // Google is sent only when the owner edited it: the field may be
        // showing the existing review link, and re-sending it on every save
        // would rewrite that link. Clearing the field removes the link.
        ...(form.googlePlaceId.trim() !== initial.googlePlaceId.trim()
          ? form.googlePlaceId.trim()
            ? { googlePlaceId: form.googlePlaceId.trim() }
            : { googlePlaceId: null, googleReviewUrl: null }
          : {}),
      };
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(restaurantSaveErrorMessage(data, locale, t.saveFailed));
      }
      const updated = await res.json();
      setInitial(form);
      setSuccess(t.saved);
      onSaved?.({
        ...restaurant,
        ...payload,
        ...updated,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.saveFailed;
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
        title={t.identityTitle}
        description={t.identityDesc}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.name} required error={fieldErrors.name}>
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
            label={t.slug}
            hint={t.slugHint(form.slug || "...")}
            error={fieldErrors.slug}
          >
            <input
              className="bz-input bz-mono"
              type="text"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          <Field label={t.sector}>
            <PulseSelect
              value={sectorOption?.id ?? "diger"}
              onChange={(value) => {
                const opt = SECTORS.find((s) => s.id === value);
                if (opt) set("category", opt.label);
              }}
              options={SECTORS.map((s) => ({ value: s.id, label: isTr ? s.display.tr : s.display.en }))}
              ariaLabel={t.sector}
            />
          </Field>
          <Field
            label={t.description}
            hint={t.descHint(descCount, DESCRIPTION_MAX)}
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
              <span className="text-[12px] text-[#525252]">{t.sectorPlatforms}</span>
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
        title={t.contactTitle}
        description={t.contactDesc}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.phone} error={fieldErrors.phone}>
            <input
              className="bz-input"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="next"
              placeholder="+90 ..."
            />
          </Field>
          <Field label={t.notificationEmail} error={fieldErrors.notificationEmail}>
            <input
              className="bz-input"
              type="email"
              value={form.notificationEmail}
              onChange={(e) => set("notificationEmail", e.target.value)}
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t.emailPlaceholder}
            />
          </Field>
          <Field label={t.address}>
            <input
              className="bz-input"
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              autoComplete="street-address"
            />
          </Field>
          <Field label={t.city}>
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
        title={t.webTitle}
        description={t.webDesc}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.website} hint={t.websiteHint} error={fieldErrors.website}>
            <input
              className="bz-input"
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder={t.websitePlaceholder}
              autoComplete="url"
            />
          </Field>
          <Field label={t.placeId} hint={t.placeIdHint}>
            <input
              className="bz-input bz-mono"
              type="text"
              value={form.googlePlaceId}
              onChange={(e) => set("googlePlaceId", e.target.value)}
              placeholder={t.placeIdPlaceholder}
            />
          </Field>
        </div>
      </SettingsCard>

      {/* Phase 8c+ §38.26 — Owner-tanımlı hedef puan. Analytics 14-haftalık
          trend chart'ında dashed line + delta to target hint için. */}
      <SettingsCard
        icon={<Pin size={18} />}
        title={t.targetTitle}
        description={t.targetDesc}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.targetLabel} error={fieldErrors.targetRating} hint={t.targetHint}>
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

      <UnsavedChangesBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        error={error}
        success={dirty ? null : success}
        locale={locale}
      />

      {saving && (
        <div className="sr-only" aria-live="polite">
          <Loader2 aria-hidden="true" />
          {t.saving}
        </div>
      )}
    </div>
  );
}

const COPY = {
  tr: {
    nameRequired: "İşletme adı zorunlu.",
    maxChars: (n: number) => `En fazla ${n} karakter.`,
    slugInvalid: "Sadece küçük harf, rakam ve tire kullanılabilir.",
    websiteProtocol: "http(s):// ile başlamalı.",
    urlInvalid: "Geçerli bir URL girin.",
    emailInvalid: "Geçerli bir e-posta girin.",
    targetRange: "Hedef puan 1.0 – 5.0 arasında olmalı.",
    checkFields: "Lütfen alanları kontrol edin.",
    saveFailed: "Kaydedilemedi.",
    saved: "Kaydedildi. Genel bilgiler güncellendi.",
    saving: "Kaydediliyor",
    identityTitle: "Kimlik",
    identityDesc: "Müşteri sayfanda ve panelde görünen temel bilgiler.",
    name: "İşletme adı",
    slug: "Sayfa adresi",
    slugHint: (slug: string) => `/r/${slug} — değiştirirsen QR linkleri tazelenir.`,
    sector: "Sektör",
    description: "Kısa açıklama",
    descHint: (n: number, max: number) => `${n}/${max} karakter — müşteri sayfasında görünür.`,
    sectorPlatforms: "Bu sektörde görünecek platformlar:",
    contactTitle: "İletişim ve adres",
    contactDesc: "Müşterilerin sana ulaşması için kullanılacak bilgiler.",
    phone: "Telefon",
    notificationEmail: "Bildirim e-postası",
    emailPlaceholder: "bildirim@isletmem.com",
    address: "Adres",
    city: "Şehir",
    webTitle: "Web ve haritalar",
    webDesc: "İşletmenin web kimliği ve Google Haritalar konumu.",
    website: "Web sitesi",
    websiteHint: "https:// ile başlamalı.",
    websitePlaceholder: "https://isletmem.com",
    placeId: "Google Maps / Place ID",
    placeIdHint: "Google profil URL'i veya yer (place) kimliği.",
    placeIdPlaceholder: "ChIJ... veya https://maps.app.goo.gl/...",
    targetTitle: "Performans hedefi",
    targetDesc:
      "Analitik sayfasındaki 14 haftalık trend grafiğinde hedef puan çizgisi olarak görünür. Ayarlamazsan 4.0 endüstri ortalaması kullanılır.",
    targetLabel: "Hedef ortalama puan",
    targetHint: "1.0 – 5.0 arası (örn. 4.5). Boş bırakırsan 4.0 kullanılır.",
  },
  en: {
    nameRequired: "Business name is required.",
    maxChars: (n: number) => `At most ${n} characters.`,
    slugInvalid: "Use lowercase letters, numbers and hyphens only.",
    websiteProtocol: "Must start with http(s)://.",
    urlInvalid: "Enter a valid URL.",
    emailInvalid: "Enter a valid email.",
    targetRange: "Target rating must be between 1.0 and 5.0.",
    checkFields: "Please check the highlighted fields.",
    saveFailed: "Could not save.",
    saved: "Saved. General details updated.",
    saving: "Saving",
    identityTitle: "Identity",
    identityDesc: "Core details shown on your customer page and in the panel.",
    name: "Business name",
    slug: "URL slug",
    slugHint: (slug: string) => `/r/${slug} — changing it refreshes your QR links.`,
    sector: "Sector",
    description: "Short description",
    descHint: (n: number, max: number) => `${n}/${max} characters — shown on the public page.`,
    sectorPlatforms: "Platforms shown for this sector:",
    contactTitle: "Contact & address",
    contactDesc: "How customers reach you.",
    phone: "Phone",
    notificationEmail: "Notification email",
    emailPlaceholder: "alerts@mybusiness.com",
    address: "Address",
    city: "City",
    webTitle: "Web & maps",
    webDesc: "Your business website and Google Maps location.",
    website: "Website",
    websiteHint: "Must start with https://.",
    websitePlaceholder: "https://mybusiness.com",
    placeId: "Google Maps / Place ID",
    placeIdHint: "Google profile URL or place ID.",
    placeIdPlaceholder: "ChIJ... or https://maps.app.goo.gl/...",
    targetTitle: "Performance target",
    targetDesc:
      "Shown as the target line on the 14-week Analytics trend chart. If unset, the 4.0 industry average is used.",
    targetLabel: "Target average rating",
    targetHint: "Between 1.0 and 5.0 (e.g. 4.5). Leave empty for the 4.0 fallback.",
  },
};

export default BusinessGeneralSettings;
