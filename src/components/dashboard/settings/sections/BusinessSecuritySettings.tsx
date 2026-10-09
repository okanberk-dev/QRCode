"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { AlertBanner, Badge, APSwitch } from "@/components/ui";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";
import {
  SuspendedByAdminNotice,
  isSuspendedByAdminError,
  restaurantSaveErrorMessage,
} from "../restaurant-status";

interface RestaurantData {
  id: string;
  isActive: boolean;
  /** Set when a superadmin paused the business — owner cannot reactivate. */
  suspendedByAdmin?: boolean;
}

interface BusinessSecuritySettingsProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
  onSaved?: (partial: Partial<RestaurantData>) => void;
}

interface FormState {
  isActive: boolean;
}

function toForm(r: RestaurantData): FormState {
  return { isActive: r.isActive };
}

function isDirty(a: FormState, b: FormState) {
  return a.isActive !== b.isActive;
}

/**
 * Section 8 — Güvenlik & Erişim.
 *
 * Tek alt-bölüm: İşletmeyi devre dışı bırak (isActive APSwitch). Panelde
 * aktiflik durumunu açıp kapatan tek kontrol budur (Genel sekmesindeki kopya
 * kaldırıldı; Tehlikeli bölge yalnız tek yönlü devre dışı bırakma sunar).
 *
 * Admin duraklatması (`suspendedByAdmin`) varken switch kilitlenir — owner
 * PUT `{ isActive: true }` zaten 403 `SUSPENDED_BY_ADMIN` döner.
 *
 * KVKK aydınlatma + açık rıza metinleri Buaze tarafından merkezi olarak
 * yönetilir (`LegalDocument` modeli + `/admin/legal-documents`); işletme
 * sahibi düzenlemez ve "metin eksik" uyarısı çıkmaz. Salt-okunur özet
 * `BusinessLegalSettings` bölümünde gösterilir.
 *
 * 2FA + Aktif Oturumlar + API Anahtarları kartları kullanıcı talebiyle
 * kaldırıldı (mevcut kullanıcı tabanına yakın değil; ileride bağımsız
 * feature olarak yeniden değerlendirilir). Backend endpoint'leri
 * (/api/account/2fa/*, /api/account/sessions, /api/api-keys) korundu;
 * component dosyaları silindi — yeniden bağlamak için git history.
 */
export function BusinessSecuritySettings({
  restaurant,
  locale = "tr",
  onSaved,
}: BusinessSecuritySettingsProps) {
  const t = locale === "en" ? COPY.en : COPY.tr;
  const suspended = restaurant.suspendedByAdmin === true;
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Resync on a different business or when another surface (Tehlikeli bölge)
  // changed `isActive` — not on every parent object identity change.
  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id, restaurant.isActive]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(null);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Partial<RestaurantData> = {
        isActive: form.isActive,
      };
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (isSuspendedByAdminError(data)) {
          // Our snapshot was stale (admin paused after load): drop the edit
          // and lock every status control via the parent.
          setForm(initial);
          onSaved?.({ suspendedByAdmin: true });
        }
        throw new Error(restaurantSaveErrorMessage(data, locale, t.saveFailed));
      }
      setInitial(form);
      setSuccess(t.saved);
      onSaved?.(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-5">
      {suspended && <SuspendedByAdminNotice locale={locale} />}
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>
          {success}
        </AlertBanner>
      )}

      {/* isActive */}
      <SettingsCard
        icon={<Lock size={18} />}
        title={t.cardTitle}
        description={t.cardDesc}
        actions={
          <Badge kind={form.isActive ? "ok" : "danger"}>
            {form.isActive ? t.badgeActive : t.badgeDisabled}
          </Badge>
        }
      >
        <div className="flex items-center gap-3">
          <APSwitch
            checked={form.isActive}
            onChange={(next) => set("isActive", next)}
            locked={suspended}
            ariaLabel={t.switchAria}
          />
          <span className="text-[13px]">
            {form.isActive ? t.stateActive : t.stateDisabled}
          </span>
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
    </div>
  );
}

const COPY = {
  tr: {
    saveFailed: "Kaydedilemedi.",
    saved: "Güvenlik ayarları güncellendi.",
    cardTitle: "İşletmeyi devre dışı bırak",
    cardDesc: "Devre dışıyken müşteri sayfası kapalı görünür. Geri alınabilir.",
    badgeActive: "Aktif",
    badgeDisabled: "Devre dışı",
    switchAria: "İşletme aktif",
    stateActive: "İşletme aktif",
    stateDisabled: "İşletme devre dışı",
  },
  en: {
    saveFailed: "Could not save.",
    saved: "Security settings updated.",
    cardTitle: "Disable business",
    cardDesc: "While disabled, the customer page shows as closed. You can undo this.",
    badgeActive: "Active",
    badgeDisabled: "Disabled",
    switchAria: "Business active",
    stateActive: "Business is active",
    stateDisabled: "Business is disabled",
  },
};

export default BusinessSecuritySettings;
