// Stage A5 §38.97 — admin dashboard "Operasyonel sinyaller" section.
//
// Server-rendered: son 5 bulk operation (admin.*.bulk.*) + son 5 destructive
// audit event (delete / deactivate / impersonate). Cross-link "Tümünü gör"
// → /admin/audit-logs (Stage A3 §38.95). Pure presentational; data
// AdminAuditLog'tan SSR fetch edilir.

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  Layers,
  Mail,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import { Eyebrow } from '@/components/ui';
import { actionLabel } from '@/lib/audit-log';

export interface OperationalSignalRow {
  id: string;
  action: string;
  // Stage A — actorId nullable; the KVKK hard-delete flow severs the
  // actor reference but keeps the row for an unbroken audit trail.
  actorId: string | null;
  actorSource: string;
  targetId: string | null;
  createdAt: Date;
  /** Resolved actor display name (admin username or 'Sistem'). */
  actorName: string | null;
  /** Affected count (parsed from payload.count if present). */
  count: number | null;
}

interface Props {
  bulkRows: OperationalSignalRow[];
  destructiveRows: OperationalSignalRow[];
}

const ICON_MAP: Record<string, typeof Trash2> = {
  'admin.restaurants.bulk.activate': Layers,
  'admin.restaurants.bulk.deactivate': Layers,
  'admin.restaurants.bulk.feature_override': Zap,
  'admin.owners.bulk.send_email': Mail,
  'admin.users.delete': Trash2,
  'admin.members.deactivate': Trash2,
  'admin.restaurants.delete': Trash2,
  'restaurant.delete': Trash2,
  'admin.impersonate.start': Eye,
  'admin.impersonate.end': Eye,
  'admin.permission.grant': ShieldAlert,
  'admin.permission.revoke': ShieldAlert,
};

function formatRelative(date: Date): string {
  const now = Date.now();
  const ms = now - date.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}sa önce`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}g önce`;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function SignalRow({ row, accent }: { row: OperationalSignalRow; accent: 'lime' | 'amber' | 'red' }) {
  const Icon = ICON_MAP[row.action] || AlertTriangle;
  const accentBg = accent === 'lime' ? 'bg-pn-accent-soft' : accent === 'amber' ? 'bg-[#FEF3C7]' : 'bg-[#FEE2E2]';
  const accentFg = accent === 'lime' ? 'text-pn-ink' : accent === 'amber' ? 'text-[#92400E]' : 'text-[#991B1B]';
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-pn-line last:border-b-0">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accentBg} ${accentFg}`}>
        <Icon size={13} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-pn-ink">
            {actionLabel(row.action, 'tr')}
          </span>
          {row.count != null && row.count > 0 && (
            <span className="tabular-nums text-[12px] text-[#737373] tabular-nums">
              · {row.count} adet
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-[#737373]">
          {row.actorName || (row.actorId ? row.actorId.slice(0, 6) + '…' : 'Anonim')} ·{' '}
          {formatRelative(row.createdAt)}
        </div>
      </div>
    </div>
  );
}

export function AdminOperationalSignals({ bulkRows, destructiveRows }: Props) {
  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <div className="bz-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>SON TOPLU İŞLEMLER</Eyebrow>
          <Link
            href="/admin/audit-logs?actorSource=admin&action=bulk"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-pn-ink hover:underline"
          >
            Tümü
            <ArrowRight size={11} strokeWidth={2.2} />
          </Link>
        </div>
        <div className="mt-3">
          {bulkRows.length === 0 ? (
            <p className="text-[12px] text-[#737373] py-3">Son 30 günde toplu işlem yok.</p>
          ) : (
            bulkRows.map((row) => (
              <SignalRow key={row.id} row={row} accent="lime" />
            ))
          )}
        </div>
      </div>

      <div className="bz-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>KRİTİK AUDIT EVENT&apos;LERİ</Eyebrow>
          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-pn-ink hover:underline"
          >
            Tümü
            <ArrowRight size={11} strokeWidth={2.2} />
          </Link>
        </div>
        <div className="mt-3">
          {destructiveRows.length === 0 ? (
            <p className="text-[12px] text-[#737373] py-3">Son 30 günde kritik event yok.</p>
          ) : (
            destructiveRows.map((row) => (
              <SignalRow key={row.id} row={row} accent="red" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminOperationalSignals;
