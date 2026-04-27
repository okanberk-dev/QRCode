import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { Calendar } from 'lucide-react';
import ExportReportButton from '@/components/dashboard/ExportReportButton';
import { Eyebrow, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Analitik — Buaze' : 'Analytics — Buaze',
    robots: { index: false, follow: false },
  };
}

export default async function AnalyticsPage({
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
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      restaurants: {
        select: { id: true, name: true },
      },
    },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  const restaurantIds = user.restaurants.map((r) => r.id);

  // Aggregate data across user's restaurants for the last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const feedbacks = restaurantIds.length
    ? await prisma.feedback.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          createdAt: { gte: since },
        },
        select: {
          rating: true,
          platform: true,
          comment: true,
          createdAt: true,
          restaurantId: true,
        },
      })
    : [];

  // NPS calculation (5 = promoter, 3-4 = passive, 1-2 = detractor)
  const total = feedbacks.length;
  const promoters = feedbacks.filter((f) => f.rating >= 5).length;
  const neutrals = feedbacks.filter((f) => f.rating === 3 || f.rating === 4).length;
  const detractors = feedbacks.filter((f) => f.rating <= 2).length;
  const pctPromoter = total ? Math.round((promoters / total) * 100) : 0;
  const pctNeutral = total ? Math.round((neutrals / total) * 100) : 0;
  const pctDetractor = total ? Math.round((detractors / total) * 100) : 0;
  const nps = total ? pctPromoter - pctDetractor : 0;

  // 12-week trend (simple avg rating bucket)
  const weeks = 12;
  const buckets: Array<{ label: string; avg: number }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const slice = feedbacks.filter((f) => f.createdAt >= start && f.createdAt < end);
    const avg = slice.length ? slice.reduce((a, f) => a + f.rating, 0) / slice.length : 0;
    buckets.push({
      label: start.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'short' }).toUpperCase(),
      avg,
    });
  }

  // Build SVG polyline for trend
  const trendMax = 5;
  const trendPoints = buckets
    .map((b, i) => {
      const x = (i / (weeks - 1)) * 320;
      const y = 150 - (b.avg / trendMax) * 130;
      return `${x},${y}`;
    })
    .join(' ');

  // Platform / source distribution
  const sourceMap = new Map<string, number>();
  feedbacks.forEach((f) => {
    const key = (f.platform || (isTr ? 'buaze' : 'buaze')).toLowerCase();
    sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
  });
  const sources = Array.from(sourceMap.entries())
    .map(([k, v]) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), value: v, pct: total ? Math.round((v / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const sourceColor = (key: string) =>
    key.includes('google')
      ? '#C6F24E'
      : key.includes('yemek')
        ? '#FA0050'
        : key.includes('getir')
          ? '#5D3EBD'
          : key.includes('trendyol')
            ? '#F27A1A'
            : '#0A0A0A';

  // Sentiment word cloud (1:1 design `OwnerAnalytics` "Duygu analizi") —
  // tone derived from the source rating: words from rating ≥ 4 land in
  // the positive bucket, rating ≤ 2 in the negative bucket. Rating = 3
  // is treated as neutral and skipped (no signal). When the same word
  // appears in both buckets the larger count wins; total count = both.
  const stopWords = new Set([
    've',
    'çok',
    'bir',
    'için',
    'ile',
    'ama',
    'gibi',
    'daha',
    'olan',
    'olur',
    'oldu',
    'the',
    'and',
    'was',
    'very',
    'were',
    'are',
    'this',
    'that',
    'they',
    'have',
    'had',
    'from',
    'then',
    'with',
    'which',
    'just',
  ]);

  const tokenize = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[^a-zçğıöşüA-ZÇĞİÖŞÜ\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

  const posFreq = new Map<string, number>();
  const negFreq = new Map<string, number>();
  feedbacks.forEach((f) => {
    if (!f.comment) return;
    if (f.rating === 3) return; // neutral — skipped
    const target = f.rating >= 4 ? posFreq : negFreq;
    tokenize(f.comment).forEach((w) =>
      target.set(w, (target.get(w) || 0) + 1),
    );
  });

  // Merge — every distinct word becomes one cloud token, tone decided
  // by the larger bucket.
  const allWords = new Set<string>([...posFreq.keys(), ...negFreq.keys()]);
  const sentimentThemes = Array.from(allWords)
    .map((label) => {
      const pos = posFreq.get(label) ?? 0;
      const neg = negFreq.get(label) ?? 0;
      return {
        label,
        count: pos + neg,
        tone: pos >= neg ? ('pos' as const) : ('neg' as const),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);

  // Static fallback if not enough sentiment signal yet — the design's
  // sample shape (positive + negative mix) is preserved.
  const staticThemes: Array<{ label: string; count: number; tone: 'pos' | 'neg' }> = isTr
    ? [
        { label: 'lezzetli', count: 32, tone: 'pos' },
        { label: 'servis', count: 28, tone: 'pos' },
        { label: 'temiz', count: 24, tone: 'pos' },
        { label: 'mekan', count: 22, tone: 'pos' },
        { label: 'kibar', count: 18, tone: 'pos' },
        { label: 'manzara', count: 14, tone: 'pos' },
        { label: 'tatlı', count: 12, tone: 'pos' },
        { label: 'soğuk', count: 10, tone: 'neg' },
        { label: 'pahalı', count: 9, tone: 'neg' },
        { label: 'yavaş', count: 7, tone: 'neg' },
        { label: 'hijyen', count: 5, tone: 'neg' },
      ]
    : [
        { label: 'tasty', count: 32, tone: 'pos' },
        { label: 'service', count: 28, tone: 'pos' },
        { label: 'clean', count: 24, tone: 'pos' },
        { label: 'venue', count: 22, tone: 'pos' },
        { label: 'kind', count: 18, tone: 'pos' },
        { label: 'view', count: 14, tone: 'pos' },
        { label: 'dessert', count: 12, tone: 'pos' },
        { label: 'cold', count: 10, tone: 'neg' },
        { label: 'pricey', count: 9, tone: 'neg' },
        { label: 'slow', count: 7, tone: 'neg' },
        { label: 'hygiene', count: 5, tone: 'neg' },
      ];

  const displayThemes = sentimentThemes.length >= 5 ? sentimentThemes : staticThemes;

  // Per-location performance table (instead of "staff" which doesn't exist as a feature yet)
  const perLocation = user.restaurants.map((r) => {
    const slice = feedbacks.filter((f) => f.restaurantId === r.id);
    const avg = slice.length ? slice.reduce((a, f) => a + f.rating, 0) / slice.length : 0;
    return {
      id: r.id,
      name: r.name,
      count: slice.length,
      avg,
      status:
        avg >= 4.7 ? 'top' : avg >= 4.2 ? 'ok' : avg > 0 ? 'warn' : 'empty',
    };
  });

  const tabs = isTr
    ? ['Genel', 'Duygu', 'Konum', 'Kaynak', 'Zaman']
    : ['Overall', 'Sentiment', 'Location', 'Source', 'Time'];

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'ANALİTİK' : 'ANALYTICS'}
        title={isTr ? 'İşletme analitiği' : 'Business analytics'}
        description={
          isTr
            ? 'NPS skoru, platform yönlendirme ve günlük etkileşim trendlerini tek panelde gör.'
            : 'NPS score, platform redirects, and daily interaction trends in a single panel.'
        }
      />

      {/* Top controls — tabs + date range + export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                i === 0
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors"
          >
            <Calendar size={12} strokeWidth={2} />
            {isTr ? 'Son 90 gün' : 'Last 90 days'}
          </button>
          <ExportReportButton
            label={isTr ? 'Rapor indir' : 'Download report'}
            format="csv"
            range="90d"
          />
        </div>
      </div>

      {/* NPS scoreboard (big dark card) — AdminAnalytics §542-576 */}
      <section className="rounded-2xl bg-[#0A0A0A] p-6 sm:p-8 text-white">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'NPS SKORU · 90 GÜN' : 'NPS · 90 DAYS'}
            </div>
            <div className="mt-2.5 flex items-baseline gap-4">
              <span
                className="text-[96px] sm:text-[120px] font-medium leading-[0.85] tracking-[-0.04em] text-[#C6F24E] bz-h-tight"
              >
                {total ? nps : '—'}
              </span>
              <div className="min-w-0">
                <div className="text-[16px] sm:text-[18px] font-medium">
                  {total
                    ? nps >= 70
                      ? isTr ? 'Mükemmel' : 'Excellent'
                      : nps >= 50
                        ? isTr ? 'Çok iyi' : 'Great'
                        : nps >= 30
                          ? isTr ? 'İyi' : 'Good'
                          : nps >= 0
                            ? isTr ? 'Gelişmeli' : 'Needs work'
                            : isTr ? 'Dikkat' : 'Attention'
                    : isTr ? 'Henüz veri yok' : 'No data yet'}
                </div>
                <div className="text-[12px] text-white/60 mt-1">
                  {total ? `${total} ${isTr ? 'yorum değerlendirildi' : 'reviews analyzed'}` : isTr ? 'Yorum topladıkça güncellenecek' : 'Updates as reviews arrive'}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {[
                { k: isTr ? 'Destekçi' : 'Promoters', v: pctPromoter, c: '#C6F24E' },
                { k: isTr ? 'Nötr' : 'Neutral', v: pctNeutral, c: '#737373' },
                { k: isTr ? 'Eleştiren' : 'Detractors', v: pctDetractor, c: '#DC2626' },
              ].map((s) => (
                <div key={s.k}>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">{s.k}</span>
                    <span className="font-semibold">{s.v}%</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-[#1A1A1A]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.v}%`, background: s.c }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'TREND · 12 HAFTA' : 'TREND · 12 WEEKS'}
            </div>
            <svg viewBox="0 0 320 150" className="w-full mt-2" aria-hidden>
              <polyline
                points={trendPoints}
                fill="none"
                stroke="#C6F24E"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {buckets.map((b, i) => {
                const x = (i / (weeks - 1)) * 320;
                const y = 150 - (b.avg / trendMax) * 130;
                if (i % 3 !== 0) return null;
                return <circle key={i} cx={x} cy={y} r="3" fill="#C6F24E" />;
              })}
            </svg>
            <div className="mt-2 flex justify-between text-[10px] text-white/50 font-mono">
              {[0, 3, 6, 9, 11].map((i) => (
                <span key={i}>{buckets[i]?.label ?? ''}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sentiment word cloud + source distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'DUYGU ANALİZİ' : 'SENTIMENT'}</Eyebrow>
          <h3
            className="bz-h-tight text-[18px] text-[#0A0A0A] mt-1"
          >
            {isTr ? 'Yorumlardan çıkan kelimeler' : 'Words from reviews'}
          </h3>
          <p className="pulse-eyebrow text-[#737373] mt-1">
            {sentimentThemes.length >= 5
              ? isTr
                ? 'Pozitif: 4–5 yıldız · Negatif: 1–2 yıldız yorumlardan'
                : 'Positive: 4–5★ · Negative: 1–2★ reviews'
              : isTr
                ? 'Demo · daha fazla yorum geldikçe gerçek veri görünür'
                : 'Demo · real data appears as more reviews come in'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 items-center">
            {displayThemes.map((tag) => {
              const isPos = tag.tone === 'pos';
              const size = 12 + Math.min(tag.count / 4, 8);
              return (
                <span
                  key={tag.label}
                  className="inline-flex items-center gap-1.5 rounded-full"
                  style={{
                    padding: '5px 12px',
                    background: isPos ? '#EAF9B8' : '#FEF2F2',
                    color: isPos ? '#3D4D00' : '#991B1B',
                    fontSize: `${size}px`,
                    fontWeight: 500,
                  }}
                >
                  {tag.label}
                  <span style={{ opacity: 0.6, fontSize: 10 }}>{tag.count}</span>
                </span>
              );
            })}
          </div>
        </section>

        <section className="bz-card p-5 sm:p-6">
          <h3
            className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
          >
            {isTr ? 'Kaynak dağılımı' : 'Source distribution'}
          </h3>
          <div className="mt-4 space-y-3">
            {sources.length === 0 ? (
              <p className="text-[13px] text-[#737373]">
                {isTr ? 'Henüz yorum yok.' : 'No reviews yet.'}
              </p>
            ) : (
              sources.map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between text-[12px] font-medium">
                    <span>{s.label}</span>
                    <span>{s.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-[#F5F5F5]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.pct}%`, background: sourceColor(s.key) }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Location performance table — design's staff table repurposed */}
      <section className="bz-card p-5 sm:p-6">
        <h3
          className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
        >
          {isTr ? 'Konum performansı' : 'Location performance'}
        </h3>
        {perLocation.length === 0 ? (
          <p className="mt-4 text-[13px] text-[#737373]">
            {isTr ? 'Henüz bir işletmeniz yok.' : 'No locations yet.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="pulse-eyebrow text-[#737373] text-left">
                  <th className="py-2.5 pr-4 font-medium">{isTr ? 'KONUM' : 'LOCATION'}</th>
                  <th className="py-2.5 pr-4 font-medium">{isTr ? 'YORUM' : 'REVIEWS'}</th>
                  <th className="py-2.5 pr-4 font-medium">{isTr ? 'ORT. PUAN' : 'AVG. RATING'}</th>
                  <th className="py-2.5 pr-4 font-medium">{isTr ? 'PAY' : 'SHARE'}</th>
                  <th className="py-2.5 font-medium">{isTr ? 'DURUM' : 'STATUS'}</th>
                </tr>
              </thead>
              <tbody>
                {perLocation.map((p) => {
                  const share = total ? Math.round((p.count / total) * 100) : 0;
                  const statusMap = {
                    top: { label: isTr ? 'ZİRVEDE' : 'TOP', bg: 'bg-[#EAF9B8]', fg: 'text-[#0A0A0A]' },
                    ok: { label: isTr ? 'NORMAL' : 'OK', bg: 'bg-[#F5F5F5]', fg: 'text-[#525252]' },
                    warn: { label: isTr ? 'DİKKAT' : 'WATCH', bg: 'bg-[#FEE2E2]', fg: 'text-[#DC2626]' },
                    empty: { label: isTr ? 'YENİ' : 'NEW', bg: 'bg-[#F5F5F5]', fg: 'text-[#737373]' },
                  } as const;
                  const status = statusMap[p.status as keyof typeof statusMap];
                  return (
                    <tr key={p.id} className="border-t border-[#F5F5F5]">
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F5F5] text-[10px] font-semibold bz-h-tight"
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold">{p.name}</span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-[12px] text-[#525252]">{p.count}</td>
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold">{p.avg > 0 ? p.avg.toFixed(1) : '—'}</span>{' '}
                        <span className="text-[#C6F24E]">★</span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-[12px] text-[#737373]">{share}%</td>
                      <td className="py-3.5">
                        <span className={`pulse-eyebrow rounded px-1.5 py-0.5 ${status.bg} ${status.fg}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
