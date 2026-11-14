/* eslint-disable @typescript-eslint/no-explicit-any */
// Buaze ROI estimate — server-side PDF attached to the /roi report e-mail.
// Pulse brand (CLAUDE.md §11): graphite #0A0A0A + lime #C6F24E + white.
//
// Content rules (marketing spec D9): every number comes from the values the
// visitor entered (src/lib/roi/roi-model.ts). The PDF says so on the cover,
// describes the review flow exactly as the product works (spec D1) and makes
// no cohort, rating-lift, revenue or "low ratings stay off Google" claims.
//
// Two A4 pages: (1) the estimate + written summary, (2) the values entered,
// the calculation, the QR flow, what is left out and how to reach us.
import { Document, Page, Text, View, StyleSheet, Svg, Path, Circle, Font } from '@react-pdf/renderer';
import type { RoiInputs, RoiResult } from './roi-model';
import { formatHours, formatUsd, ROI_SECTOR_LABELS, isRoiSector } from './roi-model';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import { SITE_HOST } from '@/lib/site';
import { resolveDisplayTimeZone } from '@/lib/timezone';

// Inter (OFL) — Unicode font so Turkish glyphs (ı İ ğ Ğ ş Ş) and the minus
// sign render. Pinned jsdelivr tag; if the CDN is unreachable the route's
// .catch drops the attachment and still sends the mail body.
const INTER_REGULAR = 'https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-Regular.otf';
const INTER_BOLD = 'https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-Bold.otf';

Font.register({ family: 'Inter', src: INTER_REGULAR });
Font.register({ family: 'Inter-Bold', src: INTER_BOLD });
// No automatic hyphenation: it split Turkish words mid-syllable ("ra-por").
// This PDF is the only react-pdf document in the app.
Font.registerHyphenationCallback((word) => [word]);

