"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Undo2 } from "lucide-react";
import type { Locale } from "@/lib/translations";
import { AlertBanner } from "@/components/ui";
import { resolveDisplayTimeZone } from "@/lib/timezone";

// Wave B4 (CLAUDE.md §38.B + §38.193) — Account Danger Zone card.
// Originally removed in Stage 79 §38.159 because backend was a placeholder;
// reintroduced now that POST /api/account/delete + POST
// /api/account/delete/cancel are live. Mount inside SettingsSection
// id="security" so the destructive control lives next to password + 2FA.
//
// State machine (driven by `scheduledDeletionAt` prop from /api/user/profile):
//   - null              → "Delete account" CTA + native confirm dialog
//   - DateTime          → Countdown card + "Vazgeç" CTA (inline cancel)
//
// Cancel flow can also be exercised from the mail link (GET /cancel?token=...)
// but this in-app button gives the owner a cancel path without leaving the
// panel. Both code paths fire the `account-deletion-canceled` mail.

export interface AccountDangerZoneProps {
  locale?: Locale;
  /** From /api/user/profile GET. ISO-string when scheduled, null otherwise. */
  scheduledDeletionAt: string | null;
  /** Account email — surfaces in the confirm prompt + audit card. */
  accountEmail: string;
}

function formatDaysRemaining(scheduledAt: Date, now: Date = new Date()): number {
  const ms = scheduledAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function AccountDangerZone({
  locale = "tr",
  scheduledDeletionAt,
  accountEmail,
}: AccountDangerZoneProps) {
  const isTr = locale === "tr";
  const [scheduled, setScheduled] = useState<string | null>(scheduledDeletionAt);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  async function handleSchedule() {
    if (busy) return;
    // Native confirm — sufficient for a destructive action that already has
    // a 30-day mail-driven undo path. Keeps the component free of modal
    // primitive plumbing.
    const promptLine = isTr
      ? `Hesabını silmek istediğinden emin misin? Onaylamak için aşağıya hesap e-postanı yaz:\n\n${accountEmail}`
      : `Are you sure you want to delete your account? Type your account email below to confirm:\n\n${accountEmail}`;
    const typed = window.prompt(promptLine, "");
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== accountEmail.toLowerCase()) {
      setNotice({
        kind: "danger",
        text: isTr
          ? "E-posta eşleşmedi. Hesap silme iptal edildi."
          : "Email did not match. Account deletion canceled.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        const body = (await res.json()) as { scheduledFor: string; daysRemaining: number };
        setScheduled(body.scheduledFor);
        setNotice({
          kind: "success",
          text: isTr
            ? "Hesap silme planlandı. Onay e-postası gelen kutuna gönderildi. 30 gün içinde istediğin zaman vazgeçebilirsin."
            : "Account deletion scheduled. A confirmation mail is on its way. You can cancel anytime in the next 30 days.",
        });
        // CLAUDE.md §37.2.A — every session was revoked server-side. The
        // current cookie will start returning 401 on the next request,
        // forcing a re-login. Give the owner a beat to read the notice
        // before kicking them out.
        window.setTimeout(() => {
          window.location.href = `/${locale}/auth/login`;
        }, 4000);
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setNotice({
          kind: "danger",
          text:
            body.message ||
            body.error ||
            (isTr ? "Hesap silme planlanamadı." : "Could not schedule account deletion."),
        });
      }
    } catch {
      setNotice({
        kind: "danger",
        text: isTr ? "Ağ hatası — tekrar dene." : "Network error — please retry.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete/cancel", { method: "POST" });
      if (res.ok) {
        setScheduled(null);
        setNotice({
          kind: "success",
          text: isTr
            ? "Hesap silme iptal edildi. Bilgilendirme e-postası gelen kutuna gönderildi."
            : "Account deletion canceled. A confirmation mail is on its way.",
        });
      } else {
        setNotice({
          kind: "danger",
          text: isTr ? "İptal başarısız." : "Cancel failed.",
        });
      }
    } catch {
      setNotice({
        kind: "danger",
        text: isTr ? "Ağ hatası — tekrar dene." : "Network error — please retry.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      {notice && (
        <AlertBanner kind={notice.kind === "success" ? "success" : "danger"} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AlertBanner>
      )}

      <div className="rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[24px] bg-[#FEE2E2] text-[#991B1B] ring-1 ring-black/5">
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0">
              <p className="bz-h-tight text-[16px] font-medium text-pn-ink">
                {isTr ? "Tehlikeli bölge — Hesabı sil" : "Danger zone — Delete account"}
              </p>
              <p className="mt-1 max-w-[520px] text-[13px] leading-[1.55] text-[#525252]">
                {isTr
                  ? "Hesabını silmek tüm işletme, yorum, QR, abonelik ve oturum geçmişini kalıcı olarak kaldırır. Yasal zorunluluk gereği mali kayıtlar anonimleştirilerek 10 yıl saklanır. Silme işlemi 30 günlük bekleme süresinin sonunda yapılır; bu süre içinde istediğin an vazgeçebilirsin."
                  : "Deleting your account permanently removes all businesses, reviews, QR codes, subscription and session history. Financial records are kept anonymised for 10 years as required by law. The deletion runs at the end of a 30-day waiting period — you can cancel at any time before then."}
              </p>
            </div>
          </div>

          {scheduled ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="inline-flex items-center gap-2 self-start rounded-full bg-pn-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-pn-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
              {isTr ? "Silmeyi iptal et" : "Cancel deletion"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSchedule}
              disabled={busy}
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#991B1B] bg-white px-4 py-2 text-[13px] font-medium text-[#991B1B] transition-colors hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              {isTr ? "Hesabı sil" : "Delete account"}
            </button>
          )}
        </div>

        {scheduled && (
          <div className="mt-5 rounded-[24px] border border-[#FECACA] bg-white p-4">
            <p className="text-[12px] font-medium text-[#737373]">
              {isTr ? "Silme planı aktif" : "Deletion scheduled"}
            </p>
            <p className="mt-2 text-[13px] text-pn-ink">
              {isTr
                ? `Hesabın ${new Date(scheduled).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: resolveDisplayTimeZone() })} tarihinde silinecek (${formatDaysRemaining(new Date(scheduled))} gün kaldı).`
                : `Your account will be deleted on ${new Date(scheduled).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: resolveDisplayTimeZone() })} (${formatDaysRemaining(new Date(scheduled))} days remaining).`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
