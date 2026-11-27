"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { AlertBanner, Field, PulseSelect } from "@/components/ui";
import { SkBox } from "@/components/ui/skeletons/PageSkeleton";
import type { Locale } from "@/lib/translations";

interface BusinessProfileSettingsProps {
  locale?: Locale;
}

// §38.37 — IANA timezone select options. Owner-facing 10 popüler tz + "Diğer"
// (custom input fallback). Tasarım .design-owner-2026/page-account.jsx:Profile
// timezone select. Backend Zod regex `^[A-Za-z]+/[A-Za-z_-]+(?:/[A-Za-z_-]+)?$`
// kabul eder, herhangi bir IANA tz string set edilebilir.
const TIMEZONE_OPTIONS: { value: string; tr: string; en: string }[] = [
  { value: "Europe/Istanbul", tr: "İstanbul (UTC+3)", en: "Istanbul (UTC+3)" },
  { value: "Europe/London", tr: "Londra (UTC+0/+1)", en: "London (UTC+0/+1)" },
  { value: "Europe/Berlin", tr: "Berlin (UTC+1/+2)", en: "Berlin (UTC+1/+2)" },
  { value: "Europe/Paris", tr: "Paris (UTC+1/+2)", en: "Paris (UTC+1/+2)" },
  { value: "Europe/Amsterdam", tr: "Amsterdam (UTC+1/+2)", en: "Amsterdam (UTC+1/+2)" },
  { value: "America/New_York", tr: "New York (UTC-5/-4)", en: "New York (UTC-5/-4)" },
  { value: "America/Los_Angeles", tr: "Los Angeles (UTC-8/-7)", en: "Los Angeles (UTC-8/-7)" },
  { value: "Asia/Dubai", tr: "Dubai (UTC+4)", en: "Dubai (UTC+4)" },
  { value: "Asia/Singapore", tr: "Singapur (UTC+8)", en: "Singapore (UTC+8)" },
  { value: "Asia/Tokyo", tr: "Tokyo (UTC+9)", en: "Tokyo (UTC+9)" },
];

/**
 * Section — Profil (Faz unified hub).
 *
 * User-level identity: ad, e-posta, telefon, pozisyon, timezone, panel dili.
 * /api/user/profile PUT handles name + email + phoneNumber + position +
 * timezone (also accepts password fields, but those live in
 * `BusinessAccountSecuritySettings`). Locale change reuses /api/user/locale
 * which writes to user.locale and bounces to the new locale URL.
 *
 * Pulse design — bz-card + bz-input via <Field>. AlertBanner for
 * success/error feedback (auto-dismiss success after 4s). §38.37 6-field
 * (tasarım .design-owner-2026/page-account.jsx birebir).
 */
