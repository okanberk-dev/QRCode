'use client';

import { CheckCheck, Flag, Loader2, UserPlus, X } from 'lucide-react';

interface BulkActionToolbarProps {
  isTr: boolean;
  count: number;
  busy: boolean;
  onFlag: () => void;
  onUnflag: () => void;
  onAssign: () => void;
  /**
   * Stage 13 (CLAUDE.md §38.83) — toplu "okundu" işaretleme. Backend
   * /api/feedback/bulk action `bulk_mark_read` çağırır + audit log.
   */
  onMarkRead: () => void;
  onClear: () => void;
}

/**
 * Floating bottom toolbar — Stripe Dashboard pattern (CLAUDE.md §23.3.1).
 * Selection > 0 olduğunda sticky görünür; mobile'da inset-x-4 ile yan-padding,
 * ≥sm'de center-aligned 480px max width.
 */
export function BulkActionToolbar({
  isTr,
  count,
  busy,
  onFlag,
  onUnflag,
  onAssign,
  onMarkRead,
  onClear,
}: BulkActionToolbarProps) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={isTr ? 'Toplu işlem araç çubuğu' : 'Bulk action toolbar'}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0A0A0A] bg-white px-3 py-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:max-w-[520px]"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <span
        aria-live="polite"
        className="text-[12px] font-semibold text-[#0A0A0A] px-2 shrink-0"
      >
        {count} {isTr ? 'seçildi' : 'selected'}
      </span>
      <button
        type="button"
        onClick={onFlag}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#A8D62E] bg-[#EAF9B8] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:bg-[#C6F24E] transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Flag size={11} strokeWidth={2.2} />}
        {isTr ? 'İşaretle' : 'Flag'}
      </button>
      <button
        type="button"
        onClick={onUnflag}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
      >
        {isTr ? 'Kaldır' : 'Unflag'}
      </button>
      <button
        type="button"
        onClick={onAssign}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <UserPlus size={11} strokeWidth={2.2} />
        )}
        {isTr ? 'Bana ata' : 'Assign me'}
      </button>
      {/* Stage 13 — toplu "okundu" işaretleme (CLAUDE.md §38.83). Lime-soft
          palette (CheckCheck = iki tick "okundu" semantic). */}
      <button
        type="button"
        onClick={onMarkRead}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#A8D62E] bg-[#EAF9B8] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:bg-[#C6F24E] transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <CheckCheck size={11} strokeWidth={2.2} />
        )}
        {isTr ? 'Okundu işaretle' : 'Mark as read'}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label={isTr ? 'Seçimi temizle' : 'Clear selection'}
        className="ml-auto rounded-md p-1 hover:bg-[#FAFAFA] transition-colors"
      >
        <X size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export default BulkActionToolbar;
