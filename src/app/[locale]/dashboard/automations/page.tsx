import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Zap, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import { Badge, EmptyState } from '@/components/ui';
import AutomationsManager from './_components/AutomationsManager';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Otomasyonlar — Buaze' : 'Automations — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: Date;
  payload: unknown;
}

export default async function OwnerAutomationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);
  const payload = await verifyJwt(token);
  if (!payload) redirect(`/${locale}/auth/login`);

  const userId = payload.userId as string;
  // Owner panel sadece direct user (admin /api/automations farklı yoldan
  // yönetilir; owner panele admin-source automation rule görmek bu Stage 12
  // kapsamı dışı, scope creep).
  const ownerRef = userId;

  // Tek transaction (CLAUDE.md §14.1 connection_limit=1) — 3 query parallel
  // queue yerine sequential single-connection.
  const [rules, activityRows, restaurants] = await prisma.$transaction([
    prisma.automationRule.findMany({
      where: { userId: ownerRef },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.adminAuditLog.findMany({
      where: {
        actorId: userId,
        action: { startsWith: 'automation.' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        createdAt: true,
        payload: true,
      },
    }),
    prisma.restaurant.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedRules = rules.map((r) => ({
    id: r.id,
    restaurantId: r.restaurantId,
    trigger: r.trigger,
    threshold: r.threshold,
    action: r.action,
    target: r.target,
    isActive: r.isActive,
    lastFiredAt: r.lastFiredAt ? r.lastFiredAt.toISOString() : null,
    lastFireStatus: r.lastFireStatus,
    lastFireResponseMs: r.lastFireResponseMs,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <AutomationsManager
        initialRules={serializedRules}
        restaurants={restaurants}
        locale={locale}
      />

      <ActivityLogSection entries={activityRows} isTr={isTr} />
    </div>
  );
}

function ActivityLogSection({
  entries,
  isTr,
}: {
  entries: ActivityEntry[];
  isTr: boolean;
}) {
  if (entries.length === 0) {
    return (
      <section className="bz-card p-5 sm:p-6">
        <header className="mb-4 flex items-center gap-2">
          <Activity size={16} className="text-[#525252]" />
          <h2 className="bz-h-tight text-[15px]">
            {isTr ? 'Etkinlik kaydı' : 'Activity log'}
          </h2>
        </header>
        <EmptyState
          icon={<Activity size={28} />}
          title={isTr ? 'Henüz etkinlik yok' : 'No activity yet'}
          body={
            isTr
              ? 'Bir kural tetiklenince son 50 fire/update/delete hareketi burada görünür.'
              : 'When a rule fires, the last 50 fire/update/delete events appear here.'
          }
        />
      </section>
    );
  }

  return (
    <section className="bz-card p-5 sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <Activity size={16} className="text-[#525252]" />
        <h2 className="bz-h-tight text-[15px]">
          {isTr ? 'Etkinlik kaydı' : 'Activity log'}
        </h2>
        <Badge kind="ghost">{entries.length}</Badge>
      </header>
      <ul className="divide-y divide-[#EDEDED]">
        {entries.map((e) => {
          const meta = parseAuditPayload(e.payload);
          const isFire = e.action.startsWith('automation.fire.');
          const isFireOk = e.action === 'automation.fire.ok';
          const verbLabel = labelForAction(e.action, isTr);
          return (
            <li key={e.id} className="flex items-start gap-3 py-3">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                aria-hidden="true"
              >
                {isFire ? (
                  isFireOk ? (
                    <CheckCircle2 size={16} className="text-[#16A34A]" />
                  ) : (
                    <XCircle size={16} className="text-[#DC2626]" />
                  )
                ) : (
                  <Zap size={14} className="text-[#737373]" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="bz-h-tight text-[13px] text-[#0A0A0A]">{verbLabel}</span>
                  <span className="bz-mono text-[11px] text-[#737373]">
                    {new Date(e.createdAt).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {meta && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#525252]">
                    {meta.httpStatus !== undefined && (
                      <span className="bz-mono">HTTP {meta.httpStatus ?? '—'}</span>
                    )}
                    {meta.responseMs !== undefined && meta.responseMs !== null && (
                      <span className="bz-mono">{meta.responseMs}ms</span>
                    )}
                    {meta.feedbackId && (
                      <span className="bz-mono">
                        feedback {String(meta.feedbackId).slice(0, 8)}…
                      </span>
                    )}
                    {meta.errorReason && (
                      <span className="text-[#DC2626]">{String(meta.errorReason)}</span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function parseAuditPayload(p: unknown): {
  httpStatus?: number | null;
  responseMs?: number | null;
  feedbackId?: string | null;
  errorReason?: string | null;
} | null {
  if (!p || typeof p !== 'object') return null;
  const obj = p as Record<string, unknown>;
  return {
    httpStatus: typeof obj.httpStatus === 'number' ? obj.httpStatus : null,
    responseMs: typeof obj.responseMs === 'number' ? obj.responseMs : null,
    feedbackId: typeof obj.feedbackId === 'string' ? obj.feedbackId : null,
    errorReason: typeof obj.errorReason === 'string' ? obj.errorReason : null,
  };
}

function labelForAction(action: string, isTr: boolean): string {
  switch (action) {
    case 'automation.create':
      return isTr ? 'Kural oluşturuldu' : 'Rule created';
    case 'automation.update':
      return isTr ? 'Kural güncellendi' : 'Rule updated';
    case 'automation.delete':
      return isTr ? 'Kural silindi' : 'Rule deleted';
    case 'automation.fire.ok':
      return isTr ? 'Webhook tetiklendi' : 'Webhook fired';
    case 'automation.fire.fail':
      return isTr ? 'Webhook başarısız' : 'Webhook failed';
    default:
      return action;
  }
}
