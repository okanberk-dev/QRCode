// CLAUDE.md §38.99 — Customer campaign stats aggregator.
//
// Owner panel `/dashboard/campaigns` campaign list + detail için saf
// fonksiyon delivery rate compute helper. Pure (no Prisma), test edilebilir.
// CustomerEmailLog status enum: 'pending' | 'sent' | 'failed' | 'unsubscribed'.

export interface LogStatusBucket {
  pending: number;
  sent: number;
  failed: number;
  unsubscribed: number;
}

export interface CampaignStats extends LogStatusBucket {
  total: number;
  /** sent / (recipientCount - unsubscribed) × 100, rounded to 1 decimal. */
  deliveryRate: number;
}

/**
 * Aggregate log status counts for a single campaign.
 *
 * Delivery rate excludes unsubscribed recipients from denominator (KVKK
 * marketing consent gate skip'leri "delivered" sayılmaz). Edge cases:
 *   - 0 recipients → deliveryRate=0
 *   - all unsubscribed → deliveryRate=0 (no eligible audience)
 *   - all sent → deliveryRate=100
 *   - sent + failed mixed → sent / (sent+failed+pending) × 100
 *
 * @param logs CustomerEmailLog rows for one campaign (any order).
 * @param recipientCount Optional override (default: logs.length). Useful when
 *   campaign.recipientCount is the source of truth (logs may be paginated).
 */
export function aggregateLogStats(
  logs: ReadonlyArray<{ status: string }>,
  recipientCount?: number,
): CampaignStats {
  const buckets: LogStatusBucket = {
    pending: 0,
    sent: 0,
    failed: 0,
    unsubscribed: 0,
  };

  for (const log of logs) {
    if (log.status === 'sent') buckets.sent += 1;
    else if (log.status === 'failed') buckets.failed += 1;
    else if (log.status === 'unsubscribed') buckets.unsubscribed += 1;
    else buckets.pending += 1;
  }

  const total = recipientCount ?? logs.length;
  const eligible = total - buckets.unsubscribed;
  const deliveryRate = eligible > 0 ? Math.round((buckets.sent / eligible) * 1000) / 10 : 0;

  return { ...buckets, total, deliveryRate };
}

/**
 * Status badge variant resolver for owner UI. Pulse Badge primitive `kind`
 * enum mapping (CLAUDE.md §11 + §23.3 + §38.105 moderation extension).
 */
export function campaignStatusBadge(
  status: string,
): 'ok' | 'warn' | 'danger' | 'info' | 'ghost' | 'lime' {
  switch (status) {
    case 'sent':
      return 'ok';
    case 'sending':
      return 'info';
    case 'failed':
      return 'danger';
    case 'draft':
      return 'ghost';
    // Stage 29 §38.105 — moderation pipeline status'ları
    case 'pending_approval':
      return 'warn';
    case 'approved':
      // Transient state — Resend pipeline başlamadan önce kısa süreli
      // (UI zaten 'sending' veya 'sent'/'failed' hızlıca tetiklenir).
      return 'lime';
    case 'rejected':
      return 'danger';
    default:
      return 'ghost';
  }
}

export function campaignStatusLabel(
  status: string,
  locale: 'tr' | 'en' = 'tr',
): string {
  const map: Record<string, { tr: string; en: string }> = {
    draft: { tr: 'Taslak', en: 'Draft' },
    sending: { tr: 'Gönderiliyor', en: 'Sending' },
    sent: { tr: 'Gönderildi', en: 'Sent' },
    failed: { tr: 'Başarısız', en: 'Failed' },
    // Stage 29 §38.105 — moderation pipeline label'ları
    pending_approval: { tr: 'Onayda', en: 'Pending approval' },
    approved: { tr: 'Onaylandı', en: 'Approved' },
    rejected: { tr: 'Reddedildi', en: 'Rejected' },
  };
  return map[status]?.[locale] ?? status;
}

export function logStatusLabel(
  status: string,
  locale: 'tr' | 'en' = 'tr',
): string {
  const map: Record<string, { tr: string; en: string }> = {
    pending: { tr: 'Bekliyor', en: 'Pending' },
    sent: { tr: 'Teslim edildi', en: 'Delivered' },
    failed: { tr: 'Başarısız', en: 'Failed' },
    unsubscribed: { tr: 'Pazarlama onayı yok', en: 'No marketing consent' },
  };
  return map[status]?.[locale] ?? status;
}

export function logStatusBadge(
  status: string,
): 'ok' | 'warn' | 'danger' | 'ghost' {
  switch (status) {
    case 'sent':
      return 'ok';
    case 'failed':
      return 'danger';
    case 'unsubscribed':
      return 'warn';
    default:
      return 'ghost';
  }
}
