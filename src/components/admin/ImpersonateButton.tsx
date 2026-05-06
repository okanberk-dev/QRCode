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
      setError('Devam etmek için KVKK disclosure onayı zorunlu.');
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
          setError('Bu işlem için yetkiniz yok (impersonation:write).');
        } else if (res.status === 429) {
          const retry = j.retryAfter ? Math.ceil(j.retryAfter / 60) : 60;
          setError(`Saatte 3 oturumdan fazla açılamaz. ${retry} dk sonra tekrar dene.`);
        } else if (res.status === 400 && j.error === 'target_inactive') {
          setError('Bu hesap pasifleştirilmiş — önce aktive edin.');
        } else {
          setError(j.error || 'Oturum başlatılamadı.');
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
        className="bz-btn-ghost w-full justify-start disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          disabled
            ? 'Pasifleştirilmiş hesap için kullanılamaz'
            : 'Hesap sahibi gibi panel\'i görüntüle (support workflow)'
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
            <div>
              <p className="pulse-eyebrow text-[#737373]">SUPPORT WORKFLOW</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
                {targetName || targetEmail} olarak görüntüle
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#525252]">
                Hesap sahibinin panel&apos;ine 30 dakikalık geçici erişim açılacak.
                İşlem audit log&apos;a kaydedilir, müşteriye bilgilendirme maili gider.
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

            {/* KVKK + audit disclosure */}
            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E]">
              <div className="flex items-start gap-2">
                <ShieldAlert size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>KVKK + audit transparency</strong>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90">
                    <li>30 dakika sonra otomatik kapanır (manuel çıkış da yapılabilir)</li>
                    <li>Müşteriye anlık mail bildirimi gider (KVKK §13.9)</li>
                    <li>AdminAuditLog&apos;a 2 entry: start + end</li>
                    <li>Sentry tag&apos;li (ops monitoring)</li>
                    <li>Saatte 3 oturum üst sınırı (abuse önleme)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="impersonate-reason"
                className="text-[11px] font-semibold text-[#6B7280] ml-1"
              >
                Sebep (min 20 karakter, audit log&apos;a kaydedilir) *
              </label>
              <textarea
                id="impersonate-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Customer support ticket #4521 — owner QR kod indirme akışında 500 hatası raporladı, kontrol etmek için."
                maxLength={500}
                className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E] resize-none"
              />
              <p className="text-[10.5px] text-[#737373] tabular-nums">
                {reason.trim().length}/500 karakter (minimum 20)
              </p>
            </div>

            <label className="flex items-start gap-2 text-[12px] text-[#0A0A0A] cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#EDEDED] text-[#0A0A0A] focus:ring-[#C6F24E]"
              />
              <span>
                Bu işlem KVKK transparency disipline&apos;e uygun yapılacaktır. Müşteriye anlık
                mail bildirimi gönderileceğini, audit log&apos;a kaydedileceğini onaylıyorum.
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-[#EDEDED]">
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
