"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AlertBanner, RadioCard, Skeleton, APSwitch } from "@/components/ui";
import type { Locale } from "@/lib/translations";

type Tone = "warm" | "formal" | "apologetic";

interface RestaurantOption {
  id: string;
  name: string;
}

interface RestaurantSettings {
  pulseAiEnabled: boolean;
  enableAiDraft: boolean;
  googleAiEnabled: boolean;
  aiDraftTone: Tone;
  loaded: boolean;
  saving: boolean;
  error?: string | null;
  /** Initial GET failed — controls stay disabled so a toggle can't PATCH
   *  over settings we never saw. */
  loadError?: boolean;
}

interface BusinessPulseAiSettingsProps {
  restaurants: RestaurantOption[];
  locale?: Locale;
}

const TONE_OPTIONS: Array<{ value: Tone; labelTr: string; labelEn: string; descTr: string; descEn: string }> = [
  {
    value: "warm",
    labelTr: "Samimi",
    labelEn: "Warm",
    descTr: "İçten ve profesyonel. Olumsuz yorumlarda dinleme + somut düzeltme.",
    descEn: "Sincere and professional. Listens and offers concrete fixes.",
  },
  {
    value: "formal",
    labelTr: "Resmi",
    labelEn: "Formal",
    descTr: "Kurumsal ve mesafeli. \"Sayın\" hitabı, samimiyetten kaçınır.",
    descEn: "Corporate and reserved. Uses formal address, avoids casual language.",
  },
  {
    value: "apologetic",
    labelTr: "Özür ağırlıklı",
    labelEn: "Apologetic",
    descTr: "İçten özür + sorumluluk kabulü + telafi. Düşük puan akışları için.",
    descEn: "Sincere apology + responsibility + remediation. For low-rating flows.",
  },
];

const FALLBACK_SETTINGS: RestaurantSettings = {
  pulseAiEnabled: true,
  enableAiDraft: false,
  googleAiEnabled: true,
  aiDraftTone: "warm",
  loaded: true,
  saving: false,
};

/** ai-settings API returns snake codes; map them to owner-readable copy. */
function describeAiSettingsError(code: unknown, isTr: boolean): string {
  switch (code) {
    case "pulse_ai_disabled_by_admin":
      return isTr
        ? "Pulse AI bu işletme için Buaze tarafından kapatıldı."
        : "Pulse AI is disabled for this location by Buaze.";
    case "not_found":
      return isTr ? "İşletme bulunamadı." : "Business not found.";
    case "invalid_tone":
      return isTr ? "Geçersiz ton seçimi." : "Invalid tone.";
    default:
      return isTr
        ? "Değişiklik kaydedilemedi. Lütfen tekrar deneyin."
        : "Couldn't save the change. Please try again.";
  }
}

async function fetchSettings(id: string): Promise<RestaurantSettings> {
  try {
    const res = await fetch(`/api/restaurants/${id}/ai-settings`);
    if (!res.ok) return { ...FALLBACK_SETTINGS, loadError: true };
    const data = await res.json();
    return {
      pulseAiEnabled: Boolean(data.pulseAiEnabled ?? true),
      enableAiDraft: Boolean(data.enableAiDraft),
      googleAiEnabled: Boolean(data.googleAiEnabled ?? true),
      aiDraftTone: (data.aiDraftTone as Tone) ?? "warm",
      loaded: true,
      saving: false,
    };
  } catch {
    return { ...FALLBACK_SETTINGS, loadError: true };
  }
}

/**
 * Pulse AI per-restaurant settings (CLAUDE.md §15).
 *
 * Owner enables auto-draft per location and picks the default tone. Auto-send
 * is intentionally NOT supported — every reply still passes through the
 * inbox approval gate.
 */