const C = {
  graphite: '#0A0A0A',
  lime: '#C6F24E',
  limeDeep: '#A8D62E',
  limeSoft: '#EAF9B8',
  white: '#FFFFFF',
  n50: '#FAFAFA',
  n200: '#EDEDED',
  n500: '#737373',
  n800: '#1A1A1A',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    color: C.graphite,
    paddingTop: 40,
    paddingHorizontal: 44,
    paddingBottom: 56,
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandWord: { fontFamily: 'Inter-Bold', fontSize: 16, letterSpacing: -0.4, color: C.graphite },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.limeDeep, marginLeft: 1 },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 1.6, color: C.n500, textTransform: 'uppercase' },
  meta: { fontSize: 9, color: C.n500 },
  h1: { fontFamily: 'Inter-Bold', fontSize: 22, lineHeight: 1.15, letterSpacing: -0.4, color: C.graphite, marginTop: 6, marginBottom: 6 },
  h2: { fontFamily: 'Inter-Bold', fontSize: 13, lineHeight: 1.2, letterSpacing: -0.2, color: C.graphite, marginBottom: 6 },
  lead: { fontSize: 10, color: C.n500, lineHeight: 1.5, marginBottom: 16 },
  body: { fontSize: 9.5, color: C.n800, lineHeight: 1.5 },

  hero: { backgroundColor: C.graphite, borderRadius: 14, padding: 20, marginBottom: 12 },
  heroEyebrow: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 1.6, color: C.lime, textTransform: 'uppercase' },
  heroValue: { fontFamily: 'Inter-Bold', fontSize: 30, lineHeight: 1.1, color: C.lime, marginTop: 6, marginBottom: 8 },
  heroSub: { fontSize: 9.5, color: '#FFFFFFCC', lineHeight: 1.5 },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCell: { flex: 1, backgroundColor: C.n50, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: C.n200 },
  kpiValue: { fontFamily: 'Inter-Bold', fontSize: 14, lineHeight: 1.1, color: C.graphite, marginBottom: 3 },
  kpiLabel: { fontFamily: 'Inter-Bold', fontSize: 7, letterSpacing: 0.8, color: C.n500, textTransform: 'uppercase' },

  insightCard: { backgroundColor: C.graphite, borderRadius: 14, padding: 18 },
  insightEyebrow: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 1.6, color: C.lime, textTransform: 'uppercase' },
  insightSummary: { marginTop: 6, fontSize: 10, lineHeight: 1.55, color: '#FFFFFFE6' },
  insightHighlight: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(198,242,78,0.14)', borderLeftWidth: 3, borderLeftColor: C.lime, borderRadius: 6 },
  insightHighlightEyebrow: { fontFamily: 'Inter-Bold', fontSize: 7.5, letterSpacing: 1.4, color: C.lime, textTransform: 'uppercase', marginBottom: 3 },
  insightHighlightBody: { fontSize: 9.5, lineHeight: 1.5, color: C.white },
  insightStepsLabel: { marginTop: 12, fontFamily: 'Inter-Bold', fontSize: 7.5, letterSpacing: 1.4, color: '#FFFFFF8C', textTransform: 'uppercase', marginBottom: 6 },
  insightStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  insightStepNum: { width: 20, fontFamily: 'Inter-Bold', fontSize: 9.5, color: C.lime, paddingTop: 1 },
  insightStepText: { flex: 1, fontSize: 9.5, lineHeight: 1.5, color: '#FFFFFFE6' },

  columns: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  column: { flex: 1 },
  table: { borderRadius: 10, borderWidth: 0.5, borderColor: C.n200, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.n200 },
  trLast: { flexDirection: 'row' },
  th: { flex: 1.35, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: C.n50, fontSize: 8.5, lineHeight: 1.35, color: C.n500 },
  td: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, fontFamily: 'Inter-Bold', fontSize: 8.5, lineHeight: 1.35, color: C.graphite },

  flow: { borderRadius: 12, borderWidth: 0.5, borderColor: C.n200, padding: 12, marginBottom: 14 },
  flowRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  flowChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, width: 92 },
  flowChipText: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 0.4, textAlign: 'center' },
  flowDesc: { flex: 1, marginLeft: 10, fontSize: 9, color: C.n800, lineHeight: 1.45, paddingTop: 2 },

  note: { backgroundColor: C.n50, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.n200, marginBottom: 14 },
  noteTitle: { fontFamily: 'Inter-Bold', fontSize: 10, color: C.graphite, marginBottom: 3 },

  cta: { backgroundColor: C.lime, borderRadius: 14, padding: 16 },
  ctaTitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: C.graphite, marginBottom: 4, letterSpacing: -0.2 },
  ctaBody: { fontSize: 9.5, color: C.graphite, lineHeight: 1.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.08)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  chipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.graphite, marginRight: 5 },
  chipText: { fontSize: 8.5, color: C.graphite, fontFamily: 'Inter-Bold' },

  footer: { position: 'absolute', bottom: 22, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.n200, paddingTop: 8 },
  footerNote: { fontSize: 7.5, color: C.n500 },
  pageNumber: { fontFamily: 'Inter-Bold', fontSize: 7.5, color: C.n500 },
});

type LocaleKey = 'tr' | 'en';

