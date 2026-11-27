import Link from 'next/link';
import { ArrowUpRight, MessageSquareText, RefreshCw, Users } from 'lucide-react';
import type { DashboardTask, TaskSeverity, TaskType } from '@/lib/dashboard-tasks';
import type { BadgeKind } from '@/components/ui/Badge';

// Phase 8c+ §38.32 — BUGÜN BEKLEYEN section. Tasarım kaynağı:
// .design-owner-2026/project/page-dashboard.jsx PendingTasks line 250-280.
// 4 task tipinden 3'ü implement (campaign çıkarıldı; Yemeksepeti/Getir/
// Trendyol public API yok, sadece Google sync check anlamlı).

// §38.71 — Inline hex render kaldırıldı, Pulse Badge primitive'e migrate.
// Renk tokenleri globals.css `.bz-badge--{danger,warn,ghost}` üzerinden
// gelir; drift sıfırlanır, Pulse palette tutarlılığı korunur (CLAUDE.md §23.1).
const SEVERITY_LABEL: Record<TaskSeverity, { tr: string; en: string; kind: BadgeKind }> = {
  high: { tr: 'Acil', en: 'Urgent', kind: 'danger' },
  medium: { tr: 'Orta', en: 'Medium', kind: 'warn' },
  low: { tr: 'Düşük', en: 'Low', kind: 'ghost' },
};

/** Soft severity pills (Fintora): red, amber, grey. */
const SEVERITY_PILL: Record<TaskSeverity, string> = {
  high: 'pn-change--down',
  medium: 'bg-[#FFF4D6] text-[#8A5A00]',
  low: 'pn-change--flat',
};

const TASK_ICON: Record<TaskType, typeof MessageSquareText> = {
  reply: MessageSquareText,
  platform: RefreshCw,
  reminder: Users,
};

export interface PendingTasksProps {
  tasks: DashboardTask[];
  isTr?: boolean;
  /** Optional "Tümü" header link. Omitted by default: every task row is
   *  already a link, and the list is never truncated. */
  viewAllHref?: string;
  className?: string;
}

export function PendingTasks({
  tasks,
  isTr = true,
  viewAllHref,
  className = '',
}: PendingTasksProps) {
  const totalLabel =
    tasks.length === 0
      ? isTr
        ? 'Bekleyen iş yok'
        : 'No pending tasks'
      : isTr
        ? `${tasks.length} görev`
        : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

  // Fintora notification rows (DASHBOARD_DESIGN.md §5.4): grey 16px rows,
  // a 40px icon circle (black for urgent work, grey otherwise), title over
  // a grey line, a soft severity pill and a black dot on urgent rows.
  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="pn-card-title text-pn-ink">{isTr ? 'Bekleyen işler' : 'Pending tasks'}</h2>
          <p className="mt-1 text-[13px] text-[#9A9A9A]">{totalLabel}</p>
        </div>
        {tasks.length > 0 && viewAllHref && (
          <Link href={viewAllHref} className="pn-arrow-btn" aria-label={isTr ? 'Tüm bekleyen işler' : 'All pending tasks'}>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-[16px] bg-pn-canvas px-4 py-4 text-[14px] leading-[1.55] text-[#737373]">
          {isTr
            ? 'Yanıt bekleyen yorum, Google bağlantı sorunu ya da geri dönmeyen müşteri yok.'
            : 'No reviews waiting for a reply, no Google link problem and no customers lost.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const Icon = TASK_ICON[task.type];
            const sev = SEVERITY_LABEL[task.severity];
            const sevLabel = isTr ? sev.tr : sev.en;
            const sevPrefix = `${sevLabel} · `;
            const meta = task.meta?.startsWith(sevPrefix) ? task.meta.slice(sevPrefix.length) : task.meta;
            const urgent = task.severity === 'high';
            return (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="pn-row group min-h-[64px]"
                  aria-label={`${task.title} — ${sevLabel}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pn-row-icon ${urgent ? '' : 'bg-pn-accent-soft text-pn-accent'}`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-pn-ink">{task.title}</span>
                      {urgent && <span className="pn-new-dot" aria-hidden="true" />}
                    </span>
                    {meta && <span className="mt-0.5 block truncate text-[13px] text-[#9A9A9A]">{meta}</span>}
                  </span>
                  <span className={`pn-change shrink-0 ${SEVERITY_PILL[task.severity]}`}>{sevLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default PendingTasks;
