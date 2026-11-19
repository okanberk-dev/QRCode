import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { latestChecksForRestaurants } from '@/lib/platform-link-test';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { PageHeader } from '@/components/ui';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [7, 30, 90] as const;

interface Row {
  id: string;
  name: string;
  isActive: boolean;
  reviews: number;
  avg: number | null;
  prevAvg: number | null;
  low: number;
  lowReplied: number;
  scans: number;
  redirects: number;
  brokenLinks: number;
}

function countMap(rows: Array<{ restaurantId: string | null; _count: unknown }>): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.restaurantId) continue;
    out.set(r.restaurantId, typeof r._count === 'object' && r._count ? Number((r._count as { _all?: number })._all ?? 0) : 0);
  }
  return out;
}

/**
 * Franchise report (Stage 176): every business of the workspace side by side
 * for a period, printable as a PDF from the browser. Same numbers as the
 * inbox and the analytics page: low rating = 1–3★, reply rate = low ratings
 * with at least one reply.
 */
export default async function FranchiseReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const sp = await searchParams;
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 30;

  const token = (await cookies()).get('user_token')?.value;
  const payload = token ? await verifyJwt(token) : null;
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/report`);
  }
  const ids = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });

  const now = Date.now();
  const start = new Date(now - days * DAY_MS);
  const prevStart = new Date(now - 2 * days * DAY_MS);
  const where = { restaurantId: { in: ids } };

  const [restaurants, current, previous, low, lowReplied, scans, redirects] =
    ids.length > 0
      ? await prisma.$transaction([
          prisma.restaurant.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, isActive: true },
            orderBy: { name: 'asc' },
          }),
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { ...where, createdAt: { gte: start } },
            _count: { _all: true },
            _avg: { rating: true },
            orderBy: { restaurantId: 'asc' },
          }),
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { ...where, createdAt: { gte: prevStart, lt: start } },
            _avg: { rating: true },
            orderBy: { restaurantId: 'asc' },
          }),
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { ...where, createdAt: { gte: start }, rating: { lte: 3 } },
            _count: { _all: true },
            orderBy: { restaurantId: 'asc' },
          }),
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { ...where, createdAt: { gte: start }, rating: { lte: 3 }, replies: { some: {} } },
            _count: { _all: true },
            orderBy: { restaurantId: 'asc' },
          }),
          prisma.qrScan.groupBy({
            by: ['restaurantId'],
            where: { ...where, createdAt: { gte: start } },
            _count: { _all: true },
            orderBy: { restaurantId: 'asc' },
          }),
          prisma.platformRedirectEvent.groupBy({
            by: ['restaurantId'],
            where: { ...where, createdAt: { gte: start } },
            _count: { _all: true },
            orderBy: { restaurantId: 'asc' },
          }),
        ])
      : [[], [], [], [], [], [], []];
  const checks = ids.length > 0 ? await latestChecksForRestaurants(ids, new Date(now - 90 * DAY_MS)) : [];

  const currentById = new Map(current.map((r) => [r.restaurantId as string, r]));
  const prevById = new Map(previous.map((r) => [r.restaurantId as string, r._avg?.rating ?? null]));
  const lowById = countMap(low);
  const lowRepliedById = countMap(lowReplied);
  const scansById = countMap(scans);
  const redirectsById = countMap(redirects);
  const brokenById = new Map<string, number>();
  for (const c of checks) if (!c.ok) brokenById.set(c.restaurantId, (brokenById.get(c.restaurantId) ?? 0) + 1);

  const rows: Row[] = restaurants.map((r) => {
    const cur = currentById.get(r.id);
    const count = typeof cur?._count === 'object' && cur._count ? cur._count._all ?? 0 : 0;
    return {
      id: r.id,
      name: r.name,
      isActive: r.isActive,
      reviews: count,
      avg: cur?._avg?.rating ?? null,
      prevAvg: prevById.get(r.id) ?? null,
      low: lowById.get(r.id) ?? 0,
      lowReplied: lowRepliedById.get(r.id) ?? 0,
      scans: scansById.get(r.id) ?? 0,
      redirects: redirectsById.get(r.id) ?? 0,
      brokenLinks: brokenById.get(r.id) ?? 0,
    };
  });
  const totals = rows.reduce(
    (t, r) => ({
      reviews: t.reviews + r.reviews,
      ratingSum: t.ratingSum + (r.avg ?? 0) * r.reviews,
      low: t.low + r.low,
      lowReplied: t.lowReplied + r.lowReplied,
      scans: t.scans + r.scans,
      redirects: t.redirects + r.redirects,
      brokenLinks: t.brokenLinks + r.brokenLinks,
    }),
    { reviews: 0, ratingSum: 0, low: 0, lowReplied: 0, scans: 0, redirects: 0, brokenLinks: 0 },
  );

  const nf = new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US');
  const fmtAvg = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', isTr ? ',' : '.'));
  const pct = (part: number, whole: number) => (whole > 0 ? `%${Math.round((part / whole) * 100)}` : '—');
  const delta = (cur: number | null, prev: number | null) => {
    if (cur == null || prev == null) return null;
    const d = Math.round((cur - prev) * 10) / 10;
    if (d === 0) return null;
    return { text: `${d > 0 ? '+' : ''}${d.toFixed(1)}`, up: d > 0 };
  };
  const generated = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: resolveDisplayTimeZone(),
  }).format(new Date(now));

  const t = isTr
    ? {
        eyebrow: 'RAPOR',
        title: 'Şube raporu',
        description: `Tüm işletmeleriniz son ${days} günde yan yana. Önceki ${days} günle puan farkı gösterilir.`,
        print: 'PDF olarak indir',
        back: 'İşletmeler',
        period: 'Dönem',
        days: (d: number) => `${d} gün`,
        cols: ['Şube', 'Yorum', 'Ort. puan', 'Düşük puan (1–3★)', 'Düşüklere yanıt', 'QR okutma', 'Platforma yönlendirme', 'Sorunlu link'],
        total: 'Toplam',
        paused: 'Duraklatıldı',
        empty: 'Henüz işletme yok.',
        generated: `Oluşturuldu: ${generated}`,
      }
    : {
        eyebrow: 'REPORT',
        title: 'Branch report',
        description: `All your businesses for the last ${days} days. Rating change is against the previous ${days} days.`,
        print: 'Download as PDF',
        back: 'Businesses',
        period: 'Period',
        days: (d: number) => `${d} days`,
        cols: ['Branch', 'Reviews', 'Avg rating', 'Low rating (1–3★)', 'Low ratings replied', 'QR scans', 'Platform redirects', 'Broken links'],
        total: 'Total',
        paused: 'Paused',
        empty: 'No businesses yet.',
        generated: `Generated: ${generated}`,
      };

  return (
    <div className="bz-print-area mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-7 lg:py-8">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <div className="bz-print-hide flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-ghost">
              {t.back}
            </Link>
            <PrintButton label={t.print} />
          </div>
        }
      />

      <nav className="bz-print-hide flex flex-wrap items-center gap-2" aria-label={t.period}>
        {PERIODS.map((d) => (
          <Link
            key={d}
            href={`/${locale}/dashboard/restaurants/report?days=${d}`}
            aria-current={d === days ? 'page' : undefined}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
              d === days ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#EDEDED] bg-white text-[#525252]'
            }`}
          >
            {t.days(d)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="bz-card p-6 text-[13px] text-[#737373]">{t.empty}</p>
      ) : (
        <div className="bz-card overflow-x-auto">
          <table className="bz-table w-full min-w-[860px]">
            <thead>
              <tr>
                {t.cols.map((c, i) => (
                  <th key={c} className={i === 0 ? '' : 'text-right'}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = delta(r.avg, r.prevAvg);
                return (
                  <tr key={r.id}>
                    <td className="font-medium text-[#0A0A0A]">
                      {r.name}
                      {!r.isActive && <span className="ml-2 text-[11px] text-[#737373]">· {t.paused}</span>}
                    </td>
                    <td className="text-right tabular-nums">{nf.format(r.reviews)}</td>
                    <td className="text-right tabular-nums">
                      {fmtAvg(r.avg)}
                      {d && (
                        <span className={`ml-1.5 text-[11px] ${d.up ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>{d.text}</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{nf.format(r.low)}</td>
                    <td className="text-right tabular-nums">{pct(r.lowReplied, r.low)}</td>
                    <td className="text-right tabular-nums">{nf.format(r.scans)}</td>
                    <td className="text-right tabular-nums">{nf.format(r.redirects)}</td>
                    <td className={`text-right tabular-nums ${r.brokenLinks > 0 ? 'font-semibold text-[#B91C1C]' : ''}`}>
                      {nf.format(r.brokenLinks)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td>{t.total}</td>
                <td className="text-right tabular-nums">{nf.format(totals.reviews)}</td>
                <td className="text-right tabular-nums">
                  {fmtAvg(totals.reviews > 0 ? totals.ratingSum / totals.reviews : null)}
                </td>
                <td className="text-right tabular-nums">{nf.format(totals.low)}</td>
                <td className="text-right tabular-nums">{pct(totals.lowReplied, totals.low)}</td>
                <td className="text-right tabular-nums">{nf.format(totals.scans)}</td>
                <td className="text-right tabular-nums">{nf.format(totals.redirects)}</td>
                <td className="text-right tabular-nums">{nf.format(totals.brokenLinks)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-[11px] text-[#737373]">{t.generated}</p>
    </div>
  );
}
