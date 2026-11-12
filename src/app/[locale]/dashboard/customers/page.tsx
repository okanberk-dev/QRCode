import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  Crown,
  Wallet,
  Repeat2,
  AlertTriangle,
  Inbox,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { PageHeader, StatCard, EmptyState, Badge, AlertBanner } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import {
  deriveCustomerFields,
  computeLastChannel,
  computeLastTopic,
  applyArchiveOverlay,
  applySegmentOverride,
  type CustomerSegment,
  type CustomerSentiment,
} from '@/lib/customers';
import { SegmentChip } from '@/components/customers/SegmentChip';
import { SentimentBadge } from '@/components/customers/SentimentBadge';
import { SentimentSparkbar } from '@/components/customers/SentimentSparkbar';
import { CustomerDetailDrawer } from './_components/CustomerDetailDrawer';
import CustomersBulkBar from './_components/CustomersBulkBar';
import { CustomersToolbar } from './_components/CustomersToolbar';

// Phase 8 — Owner Customers CRM (CLAUDE.md §23.7 Phase 12.x).
// Phase 8c (CLAUDE.md §38.16): segment + LTV + sentiment columns + segment
// filter pills. Helper'lar lib/customers.ts (saf fonksiyon, test edilebilir).
//
// Server component + direct Prisma raw SQL (admin /api/admin/customers paterni
// reuse). IDOR via getScopedRestaurantIds. Anonim feedback (email + phone null)
// listede yer almaz; dedupe key (restaurantId, COALESCE(lower(email), phone)).

export const dynamic = 'force-dynamic';

const RANGE_PRESETS = { '7d': 7, '30d': 30, '90d': 90 } as const;
type RangeKey = keyof typeof RANGE_PRESETS | 'all';

const PAGE_SIZE = 25;
const MAX_AGGREGATE_ROWS = 5000;
// §38.47 — 'churned' segment eklendi (CLAUDE.md §38.36 backlog kapanışı).
const VALID_SEGMENTS = new Set<CustomerSegment>(['new', 'risk', 'vip', 'loyal', 'churned']);

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    range?: string;
    search?: string;
    restaurantId?: string;
    page?: string;
    segment?: string;
    // §38.48 Wave 2 — archived müşterileri göster (varsayılan: gizli).
    showArchived?: string;
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
  // §38.47 — son feedback'in aspect rating'leri (lastTopic için).
  last_food_rating: number | null;
  last_service_rating: number | null;
  last_atmosphere_rating: number | null;
}

interface SummaryRow {
  customers: bigint;
  feedbacks: bigint;
  avg_rating: number | null;
}