const STRINGS = {
  tr: {
    coverEyebrow: 'TAHMİNİ RAPOR · ROI HESAPLAYICI',
    title: (name: string) => `${name} için tahmini rapor`,
    lead:
      'Bu rapor, hesaplayıcıya girdiğiniz değerlere ve varsayımlara dayanan bir tahmindir; Buaze müşteri verisine ya da bir araştırmaya dayanmaz. Gerçek sonuçlar işletmenize göre değişir.',
    heroEyebrow: 'TAHMİNİ ZAMAN TASARRUFU',
    hoursPerMonth: (h: string) => `${h} saat / ay`,
    heroValueLine: (v: string) => `Bu sürenin tahmini değeri ${v} / ay.`,
    heroPlanLine: (p: string, d: string) => ` Plan ${p} / ay; tahmini aylık fark ${d}.`,
    kpiRatings: 'TAHMİNİ PUAN / AY',
    kpiReplies: 'YANIT / AY',
    kpiManual: 'ELLE (SA / AY)',
    kpiDraft: 'TASLAKLA (SA / AY)',
    insightAi: 'BUAZE ÖZETİ · YAPAY ZEKÂ İLE HAZIRLANDI',
    insightTemplate: 'BUAZE ÖZETİ',
    insightHighlight: 'ÖNE ÇIKAN NOKTA',
    insightSteps: 'İLK 30 GÜN İÇİN ÖNERİLER',
    page2Meta: 'Değerler ve hesap',
    inputsH2: 'Girdiğiniz değerler',
    rowSector: 'İşletme türü',
    rowCustomers: 'Aylık müşteri sayısı',
    rowRatingRate: 'QR kodu okutup puan veren müşteri oranı',
    rowReplyShare: 'Yanıt yazdığınız geri bildirim oranı',
    rowMinutesManual: 'Bir yanıtı elle yazma süresi',
    rowMinutesDraft: 'Pulse AI taslağıyla yanıt süresi',
    rowHourly: 'Bir çalışma saatinin maliyeti',
    rowPlan: 'Plan',
    noPlan: 'Seçilmedi',
    minutes: (n: number) => `${n} dakika`,
    breakdownH2: 'Hesap dökümü',
    rowRatings: 'Tahmini puan / ay',
    rowReplies: 'Yanıt / ay',
    rowHoursManual: 'Elle yanıt süresi',
    rowHoursDraft: 'Taslakla yanıt süresi',
    rowHoursSaved: 'Tahmini zaman tasarrufu',
    rowTimeValue: 'Tasarrufun tahmini değeri',
    rowPlanCost: 'Plan maliyeti',
    rowMonthlyDiff: 'Tahmini aylık fark',
    rowYearlyDiff: '12 ayda tahmini fark',
    rowCoverage: 'Aynı sürede yanıtlanabilecek puan oranı',
    perMonth: '/ ay',
    hoursUnit: (h: string) => `${h} saat / ay`,
    flowH2: 'Buaze QR akışı nasıl çalışır',
    flowLead:
      'Müşteri QR kodu okutur ve puan verir. Yönlendirme eşiğini siz belirlersiniz (varsayılan 5 yıldız). Buaze hiçbir yorumu silmez, gizlemez ya da değiştirmez.',
    flowHighChip: 'EŞİK VE ÜZERİ',
    flowHighDesc: 'Seçtiğiniz platformun yorum sayfası açılır; müşteri yorumunu orada, kendi hesabıyla yazar.',
    flowLowChip: 'EŞİĞİN ALTI',
    flowLowDesc:
      'Müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür. 1-3 yıldızlı geri bildirimde size anında e-posta gelir.',
    excludedTitle: 'Hesaba katmadıklarımız',
    excludedBody:
      'Daha fazla herkese açık yorumun, daha iyi bir puanın ya da geri kazanılan müşterilerin gelire etkisini hesaplamıyoruz. Bu etkiler işletmeden işletmeye çok değişir ve önceden bilinemez.',
    ctaTitle: 'Kurulumda yardım ister misiniz?',
    ctaBody: (email: string, contact: string, hours: string) =>
      `${email} adresine yazabilir ya da ${contact} sayfasını kullanabilirsiniz. ${hours}`,
    chips: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
    footer: (email: string) => `Tahmini rapor · ${email}`,
    footerPage2: 'Girdiğiniz değerlere dayanan tahmindir · garanti değildir',
    docTitle: (name: string) => `Buaze tahmini rapor — ${name}`,
    docSubject: 'ROI hesaplayıcı tahmini',
  },
  en: {
    coverEyebrow: 'ESTIMATE · ROI CALCULATOR',
    title: (name: string) => `Estimate for ${name}`,
    lead:
      'This report is an estimate based on the values and assumptions you entered in the calculator; it is not based on Buaze customer data or research. Real results depend on your business.',
    heroEyebrow: 'ESTIMATED TIME SAVED',
    hoursPerMonth: (h: string) => `${h} hours / month`,
    heroValueLine: (v: string) => `Estimated value of that time: ${v} / month.`,
    heroPlanLine: (p: string, d: string) => ` Plan ${p} / month; estimated monthly difference ${d}.`,
    kpiRatings: 'EST. RATINGS / MO',
    kpiReplies: 'REPLIES / MO',
    kpiManual: 'BY HAND (H / MO)',
    kpiDraft: 'WITH DRAFTS (H / MO)',
    insightAi: 'BUAZE SUMMARY · WRITTEN WITH AI',
    insightTemplate: 'BUAZE SUMMARY',
    insightHighlight: 'KEY POINT',
    insightSteps: 'SUGGESTIONS FOR THE FIRST 30 DAYS',
    page2Meta: 'Values and calculation',
    inputsH2: 'The values you entered',
    rowSector: 'Type of business',
    rowCustomers: 'Customers per month',
    rowRatingRate: 'Share of customers who scan the QR code and rate',
    rowReplyShare: 'Share of feedback you reply to',
    rowMinutesManual: 'Time to write a reply by hand',
    rowMinutesDraft: 'Time to reply with a Pulse AI draft',
    rowHourly: 'Cost of one working hour',
    rowPlan: 'Plan',
    noPlan: 'Not selected',
    minutes: (n: number) => `${n} minutes`,
    breakdownH2: 'Calculation',
    rowRatings: 'Estimated ratings / month',
    rowReplies: 'Replies / month',
    rowHoursManual: 'Reply time by hand',
    rowHoursDraft: 'Reply time with drafts',
    rowHoursSaved: 'Estimated time saved',
    rowTimeValue: 'Estimated value of the time saved',
    rowPlanCost: 'Plan cost',
    rowMonthlyDiff: 'Estimated monthly difference',
    rowYearlyDiff: 'Estimated difference over 12 months',
    rowCoverage: 'Share of ratings answered in the same time',
    perMonth: '/ month',
    hoursUnit: (h: string) => `${h} hours / month`,
    flowH2: 'How the Buaze QR flow works',
    flowLead:
      'The customer scans the QR code and gives a rating. You set the redirect threshold (5 stars by default). Buaze never deletes, hides or edits a review.',
    flowHighChip: 'AT OR ABOVE',
    flowHighDesc: 'Your chosen platform’s review page opens; the customer writes the review there, with their own account.',
    flowLowChip: 'BELOW',
    flowLowDesc:
      'The customer can first send you private feedback; the public review link is shown on the same screen. Feedback rated 1-3 stars sends you an instant e-mail.',
    excludedTitle: 'What we leave out',
    excludedBody:
      'We do not calculate any revenue effect of more public reviews, a better rating or customers you win back. Those effects vary widely between businesses and cannot be known in advance.',
    ctaTitle: 'Would you like help with setup?',
    ctaBody: (email: string, contact: string, hours: string) =>
      `Write to ${email} or use ${contact}. ${hours}`,
    chips: ['14 days free', 'No credit card required', 'Cancel anytime'],
    footer: (email: string) => `Estimate · ${email}`,
    footerPage2: 'An estimate based on your values · not a guarantee',
    docTitle: (name: string) => `Buaze estimate — ${name}`,
    docSubject: 'ROI calculator estimate',
  },
} as const;

