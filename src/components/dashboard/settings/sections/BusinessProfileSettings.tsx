"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { AlertBanner, Eyebrow, Field } from "@/components/ui";
import type { Locale } from "@/lib/translations";

interface BusinessProfileSettingsProps {
  locale?: Locale;
}

/**
 * Section — Profil (Faz unified hub).
 *
 * User-level identity: ad, e-posta, panel dili. /api/user/profile PUT
 * handles name + email (also accepts password fields, but those live in
 * `BusinessAccountSecuritySettings`). Locale change reuses /api/user/locale
 * which writes to user.locale and bounces to the new locale URL.
 *
 * Pulse design — bz-card + bz-input via <Field>. AlertBanner for
 * success/error feedback (auto-dismiss success after 4s).
 */
export function BusinessProfileSettings({ locale = "tr" }: BusinessProfileSettingsProps) {
  const isTr = locale === "tr";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setName(data.name ?? "");
        setEmail(data.email ?? "");
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
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
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
    return (
      <div className="bz-card flex items-center justify-center gap-2 p-10 text-[13px] text-[#737373]">
        <Loader2 size={14} className="animate-spin" />
        {isTr ? "Yükleniyor…" : "Loading…"}
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
          <Eyebrow>{isTr ? "KİMLİK" : "IDENTITY"}</Eyebrow>
          <h3 className="bz-h-tight mt-1 text-[16px] text-[#0A0A0A]">
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
            />
          </Field>
          <Field label={isTr ? "E-posta" : "Email"} required>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bz-input w-full"
              autoComplete="email"
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
          <Eyebrow>{isTr ? "TERCİH" : "PREFERENCE"}</Eyebrow>
          <h3 className="bz-h-tight mt-1 text-[16px] text-[#0A0A0A]">
            {isTr ? "Panel dili" : "Panel language"}
          </h3>
          <p className="mt-1 text-[12px] leading-[1.55] text-[#737373]">
            {isTr
              ? "Bu sadece senin paneli görme dilini değiştirir. Müşteri yorum sayfası ayrı."
              : "This only affects your panel UI language. The public review surface is separate."}
          </p>
        </div>
        <Field label={isTr ? "Dil" : "Language"}>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            className="bz-input w-full md:w-[260px]"
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

export default BusinessProfileSettings;
