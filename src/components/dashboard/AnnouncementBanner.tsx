'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, Info, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';

export type DashboardAnnouncement = {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  priority: number;
  ctaText: string | null;
  ctaLink: string | null;
  isDismissible: boolean;
  updatedAt: string;
};

interface Props {
  announcements: DashboardAnnouncement[];
  locale: Locale;
}

// Palette aligned with AlertBanner primitive (src/components/ui/AlertBanner.tsx
// KIND_PALETTE) so dashboard-top announcements share the same visual language
// as inline alerts elsewhere in the panel.
const SEVERITY_STYLES: Record<
  DashboardAnnouncement['severity'],
  { bg: string; border: string; text: string; accent: string; icon: typeof Info }
> = {
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1E40AF',
    accent: 'rgba(37, 99, 235, 0.12)',
    icon: Info,
  },
  success: {
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#166534',
    accent: 'rgba(22, 163, 74, 0.12)',
    icon: CheckCircle2,
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    accent: 'rgba(217, 119, 6, 0.15)',
    icon: AlertTriangle,
  },
  critical: {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
    accent: 'rgba(220, 38, 38, 0.12)',
    icon: AlertOctagon,
  },
};

const STORAGE_KEY = 'buaze:ann:dismiss:v1';

function loadDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function saveDismissed(values: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values.slice(-200)));
  } catch {
    /* quota/errors ignored */
  }
}

const fingerprint = (a: DashboardAnnouncement) => `${a.id}:${a.updatedAt}`;

export default function AnnouncementBanner({ announcements, locale }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(loadDismissed());
    setHydrated(true);
  }, []);

  const visible = useMemo(() => {
    if (!hydrated) return announcements;
    const setFP = new Set(dismissed);
    return announcements.filter((a) => !a.isDismissible || a.severity === 'critical' || !setFP.has(fingerprint(a)));
  }, [announcements, dismissed, hydrated]);

  if (!announcements.length || !visible.length) return null;

  const [primary, ...rest] = visible;

  const dismiss = (a: DashboardAnnouncement) => {
    if (!a.isDismissible || a.severity === 'critical') return;
    const next = Array.from(new Set([...dismissed, fingerprint(a)]));
    setDismissed(next);
    saveDismissed(next);
  };

  const copy = locale === 'en'
    ? { more: (n: number) => `+${n} more`, less: 'Hide', learn: 'Learn more', dismiss: 'Dismiss' }
    : { more: (n: number) => `+${n} duyuru daha`, less: 'Gizle', learn: 'Detayları gör', dismiss: 'Kapat' };

  const renderOne = (a: DashboardAnnouncement, compact: boolean) => {
    const style = SEVERITY_STYLES[a.severity];
    const Icon = style.icon;
    const dismissable = a.isDismissible && a.severity !== 'critical';
    return (
      <div
        key={a.id}
        className={`relative flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 ${
          compact ? '' : 'shadow-sm'
        }`}
        style={{ background: style.bg, borderColor: style.border, color: style.text }}
        role={a.severity === 'critical' ? 'alert' : 'status'}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: style.accent, color: style.text }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="bz-h-tight text-[14px] leading-tight"
            style={{ color: style.text }}
          >
            {a.title}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug opacity-80">{a.message}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {a.ctaText && a.ctaLink && (
            <a
              href={a.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-btn-primary whitespace-nowrap px-4 py-2 text-[12px]"
            >
              {a.ctaText}
            </a>
          )}
          {dismissable && (
            <button
              type="button"
              onClick={() => dismiss(a)}
              aria-label={copy.dismiss}
              className="bz-btn-icon"
              style={{ color: style.text }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-3 sm:px-6 md:px-10 pt-3 sm:pt-6 space-y-2">
      {renderOne(primary, false)}
      {rest.length > 0 && expanded && (
        <div className="space-y-2">
          {rest.map((a) => renderOne(a, true))}
        </div>
      )}
      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={2} />
          {expanded ? copy.less : copy.more(rest.length)}
        </button>
      )}
    </div>
  );
}
