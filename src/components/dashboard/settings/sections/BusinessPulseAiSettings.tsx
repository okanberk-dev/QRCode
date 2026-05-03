"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AlertBanner, RadioCard, Skeleton, Toggle } from "@/components/ui";
import type { Locale } from "@/lib/translations";

type Tone = "warm" | "formal" | "apologetic";

interface RestaurantOption {
  id: string;
  name: string;
}

interface RestaurantSettings {
  enableAiDraft: boolean;
  googleAiEnabled: boolean;
  aiDraftTone: Tone;
  loaded: boolean;
  saving: boolean;
  error?: string | null;
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
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, RestaurantSettings> = {};
      await Promise.all(
        restaurants.map(async (r) => {
          try {
            const res = await fetch(`/api/restaurants/${r.id}/ai-settings`);
            if (!res.ok) {
              next[r.id] = { enableAiDraft: false, googleAiEnabled: true, aiDraftTone: "warm", loaded: true, saving: false };
              return;
            }
            const data = await res.json();
            next[r.id] = {
              enableAiDraft: Boolean(data.enableAiDraft),
              googleAiEnabled: Boolean(data.googleAiEnabled ?? true),
              aiDraftTone: (data.aiDraftTone as Tone) ?? "warm",
              loaded: true,
              saving: false,
            };
          } catch {
            next[r.id] = { enableAiDraft: false, googleAiEnabled: true, aiDraftTone: "warm", loaded: true, saving: false };
          }
        }),
      );
      if (!cancelled) setSettings(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurants]);

  const update = async (id: string, patch: Partial<Pick<RestaurantSettings, "enableAiDraft" | "googleAiEnabled" | "aiDraftTone">>) => {
    setSettings((s) => ({ ...s, [id]: { ...(s[id] ?? { enableAiDraft: false, googleAiEnabled: true, aiDraftTone: "warm", loaded: true, saving: false }), ...patch, saving: true, error: null } }));
    try {
      const res = await fetch(`/api/restaurants/${id}/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSettings((s) => ({ ...s, [id]: { ...s[id], saving: false, error: err?.error ?? "save_failed" } }));
        return;
      }
      const data = await res.json();
      setSettings((s) => ({
        ...s,
        [id]: {
          enableAiDraft: Boolean(data.enableAiDraft),
          googleAiEnabled: Boolean(data.googleAiEnabled ?? true),
          aiDraftTone: (data.aiDraftTone as Tone) ?? "warm",
          loaded: true,
          saving: false,
          error: null,
        },
      }));
    } catch (err) {
      setSettings((s) => ({ ...s, [id]: { ...s[id], saving: false, error: err instanceof Error ? err.message : "save_failed" } }));
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
      {globalError && (
        <AlertBanner kind="danger" onDismiss={() => setGlobalError(null)}>
          {globalError}
        </AlertBanner>
      )}

      <AlertBanner kind="info" icon={<Sparkles size={14} />}>
        {isTr
          ? "Düşük puanlı (1-3 yıldız) yorum geldiğinde Pulse AI sizin için yanıt taslağı hazırlar. Onaylamadan göndermez. Yorum metni OpenAI'a iletilir — KVKK için müşteri rızanız mevcut olmalı."
          : "When a low-rating (1-3 stars) review arrives, Pulse AI prepares a reply draft for you. It never sends without your approval. The review text is sent to OpenAI — your KVKK / GDPR consent must already cover this."}
      </AlertBanner>

      {restaurants.map((r) => {
        const s = settings[r.id];
        const loaded = Boolean(s?.loaded);
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

            {/* Toggle + tone radios — fetch tamamlanana kadar Toggle yanlış
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
                <div className="mt-4 flex items-start gap-3">
                  <Toggle
                    checked={Boolean(s?.enableAiDraft)}
                    onChange={(next) => update(r.id, { enableAiDraft: next })}
                    disabled={s?.saving}
                    ariaLabel={
                      isTr ? "Pulse AI taslaklarını otomatik hazırla" : "Auto-prepare Pulse AI drafts"
                    }
                  />
                  <div className="text-[14px] text-[#0A0A0A]">
                    <span className="font-semibold">
                      {isTr ? "Pulse AI taslaklarını otomatik hazırla" : "Auto-prepare Pulse AI drafts"}
                    </span>
                    <span className="block text-[12px] text-[#737373] mt-0.5">
                      {isTr
                        ? "1-3★ yorum geldiğinde taslak inbox'a gelir, manuel onaylayıp gönderirsin."
                        : "When a 1-3★ review arrives, a draft lands in the inbox for your approval."}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3 border-t border-[#EDEDED] pt-4">
                  <Toggle
                    checked={Boolean(s?.googleAiEnabled)}
                    onChange={(next) => update(r.id, { googleAiEnabled: next })}
                    disabled={s?.saving}
                    ariaLabel={
                      isTr ? "Google yorumlarında Pulse AI kullan" : "Use Pulse AI for Google reviews"
                    }
                  />
                  <div className="text-[14px] text-[#0A0A0A]">
                    <span className="font-semibold">
                      {isTr ? "Google yorumlarında Pulse AI kullan" : "Use Pulse AI for Google reviews"}
                    </span>
                    <span className="block text-[12px] text-[#737373] mt-0.5">
                      {isTr
                        ? "Google yorumlarını yanıtlarken AI yardımcıyı aktif hale getirir."
                        : "Enables AI assistant when replying to Google reviews."}
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
                        disabled={s?.saving}
                        onClick={() => update(r.id, { aiDraftTone: opt.value })}
                        title={isTr ? opt.labelTr : opt.labelEn}
                        body={isTr ? opt.descTr : opt.descEn}
                      />
                    ))}
                  </div>
                </div>

                {s?.error && (
                  <div className="mt-3">
                    <AlertBanner kind="danger">
                      {isTr ? "Kaydedilemedi: " : "Save failed: "}
                      {s.error}
                    </AlertBanner>
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