export interface RoiPdfData {
  restaurantName: string;
  email: string;
  generatedAt: Date;
  /** Report language (from the form). */
  locale?: LocaleKey;
  /** One of ROI_SECTORS; unknown values print as given. */
  sector: string;
  /** Plan name chosen in the calculator; null = no plan. */
  planName: string | null;
  inputs: RoiInputs;
  result: RoiResult;
  /** AI (OpenAI) or deterministic summary; omitted when null. */
  insight?: {
    summary: string;
    highlight: string;
    nextSteps: string[];
    source: 'ai' | 'template';
  } | null;
}

function BuazeLogo() {
  return (
    <Svg width={24} height={24} viewBox="0 0 64 64">
      <Path
        d="M10 14 C10 11 12 9 15 9 L49 9 C52 9 54 11 54 14 L54 38 C54 41 52 43 49 43 L26 43 L18 51 L18 43 L15 43 C12 43 10 41 10 38 Z"
        fill={C.graphite}
      />
      <Path d="M18 26 L24 26 L27 20 L31 32 L34 24 L37 28 L46 28" stroke={C.white} strokeWidth={2.4} fill="none" />
      <Circle cx={50} cy={16} r={5} fill={C.lime} />
    </Svg>
  );
}

function Header({ right }: { right: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <BuazeLogo />
        <Text style={styles.brandWord}>buaze</Text>
        <View style={styles.brandDot} />
      </View>
      <Text style={styles.meta}>{right}</Text>
    </View>
  );
}

