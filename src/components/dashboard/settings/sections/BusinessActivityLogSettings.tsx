'use client';

import { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import { AlertBanner, EmptyState } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { ACTION_LABELS } from '@/lib/audit-log-labels';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import type { Locale } from '@/lib/translations';

// Stage A3 §38.95 — owner KVKK transparency surface.
// /dashboard/account?section=activity altında render edilir. Owner kendi
// audit log'unu (max 100 kayıt, last 2 years) görür: kendi yaptığı
// aksiyonlar + admin tarafından kendisine yapılan aksiyonlar.

interface AuditEntry {
  id: string;
  action: string;
  actorSource: 'admin' | 'user';
  actorLabel: string;
  payload: unknown;
  createdAt: string;
}

interface Props {
  locale: Locale;
  /** Owner's businesses — resolves `restaurantId` in a row's details to a name. */
  restaurants?: Array<{ id: string; name: string }>;
}

const PAGE_SIZE = 20;

// Package switches an admin can flip (`admin.restaurants.feature_access`).
const FEATURE_LABELS: Record<string, { tr: string; en: string }> = {
  googleReviewManagementEnabled: { tr: 'Google yorum yönetimi', en: 'Google review management' },
  pulseAiEnabled: { tr: 'Pulse AI', en: 'Pulse AI' },
  aiAnalyticsEnabled: { tr: 'AI analitik', en: 'AI analytics' },
  externalPlatformsEnabled: { tr: 'Google dışı platformlar', en: 'Non-Google platforms' },
  menuEnabled: { tr: 'Menü', en: 'Menu' },
  menuPublished: { tr: 'Menü yayını', en: 'Menu publishing' },
  surveysEnabled: { tr: 'Anketler', en: 'Surveys' },
};

/** Readable title; unknown action codes get a neutral label, never the raw code. */
function entryTitle(action: string, isTr: boolean): string {
  const known = ACTION_LABELS[action];
  if (known) return isTr ? known.tr : known.en;
  return isTr ? 'Hesap işlemi' : 'Account change';
}

/** The API builds actor labels in Turkish ("Sen", "admin (Yönetici)"). */
function actorText(entry: AuditEntry, isTr: boolean): string {
  if (entry.actorSource === 'user') return isTr ? 'Sen' : 'You';
  const match = /^(.*) \(Yönetici\)$/.exec(entry.actorLabel);
  const base = isTr ? 'Buaze yöneticisi' : 'Buaze admin';
  return match ? `${base} · ${match[1]}` : base;
}

/** Plain-language summary of a row's payload (no raw JSON / field codes). */
function detailLines(
  payload: unknown,
  isTr: boolean,
  restaurantName: (id: string) => string | null,
): string[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const p = payload as Record<string, unknown>;
  const lines: string[] = [];
  if (typeof p.restaurantId === 'string') {
    const name = restaurantName(p.restaurantId);
    if (name) lines.push(`${isTr ? 'İşletme' : 'Business'}: ${name}`);
  }
  if (p.changed && typeof p.changed === 'object' && !Array.isArray(p.changed)) {
    for (const [key, value] of Object.entries(p.changed as Record<string, unknown>)) {
      const label = FEATURE_LABELS[key];
      const to = value && typeof value === 'object' ? (value as { to?: unknown }).to : undefined;
      if (label && typeof to === 'boolean') {
        lines.push(
          `${isTr ? label.tr : label.en}: ${to ? (isTr ? 'açıldı' : 'turned on') : isTr ? 'kapatıldı' : 'turned off'}`,
        );
      }
    }
    if (lines.length === 0 || (lines.length === 1 && typeof p.restaurantId === 'string')) {
      const n = Object.keys(p.changed as Record<string, unknown>).length;
      if (n > 0) lines.push(isTr ? `${n} ayar değişti` : `${n} setting(s) changed`);
    }
  }
  if (Array.isArray(p.fields) && p.fields.length > 0) {
    lines.push(isTr ? `${p.fields.length} alan güncellendi` : `${p.fields.length} field(s) updated`);
  }
  if (p.impersonation && typeof p.impersonation === 'object') {
    lines.push(
      isTr
        ? 'Bir Buaze yöneticisi senin hesabın üzerinden yaptı.'
        : 'A Buaze admin made this while viewing your account.',
    );
  }
  return lines;
}

function relativeTime(iso: string, isTr: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return isTr ? 'şimdi' : 'just now';
  if (min < 60) return isTr ? `${min} dk önce` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return isTr ? `${h} sa önce` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return isTr ? `${d} gün önce` : `${d}d ago`;
  return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: resolveDisplayTimeZone(),
  });
}

