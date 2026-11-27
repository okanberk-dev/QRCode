'use client';

import { useState } from 'react';
import { Eye, Loader2, ShieldAlert } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';

// Stage A4 §38.96 — admin "Owner gibi gör" CTA + modal.
//
// /admin/members/[id] page'inde mount edilir. Süperadmin / impersonation:write
// permission'lı manager için support workflow giriş noktası.
//
// Modal: reason input (min 20 char) + 30dk timer disclosure + KVKK consent
// checkbox. Confirm → POST /api/admin/impersonate → redirect /tr/dashboard
// (target user'ın locale'ine göre).

interface Props {
  targetUserId: string;
  targetEmail: string;
  targetName: string | null;
  /** isActive=false owner için disabled. */
  disabled?: boolean;
}

export default function ImpersonateButton({
  targetUserId,
  targetEmail,
  targetName,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason('');
    setConsent(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    reset();
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 20) {
      setError('Sebep en az 20 karakter olmalı.');
      return;
    }
    if (!consent) {
      setError('Devam etmek için KVKK bilgilendirmesini onaylaman gerekiyor.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, reason: reason.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) {
          setError('Bu işlem için yetkiniz yok.');
        } else if (res.status === 429) {
          const retry = j.retryAfter ? Math.ceil(j.retryAfter / 60) : 60;
          setError(`Saatte 3 oturumdan fazla açılamaz. ${retry} dk sonra tekrar dene.`);
        } else if (res.status === 400 && j.error === 'target_inactive') {
          setError('Bu hesap pasifleştirilmiş — önce aktive edin.');
        } else if (res.status === 404) {
          setError('Hesap bulunamadı. Sayfayı yenileyip tekrar dene.');
        } else {
          // Raw API codes (impersonate_failed, invalid_json…) are not shown.
          setError('Oturum başlatılamadı. Lütfen tekrar dene.');
        }
        setSubmitting(false);
        return;
      }
      // Hard navigation — cookie tarafı sunucu tarafında kuruldu, client refresh
      // gerekiyor. Target user'ın dashboard'ı açılır + impersonation banner görünür.
      const target = typeof j.redirectTo === 'string' ? j.redirectTo : '/tr/dashboard';
      window.location.href = target;
    } catch {
      setError('Bağlantı hatası.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="bz-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          disabled
            ? 'Pasifleştirilmiş hesap için kullanılamaz'
            : 'Hesap sahibinin panelini onun gözünden görüntüle'
        }
      >
        <Eye size={14} strokeWidth={2} />
        <span>Owner gibi gör</span>
      </button>

      {open && (
        <Modal
          size={560}
          onClose={handleClose}
          title={
            // The Modal title slot truncates to one line; this header is a
            // multi-line block, so let it wrap.
            <div className="whitespace-normal">
              <p className="text-[13px] font-medium text-[#737373]">DESTEK OTURUMU</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-pn-ink">
                {targetName || targetEmail} olarak görüntüle
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#525252]">
                Hesap sahibinin paneline 30 dakikalık geçici erişim açılacak.
                Oturum işlem kaydına yazılır, müşteriye bilgilendirme maili gider.
              </p>
            </div>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            {error && <AlertBanner kind="danger">{error}</AlertBanner>}

            {/* KVKK disclosure — plain-language summary of what happens */}
            <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E]">
              <div className="flex items-start gap-2">
                <ShieldAlert size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Bu oturumda neler olur?</strong>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90">
                    <li>30 dakika sonra otomatik kapanır, istediğin an da çıkabilirsin</li>
                    <li>Müşteriye bilgilendirme maili gider</li>
                    <li>Başlangıç ve bitiş işlem kaydına yazılır</li>
                    <li>Saatte en fazla 3 oturum açılabilir</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="impersonate-reason"
                className="text-[12px] font-medium text-[#6B7280] ml-1"
              >
                Sebep (en az 20 karakter, işlem kaydına yazılır) *
              </label>
              <textarea
                id="impersonate-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Destek talebi #4521 — işletme sahibi QR kodunu indirirken hata aldığını bildirdi, kontrol etmek için."
                maxLength={500}
                className="w-full rounded-[20px] border border-pn-line bg-white px-4 py-3 text-[13px] text-pn-ink outline-none focus:ring-2 focus:ring-pn-accent resize-none"
              />
              <p className="text-[12px] text-[#737373] tabular-nums">
                {reason.trim().length}/500 karakter (minimum 20)
              </p>
            </div>

            <label className="flex items-start gap-2 text-[12px] text-pn-ink cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-pn-line text-pn-ink focus:ring-pn-accent"
              />
              <span>
                Bu oturumun KVKK kapsamında müşteriye mail ile bildirileceğini ve işlem
                kaydına yazılacağını onaylıyorum.
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-pn-line">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="bz-btn-ghost"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting || reason.trim().length < 20 || !consent}
                className="bz-btn-primary disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Eye size={14} strokeWidth={2} />
                )}
                {submitting ? 'Açılıyor…' : 'Oturumu başlat'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
