import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mail, Phone, Star, Users, MessageSquareText, Inbox, Download } from 'lucide-react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { PageHeader, StatCard, EmptyState, Badge } from '@/components/ui';
import type { Locale } from '@/lib/translations';

// Phase 8 — Owner Customers CRM (CLAUDE.md §23.7 Phase 12.x).
// Server component + direct Prisma raw SQL (admin /api/admin/customers paterni
// reuse). IDOR via getScopedRestaurantIds. Anonim feedback (email + phone null)
// listede yer almaz; dedupe key (restaurantId, COALESCE(lower(email), phone)).

export const dynamic = 'force-dynamic';

const RANGE_PRESETS = { '7d': 7, '30d': 30, '90d': 90 } as const;
type RangeKey = keyof typeof RANGE_PRESETS | 'all';

const PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    range?: string;
    search?: string;
    restaurantId?: string;
    page?: string;
  }>;
}

interface AggregateRow {
  restaurant_id: string;
  restaurant_name: string | null;
  contact_key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  platform: string | null;
  last_rating: number | null;
  last_at: Date;
  feedback_count: bigint;
  avg_rating: number | null;
}

interface SummaryRow {
  customers: bigint;
  feedbacks: bigint;
  avg_rating: number | null;
}

function parseRange(raw: string | undefined): { start: Date | null; key: RangeKey } {
  if (raw === 'all') return { start: null, key: 'all' };
  const k = (raw && raw in RANGE_PRESETS ? raw : '30d') as Exclude<RangeKey, 'all'>;
  return { start: new Date(Date.now() - RANGE_PRESETS[k] * 24 * 60 * 60 * 1000), key: k };
}

