import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Mail,
  Phone,
  Users,
  Crown,
  Wallet,
  Repeat2,
  AlertTriangle,
  Inbox,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { PageHeader, StatCard, EmptyState, Badge } from '@/components/ui';
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
  const segmentParamRaw = (sp.segment || '').trim().toLowerCase();
  const segmentFilter = VALID_SEGMENTS.has(segmentParamRaw as CustomerSegment)
    ? (segmentParamRaw as CustomerSegment)
    : null;
  const page = Math.max(1, Number.parseInt(sp.page || '1', 10) || 1);
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
  let restaurants: { id: string; name: string }[] = [];
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
    const [summary, fetched, restaurantList, archives, overrides] = await Promise.all([
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
      prisma.restaurant.findMany({
        where: { id: { in: scopedIds } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      // §38.48 — Archive overlay (showArchived ise filter hâlâ sorgulanır
      // ama UI bypass eder; "geri al" butonu için archived state gerekir).
      prisma.customerArchive.findMany({
        where: { restaurantId: { in: scopedIds } },
        select: { restaurantId: true, contactKey: true },
      }),
      // §38.48 — Segment override (manualSegment varsa derived'i replace eder).
      prisma.customerSegmentOverride.findMany({
        where: { restaurantId: { in: scopedIds } },
        select: { restaurantId: true, contactKey: true, manualSegment: true },
      }),
    ]);
    summaryRow = summary[0];
    aggregates = fetched;
    restaurants = restaurantList;
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

  // §38.36 + §38.47 — 5-stat KPI grid. Tasarım: .design-owner-2026/page-customers.jsx
  // line 54-67 (5 KPI: Toplam / VIP / Ortalama LTV / Tekrar gelme / Risk altında).
  // YoY + sektör benchmark deltaları SKIP (CLAUDE.md §35.8 — verifiable olmayan
  // iddia, "sektör %48" gibi).
  const totalCustomers = summaryRow ? Number(summaryRow.customers) : 0;
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
  const offset = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(offset, offset + PAGE_SIZE);
  const truncated = aggregates.length >= MAX_AGGREGATE_ROWS;

  const hasFilter = Boolean(search || restaurantIdParam || segmentFilter || rangeKey !== '30d' || showArchived);

  // URL builder for filter forms / pagination / drawer detail links.
  function buildHref(
    over: Partial<Record<'range' | 'search' | 'restaurantId' | 'page' | 'detail' | 'segment' | 'showArchived', string>>,
  ) {
    const q = new URLSearchParams();
    const r = over.range ?? rangeKey;
    if (r !== '30d') q.set('range', r);
    const s = over.search ?? search ?? '';
    if (s) q.set('search', s);
    const rid = over.restaurantId ?? restaurantIdParam ?? '';
    if (rid) q.set('restaurantId', rid);
    // segment: '' explicitly clears; undefined keeps current.
    const seg = over.segment !== undefined ? over.segment : (segmentFilter ?? '');
    if (seg) q.set('segment', seg);
    const p = over.page ?? String(page);
    if (p && p !== '1') q.set('page', p);
    if (over.detail) q.set('detail', over.detail);
    // §38.48 — showArchived toggle URL state.
    const arch = over.showArchived !== undefined ? over.showArchived : (showArchived ? '1' : '');
    if (arch) q.set('showArchived', arch);
    const qs = q.toString();
    return `/${locale}/dashboard/customers${qs ? `?${qs}` : ''}`;
  }

  function fmtDate(iso: string | Date) {
    return new Date(iso).toLocaleDateString(intLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Segment pills config — table-of-truth, render desktop + mobile.
  // §38.47 — 6. chip "Kayıp" (churned) eklendi (tasarım birebir).
  const SEGMENT_PILLS: Array<{
    key: 'all' | CustomerSegment;
    labelTr: string;
    labelEn: string;
  }> = [
    { key: 'all', labelTr: 'Tümü', labelEn: 'All' },
    { key: 'vip', labelTr: 'VIP', labelEn: 'VIP' },
    { key: 'loyal', labelTr: 'Düzenli', labelEn: 'Loyal' },
    { key: 'new', labelTr: 'Yeni', labelEn: 'New' },
    { key: 'risk', labelTr: 'Risk', labelEn: 'Risk' },
    { key: 'churned', labelTr: 'Kayıp', labelEn: 'Churned' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        /* §38.66 — Customers 8-col tablo + filter toolbar + KPI grid yoğun
           layout; hero h1 ezici. titleScale="compact" mütevazı kalır. */
        titleScale="compact"
        eyebrow="CRM"
        title={isTr ? 'Müşteriler' : 'Customers'}
        description={
          isTr
            ? 'Yorum bırakan müşterilerin tek listesi — e-posta veya telefonla iletişime geçilebilir.'
            : 'Customers who left a review — reachable via email or phone.'
        }
        actions={
          /* §38.64 — Manuel "Müşteri ekle" + CSV "İçe aktar" kullanıcı kararıyla
             iptal (CLAUDE.md §38.16 + §38.48 + §38.64 disipline). Tasarımdaki
             3-button trio'dan sadece "Dışa aktar" görünür kalır (export-only).
             Yeniden eklemek için: kullanıcı açık talep + Customer ana modeli
             yaklaşımı (CLAUDE.md §34.4 silinmiş feature paterni). */
          rows.length > 0 ? (
            <a
              href={(() => {
                const q = new URLSearchParams();
                if (rangeKey !== '30d') q.set('range', rangeKey);
                if (search) q.set('search', search);
                if (restaurantIdParam) q.set('restaurantId', restaurantIdParam);
                if (segmentFilter) q.set('segment', segmentFilter);
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

      {truncated && !errored && (
        <div className="bz-card border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E]">
          {isTr
            ? `Çok fazla müşteri var; yalnızca ilk ${MAX_AGGREGATE_ROWS.toLocaleString('tr-TR')} kayıt gösteriliyor. Daha dar bir tarih aralığı veya işletme filtresi seçebilirsin.`
            : `Too many customers; showing the first ${MAX_AGGREGATE_ROWS.toLocaleString('en-US')} records. Narrow the date range or business filter to refine.`}
        </div>
      )}

      {/* §38.36 + §38.47 — 5-stat KPI grid (TOPLAM / VIP / ORT. LTV / GERİ DÖNÜŞ
          / RİSK ALTINDA). Tasarım: .design-owner-2026/page-customers.jsx:54-67.
          Mobile 2-col → 5 KPI 2x3 layout (3. row tek tile, intentional sade). */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label={isTr ? 'Toplam misafir' : 'Total guests'}
          value={totalCustomers.toLocaleString(intLocale)}
          icon={<Users size={14} />}
        />
        <StatCard
          label="VIP"
          value={vipCount.toLocaleString(intLocale)}
          icon={<Crown size={14} className="text-[#C6F24E]" />}
          accent="#C6F24E"
          delta={
            totalCustomers > 0
              ? `%${vipPct.toFixed(1).replace('.', ',')} ${isTr ? 'segment' : 'segment'}`
              : null
          }
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Ort. LTV' : 'Avg LTV'}
          value={avgLtv > 0 ? avgLtv.toLocaleString(intLocale) : '—'}
          icon={<Wallet size={14} />}
        />
        <StatCard
          label={isTr ? 'Geri dönüş oranı' : 'Return rate'}
          value={enriched.length > 0 ? `%${Math.round(returnRate)}` : '—'}
          icon={<Repeat2 size={14} />}
          delta={
            enriched.length > 0
              ? `${returningCount.toLocaleString(intLocale)} ${isTr ? 'tekrar gelen' : 'returning'}`
              : null
          }
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Risk altında' : 'At risk'}
          value={atRiskCount.toLocaleString(intLocale)}
          icon={<AlertTriangle size={14} className="text-[#DC2626]" />}
          delta={
            atRiskCount > 0
              ? isTr
                ? `${riskCount} risk · ${churnedCount} kayıp`
                : `${riskCount} risk · ${churnedCount} churned`
              : null
          }
          deltaKind="neutral"
        />
      </div>

      {/* §38.36 — TEK KONSOLİDE TOOLBAR (eski 2 ayrı bz-card filter section'ı
          birleştirildi: segment pills card + filter form card duplicate → tek
          toolbar). Tasarım: .design-owner-2026/page-customers.jsx:70-84.
          Search (URL form) + segment pills (URL Link) + range chips + restaurant
          select. "Daha fazla filtre" + "Görünüm" tasarım button'ları SKIP
          (CLAUDE.md §7 — backend yok). */}
      <form
        action={`/${locale}/dashboard/customers`}
        method="get"
        className="bz-card p-3 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5"
      >
        {/* Hidden inputs — URL state preservation across search submit */}
        <input type="hidden" name="range" value={rangeKey} />
        {segmentFilter && <input type="hidden" name="segment" value={segmentFilter} />}
        {restaurantIdParam && (
          <input type="hidden" name="restaurantId" value={restaurantIdParam} />
        )}

        {/* Search input — sol icon, max 320px lg, full mobile */}
        <div className="relative w-full lg:w-auto lg:max-w-[320px] lg:flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
            strokeWidth={2}
          />
          <input
            type="search"
            name="search"
            defaultValue={search ?? ''}
            placeholder={isTr ? 'Ad, e-posta veya telefon ara…' : 'Search name, email or phone…'}
            className="bz-input w-full pl-9"
            maxLength={100}
            aria-label={isTr ? 'Müşteri ara' : 'Search customers'}
          />
        </div>

        {/* Divider lg+ */}
        <div className="hidden lg:block h-6 w-px bg-[#EDEDED]" aria-hidden />

        {/* Segment pills inline — count INLINE label, horizontal scroll mobile */}
        <div
          className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0 lg:flex-wrap"
          role="tablist"
          aria-label={isTr ? 'Segment filtresi' : 'Segment filter'}
        >
          {SEGMENT_PILLS.map((pill) => {
            const active = pill.key === 'all' ? segmentFilter === null : segmentFilter === pill.key;
            const count = segmentCounts[pill.key];
            return (
              <Link
                key={pill.key}
                href={buildHref({ segment: pill.key === 'all' ? '' : pill.key, page: '1' })}
                role="tab"
                aria-selected={active}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                  active
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3]'
                }`}
              >
                {isTr ? pill.labelTr : pill.labelEn}
                <span
                  className={`bz-mono tabular-nums text-[10.5px] rounded-full px-1.5 py-0.5 ${
                    active ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
                  }`}
                >
                  {count.toLocaleString(intLocale)}
                </span>
              </Link>
            );
          })}
        </div>

        {/* spacer lg+ */}
        <div className="hidden lg:block flex-1" aria-hidden />

        {/* Range chips — horizontal scroll mobile */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0 lg:flex-wrap">
          {(['7d', '30d', '90d', 'all'] as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={buildHref({ range: k, page: '1' })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
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

        {/* Restaurant select (multi-restaurant only) */}
        {restaurants.length > 1 && (
          <select
            name="restaurantId"
            defaultValue={restaurantIdParam ?? ''}
            className="bz-input w-full lg:w-[180px]"
            aria-label={isTr ? 'İşletme filtresi' : 'Business filter'}
          >
            <option value="">{isTr ? 'Tüm işletmeler' : 'All businesses'}</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}

        {/* §38.48 — Arşiv toggle (Wave 2). Default off; on iken muted styling
            tablo satırlarında + "Geri al" buton. */}
        <Link
          href={buildHref({ showArchived: showArchived ? '' : '1', page: '1' })}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
            showArchived
              ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
              : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3]'
          }`}
          title={isTr ? 'Arşivlenenler dahil' : 'Include archived'}
        >
          {isTr ? 'Arşiv' : 'Archive'}
          {archivedKeys.size > 0 && (
            <span
              className={`bz-mono tabular-nums text-[10.5px] rounded-full px-1.5 py-0.5 ${
                showArchived ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
              }`}
            >
              {archivedKeys.size.toLocaleString(intLocale)}
            </span>
          )}
        </Link>

        {/* Apply / Reset — search submit + filter clear */}
        <div className="flex gap-2 lg:gap-1.5">
          <button type="submit" className="bz-btn-primary">
            {isTr ? 'Uygula' : 'Apply'}
          </button>
          {hasFilter && (
            <Link href={`/${locale}/dashboard/customers`} className="bz-btn-ghost">
              {isTr ? 'Temizle' : 'Reset'}
            </Link>
          )}
        </div>
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
          {/* §38.36 + §38.47 — Desktop table 8-col (tasarım line 108-122 birebir).
              Eski "İletişim" sütunu drop (email Misafir altına taşındı, telefon
              drawer'da). §38.47'de Kanal + Son konu kolonları eklendi (tasarım
              parity). Sentiment SentimentBadge yerine SentimentSparkbar (0-100
              score progress + number). Avatar bg sentiment-based (pos lime-soft
              / neg red-soft / neu n100). */}
          <div className="bz-card hidden overflow-x-auto lg:block">
            <table className="bz-table w-full min-w-[1080px]">
              <thead>
                <tr>
                  {/* §38.48 Wave 2 — bulk select-all checkbox; client island hydrates */}
                  <th className="w-10 text-left">
                    <input
                      type="checkbox"
                      data-select-all
                      aria-label={isTr ? 'Tümünü seç' : 'Select all'}
                      className="h-4 w-4 cursor-pointer accent-[#0A0A0A]"
                    />
                  </th>
                  <th className="text-left sticky left-10 z-10 bg-[#FAFAFA]">
                    {isTr ? 'Misafir' : 'Guest'}
                  </th>
                  <th className="text-left">{isTr ? 'Segment' : 'Segment'}</th>
                  <th className="text-right">{isTr ? 'Ziyaret' : 'Visits'}</th>
                  <th className="text-right">{isTr ? 'LTV' : 'LTV'}</th>
                  <th className="text-left">{isTr ? 'Son konu' : 'Last topic'}</th>
                  <th className="text-left">{isTr ? 'Kanal' : 'Channel'}</th>
                  <th className="text-right">{isTr ? 'Son ziyaret' : 'Last seen'}</th>
                  <th className="text-left">{isTr ? 'Sentiment' : 'Sentiment'}</th>
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
                    <tr key={detailKey} className={`bz-tr-hover ${r.archived ? 'opacity-60' : ''}`}>
                      <td className="w-10">
                        <input
                          type="checkbox"
                          data-customer-key={detailKey}
                          aria-label={isTr ? 'Bu satırı seç' : 'Select row'}
                          className="h-4 w-4 cursor-pointer accent-[#0A0A0A]"
                        />
                      </td>
                      <td className="sticky left-10 z-10 bg-white">
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
                            {(r.restaurant_name || r.branch) && (
                              <div className="text-[11px] text-[#737373] truncate">
                                {r.restaurant_name}
                                {r.branch && r.restaurant_name && ' · '}
                                {r.branch}
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

          {/* Mobile card list — Phase 8c: Segment chip + Sentiment dot eklendi
              (audit önerisi: drawer-centric, LTV mobile card'da gösterilmez). */}
          <div className="grid gap-3 lg:hidden">
            {rows.map((r) => {
              const initials = (r.name || r.email || r.phone || '?')
                .charAt(0)
                .toUpperCase();
              const detailKey = `${r.restaurant_id}|${r.contact_key}`;
              const detailHref = buildHref({ detail: detailKey });
              // §38.40 — Mobile card sentiment-based avatar bg (desktop'taki
              // pattern mobile'a port). Tasarım .design-owner-2026/page-customers.jsx
              // line 131-134 — pos lime-soft / neg red-soft / neu n100.
              const avatarBg =
                r.sentiment === 'neg' ? '#FEF2F2'
                : r.sentiment === 'pos' ? '#EAF9B8'
                : '#F5F5F5';
              const avatarFg = r.sentiment === 'neg' ? '#991B1B' : '#0A0A0A';
              return (
                <div key={detailKey} className={`bz-card p-4 space-y-2.5 ${r.archived ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* §38.48 — bulk select checkbox (mobile card) */}
                    <input
                      type="checkbox"
                      data-customer-key={detailKey}
                      aria-label={isTr ? 'Bu satırı seç' : 'Select row'}
                      className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0A0A0A]"
                    />
                    <div
                      className="bz-avatar h-9 w-9 text-[13px]"
                      style={{ backgroundColor: avatarBg, color: avatarFg }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={detailHref}
                          scroll={false}
                          className="truncate text-[14px] font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                          aria-label={`${r.name || 'Anonim'} — ${isTr ? 'detayı aç' : 'open detail'}`}
                        >
                          {r.name || (isTr ? 'Anonim' : 'Anonymous')}
                        </Link>
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
                  {/* Phase 8c: Segment + Sentiment row */}
                  <div className="flex items-center justify-between gap-2">
                    <SegmentChip segment={r.segment} locale={locale} size="sm" />
                    <SentimentBadge sentiment={r.sentiment} locale={locale} />
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
                  {/* §38.47 — Mobile card meta: kanal pill + son konu metni */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#737373]">
                    <span className="bz-mono inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[#525252]">
                      {r.last_channel}
                    </span>
                    <span className="text-[#525252]">{r.last_topic}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#EDEDED] pt-2 text-[11px] text-[#737373]">
                    <span>
                      <strong className="text-[#0A0A0A]">{r.feedback_count}</strong>{' '}
                      {isTr ? 'yorum' : 'reviews'}
                    </span>
                    <span>{fmtDate(r.last_at)}</span>
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
                        className="bz-btn-icon"
                        aria-label={isTr ? 'Önceki sayfa' : 'Previous page'}
                      >
                        <ChevronLeft size={14} strokeWidth={2} />
                      </Link>
                    ) : (
                      <span
                        className="bz-btn-icon opacity-40 cursor-not-allowed"
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
                          className={`min-w-[28px] h-7 inline-flex items-center justify-center rounded-md px-2 text-[12px] font-medium tabular-nums transition-colors ${
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
                        className="bz-btn-icon"
                        aria-label={isTr ? 'Sonraki sayfa' : 'Next page'}
                      >
                        <ChevronRight size={14} strokeWidth={2} />
                      </Link>
                    ) : (
                      <span
                        className="bz-btn-icon opacity-40 cursor-not-allowed"
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

      {/* Customer detail drawer — URL state ?detail=KEY ile mount/unmount.
          Client island; useSearchParams ile detect, fetch, ESC + outside click
          + body scroll lock. (CLAUDE.md §23.7 Phase 12 Phase 8d) */}
      <CustomerDetailDrawer locale={locale} />

      {/* §38.48 Wave 2 — Bulk action bar client island. Tablodaki checkbox'ları
          hydrate eder + selection state + 3 modal trigger (Kampanya/Segmentle/
          Arşivle). showArchived prop'u "Geri al" eylemi için. */}
      <CustomersBulkBar locale={locale} showArchived={showArchived} />
    </div>
  );
}
