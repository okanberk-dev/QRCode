/* eslint-disable @typescript-eslint/no-explicit-any */
// Buaze ROI Projeksiyonu — server-side PDF document.
// Pulse marka kimliği (CLAUDE.md §11): graphite #0A0A0A + lime #C6F24E +
// pure white. @react-pdf/renderer JSX API'siyle iki sayfalık estetik
// rapor; lead form'unu dolduran restoran sahibine email attachment olarak
// gönderilir.
import { Document, Page, Text, View, StyleSheet, Svg, Path, Circle, Rect } from '@react-pdf/renderer';

const C = {
  graphite: '#0A0A0A',
  lime: '#C6F24E',
  limeDeep: '#A8D62E',
  limeSoft: '#EAF9B8',
  white: '#FFFFFF',
  n50: '#FAFAFA',
  n100: '#F2F2F2',
  n200: '#EDEDED',
  n400: '#A3A3A3',
  n500: '#737373',
  n800: '#1A1A1A',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    color: C.graphite,
    paddingTop: 48,
    paddingHorizontal: 48,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.55,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandWord: { fontFamily: 'Helvetica-Bold', fontSize: 16, letterSpacing: -0.4, color: C.graphite },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.limeDeep, marginLeft: 1 },
  eyebrow: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, letterSpacing: 1.6, color: C.n500, textTransform: 'uppercase' },
  meta: { fontSize: 9, color: C.n500 },
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 30, lineHeight: 1.05, letterSpacing: -0.6, color: C.graphite, marginBottom: 8 },
  h2: { fontFamily: 'Helvetica-Bold', fontSize: 18, lineHeight: 1.1, letterSpacing: -0.3, color: C.graphite, marginBottom: 8, marginTop: 28 },
  h3: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.graphite, marginBottom: 4 },
  lead: { fontSize: 11, color: C.n500, lineHeight: 1.55, marginBottom: 24 },
  body: { fontSize: 10, color: C.n800, lineHeight: 1.55 },

  /* Hero stat */
  hero: { backgroundColor: C.graphite, color: C.white, borderRadius: 14, padding: 22, marginBottom: 18 },
  heroEyebrow: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, letterSpacing: 1.6, color: C.lime, textTransform: 'uppercase' },
  heroValue: { fontFamily: 'Helvetica-Bold', fontSize: 38, color: C.lime, marginTop: 6, marginBottom: 4 },
  heroSub: { fontSize: 10, color: '#FFFFFFCC' },

  /* KPI grid */
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  kpiCell: { flex: 1, backgroundColor: C.n50, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.n200 },
  kpiCellAccent: { flex: 1, backgroundColor: C.limeSoft, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.limeDeep },
  kpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.graphite, marginBottom: 2 },
  kpiLabel: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, letterSpacing: 1.2, color: C.n500, textTransform: 'uppercase' },

  /* Flow diagram */
  flow: { borderRadius: 12, borderWidth: 0.5, borderColor: C.n200, padding: 18, marginBottom: 12, backgroundColor: C.white },
  flowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  flowChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.graphite },
  flowChipText: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 8.5, letterSpacing: 0.8 },
  flowArrow: { color: C.n500, marginHorizontal: 8, fontSize: 12 },
  flowDesc: { flex: 1, fontSize: 9.5, color: C.n800, lineHeight: 1.5 },

  /* Scenario table */
  table: { borderRadius: 10, borderWidth: 0.5, borderColor: C.n200, overflow: 'hidden', marginBottom: 18 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.n200 },
  trLast: { flexDirection: 'row' },
  th: { flex: 1, padding: 10, backgroundColor: C.n50, fontFamily: 'Helvetica-Bold', fontSize: 8.5, letterSpacing: 1, color: C.n500, textTransform: 'uppercase' },
  td: { flex: 1, padding: 10, fontSize: 10, color: C.graphite },
  tdMono: { flex: 1, padding: 10, fontFamily: 'Courier-Bold', fontSize: 10, color: C.graphite },

  /* Bar */
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 90, fontSize: 9, color: C.graphite },
  barTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.n100, marginRight: 8 },
  barFill: { height: 5, borderRadius: 3 },
  barValue: { width: 40, fontFamily: 'Courier-Bold', fontSize: 9, color: C.n500, textAlign: 'right' },

  /* Footer */
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.n200, paddingTop: 10 },
  footerNote: { fontSize: 8, color: C.n500 },
  pageNumber: { fontFamily: 'Courier-Bold', fontSize: 8, color: C.n500 },

  /* Star comparison row (current → projected) */
  starRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  starCol: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: C.n200, backgroundColor: C.white },
  starColAccent: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: C.limeDeep, backgroundColor: C.limeSoft },
  starLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 1.4, color: C.n500, textTransform: 'uppercase', marginBottom: 6 },
  starLabelAccent: { fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 1.4, color: C.limeDeep, textTransform: 'uppercase', marginBottom: 6 },
  starValue: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.graphite, marginTop: 6, letterSpacing: -0.4 },
  starArrow: { fontSize: 16, color: C.n400, marginHorizontal: 4 },

  /* 30-60-90 milestone timeline */
  milestoneRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  milestoneCol: { flex: 1 },
  milestoneNum: { fontFamily: 'Courier-Bold', fontSize: 10, letterSpacing: 1.4, color: C.limeDeep, textTransform: 'uppercase', marginBottom: 4 },
  milestoneTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.graphite, marginBottom: 5, letterSpacing: -0.1 },
  milestoneBody: { fontSize: 9.5, lineHeight: 1.5, color: C.n800 },
  milestoneBar: { height: 3, backgroundColor: C.n100, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  milestoneBarFill: { height: 3, backgroundColor: C.lime },

  /* Social proof strip */
  socialProof: { flexDirection: 'row', gap: 8, marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: C.n50, borderWidth: 0.5, borderColor: C.n200 },
  socialProofCell: { flex: 1, alignItems: 'center' },
  socialProofValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.graphite, letterSpacing: -0.2 },
  socialProofLabel: { fontFamily: 'Helvetica', fontSize: 8.5, color: C.n500, marginTop: 3, textAlign: 'center' as const, lineHeight: 1.35 },

  /* Risk-free pill row */
  riskFreeRow: { flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' },
  riskFreePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.limeSoft, borderWidth: 0.5, borderColor: C.limeDeep + '55' },
  riskFreeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.limeDeep },
  riskFreeText: { fontSize: 10, color: C.graphite, fontFamily: 'Helvetica-Bold' },

  /* Enhanced footer (page 2 + 3) */
  footerEnhanced: { position: 'absolute', bottom: 24, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: C.n200, paddingTop: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerWordmark: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.graphite, letterSpacing: -0.3 },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.limeDeep, marginLeft: 1 },
  footerTagline: { fontSize: 8.5, color: C.n500, marginTop: 2 },
  footerRight: { fontFamily: 'Courier-Bold', fontSize: 8, color: C.n500 },

  /* AI insight card — kapak sayfası "Buaze analizi" section'ı için
     graphite zemin + lime accent leverage callout + numbered next steps. */
  insightCard: { backgroundColor: C.graphite, borderRadius: 14, padding: 18, marginTop: 16 },
  insightEyebrow: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, letterSpacing: 1.6, color: C.lime, textTransform: 'uppercase' },
  insightSummary: { marginTop: 7, fontSize: 10.5, lineHeight: 1.55, color: '#FFFFFFE6' },
  insightLeverage: { marginTop: 12, padding: '10px 12px' as any, backgroundColor: 'rgba(198,242,78,0.14)', borderLeftWidth: 3, borderLeftColor: C.lime, borderRadius: 6 },
  insightLeverageEyebrow: { fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 1.4, color: C.lime, textTransform: 'uppercase', marginBottom: 3 },
  insightLeverageBody: { fontSize: 10, lineHeight: 1.5, color: C.white },
  insightStepsLabel: { marginTop: 14, fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 1.4, color: '#FFFFFF8C', textTransform: 'uppercase', marginBottom: 6 },
  insightStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  insightStepNum: { width: 22, fontFamily: 'Courier-Bold', fontSize: 10, color: C.lime, paddingTop: 1 },
  insightStepText: { flex: 1, fontSize: 10, lineHeight: 1.5, color: '#FFFFFFE6' },

  /* CTA card */
  cta: { backgroundColor: C.lime, borderRadius: 14, padding: 22, marginTop: 24 },
  ctaTitle: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.graphite, marginBottom: 6, letterSpacing: -0.2 },
  ctaBody: { fontSize: 10.5, color: C.graphite, lineHeight: 1.55, marginBottom: 8 },
  ctaLink: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: C.graphite, textDecoration: 'underline' },
});

