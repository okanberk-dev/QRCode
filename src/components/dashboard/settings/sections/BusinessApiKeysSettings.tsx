"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AlertBanner, Field, Modal } from "@/components/ui";
import type { Locale } from "@/lib/translations";
import { SettingsCard } from "../SettingsCard";

interface BusinessApiKeysSettingsProps {
  locale?: Locale;
}

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

// Backend `VALID_SCOPES` (src/app/api/api-keys/route.ts) ile birebir. Yeni
// scope eklenirse iki yer senkron tutulmalı. Owner okunabilir TR/EN label.
const SCOPE_DEFS: { id: string; tr: string; en: string }[] = [
  { id: "feedback:read", tr: "Yorumları oku", en: "Read feedback" },
  { id: "feedback:write", tr: "Yorumlara yaz", en: "Write feedback" },
  { id: "restaurants:read", tr: "İşletmeleri oku", en: "Read businesses" },
  { id: "restaurants:write", tr: "İşletmeleri düzenle", en: "Write businesses" },
  { id: "analytics:read", tr: "Analitiği oku", en: "Read analytics" },
  { id: "menu:read", tr: "Menüyü oku", en: "Read menu" },
  { id: "menu:write", tr: "Menüyü düzenle", en: "Write menu" },
];

function relativeTime(iso: string, isTr: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return isTr ? "şimdi" : "just now";
  if (min < 60) return isTr ? `${min} dk önce` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isTr ? `${hr} sa önce` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return isTr ? `${day} gün önce` : `${day}d ago`;
  const month = Math.floor(day / 30);
  return isTr ? `${month} ay önce` : `${month}mo ago`;
}

/**
 * Owner-facing API key management (workspace-scoped).
 *
 * Backend `/api/api-keys` (+ `/[id]`) zaten owner-scoped: `getPanelActorFromRequest`
 * → `ownerRef(actor)` = `actor.id` (source === 'user'). Bu yüzden bu UI hiçbir
 * IDOR/admin-only varsayımı yapmaz; admin tarafındaki `/admin/api` ile aynı
 * endpoint'i paylaşır.
 *
 * Geçmiş: API anahtarı kartları §38.51'de owner panelden kullanıcı talebiyle
 * kaldırılmıştı; backend korunmuştu. Bu kart açık kullanıcı talebiyle geri
 * eklendi (account-level — keys workspace-scoped, per-restaurant değil).
 */