export function BusinessProfileSettings({ locale = "tr" }: BusinessProfileSettingsProps) {
  const isTr = locale === "tr";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // §38.37 — yeni 3 alan
  const [phoneNumber, setPhoneNumber] = useState("");
  const [position, setPosition] = useState("");
  const [timezone, setTimezone] = useState("");
  // §38.51 — emailVerified UI badge ("Doğrulandı" green check, tasarım birebir).
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setPhoneNumber(data.phoneNumber ?? "");
        setPosition(data.position ?? "");
        setTimezone(data.timezone ?? "");
        setEmailVerified(Boolean(data.emailVerified));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          // §38.37 — null yerine empty string gönder; backend trim + null'a düşürür.
          phoneNumber: phoneNumber.trim(),
          position: position.trim(),
          timezone: timezone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (isTr ? "Güncelleme sırasında hata oluştu." : "Update failed."));
      } else {
        setSuccess(isTr ? "Profilin güncellendi." : "Your profile was updated.");
      }
    } catch {
      setError(isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setSaving(false);
    }
  };

  const handleLocaleChange = async (next: string) => {
    if (next === locale) return;
    try {
      const res = await fetch("/api/user/locale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (res.ok) {
        // Reload at the new locale prefix; preserve current section.
        window.location.href = `/${next}/dashboard/account?section=profile`;
      } else {
        setError(isTr ? "Dil değiştirilemedi." : "Could not switch language.");
      }
    } catch {
      setError(isTr ? "Bağlantı hatası." : "Connection error.");
    }
  };

  if (loading) {
    // Shape-matching skeleton: profile form (2-col fields) + language card.
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="bz-card p-5 sm:p-6 space-y-4">
          <SkBox className="h-5 w-36" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkBox className="h-3 w-20" />
                <SkBox className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="bz-card p-5 sm:p-6 space-y-3">
          <SkBox className="h-5 w-28" />
          <SkBox className="h-10 w-full md:w-[260px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <form onSubmit={handleSubmit} className="bz-card p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="bz-h-tight text-[16px] text-pn-ink">
            {isTr ? "Profil bilgilerin" : "Your profile"}
          </h3>
          <p className="mt-1 text-[12px] leading-[1.55] text-[#737373]">
            {isTr
              ? "Adın yorum yanıtlarında ve admin yazışmalarında görünür. E-posta panel girişin ve bildirim alıcısıdır."
              : "Your name appears in review replies and admin correspondence. Email is your sign-in and notification target."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={isTr ? "Ad Soyad" : "Full name"} required>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bz-input w-full"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
            />
          </Field>
          {/* The required asterisk is part of the label here: Field appends
              its own after the label node, and with the full-width flex row
              (name ↔ "Verified") it wrapped onto a second line, pushing this
              input below the "Ad Soyad" one. The input's own `required`
              still exposes the requirement to assistive tech. */}
          <Field
            label={
              <span className="flex items-center justify-between gap-2">
                <span>
                  {isTr ? "E-posta" : "Email"}
                  <span style={{ color: "#DC2626", marginLeft: 4 }} aria-hidden="true">
                    *
                  </span>
                </span>
                {emailVerified && (
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#16A34A]"
                    title={isTr ? "E-posta doğrulandı" : "Email verified"}
                  >
                    <Check size={10} strokeWidth={2.5} />
                    {isTr ? "Doğrulandı" : "Verified"}
                  </span>
                )}
              </span>
            }
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bz-input w-full"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          {/* §38.37 — yeni 3 alan: telefon / pozisyon / timezone (tasarım birebir). */}
          <Field
            label={isTr ? "Telefon" : "Phone"}
            hint={isTr ? "Opsiyonel — admin yazışmaları için" : "Optional — admin contact"}
          >
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bz-input w-full"
              autoComplete="tel"
              maxLength={32}
              placeholder="+90 5XX XXX XX XX"
              inputMode="tel"
              enterKeyHint="next"
            />
          </Field>
          <Field
            label={isTr ? "Pozisyon" : "Position"}
            hint={isTr ? "İşletme içi rolün — örn. Operasyon müdürü" : "Your role — e.g. Operations manager"}
          >
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="bz-input w-full"
              autoComplete="organization-title"
              maxLength={100}
            />
          </Field>
          <Field
            label={isTr ? "Saat dilimi" : "Time zone"}
            // Panel/mail timestamps use the business's local time (§46), not
            // this field — the old "for date/time display" hint was untrue.
            hint={
              isTr
                ? "Hesabında saklanır; panel ve e-posta saatleri şimdilik işletmenin yerel saatiyle gösterilir."
                : "Saved to your account; panel and email times currently use the business's local time."
            }
          >
            <PulseSelect
              value={timezone}
              onChange={setTimezone}
              options={[
                { value: "", label: isTr ? "Seçilmedi" : "Not set" },
                ...TIMEZONE_OPTIONS.map((o) => ({ value: o.value, label: isTr ? o.tr : o.en })),
              ]}
              ariaLabel={isTr ? "Saat dilimi" : "Time zone"}
              placeholder={isTr ? "Seçilmedi" : "Not set"}
            />
          </Field>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving} className="bz-btn-primary disabled:opacity-50">
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} strokeWidth={2} />
            )}
            {isTr ? "Kaydet" : "Save"}
          </button>
        </div>
      </form>

      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="bz-h-tight text-[16px] text-pn-ink">
            {isTr ? "Panel dili" : "Panel language"}
          </h3>
          <p className="mt-1 text-[12px] leading-[1.55] text-[#737373]">
            {isTr
              ? "Bu sadece senin paneli görme dilini değiştirir. Müşteri yorum sayfası ayrı."
              : "This only changes the language of your panel. The customer review page is not affected."}
          </p>
        </div>
        <Field label={isTr ? "Dil" : "Language"}>
          <PulseSelect
            value={locale}
            onChange={handleLocaleChange}
            options={[
              { value: "tr", label: "Türkçe" },
              { value: "en", label: "English" },
            ]}
            ariaLabel={isTr ? "Panel dili" : "Panel language"}
            className="md:w-[260px]"
          />
        </Field>
      </div>
    </div>
  );
}

export default BusinessProfileSettings;