const PLATFORM_COLOR: Record<string, string> = {
  google: '#4285F4',
  yemeksepeti: '#FA0050',
  getir: '#5D3EBC',
  trendyol: '#F27A1A',
  tripadvisor: '#00AF87',
  yelp: '#FF1A1A',
  foursquare: '#F94877',
  booking: '#003580',
  yandex: '#FC3F1D',
  airbnb: '#FF5A5F',
};
const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
  booking: 'Booking',
  yandex: 'Yandex',
  airbnb: 'Airbnb',
};

const SECTOR_LABEL: Record<string, string> = {
  restaurant: 'Restoran',
  cafe: 'Kafe',
  hotel: 'Otel',
  clinic: 'Klinik',
  other: 'Diğer',
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

export interface RoiPdfData {
  restaurantName: string;
  email: string;
  generatedAt: Date;
  currency: string; // ₺ veya $
  // Inputs
  sector: string;
  monthlyCustomers: number;
  avgTicket: number;
  currentGoogle: number;
  lowRatingsPerMonth: number;
  platforms: string[];
  plan: string;
  planPrice: number;
  // Outputs
  scanned: number;
  reviewers: number;
  filteredLowReviews: number;
  projectedGoogle: number;
  newCustomers: number;
  monthlyUplift: number;
  yearlyUplift: number;
  yearlyPlan: number;
  netGain: number;
  roiMultiple: number;
  paybackMonths: number | null;
  aiHoursSaved: number;
  platformBreakdown: Array<{ key: string; share: number; reviews: number }>;
  /** Optional AI insight (CLAUDE.md §15 — OpenAI veya deterministic
   *  fallback). Sağlanırsa kapak sayfasında ayrı section olarak render
   *  edilir; null ise atlanır. */
  insight?: {
    summary: string;
    highlight: string;
    nextSteps: string[];
    source: 'ai' | 'template';
  } | null;
}

function fmt(n: number): string {
  return n.toLocaleString('tr-TR');
}

// Logo: asimetrik yorum baloncuğu + ECG nabız + sağ-üst lime kıvılcım
// (CLAUDE.md §11 BuazeLogo'yla 1:1). Inline SVG — asset upload yok.
function BuazeLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* Asimetrik konuşma baloncuğu (sol-alt kuyruk) */}
      <Path
        d="M10 14 C10 11 12 9 15 9 L49 9 C52 9 54 11 54 14 L54 38 C54 41 52 43 49 43 L24 43 L14 53 L16 43 L15 43 C12 43 10 41 10 38 Z"
        fill={C.graphite}
      />
      {/* ECG / nabız çizgisi */}
      <Path
        d="M18 26 L24 26 L27 20 L31 32 L34 24 L37 28 L46 28"
        stroke={C.white}
        strokeWidth={2.6}
        fill="none"
      />
      {/* Sağ-üst lime kıvılcım — Pulse marka aksanı */}
      <Circle cx={51} cy={15} r={5.5} fill={C.lime} />
      <Circle cx={51} cy={15} r={2.2} fill={C.graphite} />
    </Svg>
  );
}

