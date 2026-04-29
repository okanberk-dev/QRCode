"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { AlertBanner, Field, Modal } from "@/components/ui";

interface TwoFactorSetupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (backupCodes: string[]) => void;
}

/**
 * Section 8 — 2FA setup modal (Faz 3).
 *
 * Adım 1: POST /api/account/2fa/setup → secret + otpauthUrl gelir.
 *   QR yerine secret + otpauth bağlantısı gösterilir (qr lib YOK — CLAUDE.md §7).
 *   Kullanıcı authenticator uygulamasına manuel girer veya bağlantıyı tıklar.
 * Adım 2: 6 haneli kod input → POST /api/account/2fa/verify.
 *   Başarı durumunda backup codes parent'a iletilir.
 *
 * QR generation deferred — `qrcode` npm dep zaten projede var (qrcode kullanılıyor)
 * ama client-side QR için ekstra UI complexity → MVP'de manuel girişi yeterli kabul.
 */
export function TwoFactorSetupModal({ open, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchSetup = async () => {
      setLoading(true);
      setError(null);
      setStep("setup");
      try {
        const res = await fetch("/api/account/2fa/setup", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "2FA başlatılamadı.");
        }
        const data = await res.json();
        if (cancelled) return;
        setSecret(data.secret);
        setOtpauthUrl(data.otpauthUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Hata");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchSetup();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Kod 6 haneli olmalı.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Doğrulama başarısız.");
      onSuccess(data.backupCodes ?? []);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <Modal title="İki adımlı doğrulamayı kur" onClose={onClose} size={520}>
      {error && (
        <div className="mb-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      {loading && step === "setup" && (
        <div className="flex items-center gap-2 text-[13px] text-[#737373] py-6">
          <Loader2 size={14} className="animate-spin" />
          Hazırlanıyor…
        </div>
      )}

      {!loading && step === "setup" && secret && (
        <div className="space-y-4">
          <p className="text-[13px] text-[#525252]">
            <strong>1.</strong> Telefonunda Google Authenticator, 1Password veya
            benzeri bir uygulama aç. <strong>2.</strong> Aşağıdaki gizli anahtarı
            uygulamaya gir veya bağlantıyı tıkla:
          </p>
          <div
            className="flex items-center gap-2 p-3 bz-mono text-[13px]"
            style={{ background: "#FAFAFA", border: "1px solid #EDEDED", borderRadius: 10 }}
          >
            <span className="flex-1 break-all">{secret}</span>
            <button
              type="button"
              onClick={copySecret}
              className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
              style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
          <a
            href={otpauthUrl}
            className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12.5px]"
            style={{ height: 32, padding: "0 12px", borderRadius: 999 }}
          >
            <ShieldCheck size={14} />
            Otomatik bağlantı (mobilde aç)
          </a>
          <p className="text-[12.5px] text-[#525252]">
            <strong>3.</strong> Uygulama 6 haneli bir kod üretecek. Aşağıya gir:
          </p>
          <Field label="Doğrulama kodu">
            <input
              className="bz-input bz-mono"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: 18 }}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bz-btn-ghost">
              İptal
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="bz-btn-primary inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Doğrula ve aktifleştir
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default TwoFactorSetupModal;