export default async function OwnerCustomersPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const sp = await searchParams;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  // Auth — same pattern as dashboard/layout.tsx.
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/customers`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/customers`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/customers`);
  }

  const actor: PanelActor = {
    id: payload.userId as string,
    role,
    restaurantId: null,
    username: null,
    email: null,
    plan: null,
    source: 'user',
  };
  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null || scopedIds.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow={isTr ? 'CRM' : 'CRM'}
          title={isTr ? 'Müşteriler' : 'Customers'}
          description={
            isTr
              ? 'Müşteri ilişkileri yönetimi — yorum bırakanların listesi.'
              : 'Customer relationship management — list of reviewers.'
          }
        />
        <div className="bz-card p-10">
          <EmptyState
            icon={<Users size={22} strokeWidth={1.5} />}
            title={isTr ? 'Henüz işletmen yok' : 'No business yet'}
            body={
              isTr
                ? 'Önce bir işletme ekle, müşteriler buraya yorum bıraktıkça otomatik görünür.'
                : 'Add a business first; customers appear here as reviews come in.'
            }
            action={
              <Link
                href={`/${locale}/dashboard/restaurants`}
                className="bz-btn-primary"
              >
                {isTr ? 'İşletme ekle' : 'Add business'}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // Filters from URL.
  const { start: rangeStart, key: rangeKey } = parseRange(sp.range);
  const search = (sp.search || '').trim().slice(0, 100) || null;
  const restaurantIdParam =
    sp.restaurantId && scopedIds.includes(sp.restaurantId) ? sp.restaurantId : null;
  const page = Math.max(1, Number.parseInt(sp.page || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Where clause builder (Prisma raw SQL — admin /api/admin/customers paterni).
  const whereParts: Prisma.Sql[] = [
    Prisma.sql`f.has_kvkk_consent = TRUE`,
    Prisma.sql`f.restaurant_id IN (${Prisma.join(scopedIds)})`,
    Prisma.sql`COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) IS NOT NULL`,
  ];
  if (restaurantIdParam) {
    whereParts.push(Prisma.sql`f.restaurant_id = ${restaurantIdParam}`);
  }
  if (rangeStart) {
    whereParts.push(Prisma.sql`f.created_at >= ${rangeStart}`);
  }
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    whereParts.push(
      Prisma.sql`(
        LOWER(COALESCE(f.name, '')) LIKE ${like}
        OR LOWER(COALESCE(f.email, '')) LIKE ${like}
        OR LOWER(COALESCE(f.phone, '')) LIKE ${like}
      )`,
    );
  }
  const whereSql = Prisma.join(whereParts, ' AND ');

  let summaryRow: SummaryRow | undefined;
  let rows: AggregateRow[] = [];
  let total = 0;
  let restaurants: { id: string; name: string }[] = [];
  let errored = false;

  try {
    const [summary, fetched, totalRows, restaurantList] = await Promise.all([
      prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(DISTINCT CONCAT(f.restaurant_id, '|', COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')))) AS customers,
          COUNT(*)::bigint AS feedbacks,
          AVG(f.rating)::float AS avg_rating
        FROM feedback f
        WHERE ${whereSql}
      `),
      prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
        SELECT
          f.restaurant_id,
          r.name AS restaurant_name,
          COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) AS contact_key,
          (ARRAY_AGG(f.name ORDER BY f.created_at DESC) FILTER (WHERE f.name IS NOT NULL AND f.name <> ''))[1] AS name,
          (ARRAY_AGG(f.email ORDER BY f.created_at DESC) FILTER (WHERE f.email IS NOT NULL AND f.email <> ''))[1] AS email,
          (ARRAY_AGG(f.phone ORDER BY f.created_at DESC) FILTER (WHERE f.phone IS NOT NULL AND f.phone <> ''))[1] AS phone,
          (ARRAY_AGG(f.branch ORDER BY f.created_at DESC) FILTER (WHERE f.branch IS NOT NULL AND f.branch <> ''))[1] AS branch,
          (ARRAY_AGG(f.platform ORDER BY f.created_at DESC) FILTER (WHERE f.platform IS NOT NULL))[1] AS platform,
          (ARRAY_AGG(f.rating ORDER BY f.created_at DESC))[1] AS last_rating,
          AVG(f.rating)::float AS avg_rating,
          MAX(f.created_at) AS last_at,
          COUNT(*)::bigint AS feedback_count
        FROM feedback f
        LEFT JOIN restaurants r ON r.id = f.restaurant_id
        WHERE ${whereSql}
        GROUP BY f.restaurant_id, r.name, contact_key
        ORDER BY MAX(f.created_at) DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `),
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total FROM (
          SELECT 1
          FROM feedback f
          WHERE ${whereSql}
          GROUP BY f.restaurant_id, COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
        ) g
      `),
      prisma.restaurant.findMany({
        where: { id: { in: scopedIds } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    summaryRow = summary[0];
    rows = fetched;
    total = Number(totalRows[0]?.total ?? 0);
    restaurants = restaurantList;
  } catch (error) {
    console.error('[OWNER_CUSTOMERS_PAGE]', error);
    errored = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = Boolean(search || restaurantIdParam || rangeKey !== '30d');

  // URL builder for filter forms / pagination links.
  function buildHref(over: Partial<Record<'range' | 'search' | 'restaurantId' | 'page', string>>) {
    const q = new URLSearchParams();
    const r = over.range ?? rangeKey;
    if (r !== '30d') q.set('range', r);
    const s = over.search ?? search ?? '';
    if (s) q.set('search', s);
    const rid = over.restaurantId ?? restaurantIdParam ?? '';
    if (rid) q.set('restaurantId', rid);
    const p = over.page ?? String(page);
    if (p && p !== '1') q.set('page', p);
    const qs = q.toString();
    return `/${locale}/dashboard/customers${qs ? `?${qs}` : ''}`;
  }

  function fmtDate(iso: string | Date) {
    return new Date(iso).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="CRM"
        title={isTr ? 'Müşteriler' : 'Customers'}
        description={
          isTr
            ? 'Yorum bırakan müşterilerin tek listesi — e-posta veya telefonla iletişime geçilebilir.'
            : 'Customers who left a review — reachable via email or phone.'
        }
        actions={
          rows.length > 0 ? (
            <a
              href={(() => {
                const q = new URLSearchParams();
                if (rangeKey !== '30d') q.set('range', rangeKey);
                if (search) q.set('search', search);
                if (restaurantIdParam) q.set('restaurantId', restaurantIdParam);
                const qs = q.toString();
                return `/api/customers/export${qs ? `?${qs}` : ''}`;
              })()}
              className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px]"
              download
            >
              <Download size={13} strokeWidth={2} />
              {isTr ? 'CSV indir' : 'Export CSV'}
            </a>
          ) : undefined
        }
      />

      {errored && (
        <div className="bz-card border-[#FECACA] bg-[#FEF2F2] p-4 text-[13px] text-[#991B1B]">
          {isTr ? 'Müşteriler yüklenemedi.' : 'Customers could not be loaded.'}
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <StatCard
          label={isTr ? 'Müşteri' : 'Customers'}
          value={(summaryRow ? Number(summaryRow.customers) : 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<Users size={14} />}
        />
        <StatCard
          label={isTr ? 'Yorum' : 'Reviews'}
          value={(summaryRow ? Number(summaryRow.feedbacks) : 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<MessageSquareText size={14} />}
        />
        <StatCard
          label={isTr ? 'Ort. puan' : 'Avg rating'}
          value={
            summaryRow?.avg_rating != null
              ? summaryRow.avg_rating.toFixed(1)
              : '—'
          }
          icon={<Star size={14} className="text-[#C6F24E]" />}
          accent="#C6F24E"
        />
      </div>

      {/* Filter row — URL-driven (no client island, no debounce) */}
      <form
        action={`/${locale}/dashboard/customers`}
        method="get"
        className="bz-card p-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex flex-wrap gap-1.5">
          {(['7d', '30d', '90d', 'all'] as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={buildHref({ range: k, page: '1' })}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                rangeKey === k
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3]'
              }`}
            >
              {k === '7d'
                ? isTr ? 'Son 7 gün' : 'Last 7d'
                : k === '30d'
                  ? isTr ? '30 gün' : '30d'
                  : k === '90d'
                    ? isTr ? '90 gün' : '90d'
                    : isTr ? 'Tümü' : 'All'}
            </Link>
          ))}
        </div>
        <input
          type="search"
          name="search"
          defaultValue={search ?? ''}
          placeholder={isTr ? 'Ad, e-posta veya telefon ara…' : 'Search name, email or phone…'}
          className="bz-input flex-1 min-w-0"
          maxLength={100}
        />
        {restaurants.length > 1 && (
          <select
            name="restaurantId"
            defaultValue={restaurantIdParam ?? ''}
            className="bz-input sm:w-[200px]"
          >
            <option value="">{isTr ? 'Tüm işletmeler' : 'All businesses'}</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        <input type="hidden" name="range" value={rangeKey} />
        <button type="submit" className="bz-btn-primary">
          {isTr ? 'Uygula' : 'Apply'}
        </button>
        {hasFilter && (
          <Link href={`/${locale}/dashboard/customers`} className="bz-btn-ghost">
            {isTr ? 'Temizle' : 'Reset'}
          </Link>
        )}
      </form>

      {/* Table — desktop, card list on mobile (CLAUDE.md §23.6 paterni) */}
      {rows.length === 0 && !errored ? (
        <div className="bz-card p-10">
          <EmptyState
            icon={<Inbox size={22} strokeWidth={1.5} />}
            title={isTr ? 'Henüz müşteri yok' : 'No customers yet'}
            body={
              isTr
                ? hasFilter
                  ? 'Filtre koşullarına uyan müşteri bulunamadı. Filtreleri temizleyebilirsin.'
                  : 'QR ile yorum gelince burada görünmeye başlayacaklar.'
                : hasFilter
                  ? 'No customers match these filters.'
                  : 'Customers will appear here as QR feedback arrives.'
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="bz-card hidden overflow-hidden lg:block">
            <table className="bz-table w-full">
              <thead>
                <tr>
                  <th className="text-left">{isTr ? 'Müşteri' : 'Customer'}</th>
                  <th className="text-left">{isTr ? 'İletişim' : 'Contact'}</th>
                  <th className="text-left">{isTr ? 'İşletme' : 'Business'}</th>
                  <th className="text-right">{isTr ? 'Yorum' : 'Reviews'}</th>
                  <th className="text-right">{isTr ? 'Son puan' : 'Last ★'}</th>
                  <th className="text-right">{isTr ? 'Son ziyaret' : 'Last seen'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const initials = (r.name || r.email || r.phone || '?')
                    .charAt(0)
                    .toUpperCase();
                  return (
                    <tr key={`${r.restaurant_id}|${r.contact_key}`} className="bz-tr-hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="bz-avatar h-8 w-8 text-[12px]">{initials}</div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-[#0A0A0A]">
                              {r.name || (isTr ? 'Anonim' : 'Anonymous')}
                            </div>
                            {r.branch && (
                              <div className="text-[11px] text-[#737373] truncate">
                                {r.branch}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5 text-[12px]">
                          {r.email && (
                            <a
                              href={`mailto:${r.email}`}
                              className="inline-flex items-center gap-1.5 text-[#0A0A0A] hover:text-[#A8D62E]"
                            >
                              <Mail size={11} strokeWidth={2} />
                              <span className="truncate">{r.email}</span>
                            </a>
                          )}
                          {r.phone && (
                            <a
                              href={`tel:${r.phone}`}
                              className="inline-flex items-center gap-1.5 text-[#525252] hover:text-[#0A0A0A]"
                            >
                              <Phone size={11} strokeWidth={2} />
                              <span>{r.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#525252]">
                          {r.restaurant_name || '—'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums text-[13px] font-semibold">
                        {Number(r.feedback_count)}
                      </td>
                      <td className="text-right">
                        {r.last_rating != null ? (
                          <Badge kind={r.last_rating >= 4 ? 'lime' : r.last_rating >= 3 ? 'warn' : 'danger'}>
                            {r.last_rating}★
                          </Badge>
                        ) : (
                          <span className="text-[#A3A3A3]">—</span>
                        )}
                      </td>
                      <td className="text-right text-[12px] text-[#737373]">
                        {fmtDate(r.last_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="grid gap-3 lg:hidden">
            {rows.map((r) => {
              const initials = (r.name || r.email || r.phone || '?')
                .charAt(0)
                .toUpperCase();
              return (
                <div key={`${r.restaurant_id}|${r.contact_key}`} className="bz-card p-4 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="bz-avatar h-9 w-9 text-[13px]">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-[14px] font-semibold text-[#0A0A0A]">
                          {r.name || (isTr ? 'Anonim' : 'Anonymous')}
                        </div>
                        {r.last_rating != null && (
                          <Badge kind={r.last_rating >= 4 ? 'lime' : r.last_rating >= 3 ? 'warn' : 'danger'}>
                            {r.last_rating}★
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-[#737373] truncate">
                        {r.restaurant_name}
                        {r.branch && ` · ${r.branch}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-[12px]">
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="inline-flex items-center gap-1.5 text-[#0A0A0A]"
                      >
                        <Mail size={11} strokeWidth={2} />
                        <span className="truncate">{r.email}</span>
                      </a>
                    )}
                    {r.phone && (
                      <a
                        href={`tel:${r.phone}`}
                        className="inline-flex items-center gap-1.5 text-[#525252]"
                      >
                        <Phone size={11} strokeWidth={2} />
                        <span>{r.phone}</span>
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#EDEDED] pt-2 text-[11px] text-[#737373]">
                    <span>
                      <strong className="text-[#0A0A0A]">{Number(r.feedback_count)}</strong>{' '}
                      {isTr ? 'yorum' : 'reviews'}
                    </span>
                    <span>{fmtDate(r.last_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="bz-card flex items-center justify-between p-3 text-[12px]"
              aria-label={isTr ? 'Sayfalar' : 'Pagination'}
            >
              <span className="text-[#737373]">
                {isTr
                  ? `Sayfa ${page} / ${totalPages} · ${total} müşteri`
                  : `Page ${page} of ${totalPages} · ${total} customers`}
              </span>
              <div className="flex gap-1.5">
                {page > 1 ? (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="bz-btn-ghost"
                  >
                    {isTr ? '← Önceki' : '← Prev'}
                  </Link>
                ) : (
                  <span className="bz-btn-ghost opacity-40 cursor-not-allowed">
                    {isTr ? '← Önceki' : '← Prev'}
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="bz-btn-ghost"
                  >
                    {isTr ? 'Sonraki →' : 'Next →'}
                  </Link>
                ) : (
                  <span className="bz-btn-ghost opacity-40 cursor-not-allowed">
                    {isTr ? 'Sonraki →' : 'Next →'}
                  </span>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
