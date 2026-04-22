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

const SEVERITY_STYLES: Record<DashboardAnnouncement['severity'], { wrap: string; accent: string; icon: typeof Info }> = {
  info: {
    wrap: 'bg-slate-50 border-slate-200 text-slate-900',
    accent: 'bg-slate-500/10 text-slate-700',
    icon: Info,
  },
  success: {
    wrap: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    accent: 'bg-emerald-500/10 text-emerald-700',
    icon: CheckCircle2,
  },
  warning: {
    wrap: 'bg-amber-50 border-amber-200 text-amber-950',
    accent: 'bg-amber-500/15 text-amber-800',
    icon: AlertTriangle,
  },
  critical: {
    wrap: 'bg-red-50 border-red-200 text-red-950',
    accent: 'bg-red-500/10 text-red-700',
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
        className={`relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 ${style.wrap} ${compact ? '' : 'shadow-sm'}`}
        role={a.severity === 'critical' ? 'alert' : 'status'}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.accent}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight">{a.title}</p>
          <p className="text-[13px] font-medium leading-snug opacity-80 mt-0.5">{a.message}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {a.ctaText && a.ctaLink && (
            <a
              href={a.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#1A2332] text-white text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all whitespace-nowrap"
            >
              {a.ctaText}
            </a>
          )}
          {dismissable && (
            <button
              type="button"
              onClick={() => dismiss(a)}
              aria-label={copy.dismiss}
              className="h-8 w-8 rounded-xl text-current/70 hover:bg-black/5 flex items-center justify-center transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
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
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-[#1A2332] transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={2.75} />
          {expanded ? copy.less : copy.more(rest.length)}
        </button>
      )}
    </div>
  );
}
