'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Mail,
  Tag,
  Archive,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';
import { Modal, useConfirmDialog } from '@/components/ui';
import type { CustomerSegment } from '@/lib/customers';
import type { Locale } from '@/lib/translations';

// §38.48 Wave 2 — Customers bulk action bar (CLAUDE.md §23.3.1 paterni).
// Page server component renders the table; bu client island'ı mount edip:
//   - selectedKeys state taşır (filter değişiminde clear, CLAUDE.md §11.21)
//   - Tablodaki .bz-customer-checkbox elementlerini hydrate eder
//   - Floating bottom toolbar (selection > 0)
//   - 3 modal (Campaign compose / Segment picker / Archive confirm)
//   - POST /api/customers/bulk + auto-refresh router

interface CustomersBulkBarProps {
  locale: Locale;
  /** Whether the parent list shows archived rows (`?showArchived=1`).
   *  When true, default action becomes "Geri al" (unarchive) instead of archive. */
  showArchived?: boolean;
}

const SEGMENT_OPTIONS: Array<{ key: CustomerSegment; tr: string; en: string }> = [
  { key: 'vip', tr: 'VIP', en: 'VIP' },
  { key: 'loyal', tr: 'Düzenli', en: 'Loyal' },
  { key: 'new', tr: 'Yeni', en: 'New' },
  { key: 'risk', tr: 'Risk', en: 'Risk' },
  { key: 'churned', tr: 'Kayıp', en: 'Churned' },
];

type BulkBusy = 'archive' | 'unarchive' | 'segment' | 'campaign' | null;

