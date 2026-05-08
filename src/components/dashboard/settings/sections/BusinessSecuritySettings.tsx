"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { AlertBanner, Badge, APSwitch } from "@/components/ui";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";

interface RestaurantData {
  id: string;
  isActive: boolean;
}

interface BusinessSecuritySettingsProps {
  restaurant: RestaurantData;
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
 * Tek alt-bölüm: İşletmeyi devre dışı bırak (isActive APSwitch).
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
  onSaved,
}: BusinessSecuritySettingsProps) {
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
  }, [restaurant]);

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
        throw new Error(data?.error || "Kaydedilemedi");
      }
      setInitial(form);
      setSuccess("Güvenlik ayarları güncellendi.");
      onSaved?.(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
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
        title="İşletmeyi devre dışı bırak"
        description="Devre dışıyken müşteri sayfası kapalı görünür. Geri alınabilir."
        actions={
          <Badge kind={form.isActive ? "ok" : "danger"}>
            {form.isActive ? "Aktif" : "Devre dışı"}
          </Badge>
        }
      >
        <div className="flex items-center gap-3">
          <APSwitch
            checked={form.isActive}
            onChange={(next) => set("isActive", next)}
            ariaLabel="İşletme aktif"
          />
          <span className="text-[13px]">
            {form.isActive ? "İşletme aktif" : "İşletme devre dışı"}
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
      />
    </div>
  );
}

export default BusinessSecuritySettings;
