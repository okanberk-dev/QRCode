"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { AlertBanner, Field, Toggle } from "@/components/ui";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";

interface RestaurantData {
  id: string;
  workingHours: string | null;
  temporarilyClosed: boolean;
  closedReason: string | null;
}

interface BusinessOperationalSettingsProps {
  restaurant: RestaurantData;
  onSaved?: (partial: Partial<RestaurantData>) => void;
}

interface FormState {
  workingHours: string;
  temporarilyClosed: boolean;
  closedReason: string;
}

const REASON_MAX = 500;

function toForm(r: RestaurantData): FormState {
  return {
    workingHours: r.workingHours ?? "",
    temporarilyClosed: r.temporarilyClosed,
    closedReason: r.closedReason ?? "",
  };
}

function isDirty(a: FormState, b: FormState) {
  return (
    a.workingHours !== b.workingHours ||
    a.temporarilyClosed !== b.temporarilyClosed ||
    a.closedReason !== b.closedReason
  );
}

/**
 * Section 7 — Operasyonel ayarlar (Faz 3).
 *
 * Field'lar:
 *  - workingHours (tek string, "08:00-22:00") — gün-bazlı V2
 *  - temporarilyClosed (Bool) + closedReason (String ≤500)
 *
 * Sipariş kabulü / rezervasyon kabulü / otomatik onay toggle'ları placeholder
 * (schema migration V2). UI iskelesi kuruldu — backend hazır olduğunda enable.
 */
export function BusinessOperationalSettings({
  restaurant,
  onSaved,
}: BusinessOperationalSettingsProps) {
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);

  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    setHoursError(null);
    setError(null);
    setSuccess(null);
  }, [restaurant]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(null);
    if (key === "workingHours") setHoursError(null);
  };

  const validate = (): boolean => {
    if (form.workingHours.trim() && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(form.workingHours.trim())) {
      setHoursError("Format: 08:00-22:00");
      return false;
    }
    return true;
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
      const payload: Partial<RestaurantData> = {
        workingHours: form.workingHours.trim() || null,
        temporarilyClosed: form.temporarilyClosed,
        closedReason: form.closedReason.trim().slice(0, REASON_MAX) || null,
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
      setInitial(form);
      setSuccess("Operasyonel ayarlar güncellendi.");
      onSaved?.(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    setHoursError(null);
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

      <SettingsCard
        icon={<Clock size={18} />}
        title="Çalışma saatleri"
        description="Müşteriye basit bir saat aralığı göster. Detaylı haftalık takvim yakında."
      >
        <Field
          label="Saat aralığı"
          hint="Örn: 08:00-22:00. Boş bırakırsan müşteri sayfasında saat görünmez."
          error={hoursError ?? undefined}
        >
          <input
            className="bz-input bz-mono"
            type="text"
            value={form.workingHours}
            placeholder="08:00-22:00"
            onChange={(e) => set("workingHours", e.target.value)}
          />
        </Field>
        <div
          className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-[10px]"
          style={{ background: "#FAFAFA", border: "1px solid #EDEDED" }}
        >
          <Info size={14} className="shrink-0 mt-0.5 text-[#737373]" aria-hidden="true" />
          <span className="text-[12px] text-[#525252]">
            Detaylı haftalık takvim (gün-bazlı açılış/kapanış) yakında V2&apos;de gelecek.
          </span>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<AlertTriangle size={18} />}
        title="Geçici olarak kapalı"
        description="Renovasyon, tatil veya beklenmedik durumlarda işletmeyi geçici kapat."
      >
        <div className="flex items-center gap-3">
          <Toggle
            checked={form.temporarilyClosed}
            onChange={(next) => set("temporarilyClosed", next)}
            ariaLabel="Geçici kapalı"
          />
          <span className="text-[13px] text-[#0A0A0A]">
            {form.temporarilyClosed ? "Geçici olarak kapalı" : "Açık"}
          </span>
        </div>
        {form.temporarilyClosed && (
          <div className="mt-4">
            <Field
              label="Kapatma sebebi"
              hint={`${form.closedReason.length}/${REASON_MAX} karakter — public sayfada görünür.`}
            >
              <textarea
                className="bz-input"
                rows={3}
                value={form.closedReason}
                maxLength={REASON_MAX}
                onChange={(e) => set("closedReason", e.target.value.slice(0, REASON_MAX))}
                placeholder="Yıllık tatildeyiz, 15 Ekim'de tekrar açıyoruz."
                style={{ resize: "vertical", minHeight: 76 }}
              />
            </Field>
          </div>
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
    </div>
  );
}

export default BusinessOperationalSettings;
