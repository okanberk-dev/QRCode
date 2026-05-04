import Link from 'next/link';
import { ArrowRight, MessageSquareText, RefreshCw, Users } from 'lucide-react';
import type { DashboardTask, TaskSeverity, TaskType } from '@/lib/dashboard-tasks';
import { Eyebrow } from '@/components/ui';

// Phase 8c+ §38.32 — BUGÜN BEKLEYEN section. Tasarım kaynağı:
// .design-owner-2026/project/page-dashboard.jsx PendingTasks line 250-280.
// 4 task tipinden 3'ü implement (campaign çıkarıldı; Yemeksepeti/Getir/
// Trendyol public API yok, sadece Google sync check anlamlı).

const SEVERITY_BADGE: Record<TaskSeverity, { tr: string; en: string; bg: string; fg: string }> = {
  high: { tr: 'Acil', en: 'Urgent', bg: '#FEE2E2', fg: '#991B1B' },
  medium: { tr: 'Orta', en: 'Medium', bg: '#FEF3C7', fg: '#92400E' },
  low: { tr: 'Düşük', en: 'Low', bg: '#F1F5F9', fg: '#475569' },
};

const TASK_ICON: Record<TaskType, typeof MessageSquareText> = {
  reply: MessageSquareText,
  platform: RefreshCw,
  reminder: Users,
};

export interface PendingTasksProps {
  tasks: DashboardTask[];
  isTr?: boolean;
  /** "Tümü" CTA href; default /dashboard/feedbacks. */
  viewAllHref?: string;
  className?: string;
}

export function PendingTasks({
  tasks,
  isTr = true,
  viewAllHref = '/dashboard/feedbacks',
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

  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`}>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>{isTr ? 'BUGÜN BEKLEYEN' : 'PENDING TODAY'}</Eyebrow>
          <div className="bz-h-tight mt-1.5 text-[18px] sm:text-[20px]">{totalLabel}</div>
        </div>
        {tasks.length > 0 && (
          <Link
            href={viewAllHref}
            className="text-[12px] text-[#525252] hover:text-[#0A0A0A] inline-flex items-center gap-1"
          >
            {isTr ? 'Tümü' : 'All'}
            <ArrowRight size={11} strokeWidth={2} />
          </Link>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className="text-[13px] text-[#737373]">
          {isTr
            ? 'Yanıt bekleyen yorum yok, Google senkron sağlıklı, müşteri kaybı sinyali yok 🎉'
            : 'No pending replies, Google sync healthy, no customer churn signal 🎉'}
        </p>
      ) : (
        <ol className="flex flex-col">
          {tasks.map((task, idx) => {
            const Icon = TASK_ICON[task.type];
            const badge = SEVERITY_BADGE[task.severity];
            return (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className={`flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-[#FAFAFA] transition-colors ${
                    idx < tasks.length - 1 ? 'border-b border-[#F2F2F2]' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAFA] text-[#0A0A0A]"
                  >
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#0A0A0A] truncate">
                      {task.title}
                    </p>
                    {task.meta && (
                      <p className="bz-mono text-[10.5px] text-[#737373] mt-0.5">
                        {task.meta}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums"
                    style={{ background: badge.bg, color: badge.fg }}
                  >
                    {isTr ? badge.tr : badge.en}
                  </span>
                  <ArrowRight
                    size={12}
                    strokeWidth={2}
                    className="shrink-0 text-[#A3A3A3]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default PendingTasks;