function Table({ rows }: { rows: { l: string; v: string }[] }) {
  return (
    <View style={styles.table}>
      {rows.map((row, i) => (
        <View key={row.l} style={i === rows.length - 1 ? styles.trLast : styles.tr} wrap={false}>
          <Text style={styles.th}>{row.l}</Text>
          <Text style={styles.td}>{row.v}</Text>
        </View>
      ))}
    </View>
  );
}

export function RoiPdfDocument({ data }: { data: RoiPdfData }) {
  const locale: LocaleKey = data.locale === 'en' ? 'en' : 'tr';
  const L = STRINGS[locale];
  const numLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const fmt = (n: number) => n.toLocaleString(numLocale);
  const pct = (n: number) => (locale === 'tr' ? `%${Math.round(n)}` : `${Math.round(n)}%`);
  const hours = (n: number) => formatHours(n, locale);
  const { inputs, result } = data;

  const dateStr = data.generatedAt.toLocaleDateString(numLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: resolveDisplayTimeZone(),
  });
  const sectorLabel = isRoiSector(data.sector) ? ROI_SECTOR_LABELS[locale][data.sector] : data.sector;
  const hasPlan =
    result.planMonthlyUsd !== null && result.monthlyDifferenceUsd !== null && result.yearlyDifferenceUsd !== null;
  const planLine = hasPlan
    ? L.heroPlanLine(formatUsd(result.planMonthlyUsd!), formatUsd(result.monthlyDifferenceUsd!, { signed: true }))
    : '';
  const planCell = hasPlan
    ? `${data.planName ? `${data.planName} · ` : ''}${formatUsd(result.planMonthlyUsd!)} ${L.perMonth}`
    : L.noPlan;
  const contact = `${SITE_HOST}/${locale}/contact`;

  return (
    <Document title={L.docTitle(data.restaurantName)} author="Buaze" subject={L.docSubject} creator="Buaze ROI calculator">
      <Page size="A4" style={styles.page}>
        <Header right={dateStr} />

        <Text style={styles.eyebrow}>{L.coverEyebrow}</Text>
        <Text style={styles.h1}>{L.title(data.restaurantName)}</Text>
        <Text style={styles.lead}>{L.lead}</Text>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{L.heroEyebrow}</Text>
          <Text style={styles.heroValue}>{L.hoursPerMonth(hours(result.hoursSaved))}</Text>
          <Text style={styles.heroSub}>
            {L.heroValueLine(formatUsd(result.timeValueUsd))}
            {planLine}
          </Text>
        </View>

        <View style={styles.kpiRow}>
          {[
            { v: fmt(result.ratingsPerMonth), l: L.kpiRatings },
            { v: fmt(result.repliesPerMonth), l: L.kpiReplies },
            { v: hours(result.hoursManual), l: L.kpiManual },
            { v: hours(result.hoursWithDrafts), l: L.kpiDraft },
          ].map((kpi) => (
            <View key={kpi.l} style={styles.kpiCell}>
              <Text style={styles.kpiValue}>{kpi.v}</Text>
              <Text style={styles.kpiLabel}>{kpi.l}</Text>
            </View>
          ))}
        </View>

        {data.insight ? (
          <View style={styles.insightCard} wrap={false}>
            <Text style={styles.insightEyebrow}>
              {data.insight.source === 'ai' ? L.insightAi : L.insightTemplate}
            </Text>
            <Text style={styles.insightSummary}>{data.insight.summary}</Text>
            <View style={styles.insightHighlight}>
              <Text style={styles.insightHighlightEyebrow}>{L.insightHighlight}</Text>
              <Text style={styles.insightHighlightBody}>{data.insight.highlight}</Text>
            </View>
            {data.insight.nextSteps.length > 0 ? (
              <>
                <Text style={styles.insightStepsLabel}>{L.insightSteps}</Text>
                {data.insight.nextSteps.map((step, i) => (
                  <View key={`${i}-${step.slice(0, 12)}`} style={styles.insightStep}>
                    <Text style={styles.insightStepNum}>{String(i + 1).padStart(2, '0')}.</Text>
                    <Text style={styles.insightStepText}>{step}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>{L.footer(data.email || SITE_HOST)}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Header right={L.page2Meta} />

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.h2}>{L.inputsH2}</Text>
            <Table
              rows={[
                { l: L.rowSector, v: sectorLabel },
                { l: L.rowCustomers, v: fmt(inputs.monthlyCustomers) },
                { l: L.rowRatingRate, v: pct(inputs.ratingRatePct) },
                { l: L.rowReplyShare, v: pct(inputs.replySharePct) },
                { l: L.rowMinutesManual, v: L.minutes(inputs.minutesManual) },
                { l: L.rowMinutesDraft, v: L.minutes(inputs.minutesWithDraft) },
                { l: L.rowHourly, v: formatUsd(inputs.hourlyCostUsd) },
                { l: L.rowPlan, v: planCell },
              ]}
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.h2}>{L.breakdownH2}</Text>
            <Table
              rows={[
                { l: L.rowRatings, v: fmt(result.ratingsPerMonth) },
                { l: L.rowReplies, v: fmt(result.repliesPerMonth) },
                { l: L.rowHoursManual, v: L.hoursUnit(hours(result.hoursManual)) },
                { l: L.rowHoursDraft, v: L.hoursUnit(hours(result.hoursWithDrafts)) },
                { l: L.rowHoursSaved, v: L.hoursUnit(hours(result.hoursSaved)) },
                { l: L.rowTimeValue, v: `${formatUsd(result.timeValueUsd)} ${L.perMonth}` },
                ...(hasPlan
                  ? [
                      { l: L.rowPlanCost, v: `${formatUsd(result.planMonthlyUsd!)} ${L.perMonth}` },
                      { l: L.rowMonthlyDiff, v: formatUsd(result.monthlyDifferenceUsd!, { signed: true }) },
                      { l: L.rowYearlyDiff, v: formatUsd(result.yearlyDifferenceUsd!, { signed: true }) },
                    ]
                  : []),
                { l: L.rowCoverage, v: `${pct(result.coverageNowPct)} → ${pct(result.coverageSameTimePct)}` },
              ]}
            />
          </View>
        </View>

        <View wrap={false}>
          <Text style={styles.h2}>{L.flowH2}</Text>
          <Text style={[styles.body, { marginBottom: 8, color: C.n500 }]}>{L.flowLead}</Text>
          <View style={styles.flow}>
            <View style={styles.flowRow}>
              <View style={[styles.flowChip, { backgroundColor: C.lime }]}>
                <Text style={[styles.flowChipText, { color: C.graphite }]}>{L.flowHighChip}</Text>
              </View>
              <Text style={styles.flowDesc}>{L.flowHighDesc}</Text>
            </View>
            <View style={[styles.flowRow, { marginBottom: 0 }]}>
              <View style={[styles.flowChip, { backgroundColor: C.graphite }]}>
                <Text style={[styles.flowChipText, { color: C.white }]}>{L.flowLowChip}</Text>
              </View>
              <Text style={styles.flowDesc}>{L.flowLowDesc}</Text>
            </View>
          </View>
        </View>

        <View style={styles.note} wrap={false}>
          <Text style={styles.noteTitle}>{L.excludedTitle}</Text>
          <Text style={styles.body}>{L.excludedBody}</Text>
        </View>

        <View style={styles.cta} wrap={false}>
          <Text style={styles.ctaTitle}>{L.ctaTitle}</Text>
          <Text style={styles.ctaBody}>{L.ctaBody(SUPPORT_EMAIL, contact, SUPPORT_HOURS[locale])}</Text>
          <View style={styles.chipRow}>
            {L.chips.map((label) => (
              <View key={label} style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>{L.footerPage2}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// Kept for callers that type-annotate loosely (generate-roi-pdf casts the element).
export type RoiPdfElement = any;