interface EnrichedRow {
  restaurant_id: string;
  restaurant_name: string | null;
  contact_key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  platform: string | null;
  last_rating: number | null;
  avg_rating: number | null;
  last_at: Date;
  feedback_count: number;
  segment: CustomerSegment;
  ltv: number;
  sentiment: CustomerSentiment;
  days_since: number | null;
  // §38.47 — derived label'lar (UI render-time, locale-aware).
  last_topic: string;
  last_channel: string;
  // §38.48 Wave 2 — archived state (UI muted styling + "Geri al" buton).
  archived: boolean;
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
  const intLocale = isTr ? 'tr-TR' : 'en-US';

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
      <div className="mx-auto max-w-[1600px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
        <PageHeader
          titleScale="compact"
          title={isTr ? 'Müşteriler' : 'Customers'}
          description={
            isTr
              ? 'Yorum bırakan müşterilerin listesi.'
              : 'List of customers who left feedback.'
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
  const segmentParamRaw = (sp.segment || '').trim().toLowerCase();
  const segmentFilter = VALID_SEGMENTS.has(segmentParamRaw as CustomerSegment)
    ? (segmentParamRaw as CustomerSegment)
    : null;
  const requestedPage = Math.max(1, Number.parseInt(sp.page || '1', 10) || 1);
  // §38.48 Wave 2 — `?showArchived=1` toggle. Default: archived müşteriler
  // listede gizli. Toggle on iken filter overlay bypass edilir.
  const showArchived = sp.showArchived === '1' || sp.showArchived === 'true';

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
  let aggregates: AggregateRow[] = [];
  // §38.48 Wave 2 — Archive overlay + segment override map'leri.
  let archivedKeys = new Set<string>();
  let segmentOverrides = new Map<string, CustomerSegment>();
  let errored = false;

  try {
    // Phase 8c — fetch up to MAX_AGGREGATE_ROWS aggregate rows; JS-side derive
    // segment/LTV/sentiment + filter + pagination. SQL'de segment hesaplaması
    // duplicate olmasın diye (helper drift önleme) bilinçli pattern (CLAUDE.md
    // §38.16). Buaze ölçeği için 5000 cap rahat.
    // §38.48 — overlay query'leri Promise.all'a paralel eklendi (CLAUDE.md
    // §14.1 connection_limit=1 disiplini için tek transaction yerine paralel
    // küçük query'ler kabul edilebilir — overlay tabloları boş çoğu owner için).
    const [summary, fetched, archives, overrides] = await Promise.all([
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
          (ARRAY_AGG(f.platform ORDER BY f.created_at DESC))[1] AS platform,
          (ARRAY_AGG(f.rating ORDER BY f.created_at DESC))[1] AS last_rating,
          (ARRAY_AGG(f.food_rating ORDER BY f.created_at DESC))[1] AS last_food_rating,
          (ARRAY_AGG(f.service_rating ORDER BY f.created_at DESC))[1] AS last_service_rating,
          (ARRAY_AGG(f.atmosphere_rating ORDER BY f.created_at DESC))[1] AS last_atmosphere_rating,
          AVG(f.rating)::float AS avg_rating,
          MAX(f.created_at) AS last_at,
          COUNT(*)::bigint AS feedback_count
        FROM feedback f
        LEFT JOIN restaurants r ON r.id = f.restaurant_id
        WHERE ${whereSql}
        GROUP BY f.restaurant_id, r.name, contact_key
        ORDER BY MAX(f.created_at) DESC
        LIMIT ${MAX_AGGREGATE_ROWS}
      `),
      // §38.48 — Archive overlay (showArchived ise filter hâlâ sorgulanır
      // ama UI bypass eder; "geri al" butonu için archived state gerekir).
      // Scoped to the active business when one is selected.
      prisma.customerArchive.findMany({
        where: { restaurantId: restaurantIdParam ?? { in: scopedIds } },
        select: { restaurantId: true, contactKey: true },
      }),
      // §38.48 — Segment override (manualSegment varsa derived'i replace eder).
      prisma.customerSegmentOverride.findMany({
        where: { restaurantId: restaurantIdParam ?? { in: scopedIds } },
        select: { restaurantId: true, contactKey: true, manualSegment: true },
      }),
    ]);
    summaryRow = summary[0];
    aggregates = fetched;
    archivedKeys = new Set(archives.map((a) => `${a.restaurantId}|${a.contactKey}`));
    segmentOverrides = new Map(
      overrides
        .filter((o) =>
          (['vip', 'loyal', 'new', 'risk', 'churned'] as CustomerSegment[]).includes(
            o.manualSegment as CustomerSegment,
          ),
        )
        .map((o) => [
          `${o.restaurantId}|${o.contactKey}`,
          o.manualSegment as CustomerSegment,
        ]),
    );
  } catch (error) {
    console.error('[OWNER_CUSTOMERS_PAGE]', error);
    errored = true;
  }

  // JS-side enrichment + filter + slice (Phase 8c). §38.47 — derive lastTopic
  // + lastChannel labels + churned segment via daysSinceLastVisit input.
  const now = new Date();
  const enriched: EnrichedRow[] = aggregates.map((r) => {
    const visits = Number(r.feedback_count);
    const derived = deriveCustomerFields({
      visits,
      avgRating: r.avg_rating,
      lastAt: r.last_at,
      now,
      lastTopicInput: {
        rating: r.last_rating,
        foodRating: r.last_food_rating,
        serviceRating: r.last_service_rating,
        atmosphereRating: r.last_atmosphere_rating,
      },
      lastPlatform: r.platform,
      locale,
    });
    // §38.48 — Segment override (manualSegment varsa derived'i replace).
    const overrideKey = `${r.restaurant_id}|${r.contact_key}`;
    const finalSegment = applySegmentOverride(derived.segment, overrideKey, segmentOverrides);
    return {
      restaurant_id: r.restaurant_id,
      restaurant_name: r.restaurant_name,
      contact_key: r.contact_key,
      name: r.name,
      email: r.email,
      phone: r.phone,
      branch: r.branch,
      platform: r.platform,
      last_rating: r.last_rating,
      avg_rating: r.avg_rating,
      last_at: r.last_at,
      feedback_count: visits,
      segment: finalSegment,
      ltv: derived.ltv,
      sentiment: derived.sentiment,
      days_since: derived.daysSinceLastVisit,
      // §38.47 — derived label'lar; deriveCustomerFields helper zaten compute
      // etti, fallback olarak helper'ı tekrar çağırıyoruz (lastTopic/lastChannel
      // her zaman dolu olsun diye — input geçirildi, undefined gelmez).
      last_topic: derived.lastTopic ?? computeLastTopic({ rating: r.last_rating }, locale),
      last_channel: derived.lastChannel ?? computeLastChannel(r.platform, locale),
      // §38.48 — Archived state (UI muted styling + "Geri al" buton).
      archived: archivedKeys.has(overrideKey),
    };
  });

  // §38.48 — Archive overlay: showArchived=1 ise filter bypass; default
  // archived müşteriler listede görünmez.
  const visibleEnriched = showArchived
    ? enriched
    : applyArchiveOverlay(enriched, archivedKeys);

  // Segment counts hesapla (filter pill label'ları) — segment filter UYGULANMADAN.
  // Her pill, mevcut range/scope için segment toplamını gösterir.
  // §38.47 — `churned` segment count eklendi.
  // §38.48 — `visibleEnriched` (archive overlay sonrası) üstünden — owner pill
  // sayıları "şu an gördüğüm liste" semantiği taşır; archived dahil değil
  // (showArchived=1 ise zaten visibleEnriched = enriched).
  const segmentCounts: Record<'all' | CustomerSegment, number> = {
    all: visibleEnriched.length,
    vip: 0,
    loyal: 0,
    new: 0,
    risk: 0,
    churned: 0,
  };
  for (const row of visibleEnriched) {
    segmentCounts[row.segment] += 1;
  }

  // §38.36 + §38.47 — 5-stat KPI grid (Toplam / VIP / Ortalama LTV /
  // Tekrar gelme / Risk altında). YoY + sektör benchmark deltaları SKIP
  // (CLAUDE.md §35.8 — verifiable olmayan iddia, "sektör %48" gibi).
  // Archived customers in the current list (business + period + search) —
  // drives the archive toggle and its "(n)" count.
  const archivedInView = enriched.reduce((n, r) => n + (r.archived ? 1 : 0), 0);

  // Same base as the tabs and the other KPIs (archived customers excluded
  // unless shown). Only when the row cap was hit does the SQL summary (which
  // counts every customer) give the better total.
  const truncated = aggregates.length >= MAX_AGGREGATE_ROWS;
  const totalCustomers = truncated
    ? summaryRow ? Number(summaryRow.customers) : 0
    : visibleEnriched.length;
  const vipCount = segmentCounts.vip;
  const vipPct = totalCustomers > 0 ? (vipCount / totalCustomers) * 100 : 0;
  const avgLtv =
    visibleEnriched.length > 0
      ? Math.round(visibleEnriched.reduce((sum, r) => sum + r.ltv, 0) / visibleEnriched.length)
      : 0;
  const returningCount = visibleEnriched.filter((r) => r.feedback_count >= 2).length;
  const returnRate = visibleEnriched.length > 0 ? (returningCount / visibleEnriched.length) * 100 : 0;
  // §38.47 — 5. KPI "Risk altında". `risk` + `churned` segment'lerin toplamı
  // owner için "şu an dikkat gereken müşteri" sinyalidir; tasarım sade "Risk
  // altında" başlığını taşır → ikisini birleştir, alt-text'te ayrım göster.
  const riskCount = segmentCounts.risk;
  const churnedCount = segmentCounts.churned;
  const atRiskCount = riskCount + churnedCount;

  // Apply segment filter (post-derive).
  const filtered = segmentFilter
    ? visibleEnriched.filter((r) => r.segment === segmentFilter)
    : visibleEnriched;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // `?page` can point past the end (e.g. kept by the business switcher when
  // moving to a smaller business) — fall back to the last page.
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(offset, offset + PAGE_SIZE);

  // The active business (`restaurantId`) is the shell's scope, not a filter:
  // the topbar switcher always writes it into the URL on this page, so it
  // must not light up "Temizle" or the "no match for these filters" copy.
  const hasFilter = Boolean(search || segmentFilter || rangeKey !== '30d' || showArchived);

  // URL builder for pagination + drawer detail links (filters are written by
  // the client toolbar). Keeps every current filter and the business scope.
  function buildHref(over: { page?: string; detail?: string }) {
    const q = new URLSearchParams();
    if (rangeKey !== '30d') q.set('range', rangeKey);
    if (search) q.set('search', search);
    if (restaurantIdParam) q.set('restaurantId', restaurantIdParam);
    if (segmentFilter) q.set('segment', segmentFilter);
    const p = over.page ?? String(page);
    if (p && p !== '1') q.set('page', p);
    if (over.detail) q.set('detail', over.detail);
    if (showArchived) q.set('showArchived', '1');
    const qs = q.toString();
    return `/${locale}/dashboard/customers${qs ? `?${qs}` : ''}`;
  }

  // §46 — dates in the business time zone (the server runs in UTC), same as
  // the detail drawer.
  const dateFormat = new Intl.DateTimeFormat(intLocale, {
    timeZone: resolveDisplayTimeZone(),
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  function fmtDate(iso: string | Date) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : dateFormat.format(d);
  }

  // CSV export keeps the same filters as the list on screen.
  const exportHref = (() => {
    const q = new URLSearchParams();
    if (rangeKey !== '30d') q.set('range', rangeKey);
    if (search) q.set('search', search);
    if (restaurantIdParam) q.set('restaurantId', restaurantIdParam);
    if (segmentFilter) q.set('segment', segmentFilter);
    const qs = q.toString();
    return `/api/customers/export${qs ? `?${qs}` : ''}`;
  })();

  // "Clear filters" keeps the active business (the shell's scope).
  const resetHref = restaurantIdParam
    ? `/${locale}/dashboard/customers?restaurantId=${encodeURIComponent(restaurantIdParam)}`
    : `/${locale}/dashboard/customers`;

  // With one business active its name would repeat on every row; it is only
  // shown when the list spans several businesses.
  const showBusinessName = !restaurantIdParam;

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        /* §38.66 — dense list page: compact title. §49 — no eyebrow (the
           topbar breadcrumb already says where we are). */
        titleScale="compact"
        title={isTr ? 'Müşteriler' : 'Customers'}
        description={
          isTr
            ? 'Yorum bırakan müşterilerle e-posta veya telefonla iletişime geç.'
            : 'Reach customers who left a review by email or phone.'
        }
        actions={
          /* §38.64 — export is the only header action (manual add / CSV
             import were dropped by product decision). */
          rows.length > 0 ? (
            <a href={exportHref} className="bz-btn-ghost gap-1.5 text-[13px]" download>
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              {isTr ? 'CSV indir' : 'Export CSV'}
            </a>
          ) : undefined
        }
      />

      {errored && (
        <AlertBanner kind="danger">
          {isTr ? 'Müşteriler yüklenemedi.' : 'Customers could not be loaded.'}
        </AlertBanner>
      )}

      {truncated && !errored && (
        <AlertBanner kind="warn">
          {isTr
            ? `Çok fazla müşteri var; yalnızca ilk ${MAX_AGGREGATE_ROWS.toLocaleString('tr-TR')} kayıt gösteriliyor. Daha kısa bir dönem seçebilirsin.`
            : `Too many customers; showing the first ${MAX_AGGREGATE_ROWS.toLocaleString('en-US')} records. Pick a shorter period to narrow it down.`}
        </AlertBanner>
      )}

      {/* §38.36 + §38.47 — 5 KPI cards (Toplam / VIP / Ort. LTV / Geri dönüş /
          Risk altında). Mobile: total full width, then 2 × 2. md–lg: 2 + 3
          (five cards at 1024px would break the labels mid-word). xl: one
          row of 5. Same grid in loading.tsx (§40.10). */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 xl:grid-cols-5">
        <StatCard
          className="col-span-2 md:col-span-3 xl:col-span-1"
          label={isTr ? 'Toplam misafir' : 'Total guests'}
          value={totalCustomers.toLocaleString(intLocale)}
          icon={<Users size={14} />}
        />
        <StatCard
          className="md:col-span-3 xl:col-span-1"
          label="VIP"
          value={vipCount.toLocaleString(intLocale)}
          icon={<Crown size={14} className="text-[#A8D62E]" />}
          delta={
            totalCustomers > 0
              ? isTr
                ? `%${vipPct.toFixed(1).replace('.', ',')} pay`
                : `${vipPct.toFixed(1)}% share`
              : null
          }
          deltaKind="neutral"
        />
        <StatCard
          className="md:col-span-2 xl:col-span-1"
          label={isTr ? 'Ort. LTV' : 'Avg LTV'}
          value={avgLtv > 0 ? avgLtv.toLocaleString(intLocale) : '—'}
          icon={<Wallet size={14} />}
        />
        <StatCard
          className="md:col-span-2 xl:col-span-1"
          label={isTr ? 'Geri dönüş oranı' : 'Return rate'}
          value={
            visibleEnriched.length > 0
              ? isTr
                ? `%${Math.round(returnRate)}`
                : `${Math.round(returnRate)}%`
              : '—'
          }
          icon={<Repeat2 size={14} />}
          delta={
            visibleEnriched.length > 0
              ? `${returningCount.toLocaleString(intLocale)} ${isTr ? 'tekrar gelen' : 'returning'}`
              : null
          }
          deltaKind="neutral"
        />
        <StatCard
          className="md:col-span-2 xl:col-span-1"
          label={isTr ? 'Risk altında' : 'At risk'}
          value={atRiskCount.toLocaleString(intLocale)}
          icon={<AlertTriangle size={14} className="text-[#DC2626]" />}
          delta={
            atRiskCount > 0
              ? isTr
                ? `${riskCount} risk · ${churnedCount} kayıp`
                : `${riskCount} at risk · ${churnedCount} churned`
              : null
          }
          deltaKind="neutral"
        />
      </div>

      {/* §49 — one toolbar: segment · search · period · archive · clear.
          Every control applies immediately (no "Uygula"). The business scope
          comes from the shell's switcher (`?restaurantId`), never from here. */}
      <CustomersToolbar
        locale={locale}
        archivedCount={archivedInView}
        segmentCounts={segmentCounts}
      />

      {/* Table — desktop, card list on mobile (CLAUDE.md §23.6 paterni) */}
      {rows.length === 0 && !errored ? (
        <div className="bz-card p-10">
          <EmptyState
            icon={<Inbox size={22} strokeWidth={1.5} />}
            title={
              hasFilter
                ? isTr ? 'Bu filtreye uyan müşteri yok' : 'No customers match these filters'
                : isTr ? 'Henüz müşteri yok' : 'No customers yet'
            }
            body={
              hasFilter
                ? isTr
                  ? 'Dönemi genişletmeyi ya da filtreleri temizlemeyi dene.'
                  : 'Try a longer period or clear the filters.'
                : isTr
                  ? 'İletişim bilgisi bırakarak yorum yapan müşteriler burada görünür.'
                  : 'Customers who leave a review with their contact details appear here.'
            }
            action={
              hasFilter ? (
                <Link href={resetHref} className="bz-btn-ghost">
                  {isTr ? 'Filtreleri temizle' : 'Clear filters'}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* §38.36 + §38.47 — Desktop table 8-col. Eski "İletişim" sütunu
              drop (email Misafir altına taşındı, telefon drawer'da). §38.47'de
              Kanal + Son konu kolonları eklendi. Sentiment SentimentBadge
              yerine SentimentSparkbar (0-100 score progress + number).
              Avatar bg sentiment-based (pos lime-soft / neg red-soft /
              neu n100). */}
          <div className="bz-card hidden overflow-x-auto lg:block">
            <table className="bz-table w-full min-w-[1080px]">
              <thead>
                <tr>
                  {/* §38.48 Wave 2 — bulk select-all checkbox; client island hydrates.
                      Sticky left-0: isim kolonu left-10'da sabitken checkbox kolonu
                      kayıp onun altından geçiyordu. */}
                  <th className="w-10 text-left sticky left-0 z-10 bg-white">
                    <input
                      type="checkbox"
                      data-select-all
                      aria-label={isTr ? 'Tümünü seç' : 'Select all'}
                      className="h-4 w-4 cursor-pointer accent-[#0A0A0A]"
                    />
                  </th>
                  <th className="text-left sticky left-10 z-10 bg-white">
                    {isTr ? 'Misafir' : 'Guest'}
                  </th>
                  <th className="text-left">Segment</th>
                  <th className="text-right">{isTr ? 'Ziyaret' : 'Visits'}</th>
                  <th className="text-right">LTV</th>
                  <th className="text-left">{isTr ? 'Son konu' : 'Last topic'}</th>
                  <th className="text-left">{isTr ? 'Kanal' : 'Channel'}</th>
                  <th className="text-right">{isTr ? 'Son ziyaret' : 'Last seen'}</th>
                  <th className="text-left">{isTr ? 'Memnuniyet' : 'Sentiment'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const initials = (r.name || r.email || r.phone || '?')
                    .charAt(0)
                    .toUpperCase();
                  const detailKey = `${r.restaurant_id}|${r.contact_key}`;
                  const detailHref = buildHref({ detail: detailKey });
                  // §38.36 — Sentiment-based avatar bg (tasarım line 131-134).
                  const avatarBg =
                    r.sentiment === 'neg' ? '#FEF2F2'
                    : r.sentiment === 'pos' ? '#EAF9B8'
                    : '#F5F5F5';
                  const avatarFg = r.sentiment === 'neg' ? '#991B1B' : '#0A0A0A';
                  // Score 0-100 (avgRating × 20, clamped).
                  const sentScore =
                    r.avg_rating != null
                      ? Math.round(Math.max(0, Math.min(5, r.avg_rating)) * 20)
                      : 0;
                  return (
                    // `group` + `!bg`: .bz-table hover kuralı katmansız olduğundan
                    // utility'leri ezip sticky hücreleri yarı saydam yapıyordu
                    // (yatay scroll'da alttaki içerik görünüyordu).
                    <tr key={detailKey} className={`group bz-tr-hover ${r.archived ? 'opacity-60' : ''}`}>
                      <td className="w-10 sticky left-0 z-10 !bg-white group-hover:!bg-[#FAFAFA]">
                        <input
                          type="checkbox"
                          data-customer-key={detailKey}
                          aria-label={isTr ? 'Bu satırı seç' : 'Select row'}
                          className="h-4 w-4 cursor-pointer accent-[#0A0A0A]"
                        />
                      </td>
                      <td className="sticky left-10 z-10 !bg-white group-hover:!bg-[#FAFAFA]">
                        <div className="flex items-center gap-3">
                          <div
                            className="bz-avatar h-8 w-8 text-[12px]"
                            style={{ backgroundColor: avatarBg, color: avatarFg }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={detailHref}
                              scroll={false}
                              className="block truncate text-[13px] font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                              aria-label={`${r.name || 'Anonim'} — ${isTr ? 'detayı aç' : 'open detail'}`}
                            >
                              {r.name || (isTr ? 'Anonim' : 'Anonymous')}
                            </Link>
                            {r.email && (
                              <div className="bz-mono text-[11px] text-[#737373] truncate max-w-[220px]">
                                {r.email}
                              </div>
                            )}
                            {((showBusinessName && r.restaurant_name) || r.branch) && (
                              <div className="text-[11px] text-[#737373] truncate">
                                {[showBusinessName ? r.restaurant_name : null, r.branch]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <SegmentChip segment={r.segment} locale={locale} />
                      </td>
                      <td className="text-right">
                        <span className="bz-mono tabular-nums text-[13px] font-semibold text-[#0A0A0A]">
                          {r.feedback_count}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="bz-mono tabular-nums text-[12.5px] font-semibold text-[#0A0A0A]">
                          {r.ltv.toLocaleString(intLocale)}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#525252]">
                          {r.last_topic}
                        </span>
                      </td>
                      <td>
                        <span className="bz-mono text-[11px] inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[#525252] whitespace-nowrap">
                          {r.last_channel}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="bz-mono text-[11.5px] text-[#737373]">
                          {fmtDate(r.last_at)}
                        </span>
                      </td>
                      <td>
                        <SentimentSparkbar score={sentScore} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list (§23.6). One action per card: the whole card
              opens the detail drawer, where email / call live. The checkbox
              sits above the stretched link with a 44px hit area. */}
          <div className="grid gap-3 lg:hidden">
            {rows.map((r) => {
              const initials = (r.name || r.email || r.phone || '?')
                .charAt(0)
                .toUpperCase();
              const detailKey = `${r.restaurant_id}|${r.contact_key}`;
              const detailHref = buildHref({ detail: detailKey });
              const avatarBg =
                r.sentiment === 'neg' ? '#FEF2F2'
                : r.sentiment === 'pos' ? '#EAF9B8'
                : '#F5F5F5';
              const avatarFg = r.sentiment === 'neg' ? '#991B1B' : '#0A0A0A';
              const displayName = r.name || (isTr ? 'Anonim' : 'Anonymous');
              const subline = [r.email || r.phone, showBusinessName ? r.restaurant_name : null, r.branch]
                .filter(Boolean)
                .join(' · ');
              return (
                <div
                  key={detailKey}
                  className={`bz-card relative p-4 transition-colors hover:border-[#D4D4D4] ${r.archived ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <label className="relative z-10 -my-2.5 -ml-2.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        data-customer-key={detailKey}
                        aria-label={isTr ? `${displayName} seç` : `Select ${displayName}`}
                        className="h-4 w-4 cursor-pointer accent-[#0A0A0A]"
                      />
                    </label>
                    <div
                      aria-hidden="true"
                      className="bz-avatar h-9 w-9 shrink-0 text-[13px]"
                      style={{ backgroundColor: avatarBg, color: avatarFg }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={detailHref}
                          scroll={false}
                          className="min-w-0 truncate text-[14px] font-semibold text-[#0A0A0A] after:absolute after:inset-0 after:rounded-[12px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#C6F24E]"
                        >
                          {displayName}
                        </Link>
                        {r.last_rating != null && (
                          <Badge kind={r.last_rating >= 4 ? 'lime' : r.last_rating >= 3 ? 'warn' : 'danger'}>
                            {r.last_rating}★
                          </Badge>
                        )}
                      </div>
                      {subline && (
                        <div className="mt-0.5 truncate text-[12px] text-[#737373]">{subline}</div>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <SegmentChip segment={r.segment} locale={locale} size="sm" />
                        <SentimentBadge sentiment={r.sentiment} locale={locale} />
                      </div>
                      <div className="mt-2 text-[12px] text-[#737373]">
                        {r.feedback_count} {isTr ? 'yorum' : r.feedback_count === 1 ? 'review' : 'reviews'}
                        {' · '}
                        {r.last_channel}
                        {' · '}
                        {fmtDate(r.last_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* §38.36 — Pagination polish: "X–Y / total misafir" + page numbers
              + chevron icons. Tasarım line 157-174. Smart ellipsis (≤7 sayfa
              tüm sayılar, >7 current ± 1 ile compact). */}
          {totalPages > 1 &&
            (() => {
              const startRow = offset + 1;
              const endRow = Math.min(offset + PAGE_SIZE, total);
              const pageList: (number | '…')[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i += 1) pageList.push(i);
              } else {
                pageList.push(1);
                if (page > 3) pageList.push('…');
                const lo = Math.max(2, page - 1);
                const hi = Math.min(totalPages - 1, page + 1);
                for (let i = lo; i <= hi; i += 1) pageList.push(i);
                if (page < totalPages - 2) pageList.push('…');
                pageList.push(totalPages);
              }
              return (
                <nav
                  className="bz-card flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between"
                  aria-label={isTr ? 'Sayfalar' : 'Pagination'}
                >
                  <span className="bz-mono text-[11.5px] text-[#737373] tabular-nums">
                    {isTr
                      ? `${startRow.toLocaleString(intLocale)}–${endRow.toLocaleString(intLocale)} / ${total.toLocaleString(intLocale)} misafir`
                      : `${startRow.toLocaleString(intLocale)}–${endRow.toLocaleString(intLocale)} of ${total.toLocaleString(intLocale)} guests`}
                  </span>
                  <div className="flex items-center gap-1">
                    {page > 1 ? (
                      <Link
                        href={buildHref({ page: String(page - 1) })}
                        className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8"
                        aria-label={isTr ? 'Önceki sayfa' : 'Previous page'}
                      >
                        <ChevronLeft size={14} strokeWidth={2} />
                      </Link>
                    ) : (
                      <span
                        className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8 opacity-40 cursor-not-allowed"
                        aria-disabled="true"
                      >
                        <ChevronLeft size={14} strokeWidth={2} />
                      </span>
                    )}
                    {pageList.map((p, i) =>
                      p === '…' ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="bz-mono text-[11px] text-[#A3A3A3] px-1"
                          aria-hidden
                        >
                          …
                        </span>
                      ) : (
                        <Link
                          key={p}
                          href={buildHref({ page: String(p) })}
                          aria-current={p === page ? 'page' : undefined}
                          // §38.74 — Mobile WCAG 2.5.5 (44x44 touch target).
                          // Mobile h-11 w-11 (44px); sm:+ h-8 (32px) compact.
                          className={`min-w-[44px] h-11 sm:min-w-[32px] sm:h-8 inline-flex items-center justify-center rounded-md px-2 text-[12px] font-medium tabular-nums transition-colors ${
                            p === page
                              ? 'bg-[#0A0A0A] text-white'
                              : 'text-[#525252] hover:bg-[#F5F5F5]'
                          }`}
                        >
                          {p}
                        </Link>
                      ),
                    )}
                    {page < totalPages ? (
                      <Link
                        href={buildHref({ page: String(page + 1) })}
                        className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8"
                        aria-label={isTr ? 'Sonraki sayfa' : 'Next page'}
                      >
                        <ChevronRight size={14} strokeWidth={2} />
                      </Link>
                    ) : (
                      <span
                        className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8 opacity-40 cursor-not-allowed"
                        aria-disabled="true"
                      >
                        <ChevronRight size={14} strokeWidth={2} />
                      </span>
                    )}
                  </div>
                </nav>
              );
            })()}
        </>
      )}

      {/* Overlays: detail drawer (`?detail=KEY`) + bulk action bar. Wrapped in
          a `display: contents` box so the page's `space-y-5` margin never
          lands on their fixed-position elements (a 20px bottom margin used
          to shrink the drawer backdrop and leave an uncovered strip). */}
      <div className="contents">
        <CustomerDetailDrawer locale={locale} />
        <CustomersBulkBar locale={locale} showArchived={showArchived} />
      </div>
    </div>
  );
}
