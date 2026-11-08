'use client';

import { CheckCheck, Flag, UserPlus } from 'lucide-react';
import { PanelSelectionBar } from '@/components/ui';

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
    <PanelSelectionBar
      reserveSpace={false}
      count={count}
      label={isTr ? 'YORUM SEÇİLDİ' : 'REVIEWS SELECTED'}
      countLocale={isTr ? 'tr-TR' : 'en-US'}
      ariaLabel={isTr ? 'Toplu işlem araç çubuğu' : 'Bulk action toolbar'}
      clearLabel={isTr ? 'Seçimi temizle' : 'Clear selection'}
      onClear={onClear}
      actions={[
        {
          key: 'flag',
          label: isTr ? 'İşaretle' : 'Flag',
          icon: <Flag size={13} strokeWidth={2.2} />,
          onClick: onFlag,
          disabled: busy,
          loading: busy,
          variant: 'primary',
        },
        {
          key: 'unflag',
          label: isTr ? 'Kaldır' : 'Unflag',
          onClick: onUnflag,
          disabled: busy,
          variant: 'neutral',
        },
        {
          key: 'assign',
          label: isTr ? 'Bana ata' : 'Assign me',
          icon: <UserPlus size={13} strokeWidth={2.2} />,
          onClick: onAssign,
          disabled: busy,
          loading: busy,
          variant: 'neutral',
        },
        {
          key: 'read',
          label: isTr ? 'Okundu' : 'Mark read',
          icon: <CheckCheck size={13} strokeWidth={2.2} />,
          onClick: onMarkRead,
          disabled: busy,
          loading: busy,
          variant: 'lime',
        },
      ]}
    />
  );
}

export default BulkActionToolbar;
