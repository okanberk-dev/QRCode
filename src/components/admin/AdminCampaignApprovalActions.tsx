'use client';

// Stage 29 §38.105 — Admin campaign approval/reject action panel.
//
// Detail page'de mount edilir; Modal primitive (CLAUDE.md §11.1 focus trap)
// + useConfirmDialog (CLAUDE.md §11.18) ile approve + reject akışları.
// Reject note min 20 char zorunlu (CLAUDE.md §38.96 paterni).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';

interface Props {
  campaignId: string;
  status: string;
  isTr: boolean;
  /** Disabled state — pending_approval dışında approve/reject butonları kapalı. */
  disabled?: boolean;
}

export default function AdminCampaignApprovalActions({
  campaignId,
  status,
  isTr,
  disabled,
}: Props) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const noteValid = openModal === 'approve' || (openModal === 'reject' && note.trim().length >= 20);

  const submit = async () => {
    if (!openModal || submitting) return;
    if (openModal === 'reject' && note.trim().length < 20) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const path =
        openModal === 'approve'
          ? `/api/admin/campaigns/${campaignId}/approve`
          : `/api/admin/campaigns/${campaignId}/reject`;
      const body =
        openModal === 'approve'
          ? note.trim() ? { note: note.trim() } : {}
          : { note: note.trim() };
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string }
        | null;
      if (!res.ok || !payload?.ok) {
        setNotice({
          tone: 'error',
          text:
            payload?.message ||
            payload?.error ||
            (isTr ? 'İşlem başarısız.' : 'Action failed.'),
        });
        return;
      }
      setNotice({
        tone: 'ok',
        text:
          openModal === 'approve'
            ? isTr
              ? 'Kampanya onaylandı ve gönderildi.'
              : 'Campaign approved and sent.'
            : isTr
              ? 'Kampanya reddedildi.'
              : 'Campaign rejected.',
      });
      setOpenModal(null);
      setNote('');
      // Refresh detail page server data.
      router.refresh();
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'fetch failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (status !== 'pending_approval') {
    return notice ? (
      <AlertBanner kind={notice.tone === 'error' ? 'danger' : 'success'}>
        {notice.text}
      </AlertBanner>
    ) : null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setOpenModal('approve');
            setNote('');
          }}
          disabled={disabled || submitting}
          className="bz-btn-primary flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 size={14} />
          {isTr ? 'Onayla ve gönder' : 'Approve & send'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpenModal('reject');
            setNote('');
          }}
          disabled={disabled || submitting}
          className="bz-btn-ghost flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] text-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle size={14} />
          {isTr ? 'Reddet' : 'Reject'}
        </button>
      </div>

      {notice && (
        <div className="mt-3">
          <AlertBanner
            kind={notice.tone === 'error' ? 'danger' : 'success'}
            onDismiss={() => setNotice(null)}
          >
            {notice.text}
          </AlertBanner>
        </div>
      )}

      {openModal && (
        <Modal
          onClose={() => {
            if (!submitting) setOpenModal(null);
          }}
          ariaLabel={
            openModal === 'approve'
              ? isTr
                ? 'Kampanyayı onayla'
                : 'Approve campaign'
              : isTr
                ? 'Kampanyayı reddet'
                : 'Reject campaign'
          }
          size={560}
        >
          <div className="p-5 sm:p-6">
            <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-2">
              {isTr ? 'KAMPANYA İNCELEMESİ' : 'CAMPAIGN REVIEW'}
            </div>
            <h2 className="bz-h-tight text-[18px] mb-3">
              {openModal === 'approve'
                ? isTr
                  ? 'Kampanyayı onayla ve gönder'
                  : 'Approve & send campaign'
                : isTr
                  ? 'Kampanyayı reddet'
                  : 'Reject campaign'}
            </h2>

            {openModal === 'approve' ? (
              <AlertBanner kind="info" icon={<AlertTriangle size={14} />}>
                {isTr
                  ? 'Kampanya onaylandığında Buaze Resend pipeline\'ı pazarlama onaylı müşterilere kampanyayı otomatik teslim eder. Bu işlem geri alınamaz.'
                  : 'Once approved, Buaze auto-delivers the campaign to opted-in customers via Resend. This cannot be undone.'}
              </AlertBanner>
            ) : (
              <AlertBanner kind="warn" icon={<AlertTriangle size={14} />}>
                {isTr
                  ? 'Reddetme nedeni owner\'a e-posta ile gönderilir. En az 20 karakter girmelisin (forensic audit gereği).'
                  : 'Rejection reason is emailed to the owner. Minimum 20 characters (forensic audit requirement).'}
              </AlertBanner>
            )}

            <div className="mt-4">
              <label
                htmlFor="reviewer-note"
                className="block pulse-eyebrow text-[10.5px] text-[#737373] mb-1.5"
              >
                {openModal === 'approve'
                  ? isTr
                    ? 'NOT (OPSİYONEL)'
                    : 'NOTE (OPTIONAL)'
                  : isTr
                    ? 'GEREKÇE *'
                    : 'REASON *'}
              </label>
              <textarea
                id="reviewer-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                rows={5}
                maxLength={1000}
                disabled={submitting}
                placeholder={
                  openModal === 'approve'
                    ? isTr
                      ? 'Owner için isteğe bağlı not (kayıt edilir)…'
                      : 'Optional note for the owner (recorded)…'
                    : isTr
                      ? 'Owner\'a iletilecek gerekçe — en az 20 karakter…'
                      : 'Reason to share with the owner — minimum 20 characters…'
                }
                className="bz-input w-full text-[13px] resize-y"
              />
              {openModal === 'reject' && (
                <div className="mt-1.5 text-[11px] text-[#737373] bz-mono">
                  {note.trim().length} / 1000
                  {note.trim().length < 20 && (
                    <span className="text-[#DC2626]"> · {isTr ? 'min 20' : 'min 20'}</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-4 border-t border-[#EDEDED]">
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                disabled={submitting}
                className="bz-btn-ghost px-4 min-h-[40px] text-[12.5px]"
              >
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || !noteValid}
                className={`flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed ${
                  openModal === 'approve' ? 'bz-btn-primary' : 'bz-btn-primary'
                }`}
                style={
                  openModal === 'reject'
                    ? { background: '#DC2626', color: '#FFFFFF' }
                    : undefined
                }
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : openModal === 'approve' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {openModal === 'approve'
                  ? isTr
                    ? 'Onayla ve gönder'
                    : 'Approve & send'
                  : isTr
                    ? 'Reddet'
                    : 'Reject'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
