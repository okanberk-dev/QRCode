"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { AlertBanner, Field, APSwitch } from "@/components/ui";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";
import { restaurantSaveErrorMessage } from "../restaurant-status";

interface RestaurantData {
  id: string;
  workingHours: string | null;
  temporarilyClosed: boolean;
  closedReason: string | null;
}

interface BusinessOperationalSettingsProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
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
  locale = "tr",
  onSaved,
}: BusinessOperationalSettingsProps) {
  const t = locale === "en" ? COPY.en : COPY.tr;
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);

  // Resync only when another business is loaded — keying on the object made
  // our own onSaved (parent merge → new object) clear the success banner and
  // any other section's save wipe unsaved edits here.
  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    setHoursError(null);
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(null);
    if (key === "workingHours") setHoursError(null);
  };

  const validate = (): boolean => {
    if (form.workingHours.trim() && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(form.workingHours.trim())) {
      setHoursError(t.hoursFormat);
      return false;
    }
    return true;
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
        title={t.hoursTitle}
        description={t.hoursDesc}
      >
        <Field
          label={t.hoursLabel}
          hint={t.hoursHint}
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
          <span className="text-[12px] text-[#525252]">{t.hoursSoon}</span>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<AlertTriangle size={18} />}
        title={t.closedTitle}
        description={t.closedDesc}
      >
        <div className="flex items-center gap-3">
          <APSwitch
            checked={form.temporarilyClosed}
            onChange={(next) => set("temporarilyClosed", next)}
            ariaLabel={t.closedAria}
          />
          <span className="text-[13px] text-[#0A0A0A]">
            {form.temporarilyClosed ? t.closedOn : t.closedOff}
          </span>
        </div>
        {form.temporarilyClosed && (
          <div className="mt-4">
            <Field
              label={t.reasonLabel}
              hint={t.reasonHint(form.closedReason.length, REASON_MAX)}
            >
              <textarea
                className="bz-input"
                rows={3}
                value={form.closedReason}
                maxLength={REASON_MAX}
                onChange={(e) => set("closedReason", e.target.value.slice(0, REASON_MAX))}
                placeholder={t.reasonPlaceholder}
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
        locale={locale}
      />
    </div>
  );
}

const COPY = {
  tr: {
    hoursFormat: "Format: 08:00-22:00",
    checkFields: "Lütfen alanları kontrol edin.",
    saveFailed: "Kaydedilemedi.",
    saved: "Operasyonel ayarlar güncellendi.",
    hoursTitle: "Çalışma saatleri",
    hoursDesc: "Müşteriye basit bir saat aralığı göster. Detaylı haftalık takvim yakında.",
    hoursLabel: "Saat aralığı",
    hoursHint: "Örn: 08:00-22:00. Boş bırakırsan müşteri sayfasında saat görünmez.",
    hoursSoon: "Detaylı haftalık takvim (gün-bazlı açılış/kapanış) yakında gelecek.",
    closedTitle: "Geçici olarak kapalı",
    closedDesc: "Renovasyon, tatil veya beklenmedik durumlarda işletmeyi geçici kapat.",
    closedAria: "Geçici kapalı",
    closedOn: "Geçici olarak kapalı",
    closedOff: "Açık",
    reasonLabel: "Kapatma sebebi",
    reasonHint: (n: number, max: number) => `${n}/${max} karakter — müşteri sayfasında görünür.`,
    reasonPlaceholder: "Yıllık tatildeyiz, 15 Ekim'de tekrar açıyoruz.",
  },
  en: {
    hoursFormat: "Format: 08:00-22:00",
    checkFields: "Please check the highlighted fields.",
    saveFailed: "Could not save.",
    saved: "Operational settings updated.",
    hoursTitle: "Opening hours",
    hoursDesc: "Show customers a simple time range. A detailed weekly schedule is coming soon.",
    hoursLabel: "Time range",
    hoursHint: "E.g. 08:00-22:00. Leave empty to hide hours on the customer page.",
    hoursSoon: "A detailed weekly schedule (per-day opening/closing) is coming soon.",
    closedTitle: "Temporarily closed",
    closedDesc: "Close the business temporarily for renovation, holidays or emergencies.",
    closedAria: "Temporarily closed",
    closedOn: "Temporarily closed",
    closedOff: "Open",
    reasonLabel: "Closure reason",
    reasonHint: (n: number, max: number) => `${n}/${max} characters — shown on your customer page.`,
    reasonPlaceholder: "We're on our annual break and reopen on 15 October.",
  },
};

export default BusinessOperationalSettings;