export default function CustomersBulkBar({ locale, showArchived = false }: CustomersBulkBarProps) {
  const router = useRouter();
  const isTr = locale === 'tr';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BulkBusy>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  // Hydrate checkbox elements rendered by the server. `data-customer-key`
  // attribute on each <input type="checkbox"> in the table tells us the row
  // key. Header checkbox carries `data-select-all`.
  useEffect(() => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('[data-customer-key]');
    const selectAll = document.querySelector<HTMLInputElement>('[data-select-all]');

    const onChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const key = target.dataset.customerKey;
      if (!key) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (target.checked) next.add(key);
        else next.delete(key);
        return next;
      });
    };

    const onSelectAll = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const allKeys = Array.from(checkboxes)
        .map((cb) => cb.dataset.customerKey)
        .filter((k): k is string => Boolean(k));
      // Lock state machine to avoid feedback loops: we set new Set, then
      // sync each row checkbox to match.
      if (target.checked) {
        setSelected(new Set(allKeys));
        checkboxes.forEach((cb) => {
          cb.checked = true;
        });
      } else {
        setSelected(new Set());
        checkboxes.forEach((cb) => {
          cb.checked = false;
        });
      }
    };

    checkboxes.forEach((cb) => cb.addEventListener('change', onChange));
    selectAll?.addEventListener('change', onSelectAll);
    return () => {
      checkboxes.forEach((cb) => cb.removeEventListener('change', onChange));
      selectAll?.removeEventListener('change', onSelectAll);
    };
  }, []);

  // When filter changes (URL changes → server re-render → checkbox elements
  // re-mount with new keys), reset selection.
  useEffect(() => {
    setSelected(new Set());
  }, []);

  // Sync select-all indeterminate state.
  useEffect(() => {
    const selectAll = document.querySelector<HTMLInputElement>('[data-select-all]');
    if (!selectAll) return;
    const all = document.querySelectorAll<HTMLInputElement>('[data-customer-key]').length;
    selectAll.checked = selected.size > 0 && selected.size === all;
    selectAll.indeterminate = selected.size > 0 && selected.size < all;
  }, [selected]);

  // 3.5s success/error notice auto-dismiss.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const count = selected.size;

  if (count === 0 && !confirmDialog && !campaignOpen && !segmentOpen && !notice) {
    return null;
  }

  async function postBulk(action: string, payload?: Record<string, unknown>) {
    const res = await fetch('/api/customers/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: Array.from(selected), action, payload }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  }

  function onArchiveClick() {
    askConfirm({
      title: isTr ? 'Müşteri arşivle' : 'Archive customers',
      body: isTr
        ? `${count} müşteriyi arşivleyeceksin. Listeden gizlenir; "Arşiv" toggle ile geri görebilirsin.`
        : `Archive ${count} customer${count === 1 ? '' : 's'}? They'll be hidden from the list; toggle "Archive" to view them again.`,
      confirmLabel: isTr ? 'Arşivle' : 'Archive',
      variant: 'default',
      onConfirm: async () => {
        setBusy('archive');
        const { ok, body } = await postBulk('archive');
        setBusy(null);
        if (ok) {
          setNotice({
            tone: 'success',
            text: isTr
              ? `${body.processed ?? 0} müşteri arşivlendi.`
              : `${body.processed ?? 0} customer${body.processed === 1 ? '' : 's'} archived.`,
          });
          setSelected(new Set());
          router.refresh();
        } else {
          setNotice({
            tone: 'error',
            text: body?.error || (isTr ? 'Arşivleme başarısız' : 'Archive failed'),
          });
        }
      },
    });
  }

  async function onUnarchive() {
    setBusy('unarchive');
    const { ok, body } = await postBulk('unarchive');
    setBusy(null);
    if (ok) {
      setNotice({
        tone: 'success',
        text: isTr
          ? `${body.processed ?? 0} müşteri geri yüklendi.`
          : `${body.processed ?? 0} customer${body.processed === 1 ? '' : 's'} restored.`,
      });
      setSelected(new Set());
      router.refresh();
    } else {
      setNotice({
        tone: 'error',
        text: body?.error || (isTr ? 'İşlem başarısız' : 'Operation failed'),
      });
    }
  }

  async function onSegmentApply(segment: CustomerSegment) {
    setBusy('segment');
    const { ok, body } = await postBulk('set_segment', { segment });
    setBusy(null);
    setSegmentOpen(false);
    if (ok) {
      setNotice({
        tone: 'success',
        text: isTr
          ? `${body.processed ?? 0} müşteri segmenti güncellendi.`
          : `${body.processed ?? 0} customer segment${body.processed === 1 ? '' : 's'} updated.`,
      });
      setSelected(new Set());
      router.refresh();
    } else {
      setNotice({
        tone: 'error',
        text: body?.error || (isTr ? 'Segment güncellemesi başarısız' : 'Segment update failed'),
      });
    }
  }

  async function onCampaignSubmit(subject: string, messageBody: string) {
    if (!subject.trim() || !messageBody.trim()) return;
    setBusy('campaign');
    const { ok, body } = await postBulk('send_campaign', {
      subject: subject.trim(),
      body: messageBody.trim(),
      locale,
    });
    setBusy(null);
    setCampaignOpen(false);
    if (ok) {
      setNotice({
        tone: 'success',
        text: isTr
          ? `${body.processed ?? 0} müşteriye kampanya gönderildi${body.skipped ? `, ${body.skipped} atlandı (KVKK izni yok)` : ''}.`
          : `Campaign sent to ${body.processed ?? 0}${body.skipped ? `, ${body.skipped} skipped (no KVKK consent)` : ''}.`,
      });
      setSelected(new Set());
      router.refresh();
    } else {
      setNotice({
        tone: 'error',
        text: body?.error || (isTr ? 'Kampanya gönderilemedi' : 'Campaign failed'),
      });
    }
  }

  return (
    <>
      {/* Floating bottom toolbar */}
      {count > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 inset-x-4 sm:inset-x-auto">
          <div className="mx-auto max-w-[640px] rounded-2xl border border-[#0A0A0A] bg-white bz-elev-2 px-4 py-2.5 flex items-center gap-2 flex-wrap">
            <span className="bz-mono text-[12px] tabular-nums text-[#0A0A0A]" aria-live="polite">
              {count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
              {isTr ? 'seçildi' : 'selected'}
            </span>
            <div className="h-4 w-px bg-[#EDEDED]" />
            {!showArchived && (
              <button
                type="button"
                onClick={() => setCampaignOpen(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#A8D62E] bg-[#EAF9B8] px-3 py-1 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#C6F24E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail size={12} strokeWidth={2.2} />
                {isTr ? 'Kampanya' : 'Campaign'}
              </button>
            )}
            {!showArchived && (
              <button
                type="button"
                onClick={() => setSegmentOpen(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[12px] font-medium text-[#525252] hover:border-[#A3A3A3] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Tag size={12} strokeWidth={2.2} />
                {isTr ? 'Segmentle' : 'Set segment'}
              </button>
            )}
            {showArchived ? (
              <button
                type="button"
                onClick={onUnarchive}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[12px] font-medium text-[#525252] hover:border-[#A3A3A3] disabled:opacity-50"
              >
                {busy === 'unarchive' ? (
                  <Loader2 size={12} strokeWidth={2.2} className="animate-spin" />
                ) : (
                  <ArchiveRestore size={12} strokeWidth={2.2} />
                )}
                {isTr ? 'Geri al' : 'Restore'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onArchiveClick}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[12px] font-medium text-[#525252] hover:border-[#A3A3A3] disabled:opacity-50"
              >
                {busy === 'archive' ? (
                  <Loader2 size={12} strokeWidth={2.2} className="animate-spin" />
                ) : (
                  <Archive size={12} strokeWidth={2.2} />
                )}
                {isTr ? 'Arşivle' : 'Archive'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                document
                  .querySelectorAll<HTMLInputElement>('[data-customer-key]')
                  .forEach((cb) => {
                    cb.checked = false;
                  });
              }}
              className="ml-auto inline-flex items-center justify-center rounded-full border border-[#EDEDED] bg-white p-1.5 text-[#737373] hover:border-[#A3A3A3]"
              aria-label={isTr ? 'Seçimi temizle' : 'Clear selection'}
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      {/* Notice (success/error) — auto-dismiss 3.5s */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2 text-[12px] font-medium shadow-md ${
            notice.tone === 'success'
              ? 'bg-[#0A0A0A] text-white'
              : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Confirm dialog (archive) — modal pattern §11.18 reuse */}
      {confirmDialog}

      {/* Segment picker modal */}
      {segmentOpen && (
        <SegmentPickerModal
          isTr={isTr}
          count={count}
          busy={busy === 'segment'}
          onPick={onSegmentApply}
          onClose={() => setSegmentOpen(false)}
        />
      )}

      {/* Campaign compose modal */}
      {campaignOpen && (
        <CampaignComposeModal
          isTr={isTr}
          count={count}
          busy={busy === 'campaign'}
          onSubmit={onCampaignSubmit}
          onClose={() => setCampaignOpen(false)}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Segment picker modal
// ──────────────────────────────────────────────────────────────────────────

function SegmentPickerModal({
  isTr,
  count,
  busy,
  onPick,
  onClose,
}: {
  isTr: boolean;
  count: number;
  busy: boolean;
  onPick: (segment: CustomerSegment) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<CustomerSegment>('loyal');
  return (
    <Modal onClose={onClose} size={420} title={isTr ? 'Segmente ekle' : 'Set segment'}>
      <div className="space-y-3">
        <p className="text-[13px] text-[#525252]">
          {isTr
            ? `${count} müşteri için manuel segment ataması yapılır. Otomatik segment yerine bu değer gösterilir.`
            : `Manual segment for ${count} customer${count === 1 ? '' : 's'}. Replaces the auto-derived segment.`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SEGMENT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPicked(opt.key)}
              className={`rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
                picked === opt.key
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3]'
              }`}
            >
              {isTr ? opt.tr : opt.en}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="bz-btn-ghost"
          >
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onPick(picked)}
            disabled={busy}
            className="bz-btn-primary inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {isTr ? 'Uygula' : 'Apply'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Campaign compose modal
// ──────────────────────────────────────────────────────────────────────────

function CampaignComposeModal({
  isTr,
  count,
  busy,
  onSubmit,
  onClose,
}: {
  isTr: boolean;
  count: number;
  busy: boolean;
  onSubmit: (subject: string, body: string) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const canSend = subject.trim().length > 0 && body.trim().length > 0 && !busy;

  return (
    <Modal onClose={onClose} size={600} title={isTr ? 'Kampanya gönder' : 'Send campaign'}>
      <div className="space-y-3.5">
        <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#92400E]">
          <strong>KVKK:</strong>{' '}
          {isTr
            ? 'Sadece pazarlama izni veren müşterilere gönderilir. İzin yoksa otomatik atlanır.'
            : 'Only customers who opted into marketing get this. Others are auto-skipped.'}
        </div>
        <label className="block">
          <span className="pulse-eyebrow text-[#737373]">{isTr ? 'KONU' : 'SUBJECT'}</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={150}
            disabled={busy}
            placeholder={isTr ? 'Sana özel bir teklif…' : 'A special offer for you…'}
            className="bz-input w-full mt-1"
          />
        </label>
        <label className="block">
          <span className="pulse-eyebrow text-[#737373]">{isTr ? 'MESAJ' : 'MESSAGE'}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            disabled={busy}
            rows={8}
            placeholder={
              isTr
                ? 'Selam,\n\nSeni tekrar görmek isteriz. …'
                : 'Hi,\n\nWe\'d love to see you again. …'
            }
            className="bz-input w-full mt-1 resize-y"
          />
          <span className="text-[11px] text-[#737373] mt-0.5 block">
            {body.length}/10.000 · {isTr ? `${count} alıcı` : `${count} recipient${count === 1 ? '' : 's'}`}
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className="bz-btn-ghost">
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(subject, body)}
            disabled={!canSend}
            className="bz-btn-primary inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            <Mail size={13} strokeWidth={2} />
            {isTr ? 'Gönder' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