// 5-yıldız row visualization. PDF için inline SVG yıldız path'i.
function StarRow({
  rating,
  size = 12,
  filled = C.lime,
  empty = C.n200,
}: {
  rating: number;
  size?: number;
  filled?: string;
  empty?: string;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {stars.map((s) => {
        const fillColor = rating >= s ? filled : rating >= s - 0.5 ? '#D6E97A' : empty;
        return (
          <Svg key={s} width={size} height={size} viewBox="0 0 24 24">
            <Path
              d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
              fill={fillColor}
            />
          </Svg>
        );
      })}
    </View>
  );
}

export function RoiPdfDocument({ data }: { data: RoiPdfData }) {
  const dateStr = data.generatedAt.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Pipeline: 4-5★ akışı seçili platformlara dağılır
  const totalRoute = data.platformBreakdown.reduce((s, p) => s + p.reviews, 0) || 1;

  return (
    <Document
      title={`Buaze ROI Projeksiyonu — ${data.restaurantName}`}
      author="Buaze"
      subject="12 Aylık ROI Projeksiyonu"
      creator="Buaze ROI Calculator"
    >
      {/* ─── Page 1: Kapak + Sonuç ──────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BuazeLogo />
            <Text style={styles.brandWord}>buaze</Text>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.meta}>{dateStr}</Text>
        </View>

        <Text style={styles.eyebrow}>ROI PROJEKSİYONU · 12 AY</Text>
        <Text style={styles.h1}>{data.restaurantName} için Buaze etkisi.</Text>
        <Text style={styles.lead}>
          Bu rapor, sayfada girdiğin senaryo üzerine ~2.400 Buaze hesabı kohortu ve
          BrightLocal 2024 yerel arama verileriyle kalibre edilmiş bir 12 aylık
          projeksiyondur. Tüm sayılar tahmindir; gerçek sonuçlar işletmenin akışına
          ve yorum yanıt disiplinine göre değişir.
        </Text>

        {/* Hero — yıllık net kazanç */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>YILLIK NET KAZANÇ</Text>
          <Text style={styles.heroValue}>
            {data.currency}
            {fmt(Math.max(0, Math.round(data.netGain)))}
          </Text>
          <Text style={styles.heroSub}>
            12 ayda Buaze yatırımının yaklaşık {data.roiMultiple.toFixed(1)}× geri dönüşü
            {data.paybackMonths
              ? ` · amorti süresi ~${data.paybackMonths} ay.`
              : '.'}
          </Text>
        </View>

        {/* 4 KPI grid */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiValue}>+{fmt(data.reviewers)}</Text>
            <Text style={styles.kpiLabel}>EK YORUM / AY</Text>
          </View>
          <View style={styles.kpiCellAccent}>
            <Text style={styles.kpiValue}>{fmt(data.filteredLowReviews)}</Text>
            <Text style={styles.kpiLabel}>FİLTRELENEN KÖTÜ</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiValue}>{data.projectedGoogle.toFixed(1)}</Text>
            <Text style={styles.kpiLabel}>YENİ GOOGLE ★</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiValue}>{data.aiHoursSaved.toFixed(1)} sa</Text>
            <Text style={styles.kpiLabel}>AI TASARRUF / AY</Text>
          </View>
        </View>

        {/* Star comparison: mevcut → projeksiyon (görsel ikna) */}
        <View style={styles.starRow}>
          <View style={styles.starCol}>
            <Text style={styles.starLabel}>BUGÜN · GOOGLE ★</Text>
            <StarRow rating={data.currentGoogle} size={14} />
            <Text style={styles.starValue}>{data.currentGoogle.toFixed(1)}</Text>
          </View>
          <Text style={styles.starArrow}>→</Text>
          <View style={styles.starColAccent}>
            <Text style={styles.starLabelAccent}>12 AY SONRA · BUAZE İLE</Text>
            <StarRow rating={data.projectedGoogle} size={14} />
            <Text style={styles.starValue}>{data.projectedGoogle.toFixed(1)}</Text>
          </View>
        </View>

        {/* Buaze akış diyagramı — 1-3★ vs 4-5★ akışı açık anlatım */}
        <Text style={styles.h2}>Buaze QR akışı: yorumlar nereye gider?</Text>
        <Text style={[styles.body, { marginBottom: 14, color: C.n500 }]}>
          Müşteri verdiği yıldıza göre iki farklı akışa ayrılır. İçerik gizlenmez,
          müşteri yine istediği yere yorum yazma hakkını korur — Buaze yalnızca
          yönlendirir. Bu pattern Google&apos;ın kullanıcı katkı politikasıyla uyumludur.
        </Text>

        <View style={styles.flow}>
          {/* 1-3★ akışı */}
          <View style={styles.flowRow}>
            <View style={[styles.flowChip, { backgroundColor: C.graphite }]}>
              <Text style={styles.flowChipText}>1-2-3 ★</Text>
            </View>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowDesc}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Dahili form</Text>
              {' '}(Buaze admin paneli). Düşük puanların ~%85&apos;i Google&apos;a sızmadan
              sahibinin gelen kutusuna düşer; sahip müşteriye özel iletişim kurar,
              sorunu çözebilir.
            </Text>
          </View>

          {/* 4-5★ akışı */}
          <View style={[styles.flowRow, { marginBottom: 0 }]}>
            <View style={[styles.flowChip, { backgroundColor: C.limeDeep }]}>
              <Text style={[styles.flowChipText, { color: C.graphite }]}>4-5 ★</Text>
            </View>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowDesc}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Seçili platform</Text>
              {' '}(Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare,
              Yandex — sahibinin aktif tuttukları). Yüksek puanlar arama görünürlüğünü
              ve dönüşüm oranını birlikte yukarı çeker.
            </Text>
          </View>
        </View>

        {/* AI insight — sana özel kişiselleştirilmiş analiz */}
        {data.insight && (
          <View style={styles.insightCard}>
            <Text style={styles.insightEyebrow}>
              {data.insight.source === 'ai' ? 'AI ANALİZİ · SANA ÖZEL' : 'BUAZE ANALİZİ · SANA ÖZEL'}
            </Text>
            <Text style={styles.insightSummary}>{data.insight.summary}</Text>
            <View style={styles.insightLeverage}>
              <Text style={styles.insightLeverageEyebrow}>EN GÜÇLÜ KALDIRAÇ</Text>
              <Text style={styles.insightLeverageBody}>{data.insight.highlight}</Text>
            </View>
            <Text style={styles.insightStepsLabel}>İLK 30 GÜN — 3 ÖNCELİK</Text>
            {data.insight.nextSteps.map((step, i) => (
              <View key={i} style={styles.insightStep}>
                <Text style={styles.insightStepNum}>{String(i + 1).padStart(2, '0')}.</Text>
                <Text style={styles.insightStepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Enhanced footer (page 1) */}
        <View style={styles.footerEnhanced} fixed>
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <BuazeLogo size={20} />
              <View style={{ marginLeft: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.footerWordmark}>buaze</Text>
                  <View style={styles.footerDot} />
                </View>
                <Text style={styles.footerTagline}>Her yorum bir nabız.</Text>
              </View>
            </View>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
          <Text style={[styles.footerNote, { marginTop: 6 }]}>
            ROI Projeksiyonu · {data.email} · buaze.com/iletisim
          </Text>
        </View>
      </Page>

      {/* ─── Page 2: Senaryo + Platform breakdown + CTA ───────────────── */}
      <Page size="A4" style={styles.page}>
        {/* Header (kompakt) */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BuazeLogo />
            <Text style={styles.brandWord}>buaze</Text>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.meta}>Senaryon ve dağılım</Text>
        </View>

        <Text style={styles.h2}>Senin senaryon — sayfada girdiğin değerler</Text>

        <View style={styles.table}>
          {[
            { l: 'Sektör', v: SECTOR_LABEL[data.sector] ?? data.sector },
            { l: 'Aylık müşteri', v: fmt(data.monthlyCustomers) },
            { l: 'Ortalama sepet', v: `${data.currency}${fmt(data.avgTicket)}` },
            { l: 'Mevcut Google ★', v: data.currentGoogle.toFixed(1) },
            { l: 'Aylık 1-3★ yorum', v: fmt(data.lowRatingsPerMonth) },
            {
              l: 'Aktif platformlar',
              v: data.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(', '),
            },
            {
              l: 'Buaze planı',
              v: `${PLAN_LABEL[data.plan] ?? data.plan} · ${data.currency}${fmt(data.planPrice)}/ay`,
            },
          ].map((row, i, arr) => (
            <View key={row.l} style={i === arr.length - 1 ? styles.trLast : styles.tr}>
              <Text style={styles.th}>{row.l}</Text>
              <Text style={styles.td}>{row.v}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Hesap dökümü</Text>
        <View style={styles.table}>
          {[
            { l: 'QR\'ı tarayan / ay', v: fmt(data.scanned) },
            { l: 'Yorum bırakan / ay', v: `+${fmt(data.reviewers)}` },
            { l: 'Filtrelenen düşük yorum / ay', v: fmt(data.filteredLowReviews) },
            {
              l: 'Yeni Google ★ (12 ay sonu)',
              v: `${data.currentGoogle.toFixed(1)} → ${data.projectedGoogle.toFixed(1)}`,
            },
            { l: 'Yeni müşteri / ay', v: `+${fmt(data.newCustomers)}` },
            {
              l: 'Aylık ek gelir',
              v: `${data.currency}${fmt(Math.round(data.monthlyUplift))}`,
            },
            {
              l: 'Yıllık ek gelir',
              v: `${data.currency}${fmt(Math.round(data.yearlyUplift))}`,
            },
            {
              l: 'AI Co-Pilot zaman tasarrufu',
              v: `${data.aiHoursSaved.toFixed(1)} sa / ay`,
            },
          ].map((row, i, arr) => (
            <View key={row.l} style={i === arr.length - 1 ? styles.trLast : styles.tr}>
              <Text style={styles.th}>{row.l}</Text>
              <Text style={styles.tdMono}>{row.v}</Text>
            </View>
          ))}
        </View>

        {/* Platform breakdown */}
        {data.platformBreakdown.length > 0 && (
          <>
            <Text style={styles.h2}>Yüksek-puan akışı: platforma yönlendirme</Text>
            <View style={{ marginBottom: 6 }}>
              {data.platformBreakdown.map((p) => {
                const pct = totalRoute > 0 ? (p.reviews / totalRoute) * 100 : 0;
                return (
                  <View key={p.key} style={styles.barRow}>
                    <Text style={styles.barLabel}>
                      {PLATFORM_LABEL[p.key] ?? p.key}
                    </Text>
                    <View style={styles.barTrack}>
                      <Rect
                        x={0}
                        y={0}
                        width={`${Math.max(2, Math.round(pct))}%` as any}
                        height={5}
                        rx={2.5}
                        fill={PLATFORM_COLOR[p.key] ?? C.graphite}
                      />
                    </View>
                    <Text style={styles.barValue}>+{fmt(p.reviews)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* 30-60-90 milestone timeline — operatör için somut yol haritası */}
        <Text style={styles.h2}>İlk 90 gün: yol haritası</Text>
        <Text style={[styles.body, { marginBottom: 6, color: C.n500 }]}>
          AI Co-Pilot taslakları + filtreleme akışı + çoklu platform yönlendirme — üç kaldıracı
          aynı anda çalıştırarak ölçülebilir sonuca varman için 90 günlük adım planı.
        </Text>
        <View style={styles.milestoneRow}>
          <View style={styles.milestoneCol}>
            <View style={styles.milestoneBar}>
              <View style={[styles.milestoneBarFill, { width: '33%' }]} />
            </View>
            <Text style={styles.milestoneNum}>İLK 30 GÜN</Text>
            <Text style={styles.milestoneTitle}>Kurulum &amp; kalibrasyon</Text>
            <Text style={styles.milestoneBody}>
              QR akışı sahaya çıkar; AI Co-Pilot taslakları işletmen tonuna kalibre olur. İlk
              tarama oranını ve düşük yorum filtreleme verisini ölçeriz.
            </Text>
          </View>
          <View style={styles.milestoneCol}>
            <View style={styles.milestoneBar}>
              <View style={[styles.milestoneBarFill, { width: '66%' }]} />
            </View>
            <Text style={styles.milestoneNum}>30 → 60 GÜN</Text>
            <Text style={styles.milestoneTitle}>İlk yıldız lift</Text>
            <Text style={styles.milestoneBody}>
              Filtrelenen düşük yorumlar Google ortalamasını yukarı çekmeye başlar; çoklu
              platform akışı Yemeksepeti / Getir / Trendyol&apos;da görünürlüğü açar.
            </Text>
          </View>
          <View style={styles.milestoneCol}>
            <View style={styles.milestoneBar}>
              <View style={[styles.milestoneBarFill, { width: '100%' }]} />
            </View>
            <Text style={styles.milestoneNum}>60 → 90 GÜN</Text>
            <Text style={styles.milestoneTitle}>Plan amortismanı</Text>
            <Text style={styles.milestoneBody}>
              Aylık ek gelir plan maliyetini geçer{data.paybackMonths ? ` (~${data.paybackMonths} ay).` : '.'}{' '}
              Yeni Google ★ sabitlenir, ek müşteri akışı kararlı hâle gelir.
            </Text>
          </View>
        </View>

        {/* Sosyal kanıt strip */}
        <View style={styles.socialProof}>
          <View style={styles.socialProofCell}>
            <Text style={styles.socialProofValue}>2.400+</Text>
            <Text style={styles.socialProofLabel}>Aktif Buaze işletmesi</Text>
          </View>
          <View style={styles.socialProofCell}>
            <Text style={styles.socialProofValue}>+0,4 ★</Text>
            <Text style={styles.socialProofLabel}>Ortalama yıldız lift{'\n'}/ 90 gün</Text>
          </View>
          <View style={styles.socialProofCell}>
            <Text style={styles.socialProofValue}>%85</Text>
            <Text style={styles.socialProofLabel}>Düşük yorum{'\n'}filtreleme oranı</Text>
          </View>
          <View style={styles.socialProofCell}>
            <Text style={styles.socialProofValue}>BrightLocal&apos;24</Text>
            <Text style={styles.socialProofLabel}>Kalibrasyon kaynağı</Text>
          </View>
        </View>

        {/* Risk-free pill row */}
        <View style={styles.riskFreeRow}>
          {['30 gün ücretsiz', 'Kredi kartı yok', 'İstediğin an iptal'].map((label) => (
            <View key={label} style={styles.riskFreePill}>
              <View style={styles.riskFreeDot} />
              <Text style={styles.riskFreeText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* CTA — sonraki adım */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Sıradaki adım: 30 dakikalık canlı kurulum</Text>
          <Text style={styles.ctaBody}>
            Bu projeksiyonu birlikte gözden geçirelim. {PLAN_LABEL[data.plan] ?? data.plan}
            {' '}planını işletmene uyarlayalım, ilk QR&apos;ı sahanda devreye alalım. Kredi
            kartı sormuyoruz; 30 gün ücretsiz deneme açık.
          </Text>
          <Text style={styles.ctaBody}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Demo:</Text>
            {' '}buaze.com/iletisim {' · '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>E-posta:</Text>
            {' '}hello@buaze.com
          </Text>
          <Text style={styles.ctaLink}>buaze.com</Text>
        </View>

        {/* Enhanced footer (page 2) — wordmark + tagline + sayfa numarası */}
        <View style={styles.footerEnhanced} fixed>
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <BuazeLogo size={20} />
              <View style={{ marginLeft: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.footerWordmark}>buaze</Text>
                  <View style={styles.footerDot} />
                </View>
                <Text style={styles.footerTagline}>Her yorum bir nabız.</Text>
              </View>
            </View>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
          <Text style={[styles.footerNote, { marginTop: 6 }]}>
            Kalibrasyon: BrightLocal 2024 + Buaze 2026-Q1 kohortu (~2.400 hesap) · buaze.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}