export function BusinessPulseAiSettings({ restaurants, locale = "tr" }: BusinessPulseAiSettingsProps) {
  const isTr = locale !== "en";
  const [settings, setSettings] = useState<Record<string, RestaurantSettings>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        restaurants.map(async (r) => [r.id, await fetchSettings(r.id)] as const),
      );
      if (!cancelled) setSettings(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurants]);

  const retryLoad = async (id: string) => {
    setSettings((s) => ({ ...s, [id]: { ...(s[id] ?? FALLBACK_SETTINGS), loaded: false } }));
    const next = await fetchSettings(id);
    setSettings((s) => ({ ...s, [id]: next }));
  };

  const update = async (id: string, patch: Partial<Pick<RestaurantSettings, "enableAiDraft" | "googleAiEnabled" | "aiDraftTone">>) => {
    const previous = settings[id] ?? FALLBACK_SETTINGS;
    // Optimistic; reverted to `previous` if the PATCH fails so the switch
    // never shows a state the server didn't accept.
    setSettings((s) => ({ ...s, [id]: { ...previous, ...patch, saving: true, error: null } }));
    const revert = (message: string) =>
      setSettings((s) => ({ ...s, [id]: { ...previous, saving: false, error: message } }));
    try {
      const res = await fetch(`/api/restaurants/${id}/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        revert(describeAiSettingsError(err?.error, isTr));
        return;
      }
      const data = await res.json();
      setSettings((s) => ({
        ...s,
        [id]: {
          pulseAiEnabled: Boolean(data.pulseAiEnabled ?? true),
          enableAiDraft: Boolean(data.enableAiDraft),
          googleAiEnabled: Boolean(data.googleAiEnabled ?? true),
          aiDraftTone: (data.aiDraftTone as Tone) ?? "warm",
          loaded: true,
          saving: false,
          error: null,
        },
      }));
    } catch {
      revert(
        isTr
          ? "Bağlantı hatası — değişiklik geri alındı."
          : "Network error — the change was reverted.",
      );
    }
  };

  if (restaurants.length === 0) {
    return (
      <AlertBanner kind="info">
        {isTr
          ? "Henüz restoran yok. Önce bir restoran ekle, ardından Pulse AI ayarları burada görünür."
          : "No restaurants yet. Add a restaurant first; Pulse AI settings will appear here."}
      </AlertBanner>
    );
  }

  return (
    <div className="space-y-5">
      <AlertBanner kind="info" icon={<Sparkles size={14} />}>
        {isTr
          ? "Düşük puanlı (1-3 yıldız) yorum geldiğinde Pulse AI sizin için yanıt taslağı hazırlar. Onaylamadan göndermez. Yorum metni OpenAI'a iletilir — KVKK için müşteri rızanız mevcut olmalı."
          : "When a low-rating (1-3 stars) review arrives, Pulse AI prepares a reply draft for you. It never sends without your approval. The review text is sent to OpenAI — your KVKK / GDPR consent must already cover this."}
      </AlertBanner>

      {restaurants.map((r) => {
      const s = settings[r.id];
      const loaded = Boolean(s?.loaded);
      const loadError = s?.loadError === true;
      const pulseEnabled = s?.pulseAiEnabled !== false;
      const controlsDisabled = Boolean(s?.saving) || !pulseEnabled || loadError;
        return (
          <div key={r.id} className="bz-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="pulse-eyebrow text-[#737373]">{isTr ? "İŞLETME" : "LOCATION"}</p>
                <h3 className="bz-h-tight text-[16px] mt-1 truncate">{r.name}</h3>
              </div>
              {!loaded && (
                <Loader2 size={14} className="animate-spin text-[#737373]" />
              )}
            </div>

            {/* APSwitch + tone radios — fetch tamamlanana kadar APSwitch yanlış
                "PASIF" göstermesin diye skeleton placeholder. CLAUDE.md §23.3
                Skeleton primitive (panel scope). */}
            {!loaded ? (
              <>
                <div className="mt-4 flex items-start gap-3">
                  <Skeleton className="h-6 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/5" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
                <div className="mt-5">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[88px] rounded-xl" />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {loadError && (
                  <div className="mt-4">
                    <AlertBanner kind="danger">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {isTr
                          ? "Bu işletmenin Pulse AI ayarları yüklenemedi; değişiklik yapılamaz."
                          : "Couldn't load this location's Pulse AI settings; changes are disabled."}
                        <button
                          type="button"
                          onClick={() => void retryLoad(r.id)}
                          className="font-semibold underline underline-offset-2"
                        >
                          {isTr ? "Tekrar dene" : "Retry"}
                        </button>
                      </span>
                    </AlertBanner>
                  </div>
                )}
                {!loadError && !pulseEnabled && (
                  <div className="mt-4">
                    <AlertBanner kind="warn">
                      {isTr
                        ? "Pulse AI bu işletme için admin tarafından kapalı. Taslaklar ve Google AI yardımcıları paket açılana kadar kullanılamaz."
                        : "Pulse AI is disabled for this location by admin. Drafts and Google AI helpers are unavailable until the feature is enabled."}
                    </AlertBanner>
                  </div>
                )}
                <div className="mt-4 flex items-start gap-3">
                  <APSwitch
                    checked={Boolean(s?.enableAiDraft)}
                    onChange={(next) => update(r.id, { enableAiDraft: next })}
                    disabled={controlsDisabled}
                    ariaLabel={
                      isTr ? "Buaze yorumlarına otomatik AI taslak" : "Auto AI draft for Buaze feedback"
                    }
                  />
                  <div className="text-[14px] text-[#0A0A0A] flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {isTr ? "Buaze yorumlarına otomatik AI taslak" : "Auto AI draft for Buaze feedback"}
                      </span>
                      {Boolean(s?.enableAiDraft) && pulseEnabled && !loadError && (
                        <span className="text-[10px] tracking-[0.16em] uppercase bg-[#EAF9B8] text-[#0A0A0A] rounded px-1.5 py-0.5 font-mono">
                          {isTr ? "AKTİF" : "ACTIVE"}
                        </span>
                      )}
                    </div>
                    <span className="block text-[12px] text-[#737373] mt-1 leading-relaxed">
                      {isTr
                        ? "Yeni yorumlar geldiğinde Buaze otomatik taslak hazırlar; inbox'ı açtığınızda taslak hazır gelir. Arka plan görevi her saat eksik kalan taslakları tarar. Otomatik gönderim YOK — onayınız her zaman gerekir."
                        : "When new reviews arrive, Buaze prepares the draft automatically; opens-ready in your inbox. A background job scans for missing drafts every hour. NO auto-send — your approval is always required."}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3 border-t border-[#EDEDED] pt-4">
                  <APSwitch
                    checked={Boolean(s?.googleAiEnabled)}
                    onChange={(next) => update(r.id, { googleAiEnabled: next })}
                    disabled={controlsDisabled}
                    ariaLabel={
                      isTr ? "Google yorumlarına otomatik AI taslak" : "Auto AI draft for Google reviews"
                    }
                  />
                  <div className="text-[14px] text-[#0A0A0A] flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {isTr ? "Google yorumlarına otomatik AI taslak" : "Auto AI draft for Google reviews"}
                      </span>
                      {Boolean(s?.googleAiEnabled) && pulseEnabled && !loadError && (
                        <span className="text-[10px] tracking-[0.16em] uppercase bg-[#EAF9B8] text-[#0A0A0A] rounded px-1.5 py-0.5 font-mono">
                          {isTr ? "AKTİF" : "ACTIVE"}
                        </span>
                      )}
                    </div>
                    <span className="block text-[12px] text-[#737373] mt-1 leading-relaxed">
                      {isTr
                        ? "Saat başı çalışan görev, Google'da yanıtlanmamış tüm yorumlara taslak hazırlar; sayfayı açtığınızda taslak içeride bekler. Sadece manuel onayınız sonrası Google'a gider."
                        : "An hourly job prepares drafts for every unanswered Google review; opens-ready when you visit the page. Drafts are only sent to Google after your manual approval."}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="pulse-eyebrow text-[#737373] mb-2">
                    {isTr ? "VARSAYILAN TON" : "DEFAULT TONE"}
                  </p>
                  <div role="radiogroup" aria-label={isTr ? "Varsayılan ton" : "Default tone"} className="grid gap-2.5 sm:grid-cols-3">
                    {TONE_OPTIONS.map((opt) => (
                      <RadioCard
                        key={opt.value}
                        active={s?.aiDraftTone === opt.value}
                        disabled={controlsDisabled}
                        onClick={() => update(r.id, { aiDraftTone: opt.value })}
                        title={isTr ? opt.labelTr : opt.labelEn}
                        body={isTr ? opt.descTr : opt.descEn}
                      />
                    ))}
                  </div>
                </div>

                {s?.error && (
                  <div className="mt-3">
                    <AlertBanner kind="danger">{s.error}</AlertBanner>
                  </div>
                )}
                {s?.saving && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[#737373]">
                    <Loader2 size={11} className="animate-spin" />
                    {isTr ? "Kaydediliyor…" : "Saving…"}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BusinessPulseAiSettings;
