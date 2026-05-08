import Link from 'next/link';
import { ArrowRight, MessageSquareText, RefreshCw, Users } from 'lucide-react';
import type { DashboardTask, TaskSeverity, TaskType } from '@/lib/dashboard-tasks';
import { Badge, Eyebrow } from '@/components/ui';
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
  /** "Tümü" CTA href; default /tr/dashboard/feedbacks. */
  viewAllHref?: string;
  className?: string;
}

export function PendingTasks({
  tasks,
  isTr = true,
  viewAllHref = isTr ? '/tr/dashboard/feedbacks' : '/en/dashboard/feedbacks',
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
            const sev = SEVERITY_LABEL[task.severity];
            return (
              <li key={task.id}>
                {/*
                  Stage 80 §38.160 — Mobile tap row 56px height
                  (uygulama-gibi UX); icon container 8 → 9 (32→36px)
                  uyumlu CTA hissi. `bz-motion-spring` hover state
                  intact. WCAG 2.5.5 (Target Size AA) 44×44 garantisi
                  aşılır, dense list okunabilirlik korunur.
                */}
                <Link
                  href={task.href}
                  className={`flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-[#FAFAFA] bz-motion-spring min-h-[56px] sm:min-h-0 ${
                    idx < tasks.length - 1 ? 'border-b border-[#F2F2F2]' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-[#FAFAFA] text-[#0A0A0A]"
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
                  <Badge kind={sev.kind} dot={false} className="shrink-0 text-[10.5px]">
                    {isTr ? sev.tr : sev.en}
                  </Badge>
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
