import Link from 'next/link';
import { ArrowRight, MessageSquareText, RefreshCw, Users } from 'lucide-react';
import { PanoStack } from '@/components/panel/pano/PanoStack';
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

  // Pano "Investments" stack (DASHBOARD_DESIGN.md §5.4): the most urgent task
  // on black, the next on lime, the rest white, overlapping like a deck.
  return (
    <section className={`bz-card p-5 sm:p-7 ${className}`}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="pn-card-title">{isTr ? 'Bekleyen işler' : 'Pending tasks'}</h2>
          <p className="mt-1 text-[13px] text-[#9A9A9A]">{totalLabel}</p>
        </div>
        {tasks.length > 0 && viewAllHref && (
          <Link href={viewAllHref} className="pn-arrow-btn" aria-label={isTr ? 'Tüm bekleyen işler' : 'All pending tasks'}>
            <ArrowRight size={17} className="-rotate-45" aria-hidden="true" />
          </Link>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className="text-[14px] leading-[1.55] text-[#737373]">
          {isTr
            ? 'Yanıt bekleyen yorum, Google bağlantı sorunu ya da geri dönmeyen müşteri yok.'
            : 'No reviews waiting for a reply, no Google link problem and no customers lost.'}
        </p>
      ) : (
        <PanoStack
          items={tasks.map((task) => {
            const Icon = TASK_ICON[task.type];
            const sev = SEVERITY_LABEL[task.severity];
            const sevLabel = isTr ? sev.tr : sev.en;
            const sevPrefix = `${sevLabel} · `;
            const meta = task.meta?.startsWith(sevPrefix) ? task.meta.slice(sevPrefix.length) : task.meta;
            return {
              id: task.id,
              href: task.href,
              icon: <Icon size={19} />,
              title: task.title,
              sub: meta,
              value: sevLabel,
              label: `${task.title} — ${sevLabel}`,
            };
          })}
        />
      )}
    </section>
  );
}

export default PendingTasks;