export function BusinessActivityLogSettings({ locale, restaurants = [] }: Props) {
  const isTr = locale === 'tr';
  const [data, setData] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const restaurantName = (id: string) => restaurants.find((r) => r.id === id)?.name ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account/audit-log')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(isTr ? 'Geçmiş yüklenemedi' : 'Failed to load history');
        }
        return res.json();
      })
      .then((j: { data: AuditEntry[] }) => {
        if (!cancelled) setData(j.data || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isTr]);

  return (
    <div className="space-y-4">
      {/* The section description says who/what; this line keeps only the
          retention + masking facts the KVKK note used to repeat it with. */}
      <p className="inline-flex items-start gap-1.5 text-[12px] leading-[1.55] text-[#525252]">
        <ShieldCheck size={13} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
        {isTr
          ? 'Son 2 yılın kaydı tutulur; e-posta ve telefon bilgileri gizlenerek gösterilir.'
          : 'The last 2 years are kept; email and phone details are shown masked.'}
      </p>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {loading ? (
        <ol className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-[20px] border border-pn-line bg-white p-4 space-y-2">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-3 w-24" />
            </li>
          ))}
        </ol>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} strokeWidth={2} />}
          title={isTr ? 'Henüz hesap aktivitesi yok' : 'No account activity yet'}
          body={
            isTr
              ? 'Hesabını oluşturduğundan bu yana kayıtlı bir işlem yok. Şifre değişikliği, profil güncellemesi ve yönetici işlemleri burada listelenir.'
              : 'Nothing recorded since your account was created. Password changes, profile updates and admin actions appear here.'
          }
        />
      ) : (
        <>
        <ol className="space-y-2">
          {data.slice(0, visible).map((entry) => {
            const isExpanded = expandedId === entry.id;
            const details = detailLines(entry.payload, isTr, restaurantName);
            const hasDetails = details.length > 0;
            const detailsId = `activity-details-${entry.id}`;
            return (
              <li
                key={entry.id}
                className="rounded-[20px] border border-pn-line bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-pn-ink">
                      {entryTitle(entry.action, isTr)}
                    </span>
                    <p className="mt-1 text-[12px] text-[#737373]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} strokeWidth={2} />
                        {relativeTime(entry.createdAt, isTr)}
                      </span>
                      <span className="mx-1.5 text-[#A3A3A3]">·</span>
                      {actorText(entry, isTr)}
                    </p>
                  </div>
                  {hasDetails && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      className="-my-2 -mr-2 inline-flex min-h-[40px] items-center gap-1 rounded-full px-2 text-[12px] text-[#737373] hover:text-pn-ink"
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} strokeWidth={2} />
                      ) : (
                        <ChevronRight size={12} strokeWidth={2} />
                      )}
                      {isTr ? (isExpanded ? 'Gizle' : 'Detay') : isExpanded ? 'Hide' : 'Detail'}
                    </button>
                  )}
                </div>
                {isExpanded && hasDetails && (
                  <ul
                    id={detailsId}
                    className="mt-3 space-y-1 rounded-[14px] border border-pn-line bg-pn-canvas px-3 py-2.5 text-[12px] leading-[1.5] text-[#525252]"
                  >
                    {details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        {data.length > visible && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="bz-btn-ghost min-h-[40px] text-[13px]"
            >
              {isTr
                ? `Daha fazla göster (${data.length - visible} kayıt daha)`
                : `Show more (${data.length - visible} more)`}
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