export function BusinessApiKeysSettings({ locale = "tr" }: BusinessApiKeysSettingsProps) {
  const isTr = locale === "tr";

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  // Token tek bir kez gösterilir (create + rotate sonrası).
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["feedback:read"]);
  const [creating, setCreating] = useState(false);

  // Per-row busy state ('rotate:<id>' | 'revoke:<id>')
  const [busy, setBusy] = useState<string | null>(null);

  // Confirm-revoke modal
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyRow | null>(null);

  const flash = (kind: "success" | "danger", text: string) => {
    setNotice({ kind, text });
    if (kind === "success") setTimeout(() => setNotice(null), 2600);
  };

  const loadKeys = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) {
        setLoadError(isTr ? "API anahtarları yüklenemedi." : "Could not load API keys.");
        return;
      }
      const data = await res.json();
      setKeys((data?.data as ApiKeyRow[]) ?? []);
    } catch {
      setLoadError(isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setLoading(false);
    }
  }, [isTr]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const toggleScope = (id: string) => {
    setNewScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const onCopyToken = (token: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(token).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onCopyPrefix = (prefix: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(prefix).catch(() => {});
    }
    flash("success", isTr ? "Kopyalandı" : "Copied");
  };

  const openCreate = () => {
    setNewName("");
    setNewScopes(["feedback:read"]);
    setCreateOpen(true);
  };

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          scopes: newScopes.length > 0 ? newScopes : ["feedback:read"],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedToken(typeof data.token === "string" ? data.token : null);
        setCreateOpen(false);
        await loadKeys();
        flash("success", isTr ? "Anahtar oluşturuldu" : "Key created");
      } else if (res.status === 429) {
        flash("danger", isTr ? "Çok fazla istek — biraz sonra dene." : "Too many requests — try again shortly.");
      } else {
        flash("danger", isTr ? "Anahtar oluşturulamadı." : "Could not create key.");
      }
    } catch {
      flash("danger", isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setCreating(false);
    }
  };

  const onRotate = async (id: string) => {
    setBusy(`rotate:${id}`);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRevealedToken(typeof data.token === "string" ? data.token : null);
        await loadKeys();
        flash("success", isTr ? "Anahtar yenilendi" : "Key rotated");
      } else {
        flash("danger", isTr ? "Anahtar yenilenemedi." : "Could not rotate key.");
      }
    } catch {
      flash("danger", isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setBusy(null);
    }
  };

  const onRevokeConfirmed = async () => {
    if (!confirmRevoke) return;
    const id = confirmRevoke.id;
    setBusy(`revoke:${id}`);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmRevoke(null);
        await loadKeys();
        flash("success", isTr ? "Anahtar iptal edildi" : "Key revoked");
      } else {
        flash("danger", isTr ? "Anahtar iptal edilemedi." : "Could not revoke key.");
      }
    } catch {
      flash("danger", isTr ? "Bağlantı hatası." : "Connection error.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <AlertBanner kind={notice.kind} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AlertBanner>
      )}

      {/* Tek-seferlik token reveal */}
      {revealedToken && (
        <div className="rounded-2xl border border-[#C6F24E] bg-[#F7FFE4] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#0A0A0A]">{isTr ? "YENİ TOKEN" : "NEW TOKEN"}</p>
              <p className="mt-1 text-[12px] text-[#525252]">
                {isTr
                  ? "Bu token yalnızca bir kez gösterilir. Güvenli bir yere kaydet."
                  : "This token is shown only once. Store it somewhere safe."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopyToken(revealedToken)}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[#0A0A0A] bg-white px-3 py-2 font-mono text-[11px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
            >
              {copied ? <Check size={11} className="text-[#A8D62E]" /> : <Copy size={11} />}
              <span className="truncate">{revealedToken}</span>
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setRevealedToken(null)}
              className="bz-btn bz-btn-sm"
            >
              {isTr ? "Kapattım, kaydettim" : "Got it, saved"}
            </button>
          </div>
        </div>
      )}

      <SettingsCard
        icon={<KeyRound size={18} />}
        title={isTr ? "API anahtarları" : "API keys"}
        description={
          isTr
            ? "Kendi entegrasyonların için kişisel API anahtarı oluştur. Buaze verilerine programatik erişim sağlar."
            : "Create personal API keys for your own integrations — programmatic access to your Buaze data."
        }
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="bz-btn-lime bz-btn-sm"
          >
            <Plus size={12} /> {isTr ? "Yeni anahtar" : "New key"}
          </button>
        }
      >
        {loadError && (
          <div className="mb-3">
            <AlertBanner kind="danger" onDismiss={() => setLoadError(null)}>
              {loadError}
            </AlertBanner>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            {isTr ? "Yükleniyor…" : "Loading…"}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#EDEDED]"
            >
              <KeyRound size={16} className="text-[#A3A3A3]" />
            </span>
            <p className="text-[13px] font-medium text-[#0A0A0A]">
              {isTr ? "Henüz API anahtarı yok" : "No API keys yet"}
            </p>
            <p className="max-w-sm text-[12px] text-[#737373]">
              {isTr
                ? "İlk anahtarını oluştur, varsayılan scope yorumları okumaktır."
                : "Create your first key — the default scope reads feedback."}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col divide-y divide-[#EDEDED]">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#0A0A0A]">{k.name}</p>
                  <p className="pulse-eyebrow mt-0.5 text-[#737373]">{k.scopes.join(" · ")}</p>
                  <p className="bz-mono mt-0.5 text-[10.5px] tabular-nums text-[#A3A3A3]">
                    {k.lastUsedAt
                      ? isTr
                        ? `Son kullanım: ${relativeTime(k.lastUsedAt, true)}`
                        : `Last used: ${relativeTime(k.lastUsedAt, false)}`
                      : isTr
                        ? "Hiç kullanılmadı"
                        : "Never used"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyPrefix(k.prefix)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-2.5 py-1.5 font-mono text-[11px] text-[#525252] hover:border-[#0A0A0A]"
                  title={isTr ? "Önek kopyala" : "Copy prefix"}
                >
                  <Copy size={10} /> {k.prefix}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRotate(k.id)}
                    disabled={busy !== null}
                    title={isTr ? "Yenile" : "Rotate"}
                    aria-label={isTr ? "Anahtarı yenile" : "Rotate key"}
                    className="bz-btn-icon disabled:opacity-50"
                  >
                    {busy === `rotate:${k.id}` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RotateCw size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(k)}
                    disabled={busy !== null}
                    title={isTr ? "İptal et" : "Revoke"}
                    aria-label={isTr ? "Anahtarı iptal et" : "Revoke key"}
                    className="bz-btn-icon text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SettingsCard>

      {/* Create modal */}
      {createOpen && (
        <Modal
          size={460}
          onClose={() => setCreateOpen(false)}
          ariaLabel={isTr ? "Yeni API anahtarı" : "New API key"}
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0A0A0A]" />
              <span>{isTr ? "Yeni API anahtarı" : "New API key"}</span>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label={isTr ? "Açıklama" : "Label"}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={isTr ? "örn. Sipariş paneli entegrasyonu" : "e.g. Order dashboard integration"}
                className="bz-input w-full"
                maxLength={100}
                autoFocus
                enterKeyHint="done"
              />
            </Field>

            <div>
              <p className="pulse-eyebrow mb-2 text-[#737373]">{isTr ? "İZİNLER (SCOPE)" : "SCOPES"}</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {SCOPE_DEFS.map((s) => {
                  const checked = newScopes.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-colors ${
                        checked
                          ? "border-[#C6F24E] bg-[#EAF9B8]/40 text-[#0A0A0A]"
                          : "border-[#EDEDED] bg-white text-[#525252] hover:border-[#D4D4D4]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleScope(s.id)}
                        className="h-3.5 w-3.5 accent-[#A8D62E]"
                      />
                      <span className="min-w-0 flex-1 truncate">{isTr ? s.tr : s.en}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-[#737373]">
                {isTr
                  ? "En az bir izin seç. Boş bırakırsan yalnızca yorum okuma izni verilir."
                  : "Pick at least one scope. If left empty, only feedback read is granted."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setCreateOpen(false)} className="bz-btn">
                {isTr ? "İptal" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={creating || !newName.trim()}
                className="bz-btn-lime disabled:opacity-40"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                {isTr ? "Oluştur" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke confirm modal */}
      {confirmRevoke && (
        <Modal
          size={420}
          onClose={() => (busy ? undefined : setConfirmRevoke(null))}
          ariaLabel={isTr ? "Anahtar iptali onayı" : "Revoke key confirmation"}
          title={
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-[#DC2626]" />
              <span>{isTr ? "Anahtarı iptal et" : "Revoke key"}</span>
            </div>
          }
        >
          <p className="text-[13px] leading-[1.6] text-[#525252]">
            {isTr ? (
              <>
                <strong className="text-[#0A0A0A]">{confirmRevoke.name}</strong> anahtarını iptal
                etmek üzeresin. Bu anahtarı kullanan tüm entegrasyonlar anında çalışmayı durdurur.
                Bu işlem geri alınamaz.
              </>
            ) : (
              <>
                You are about to revoke <strong className="text-[#0A0A0A]">{confirmRevoke.name}</strong>.
                Any integration using this key stops working immediately. This cannot be undone.
              </>
            )}
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmRevoke(null)}
              disabled={busy !== null}
              className="bz-btn disabled:opacity-50"
            >
              {isTr ? "Vazgeç" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={onRevokeConfirmed}
              disabled={busy !== null}
              className="bz-btn-danger disabled:opacity-50"
            >
              {busy?.startsWith("revoke:") ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
              {isTr ? "İptal et" : "Revoke"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BusinessApiKeysSettings;
