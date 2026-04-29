"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Key,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  AlertBanner,
  Badge,
  Field,
  Modal,
  Toggle,
  useConfirmDialog,
} from "@/components/ui";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";
import { TwoFactorSetupModal } from "../TwoFactorSetupModal";
import { ActiveSessionsTable } from "../ActiveSessionsTable";

interface RestaurantData {
  id: string;
  isActive: boolean;
  kvkkText?: string | null;
}

interface BusinessSecuritySettingsProps {
  restaurant: RestaurantData;
  /** True when the logged-in user owns this restaurant's account (workspace user). */
  isWorkspaceUser?: boolean;
  onSaved?: (partial: Partial<RestaurantData>) => void;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface ApiKeyCreatedResponse extends ApiKey {
  token: string;
}

const SCOPE_OPTIONS = [
  { id: "feedback:read", label: "Yorumları oku" },
  { id: "feedback:write", label: "Yoruma yanıt" },
  { id: "restaurants:read", label: "İşletme oku" },
  { id: "restaurants:write", label: "İşletme yaz" },
  { id: "analytics:read", label: "Analitik oku" },
  { id: "menu:read", label: "Menü oku" },
  { id: "menu:write", label: "Menü yaz" },
];

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
 * 5 alt-bölüm:
 *  1. 2FA TOTP — Toggle + Setup Modal + Disable flow
 *  2. Aktif Oturumlar — UserSession listesi + revoke
 *  3. API Anahtarları — list + create modal + revoke
 *  4. KVKK Aydınlatma metni — Buaze tarafından sağlanan default metin (read-only info)
 *  5. İşletmeyi devre dışı bırak — isActive Toggle
 */
export function BusinessSecuritySettings({
  restaurant,
  isWorkspaceUser = true,
  onSaved,
}: BusinessSecuritySettingsProps) {
  // Form state for kvkk + isActive (single save bar).
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

  // ─── 2FA state ───
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("load_failed");
        const data = await res.json();
        if (cancelled) return;
        setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
      } catch {
        if (!cancelled) setTwoFactorEnabled(false);
      } finally {
        if (!cancelled) setTwoFactorLoading(false);
      }
    };
    if (isWorkspaceUser) void load();
    else setTwoFactorLoading(false);
  }, [isWorkspaceUser]);

  const handle2FAToggle = (next: boolean) => {
    if (next) setSetupOpen(true);
    else setDisableOpen(true);
  };

  // ─── API keys state ───
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createScopes, setCreateScopes] = useState<string[]>(["feedback:read"]);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const loadApiKeys = async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      // The endpoint historically returned either { keys: [...] } or a bare
      // array. The previous `?? data ?? []` chain only guarded against
      // null/undefined — an `{ error }` envelope on 200 would slip through
      // and crash the .map below. Be strict about the array shape.
      const list = Array.isArray(data?.keys)
        ? data.keys
        : Array.isArray(data)
          ? data
          : [];
      setApiKeys(list);
    } catch {
      setApiKeys([]);
    } finally {
      setApiKeysLoading(false);
    }
  };

  useEffect(() => {
    void loadApiKeys();
  }, []);

  const handleCreateKey = async () => {
    if (!createName.trim()) {
      setError("Anahtar için isim gir.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), scopes: createScopes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Oluşturulamadı");
      }
      const data: ApiKeyCreatedResponse = await res.json();
      setNewToken(data.token);
      setCreateName("");
      setCreateScopes(["feedback:read"]);
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = (id: string, name: string) => {
    askConfirm({
      title: "Anahtarı iptal et?",
      body: `"${name}" iptal edildikten sonra bu anahtarla yapılan istekler 401 döner.`,
      confirmLabel: "İptal et",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("revoke_failed");
          await loadApiKeys();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Hata");
        }
      },
    });
  };

  const copyToken = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5">
      {confirmEl}
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

      {/* 1. 2FA */}
      <SettingsCard
        icon={<ShieldCheck size={18} />}
        title="İki adımlı doğrulama (2FA)"
        description="Şifrenden sonra ek bir 6 haneli kod ile koruma. Authenticator uygulaması gerekir."
        actions={
          twoFactorLoading ? null : (
            <Badge kind={twoFactorEnabled ? "ok" : "off"}>
              {twoFactorEnabled ? "Aktif" : "Pasif"}
            </Badge>
          )
        }
      >
        {!isWorkspaceUser ? (
          <p className="text-[12.5px] text-[#737373]">
            Yöneticiler 2FA'yı kendi hesap ayarlarından açıp kapatabilir.
          </p>
        ) : twoFactorLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            Yükleniyor…
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Toggle
              checked={Boolean(twoFactorEnabled)}
              onChange={handle2FAToggle}
              ariaLabel="2FA aç/kapat"
            />
            <span className="text-[13px] text-[#0A0A0A]">
              {twoFactorEnabled ? "Doğrulama aktif" : "Doğrulamayı kur"}
            </span>
          </div>
        )}
        {backupCodes && (
          <div
            className="mt-4 p-4"
            style={{ background: "#EAF9B8", border: "1px solid #A8D62E", borderRadius: 10 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} />
              <strong className="text-[13px]">Yedek kodlar — bunları sakla</strong>
            </div>
            <p className="text-[12px] text-[#525252] mb-3">
              Authenticator uygulamasını kaybedersen aşağıdaki kodlardan biriyle
              giriş yapabilirsin. Her kod tek seferlik. Bu pencere kapandıktan
              sonra tekrar gösterilmez.
            </p>
            <div className="grid grid-cols-2 gap-1 bz-mono text-[12px]">
              {backupCodes.map((c) => (
                <code key={c} className="bg-white p-1.5 rounded">{c}</code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBackupCodes(null)}
              className="bz-btn-primary mt-3 inline-flex items-center gap-1.5 text-[12px]"
              style={{ height: 28, padding: "0 12px", borderRadius: 999 }}
            >
              Sakladım, kapat
            </button>
          </div>
        )}
      </SettingsCard>

      {/* 2. Aktif oturumlar */}
      {isWorkspaceUser && (
        <SettingsCard
          icon={<Lock size={18} />}
          title="Aktif oturumlar"
          description="Hesabına giriş yapmış cihazlar. Şüpheli bir oturum varsa çıkış yap."
        >
          <ActiveSessionsTable />
        </SettingsCard>
      )}

      {/* 3. API anahtarları */}
      <SettingsCard
        icon={<Key size={18} />}
        title="API anahtarları"
        description="Geliştiricilerin Buaze API'sine erişmesi için anahtar üret."
        actions={
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setNewToken(null);
            }}
            className="bz-btn-primary inline-flex items-center gap-1.5 text-[12px]"
            style={{ height: 28, padding: "0 12px", borderRadius: 999 }}
          >
            <Plus size={12} />
            Yeni anahtar
          </button>
        }
      >
        {apiKeysLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            Yükleniyor…
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-[13px] text-[#737373]">
            Henüz anahtar yok. "Yeni anahtar" butonuyla bir tane oluştur.
          </p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-3 p-3"
                style={{ background: "#FAFAFA", border: "1px solid #EDEDED", borderRadius: 10 }}
              >
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#0A0A0A",
                    color: "#C6F24E",
                  }}
                >
                  <Key size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bz-h-tight text-[13px]">{k.name}</span>
                    {k.revokedAt && <Badge kind="off">İptal edilmiş</Badge>}
                  </div>
                  <div className="bz-mono text-[11.5px] text-[#737373] mt-0.5">
                    {k.prefix}
                  </div>
                  <div className="text-[11px] text-[#A3A3A3] mt-0.5">
                    {k.scopes.join(" · ")} ·{" "}
                    {k.lastUsedAt
                      ? `Son kullanım ${new Date(k.lastUsedAt).toLocaleDateString("tr-TR")}`
                      : "Hiç kullanılmadı"}
                  </div>
                </div>
                {!k.revokedAt && (
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(k.id, k.name)}
                    className="bz-btn-icon"
                    aria-label="İptal et"
                    title="İptal et"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* 4. KVKK */}
      <SettingsCard
        icon={<FileText size={18} />}
        title="KVKK aydınlatma metni"
        description="Müşterinin yorum sayfasında gösterilen KVKK aydınlatma metni Buaze tarafından hazırlanmış güncel şablondan otomatik olarak yüklenir."
        actions={<Badge kind="ok">Aktif</Badge>}
      >
        <p className="text-[13px] leading-[1.6] text-[#525252]">
          Yasal güncelleme gerektiğinde metin merkezi olarak güncellenir; ayrıca düzenleme yapmana gerek yoktur.
          Özel bir metne ihtiyacın olursa{" "}
          <a className="underline text-[#0A0A0A]" href="mailto:legal@buaze.com">
            legal@buaze.com
          </a>{" "}
          adresinden bize yazabilirsin.
        </p>
      </SettingsCard>

      {/* 5. isActive */}
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
          <Toggle
            checked={form.isActive}
            onChange={(next) => set("isActive", next)}
            ariaLabel="İşletme aktif"
          />
          <span className="text-[13px]">
            {form.isActive ? "İşletme aktif" : "İşletme devre dışı"}
          </span>
        </div>
      </SettingsCard>

      {/* Modals */}
      <TwoFactorSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSuccess={(codes) => {
          setTwoFactorEnabled(true);
          setBackupCodes(codes);
        }}
      />

      {disableOpen && (
        <DisableTwoFactorModal
          onClose={() => setDisableOpen(false)}
          onSuccess={() => {
            setTwoFactorEnabled(false);
            setDisableOpen(false);
          }}
        />
      )}

      {createOpen && (
        <Modal
          title={newToken ? "Yeni anahtar oluşturuldu" : "Yeni API anahtarı"}
          onClose={() => {
            setCreateOpen(false);
            setNewToken(null);
          }}
          size={520}
        >
          {newToken ? (
            <div className="space-y-4">
              <AlertBanner kind="warn">
                Bu anahtarı şimdi kopyala — tekrar gösterilmez!
              </AlertBanner>
              <div
                className="flex items-center gap-2 p-3 bz-mono text-[12px]"
                style={{ background: "#FAFAFA", border: "1px solid #EDEDED", borderRadius: 10 }}
              >
                <span className="flex-1 break-all">{newToken}</span>
                <button
                  type="button"
                  onClick={copyToken}
                  className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                  style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                >
                  {tokenCopied ? <Check size={12} /> : <Copy size={12} />}
                  {tokenCopied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    setNewToken(null);
                  }}
                  className="bz-btn-primary"
                >
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Anahtar adı" required>
                <input
                  className="bz-input"
                  type="text"
                  value={createName}
                  maxLength={100}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Örn: ZapierEntegrasyonu"
                />
              </Field>
              <div>
                <label className="block text-[12px] text-[#525252] mb-2">
                  İzinler
                </label>
                <div className="space-y-2">
                  {SCOPE_OPTIONS.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={createScopes.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateScopes((prev) => [...new Set([...prev, s.id])]);
                          } else {
                            setCreateScopes((prev) => prev.filter((x) => x !== s.id));
                          }
                        }}
                      />
                      <span className="bz-mono text-[12px]">{s.id}</span>
                      <span className="text-[#525252]">— {s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="bz-btn-ghost"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCreateKey}
                  disabled={creating || !createName.trim() || createScopes.length === 0}
                  className="bz-btn-primary inline-flex items-center gap-1.5"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  Oluştur
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

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

interface DisableModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function DisableTwoFactorModal({ onClose, onSuccess }: DisableModalProps) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!password) {
      setErr("Şifre gerekli.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code: code || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Kapatılamadı");
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="2FA'yı kapat" onClose={onClose} size={480}>
      <div className="space-y-4">
        {err && (
          <AlertBanner kind="danger" onDismiss={() => setErr(null)}>
            {err}
          </AlertBanner>
        )}
        <p className="text-[13px] text-[#525252]">
          Güvenlik için şifreni yeniden gir. Opsiyonel olarak bir 6 haneli kod
          veya yedek kod da girebilirsin.
        </p>
        <Field label="Şifre" required>
          <input
            className="bz-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="Doğrulama kodu (opsiyonel)" hint="6 haneli authenticator kodu veya yedek kod">
          <input
            className="bz-input bz-mono"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000 veya XXXX-XXXX"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bz-btn-ghost">
            İptal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !password}
            className="bz-btn-primary inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            2FA'yı kapat
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default BusinessSecuritySettings;
