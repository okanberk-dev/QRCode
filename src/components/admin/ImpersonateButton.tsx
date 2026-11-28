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
      setError('Sebebi en az 20 karakterle yaz.');
      return;
    }
    if (!consent) {
      setError('Oturumu başlatmak için alttaki onay kutusunu işaretle.');
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
          setError('Destek oturumu açma yetkin yok.');
        } else if (res.status === 429) {
          const retry = j.retryAfter ? Math.ceil(j.retryAfter / 60) : 60;
          setError(`Saatte en çok 3 oturum açılabilir. ${retry} dk sonra yeniden dene.`);
        } else if (res.status === 400 && j.error === 'target_inactive') {
          setError('Bu hesap silinmiş (arşivde). Önce hesabı geri getir.');
        } else if (res.status === 404) {
          setError('Hesap bulunamadı. Sayfayı yenileyip yeniden dene.');
        } else {
          // Raw API codes (impersonate_failed, invalid_json…) are not shown.
          setError('Oturum başlatılamadı. Biraz sonra yeniden dene.');
        }
        setSubmitting(false);
        return;
      }
      // Hard navigation — cookie tarafı sunucu tarafında kuruldu, client refresh
      // gerekiyor. Target user'ın dashboard'ı açılır + impersonation banner görünür.
      const target = typeof j.redirectTo === 'string' ? j.redirectTo : '/tr/dashboard';
      window.location.href = target;
    } catch {
      setError('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.');
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
            ? 'Silinmiş (arşivdeki) hesap için kullanılamaz'
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
          title="Destek oturumu başlat"
          description={
            <>
              <strong className="break-words font-medium text-pn-ink">{targetName || targetEmail}</strong>{' '}
              hesabının panelini 30 dakika boyunca hesap sahibi gibi görür ve kullanırsın.
            </>
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

            {/* Plain-language summary of what the session does */}
            <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] p-4 text-[13px] leading-[1.5] text-[#92400E]">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium">Başlatınca ne olur?</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Hesap sahibine bilgilendirme e-postası gider.</li>
                    <li>Başlangıç, bitiş ve yazdığın sebep işlem kaydına yazılır.</li>
                    <li>30 dakika sonra kendiliğinden kapanır; üstteki şeritten istediğin an çıkabilirsin.</li>
                    <li>Saatte en çok 3 oturum açabilirsin.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="impersonate-reason"
                className="mb-2 block text-[14px] font-medium leading-[1.3] text-pn-ink"
              >
                Oturumun sebebi
                <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
              </label>
              <p id="impersonate-reason-hint" className="mb-2 text-[13px] leading-[1.45] text-[#737373]">
                En az 20 karakter. Hangi destek talebi için açtığını yaz.
              </p>
              <textarea
                id="impersonate-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Destek talebi #4521. İşletme sahibi QR kodunu indirirken hata aldığını bildirdi, kontrol edeceğim."
                maxLength={500}
                aria-describedby="impersonate-reason-hint impersonate-reason-count"
                className="w-full resize-none rounded-[20px] border border-pn-line bg-white px-4 py-3 text-[16px] text-pn-ink outline-none focus:ring-2 focus:ring-pn-accent sm:text-[14px]"
              />
              <p id="impersonate-reason-count" className="mt-1 text-[12px] tabular-nums text-[#737373]">
                {reason.trim().length < 20
                  ? `${reason.trim().length}/500 · ${20 - reason.trim().length} karakter daha yaz`
                  : `${reason.trim().length}/500`}
              </p>
            </div>

            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] leading-[1.5] text-pn-ink">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-pn-line text-pn-ink focus:ring-pn-accent"
              />
              <span>
                KVKK gereği hesap sahibine e-postayla bildirim gideceğini ve oturumun işlem
                kaydına yazılacağını onaylıyorum.
              </span>
            </label>

            <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="bz-btn-ghost"
              >
                Vazgeç
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
                {submitting ? 'Oturum açılıyor…' : 'Oturumu başlat'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
