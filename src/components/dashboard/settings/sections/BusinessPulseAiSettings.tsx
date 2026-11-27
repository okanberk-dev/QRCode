"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareText, Sparkles } from "lucide-react";
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
    descTr: "İçten özür + sorumluluk kabulü + telafi. Düşük puanlı yorumlar için uygun.",
    descEn: "Sincere apology + responsibility + remediation. Best for low-rating reviews.",
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
        : "Pulse AI is turned off for this location by Buaze.";
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
          ? "Henüz işletme yok. Önce bir işletme ekle, ardından Pulse AI ayarları burada görünür."
          : "No businesses yet. Add a business first; Pulse AI settings will appear here."}
      </AlertBanner>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Fintora calm AI note: light green panel + black sparkle circle. */}
      <div role="note" className="flex items-start gap-3 rounded-[20px] bg-pn-accent-soft p-4">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          <Sparkles size={18} strokeWidth={2} />
        </span>
        <p className="min-w-0 pt-0.5 text-[13px] leading-[1.6] text-[#525252]">
          {isTr
            ? "Yeni bir yorum geldiğinde Pulse AI senin için yanıt taslağı hazırlar; sen onaylamadan hiçbir şey gönderilmez. Taslak için yorum metni yapay zekâ sağlayıcımıza (Anthropic, yedek olarak OpenAI) iletilir — müşteri aydınlatma metninin bunu kapsadığından emin ol."
            : "When a new review arrives, Pulse AI prepares a reply draft for you; nothing is sent without your approval. To write the draft, the review text is sent to our AI provider (Anthropic, with OpenAI as a backup) — make sure your customer privacy notice covers this."}
        </p>
      </div>

      {restaurants.map((r) => {
      const s = settings[r.id];
      const loaded = Boolean(s?.loaded);
      const loadError = s?.loadError === true;
      const pulseEnabled = s?.pulseAiEnabled !== false;
      const controlsDisabled = Boolean(s?.saving) || !pulseEnabled || loadError;
        return (
          <div key={r.id} className="bz-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
              >
                <Sparkles size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-[18px] font-medium text-pn-ink">{r.name}</h3>
                <p className="text-[13px] text-[#9A9A9A]">Pulse AI</p>
              </div>
            </div>

            {/* APSwitch + tone radios — fetch tamamlanana kadar APSwitch yanlış
                "PASIF" göstermesin diye skeleton placeholder. CLAUDE.md §23.3
                Skeleton primitive (panel scope). */}
            {!loaded ? (
              <>
                <div className="mt-4 space-y-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-start gap-3 rounded-[16px] bg-pn-canvas p-3.5">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-3.5 w-3/5" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                      <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[88px] rounded-[20px]" />
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
                          className="font-medium underline underline-offset-2"
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
                        ? "Pulse AI bu işletme için Buaze tarafından kapalı. Taslaklar ve Google AI yardımcıları bu özellik paketine eklenene kadar kullanılamaz."
                        : "Pulse AI is turned off for this location by Buaze. Drafts and Google AI helpers are unavailable until the feature is added to your package."}
                    </AlertBanner>
                  </div>
                )}
                {/* Fintora setting rows: icon circle · title + one-line note · switch. */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-start gap-3 rounded-[16px] bg-pn-canvas p-3.5">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
                    >
                      <MessageSquareText size={16} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-[14px] text-pn-ink">
                      <span className="font-medium">
                        {isTr ? "Buaze yorumlarına otomatik AI taslak" : "Auto AI draft for Buaze feedback"}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-[#737373]">
                        {isTr
                          ? "Yeni bir yorum geldiğinde taslak otomatik hazırlanır; Yorumlar sayfasını açtığında seni bekler. Eksik kalan taslaklar günde bir kez tamamlanır. Otomatik gönderim yoktur — her yanıt senin onayınla gider."
                          : "When a new review arrives, a draft is prepared automatically and waits for you on the Reviews page. Missing drafts are filled in once a day. Nothing is sent automatically — every reply needs your approval."}
                      </span>
                    </div>
                    <div className="shrink-0 pt-1.5">
                      <APSwitch
                        checked={Boolean(s?.enableAiDraft)}
                        onChange={(next) => update(r.id, { enableAiDraft: next })}
                        disabled={controlsDisabled}
                        ariaLabel={
                          isTr ? "Buaze yorumlarına otomatik AI taslak" : "Auto AI draft for Buaze feedback"
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[16px] bg-pn-canvas p-3.5">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-ink text-white"
                    >
                      <Sparkles size={16} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-[14px] text-pn-ink">
                      <span className="font-medium">
                        {isTr ? "Google yorumlarına otomatik AI taslak" : "Auto AI draft for Google reviews"}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-[#737373]">
                        {isTr
                          ? "Google'da yanıtlanmamış yorumlar için günde bir kez taslak hazırlanır; Google Yorumları sayfasını açtığında seni bekler. Yanıt yalnızca sen onaylayınca Google'a gönderilir."
                          : "Drafts are prepared once a day for unanswered Google reviews and wait for you on the Google Reviews page. A reply is posted to Google only after you approve it."}
                      </span>
                    </div>
                    <div className="shrink-0 pt-1.5">
                      <APSwitch
                        checked={Boolean(s?.googleAiEnabled)}
                        onChange={(next) => update(r.id, { googleAiEnabled: next })}
                        disabled={controlsDisabled}
                        ariaLabel={
                          isTr ? "Google yorumlarına otomatik AI taslak" : "Auto AI draft for Google reviews"
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[14px] font-medium text-pn-ink">
                    {isTr ? "Varsayılan ton" : "Default tone"}
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
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[#9A9A9A]">
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
