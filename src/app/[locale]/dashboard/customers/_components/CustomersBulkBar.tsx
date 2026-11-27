'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Tag,
  Archive,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';
import { Modal, PanelSelectionBar, useConfirmDialog } from '@/components/ui';
import type { CustomerSegment } from '@/lib/customers';
import type { Locale } from '@/lib/translations';

// §38.48 Wave 2 — Customers bulk action bar (CLAUDE.md §23.3.1 paterni).
// The server component renders the rows with plain checkboxes
// (`data-customer-key`, header `data-select-all`). This client island:
//   - listens to them through one delegated `change` listener on document,
//     so rows that arrive later (filter change, refresh — the page stays
//     mounted because the toolbar uses `router.replace`) keep working
//   - clears the selection (state + ticked boxes) whenever the filters
//     change, so an action never hits customers that are no longer listed
//   - shows the floating bottom toolbar (selection > 0)
//   - 2 modals (segment picker / archive confirm)
//   - POST /api/customers/bulk + router.refresh()
//
// Each row is rendered twice (desktop table + mobile card, one of them
// hidden), so keys are counted uniquely and both boxes of a key are kept in
// sync.

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

type BulkBusy = 'archive' | 'unarchive' | 'segment' | null;

function rowCheckboxes(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[data-customer-key]'));
}

function uniqueKeys(boxes: HTMLInputElement[]): Set<string> {
  return new Set(
    boxes.map((cb) => cb.dataset.customerKey).filter((k): k is string => Boolean(k)),
  );
}

function untickAll() {
  rowCheckboxes().forEach((cb) => {
    cb.checked = false;
  });
  const selectAll = document.querySelector<HTMLInputElement>('[data-select-all]');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
}

export default function CustomersBulkBar({ locale, showArchived = false }: CustomersBulkBarProps) {
  const router = useRouter();
  const isTr = locale === 'tr';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BulkBusy>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  // Delegated listener — survives server re-renders that swap the rows.
  useEffect(() => {
    const onChange = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;

      if (target.hasAttribute('data-select-all')) {
        const boxes = rowCheckboxes();
        boxes.forEach((cb) => {
          cb.checked = target.checked;
        });
        setSelected(target.checked ? uniqueKeys(boxes) : new Set());
        return;
      }

      const key = target.dataset.customerKey;
      if (!key) return;
      // Keep the twin box (desktop row / mobile card) in the same state.
      rowCheckboxes().forEach((cb) => {
        if (cb !== target && cb.dataset.customerKey === key) cb.checked = target.checked;
      });
      setSelected((prev) => {
        const next = new Set(prev);
        if (target.checked) next.add(key);
        else next.delete(key);
        return next;
      });
    };
    document.addEventListener('change', onChange);
    return () => document.removeEventListener('change', onChange);
  }, []);

  // Filter change (URL changes, the rows are re-rendered in place) → drop the
  // selection. Opening / closing the detail drawer (`?detail=`) is not a
  // filter change and keeps it.
  const searchParams = useSearchParams();
  const filterKey = (() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete('detail');
    return q.toString();
  })();
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    untickAll();
    setSelected(new Set());
  }, [filterKey]);

  // Sync select-all checked / indeterminate state.
  useEffect(() => {
    const selectAll = document.querySelector<HTMLInputElement>('[data-select-all]');
    if (!selectAll) return;
    const all = uniqueKeys(rowCheckboxes()).size;
    selectAll.checked = all > 0 && selected.size === all;
    selectAll.indeterminate = selected.size > 0 && selected.size < all;
  }, [selected]);

  // 3.5s success/error notice auto-dismiss.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const count = selected.size;
  const clearSelection = () => {
    untickAll();
    setSelected(new Set());
  };

  if (count === 0 && !confirmDialog && !segmentOpen && !notice) {
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
        ? `${count} müşteri arşivlenecek ve listeden gizlenecek. "Arşiv" düğmesiyle yeniden görebilirsin.`
        : `Archive ${count} customer${count === 1 ? '' : 's'}? They'll be hidden from the list; use the "Archived" button to see them again.`,
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
          clearSelection();
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
      clearSelection();
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
      clearSelection();
      router.refresh();
    } else {
      setNotice({
        tone: 'error',
        text: body?.error || (isTr ? 'Segment güncellemesi başarısız' : 'Segment update failed'),
      });
    }
  }

  return (
    <>
      {/* Floating bottom toolbar */}
      {count > 0 && (
        <PanelSelectionBar
          count={count}
          label={isTr ? 'MÜŞTERİ SEÇİLDİ' : 'CUSTOMERS SELECTED'}
          countLocale={isTr ? 'tr-TR' : 'en-US'}
          ariaLabel={isTr ? 'Toplu müşteri işlemleri' : 'Bulk customer actions'}
          clearLabel={isTr ? 'Seçimi temizle' : 'Clear selection'}
          onClear={clearSelection}
          // CLAUDE.md §38.171 Stage 91 — bottomOffset prop kaldırıldı
          // (primitive tek pattern her panel surface'i için doğru clearance verir).
          actions={[
            ...(!showArchived
              ? [
                  {
                    key: 'segment',
                    label: isTr ? 'Segmentle' : 'Set segment',
                    icon: <Tag size={13} strokeWidth={2.2} />,
                    onClick: () => setSegmentOpen(true),
                    disabled: busy !== null,
                    variant: 'primary' as const,
                  },
                ]
              : []),
            showArchived
              ? {
                  key: 'restore',
                  label: isTr ? 'Geri al' : 'Restore',
                  icon: <ArchiveRestore size={13} strokeWidth={2.2} />,
                  onClick: onUnarchive,
                  disabled: busy !== null,
                  loading: busy === 'unarchive',
                  variant: 'lime' as const,
                }
              : {
                  key: 'archive',
                  label: isTr ? 'Arşivle' : 'Archive',
                  icon: <Archive size={13} strokeWidth={2.2} />,
                  onClick: onArchiveClick,
                  disabled: busy !== null,
                  loading: busy === 'archive',
                  variant: 'neutral' as const,
                },
          ]}
        />
      )}

      {/* Notice (success/error) — auto-dismiss 3.5s.
          §38.171 Stage 91 — mobile bottom nav clearance CSS var ile
          (eski hardcoded `bottom-20` 80px iPhone safe-area ~110px nav altında kalıyordu). */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-[calc(var(--dash-bottom-nav-h)+12px)] left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-32px)] rounded-[24px] px-4 py-2 text-center text-[12px] font-medium shadow-md lg:bottom-20 ${
            notice.tone === 'success'
              ? 'bg-pn-ink text-white'
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
              aria-pressed={picked === opt.key}
              className={`min-h-[44px] rounded-[14px] border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent sm:min-h-[36px] ${
                picked === opt.key
                  ? 'border-pn-ink bg-pn-ink text-white'
                  : 'border-pn-line bg-white text-[#525252] hover:border-[#A3A3A3]'
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
