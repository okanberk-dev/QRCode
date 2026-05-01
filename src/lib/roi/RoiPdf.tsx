/* eslint-disable @typescript-eslint/no-explicit-any */
// Buaze ROI Projeksiyonu — server-side PDF document.
// Pulse marka kimliği (CLAUDE.md §11): graphite #0A0A0A + lime #C6F24E +
// pure white. @react-pdf/renderer JSX API'siyle iki sayfalık estetik
// rapor; lead form'unu dolduran restoran sahibine email attachment olarak
// gönderilir.
import { Document, Page, Text, View, StyleSheet, Svg, Path, Circle, Rect, Font } from '@react-pdf/renderer';

// ─── Turkish-compatible font registration ──────────────────────────────────
//
// PDF base 14 fonts (Helvetica / Helvetica-Bold / Courier-Bold) ship with
// WinAnsi encoding which does NOT include Turkish-specific glyphs:
//   ı (U+0131)  İ (U+0130)  ğ (U+011F)  Ğ (U+011E)
//   ş (U+015F)  Ş (U+015E)  ₺ (U+20BA — Turkish Lira)
// The TR ROI report contains ~236 such characters; the EN report uses
// `$` plus full ASCII so it is unaffected. Without registering a Unicode-
// capable font the TR PDF rendered tofu boxes / dropped glyphs on those
// characters and the layout drifted. We register Inter (OFL, by Rasmus
// Andersson) — Latin Extended-A + ₺ — as the canonical PDF font for both
// locales so the TR & EN outputs share identical metrics.
//
// Source: rsms/inter v3.19 OTF files via jsdelivr CDN. Pinned tag (not
// @master) so the URL is stable across deploys; jsdelivr caches GitHub
// releases aggressively — first cold-start fetch ~150-300ms, subsequent
// renders in the same Lambda are instant.
//
// If the CDN is unreachable at PDF render time @react-pdf throws and the
// route handler's `.catch` (api/roi/save) drops the attachment but still
// sends the mail body — graceful degradation, no user-facing failure.
const INTER_REGULAR = 'https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-Regular.otf';
const INTER_BOLD = 'https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-Bold.otf';

// Module-init registration. `Font.register` only stores the URL — actual
// download happens lazily on first render. Two separate families (rather
// than one family with `fontWeight: 'bold'`) keeps the call-site diff
// minimal:
//   'Helvetica'      → 'Inter'
//   'Helvetica-Bold' → 'Inter-Bold'
//   'Courier-Bold'   → 'Inter-Bold'  (mono cells become sans-bold; matches
//                                     the email template family which also
//                                     drops mono in favor of Space Grotesk
//                                     weight 600 for tabular numbers).
Font.register({ family: 'Inter', src: INTER_REGULAR });
Font.register({ family: 'Inter-Bold', src: INTER_BOLD });

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
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 1.55,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandWord: { fontFamily: 'Inter-Bold', fontSize: 16, letterSpacing: -0.4, color: C.graphite },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.limeDeep, marginLeft: 1 },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: 8.5, letterSpacing: 1.6, color: C.n500, textTransform: 'uppercase' },
  meta: { fontSize: 9, color: C.n500 },
  h1: { fontFamily: 'Inter-Bold', fontSize: 30, lineHeight: 1.05, letterSpacing: -0.6, color: C.graphite, marginBottom: 8 },
  // h2.marginTop 28 → 20: Page 2 vertical compaction. Eski değerde
  // "Calculation breakdown" başlığı orphan oluyor, table sayfa sonuna
  // sıkışıp sonraki sayfaya itiliyordu (kullanıcı raporladı).
  h2: { fontFamily: 'Inter-Bold', fontSize: 18, lineHeight: 1.1, letterSpacing: -0.3, color: C.graphite, marginBottom: 8, marginTop: 20 },
  h3: { fontFamily: 'Inter-Bold', fontSize: 12, color: C.graphite, marginBottom: 4 },
  lead: { fontSize: 11, color: C.n500, lineHeight: 1.55, marginBottom: 24 },
  body: { fontSize: 10, color: C.n800, lineHeight: 1.55 },

  /* Hero stat */
  hero: { backgroundColor: C.graphite, color: C.white, borderRadius: 14, padding: 22, marginBottom: 18 },
  heroEyebrow: { fontFamily: 'Inter-Bold', fontSize: 8.5, letterSpacing: 1.6, color: C.lime, textTransform: 'uppercase' },
  // Explicit lineHeight + larger marginBottom: Page-default lineHeight 1.55
  // 38pt face için yetersiz hesaplanıyor, descender heroSub'a çakışıyordu.
  // 1.05 + marginBottom 12 ile bounding box ve sub-text netleşir.
  heroValue: { fontFamily: 'Inter-Bold', fontSize: 38, lineHeight: 1.05, color: C.lime, marginTop: 6, marginBottom: 12 },
  heroSub: { fontSize: 10, color: '#FFFFFFCC' },

  /* KPI grid */
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  kpiCell: { flex: 1, backgroundColor: C.n50, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.n200 },
  kpiCellAccent: { flex: 1, backgroundColor: C.limeSoft, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.limeDeep },
  // Defansif lineHeight: uzun sayılarda (örn. "+1,250") aynı overlap riski.
  kpiValue: { fontFamily: 'Inter-Bold', fontSize: 16, lineHeight: 1.1, color: C.graphite, marginBottom: 2 },
  kpiLabel: { fontFamily: 'Inter-Bold', fontSize: 7.5, letterSpacing: 1.2, color: C.n500, textTransform: 'uppercase' },

  /* Flow diagram */
  flow: { borderRadius: 12, borderWidth: 0.5, borderColor: C.n200, padding: 18, marginBottom: 12, backgroundColor: C.white },
  flowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  flowChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.graphite },
  flowChipText: { color: C.white, fontFamily: 'Inter-Bold', fontSize: 8.5, letterSpacing: 0.8 },
  flowArrow: { color: C.n500, marginHorizontal: 8, fontSize: 12 },
  flowDesc: { flex: 1, fontSize: 9.5, color: C.n800, lineHeight: 1.5 },

  /* Scenario table */
  table: { borderRadius: 10, borderWidth: 0.5, borderColor: C.n200, overflow: 'hidden', marginBottom: 18 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.n200 },
  trLast: { flexDirection: 'row' },
  th: { flex: 1, padding: 10, backgroundColor: C.n50, fontFamily: 'Inter-Bold', fontSize: 8.5, letterSpacing: 1, color: C.n500, textTransform: 'uppercase' },
  td: { flex: 1, padding: 10, fontSize: 10, color: C.graphite },
  tdMono: { flex: 1, padding: 10, fontFamily: 'Inter-Bold', fontSize: 10, color: C.graphite },

  /* Bar */
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 90, fontSize: 9, color: C.graphite },
  barTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.n100, marginRight: 8 },
  barFill: { height: 5, borderRadius: 3 },
  barValue: { width: 40, fontFamily: 'Inter-Bold', fontSize: 9, color: C.n500, textAlign: 'right' },

  /* Footer */
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.n200, paddingTop: 10 },
  footerNote: { fontSize: 8, color: C.n500 },
  pageNumber: { fontFamily: 'Inter-Bold', fontSize: 8, color: C.n500 },

  /* AI insight card — kapak sayfası "Buaze analizi" section'ı için
     graphite zemin + lime accent leverage callout + numbered next steps. */
  insightCard: { backgroundColor: C.graphite, borderRadius: 14, padding: 18, marginTop: 16 },
  insightEyebrow: { fontFamily: 'Inter-Bold', fontSize: 8.5, letterSpacing: 1.6, color: C.lime, textTransform: 'uppercase' },
  insightSummary: { marginTop: 7, fontSize: 10.5, lineHeight: 1.55, color: '#FFFFFFE6' },
  // padding shorthand strings ('10px 12px') don't parse reliably in
  // @react-pdf — fall back to explicit horizontal/vertical so the inner
  // text never overlaps the 3px lime borderLeft.
  insightLeverage: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(198,242,78,0.14)', borderLeftWidth: 3, borderLeftColor: C.lime, borderRadius: 6 },
  insightLeverageEyebrow: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 1.4, color: C.lime, textTransform: 'uppercase', marginBottom: 3 },
  insightLeverageBody: { fontSize: 10, lineHeight: 1.5, color: C.white },
  insightStepsLabel: { marginTop: 14, fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 1.4, color: '#FFFFFF8C', textTransform: 'uppercase', marginBottom: 6 },
  insightStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  insightStepNum: { width: 22, fontFamily: 'Inter-Bold', fontSize: 10, color: C.lime, paddingTop: 1 },
  insightStepText: { flex: 1, fontSize: 10, lineHeight: 1.5, color: '#FFFFFFE6' },

  /* CTA card */
  cta: { backgroundColor: C.lime, borderRadius: 14, padding: 22, marginTop: 24 },
  ctaTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: C.graphite, marginBottom: 6, letterSpacing: -0.2 },
  ctaBody: { fontSize: 10.5, color: C.graphite, lineHeight: 1.55, marginBottom: 8 },
  ctaLink: { fontFamily: 'Inter-Bold', fontSize: 10.5, color: C.graphite, textDecoration: 'underline' },

  /* Star comparison strip (page 1, hero altı) — STRINGS'te starTodayLabel
     + starProjectedLabel zaten lokalize, daha önce render edilmiyordu. */
  starStrip: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  starCellMuted: { flex: 1, backgroundColor: C.n50, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: C.n200 },
  starCellAccent: { flex: 1, backgroundColor: C.graphite, borderRadius: 10, padding: 14 },
  starLabel: { fontFamily: 'Inter-Bold', fontSize: 7.5, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  starValue: { fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 1, letterSpacing: -0.4 },
  starArrow: { width: 24, alignItems: 'center', justifyContent: 'center', fontSize: 16, color: C.n400 },

  /* Milestone roadmap (page 2, scenario altı) — m1/m2/m3 strings hazırdı */
  milestoneCard: { backgroundColor: C.n50, borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.limeDeep, borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.n200 },
  milestoneEyebrow: { fontFamily: 'Inter-Bold', fontSize: 7.5, letterSpacing: 1.2, color: C.limeDeep, textTransform: 'uppercase', marginBottom: 4 },
  milestoneTitle: { fontFamily: 'Inter-Bold', fontSize: 12, color: C.graphite, marginBottom: 4 },
  milestoneBody: { fontSize: 9.5, color: C.n800, lineHeight: 1.55 },

  /* Social proof strip (page 3, CTA üstü) — socialActiveBusinesses vb. */
  socialRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  socialCell: { flex: 1, backgroundColor: C.n50, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.n200 },
  socialValue: { fontFamily: 'Inter-Bold', fontSize: 18, lineHeight: 1.1, letterSpacing: -0.3, color: C.graphite, marginBottom: 4 },
  socialLabel: { fontFamily: 'Inter-Bold', fontSize: 7.5, letterSpacing: 1.1, color: C.n500, textTransform: 'uppercase', lineHeight: 1.3 },

  /* Risk-free strip (page 3, CTA içinde) */
  riskFreeRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  riskFreeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  riskFreeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.graphite, marginRight: 6 },
  riskFreeText: { fontSize: 9, color: C.graphite, fontFamily: 'Inter-Bold' },
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
const SECTOR_LABEL_EN: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  hotel: 'Hotel',
  clinic: 'Clinic',
  other: 'Other',
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

// PDF locale string map. Tüm hardcoded TR string'ler key'lendirildi; EN
// paralel — kullanıcı form locale'ine göre PDF de doğru dilde render olur.
type LocaleKey = 'tr' | 'en';
const STRINGS: Record<LocaleKey, Record<string, string>> = {
  tr: {
    coverEyebrow: 'ROI PROJEKSİYONU · 12 AY',
    coverH1Suffix: 'için Buaze etkisi.',
    coverLead:
      'Bu rapor, sayfada girdiğin senaryo üzerine ~2.400 Buaze hesabı kohortu ve BrightLocal 2024 yerel arama verileriyle kalibre edilmiş bir 12 aylık projeksiyondur. Tüm sayılar tahmindir; gerçek sonuçlar işletmenin akışına ve yorum yanıt disiplinine göre değişir.',
    heroEyebrow: 'YILLIK NET KAZANÇ',
    heroSubA: '12 ayda Buaze yatırımının yaklaşık',
    heroSubB: '× geri dönüşü',
    heroPaybackA: ' · amorti süresi ~',
    heroPaybackB: ' ay.',
    kpiReviews: 'EK YORUM / AY',
    kpiFiltered: 'FİLTRELENEN KÖTÜ',
    kpiNewStar: 'YENİ GOOGLE ★',
    kpiAiSaved: 'AI TASARRUF / AY',
    aiHrUnit: 'sa',
    starTodayLabel: 'BUGÜN · GOOGLE ★',
    starProjectedLabel: '12 AY SONRA · BUAZE İLE',
    flowH2: 'Buaze QR akışı: yorumlar nereye gider?',
    flowLead:
      'Müşteri verdiği yıldıza göre iki farklı akışa ayrılır. İçerik gizlenmez, müşteri yine istediği yere yorum yazma hakkını korur — Buaze yalnızca yönlendirir. Bu pattern Google’ın kullanıcı katkı politikasıyla uyumludur.',
    flowLowChip: '1-2-3 ★',
    flowHighChip: '4-5 ★',
    flowLowTitle: 'Dahili form',
    flowLowDesc:
      ' (Buaze admin paneli). Düşük puanların ~%85’i Google’a sızmadan sahibinin gelen kutusuna düşer; sahip müşteriye özel iletişim kurar, sorunu çözebilir.',
    flowHighTitle: 'Seçili platform',
    flowHighDesc:
      ' (Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex — sahibinin aktif tuttukları). Yüksek puanlar arama görünürlüğünü ve dönüşüm oranını birlikte yukarı çeker.',
    insightAi: 'AI ANALİZİ · SANA ÖZEL',
    insightTemplate: 'BUAZE ANALİZİ · SANA ÖZEL',
    insightLeverage: 'EN GÜÇLÜ KALDIRAÇ',
    insightStepsLabel: 'İLK 30 GÜN — 3 ÖNCELİK',
    page2Meta: 'Senaryon ve dağılım',
    scenarioH2: 'Senin senaryon — sayfada girdiğin değerler',
    rowSector: 'Sektör',
    rowMonthlyCustomers: 'Aylık müşteri',
    rowAvgTicket: 'Ortalama sepet',
    rowCurrentGoogle: 'Mevcut Google ★',
    rowLowReviews: 'Aylık 1-3★ yorum',
    rowPlatforms: 'Aktif platformlar',
    rowPlan: 'Buaze planı',
    breakdownH2: 'Hesap dökümü',
    rowQrScans: "QR'ı tarayan / ay",
    rowReviews: 'Yorum bırakan / ay',
    rowFiltered: 'Filtrelenen düşük yorum / ay',
    rowProjectedGoogle: 'Yeni Google ★ (12 ay sonu)',
    rowNewCustomers: 'Yeni müşteri / ay',
    rowMonthlyUplift: 'Aylık ek gelir',
    rowYearlyUplift: 'Yıllık ek gelir',
    rowAiSaved: 'Pulse AI zaman tasarrufu',
    aiSavedSuffix: 'sa / ay',
    platformH2: 'Yüksek-puan akışı: platforma yönlendirme',
    milestoneH2: 'İlk 90 gün: yol haritası',
    milestoneLead:
      'Pulse AI taslakları + filtreleme akışı + çoklu platform yönlendirme — üç kaldıracı aynı anda çalıştırarak ölçülebilir sonuca varman için 90 günlük adım planı.',
    m1Eyebrow: 'İLK 30 GÜN',
    m1Title: 'Kurulum & kalibrasyon',
    m1Body:
      'QR akışı sahaya çıkar; Pulse AI taslakları işletmen tonuna kalibre olur. İlk tarama oranını ve düşük yorum filtreleme verisini ölçeriz.',
    m2Eyebrow: '30 → 60 GÜN',
    m2Title: 'İlk yıldız lift',
    m2Body:
      'Filtrelenen düşük yorumlar Google ortalamasını yukarı çekmeye başlar; çoklu platform akışı Yemeksepeti / Getir / Trendyol’da görünürlüğü açar.',
    m3Eyebrow: '60 → 90 GÜN',
    m3Title: 'Plan amortismanı',
    m3BodyA: 'Aylık ek gelir plan maliyetini geçer',
    m3PaybackA: ' (~',
    m3PaybackB: ' ay).',
    m3PaybackNoneSuffix: '.',
    m3BodyB: ' Yeni Google ★ sabitlenir, ek müşteri akışı kararlı hâle gelir.',
    socialActiveBusinesses: 'Aktif Buaze işletmesi',
    socialAvgLift: 'Ortalama yıldız lift\n/ 90 gün',
    socialFilterRate: 'Düşük yorum\nfiltreleme oranı',
    socialCalibration: 'Kalibrasyon kaynağı',
    socialBrightLocal: "BrightLocal’24",
    // Locale-aware numeric strings — TR uses dot thousands, comma decimal;
    // EN uses comma thousands, dot decimal. Previously hardcoded TR format
    // ("~2.400") rendered incorrectly inside the EN PDF.
    socialBusinessesValue: '~2.400',
    socialLiftValue: '+0,4 ★',
    socialFilterValue: '~%85',
    riskFree1: '30 gün ücretsiz',
    riskFree2: 'Kredi kartı yok',
    riskFree3: 'İstediğin an iptal',
    ctaTitle: 'Sıradaki adım: 30 dakikalık canlı kurulum',
    ctaBodyA: 'Bu projeksiyonu birlikte gözden geçirelim.',
    ctaBodyB:
      ' planını işletmene uyarlayalım, ilk QR’ı sahanda devreye alalım. Kredi kartı sormuyoruz; 30 gün ücretsiz deneme açık.',
    ctaDemoLabel: 'Demo:',
    ctaEmailLabel: 'E-posta:',
    footerTagline: 'Her yorum bir nabız.',
    footerNotePage1Prefix: 'ROI Projeksiyonu · ',
    footerNotePage1Suffix: ' · buaze.com/iletisim',
    footerNotePage2:
      'Kalibrasyon: BrightLocal 2024 + Buaze 2026-Q1 kohortu (~2.400 hesap) · buaze.com',
    monthSuffix: 'ay',
  },
  en: {
    coverEyebrow: 'ROI PROJECTION · 12 MO',
    coverH1Suffix: 'Buaze impact for',
    coverLead:
      'This report turns the scenario you entered into a 12-month projection calibrated on a cohort of ~2,400 Buaze accounts and BrightLocal 2024 local search data. All numbers are estimates; actuals depend on your operational rollout and reply discipline.',
    heroEyebrow: 'ANNUAL NET GAIN',
    heroSubA: 'Approximately',
    heroSubB: '× return on Buaze in 12 months',
    heroPaybackA: ' · payback ~',
    heroPaybackB: ' months.',
    kpiReviews: 'NEW REVIEWS / MO',
    kpiFiltered: 'LOW FILTERED',
    kpiNewStar: 'NEW GOOGLE ★',
    kpiAiSaved: 'AI SAVED / MO',
    aiHrUnit: 'h',
    starTodayLabel: 'TODAY · GOOGLE ★',
    starProjectedLabel: '12 MONTHS · WITH BUAZE',
    flowH2: 'Buaze QR flow: where reviews go',
    flowLead:
      'Customers split into two flows by star rating. Nothing is hidden — they keep the right to leave a review anywhere; Buaze only routes. This pattern is compliant with Google’s user contribution policy.',
    flowLowChip: '1-2-3 ★',
    flowHighChip: '4-5 ★',
    flowLowTitle: 'Internal form',
    flowLowDesc:
      ' (Buaze admin panel). ~85% of low ratings stay off Google, landing in the owner’s inbox; the owner can resolve the issue privately.',
    flowHighTitle: 'Selected platform',
    flowHighDesc:
      ' (Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex — those the owner keeps active). High ratings lift discovery and conversion together.',
    insightAi: 'AI ANALYSIS · TAILORED',
    insightTemplate: 'BUAZE ANALYSIS · TAILORED',
    insightLeverage: 'STRONGEST LEVERAGE',
    insightStepsLabel: 'FIRST 30 DAYS — 3 PRIORITIES',
    page2Meta: 'Scenario & breakdown',
    scenarioH2: 'Your scenario — values you entered',
    rowSector: 'Sector',
    rowMonthlyCustomers: 'Monthly customers',
    rowAvgTicket: 'Average ticket',
    rowCurrentGoogle: 'Current Google ★',
    rowLowReviews: '1-3★ reviews / mo',
    rowPlatforms: 'Active platforms',
    rowPlan: 'Buaze plan',
    breakdownH2: 'Calculation breakdown',
    rowQrScans: 'QR scans / mo',
    rowReviews: 'Reviews submitted / mo',
    rowFiltered: 'Filtered low reviews / mo',
    rowProjectedGoogle: 'New Google ★ (12-mo end)',
    rowNewCustomers: 'New customers / mo',
    rowMonthlyUplift: 'Monthly uplift',
    rowYearlyUplift: 'Yearly uplift',
    rowAiSaved: 'Pulse AI time saved',
    aiSavedSuffix: 'h / mo',
    platformH2: 'High-rating flow: platform routing',
    milestoneH2: 'First 90 days: roadmap',
    milestoneLead:
      'Pulse AI drafts + filtering flow + multi-platform routing — three levers running together to deliver measurable outcomes within 90 days.',
    m1Eyebrow: 'DAYS 1-30',
    m1Title: 'Setup & calibration',
    m1Body:
      'QR flow goes live; Pulse AI drafts calibrate to your tone of voice. We measure scan rate and low-review filtering for the first time.',
    m2Eyebrow: 'DAYS 30 → 60',
    m2Title: 'First star lift',
    m2Body:
      'Filtered low reviews start nudging the Google average upward; multi-platform flow opens visibility on Yemeksepeti / Getir / Trendyol.',
    m3Eyebrow: 'DAYS 60 → 90',
    m3Title: 'Plan payback',
    m3BodyA: 'Monthly uplift exceeds the plan cost',
    m3PaybackA: ' (~',
    m3PaybackB: ' months).',
    m3PaybackNoneSuffix: '.',
    m3BodyB: ' New Google ★ stabilizes; extra customer flow becomes steady.',
    socialActiveBusinesses: 'Active Buaze businesses',
    socialAvgLift: 'Avg. star lift\n/ 90 days',
    socialFilterRate: 'Low review\nfiltering rate',
    socialCalibration: 'Calibration source',
    socialBrightLocal: 'BrightLocal’24',
    // Locale-aware numeric strings — see TR block.
    socialBusinessesValue: '~2,400',
    socialLiftValue: '+0.4 ★',
    socialFilterValue: '~85%',
    riskFree1: '30-day free trial',
    riskFree2: 'No credit card',
    riskFree3: 'Cancel anytime',
    ctaTitle: 'Next step: 30-min live setup',
    ctaBodyA: 'Let’s walk through this projection together.',
    ctaBodyB:
      ' plan tailored to your business, first QR shipped on site. No credit card; 30-day free trial.',
    ctaDemoLabel: 'Demo:',
    ctaEmailLabel: 'Email:',
    footerTagline: 'Every review is a pulse.',
    footerNotePage1Prefix: 'ROI Projection · ',
    footerNotePage1Suffix: ' · buaze.com/contact',
    footerNotePage2:
      'Calibration: BrightLocal 2024 + Buaze 2026-Q1 cohort (~2,400 accounts) · buaze.com',
    monthSuffix: 'mo',
  },
};

export interface RoiPdfData {
  restaurantName: string;
  email: string;
  generatedAt: Date;
  currency: string; // ₺ veya $
  /** PDF render dili. Form'dan alınır; default 'tr' (TR-first SaaS).
   *  Tüm hardcoded string'ler `STRINGS[locale]` üzerinden lokalize. */
  locale?: LocaleKey;
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

function fmtFor(locale: LocaleKey) {
  const tag = locale === 'en' ? 'en-US' : 'tr-TR';
  return (n: number) => n.toLocaleString(tag);
}

// Logo: yorum baloncuğu + ECG nabız + lime accent dot (CLAUDE.md §11).
// Inline SVG path — bağımsız asset upload yok.
function BuazeLogo() {
  return (
    <Svg width={26} height={26} viewBox="0 0 64 64">
      <Path
        d="M10 14 C10 11 12 9 15 9 L49 9 C52 9 54 11 54 14 L54 38 C54 41 52 43 49 43 L26 43 L18 51 L18 43 L15 43 C12 43 10 41 10 38 Z"
        fill={C.graphite}
      />
      <Path
        d="M18 26 L24 26 L27 20 L31 32 L34 24 L37 28 L46 28"
        stroke={C.white}
        strokeWidth={2.4}
        fill="none"
      />
      <Circle cx={50} cy={16} r={5} fill={C.lime} />
    </Svg>
  );
}

export function RoiPdfDocument({ data }: { data: RoiPdfData }) {
  const locale: LocaleKey = data.locale === 'en' ? 'en' : 'tr';
  const L = STRINGS[locale];
  const fmt = fmtFor(locale);
  const sectorLabel =
    locale === 'en'
      ? SECTOR_LABEL_EN[data.sector] ?? data.sector
      : SECTOR_LABEL[data.sector] ?? data.sector;
  const dateStr = data.generatedAt.toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Pipeline: 4-5★ akışı seçili platformlara dağılır
  const totalRoute = data.platformBreakdown.reduce((s, p) => s + p.reviews, 0) || 1;

  const docTitle =
    locale === 'en'
      ? `Buaze ROI Projection — ${data.restaurantName}`
      : `Buaze ROI Projeksiyonu — ${data.restaurantName}`;
  const docSubject = locale === 'en' ? '12-Month ROI Projection' : '12 Aylık ROI Projeksiyonu';

  return (
    <Document
      title={docTitle}
      author="Buaze"
      subject={docSubject}
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

        <Text style={styles.eyebrow}>{L.coverEyebrow}</Text>
        <Text style={styles.h1}>
          {locale === 'en'
            ? `${L.coverH1Suffix} ${data.restaurantName}.`
            : `${data.restaurantName} ${L.coverH1Suffix}`}
        </Text>
        <Text style={styles.lead}>{L.coverLead}</Text>

        {/* Hero — yıllık net kazanç */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{L.heroEyebrow}</Text>
          <Text style={styles.heroValue}>
            {data.currency}
            {fmt(Math.max(0, Math.round(data.netGain)))}
          </Text>
          <Text style={styles.heroSub}>
            {L.heroSubA} {data.roiMultiple.toFixed(1)}{L.heroSubB}
            {data.paybackMonths
              ? `${L.heroPaybackA}${data.paybackMonths}${L.heroPaybackB}`
              : '.'}
          </Text>
        </View>

        {/* Star comparison strip — bugün vs 12 ay sonra Google ★ */}
        <View style={styles.starStrip}>
          <View style={styles.starCellMuted}>
            <Text style={[styles.starLabel, { color: C.n500 }]}>{L.starTodayLabel}</Text>
            <Text style={[styles.starValue, { color: C.graphite }]}>
              {data.currentGoogle.toFixed(1)} ★
            </Text>
          </View>
          <View style={styles.starArrow}>
            <Text style={{ fontSize: 18, color: C.n400 }}>→</Text>
          </View>
          <View style={styles.starCellAccent}>
            <Text style={[styles.starLabel, { color: C.lime }]}>{L.starProjectedLabel}</Text>
            <Text style={[styles.starValue, { color: C.lime }]}>
              {data.projectedGoogle.toFixed(1)} ★
            </Text>
          </View>
        </View>

        {/* 4 KPI grid */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiValue}>+{fmt(data.reviewers)}</Text>
            <Text style={styles.kpiLabel}>{L.kpiReviews}</Text>
          </View>
          <View style={styles.kpiCellAccent}>
            <Text style={styles.kpiValue}>{fmt(data.filteredLowReviews)}</Text>
            <Text style={styles.kpiLabel}>{L.kpiFiltered}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiValue}>{data.projectedGoogle.toFixed(1)}</Text>
            <Text style={styles.kpiLabel}>{L.kpiNewStar}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiValue}>{data.aiHoursSaved.toFixed(1)} {L.aiHrUnit}</Text>
            <Text style={styles.kpiLabel}>{L.kpiAiSaved}</Text>
          </View>
        </View>

        {/* Buaze akış diyagramı — 1-3★ vs 4-5★ akışı açık anlatım */}
        <Text style={styles.h2}>{L.flowH2}</Text>
        <Text style={[styles.body, { marginBottom: 14, color: C.n500 }]}>{L.flowLead}</Text>

        <View style={styles.flow}>
          {/* 1-3★ akışı */}
          <View style={styles.flowRow}>
            <View style={[styles.flowChip, { backgroundColor: C.graphite }]}>
              <Text style={styles.flowChipText}>{L.flowLowChip}</Text>
            </View>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowDesc}>
              <Text style={{ fontFamily: 'Inter-Bold' }}>{L.flowLowTitle}</Text>
              {L.flowLowDesc}
            </Text>
          </View>

          {/* 4-5★ akışı */}
          <View style={[styles.flowRow, { marginBottom: 0 }]}>
            <View style={[styles.flowChip, { backgroundColor: C.limeDeep }]}>
              <Text style={[styles.flowChipText, { color: C.graphite }]}>{L.flowHighChip}</Text>
            </View>
            <Text style={styles.flowArrow}>→</Text>
            <Text style={styles.flowDesc}>
              <Text style={{ fontFamily: 'Inter-Bold' }}>{L.flowHighTitle}</Text>
              {L.flowHighDesc}
            </Text>
          </View>
        </View>

        {/* AI insight — sana özel kişiselleştirilmiş analiz */}
        {data.insight && (
          <View style={styles.insightCard}>
            <Text style={styles.insightEyebrow}>
              {data.insight.source === 'ai' ? L.insightAi : L.insightTemplate}
            </Text>
            <Text style={styles.insightSummary}>{data.insight.summary}</Text>
            <View style={styles.insightLeverage}>
              <Text style={styles.insightLeverageEyebrow}>{L.insightLeverage}</Text>
              <Text style={styles.insightLeverageBody}>{data.insight.highlight}</Text>
            </View>
            <Text style={styles.insightStepsLabel}>{L.insightStepsLabel}</Text>
            {data.insight.nextSteps.map((step, i) => (
              <View key={i} style={styles.insightStep}>
                <Text style={styles.insightStepNum}>{String(i + 1).padStart(2, '0')}.</Text>
                <Text style={styles.insightStepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>
            {L.footerNotePage1Prefix}{data.email}{L.footerNotePage1Suffix}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
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
          <Text style={styles.meta}>{L.page2Meta}</Text>
        </View>

        <Text style={styles.h2}>{L.scenarioH2}</Text>

        <View style={styles.table}>
          {[
            { l: L.rowSector, v: sectorLabel },
            { l: L.rowMonthlyCustomers, v: fmt(data.monthlyCustomers) },
            { l: L.rowAvgTicket, v: `${data.currency}${fmt(data.avgTicket)}` },
            { l: L.rowCurrentGoogle, v: data.currentGoogle.toFixed(1) },
            { l: L.rowLowReviews, v: fmt(data.lowRatingsPerMonth) },
            {
              l: L.rowPlatforms,
              v: data.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(', ') || '—',
            },
            {
              l: L.rowPlan,
              v: `${PLAN_LABEL[data.plan] ?? data.plan} · ${data.currency}${fmt(data.planPrice)}/${L.monthSuffix}`,
            },
          ].map((row, i, arr) => (
            <View key={row.l} style={i === arr.length - 1 ? styles.trLast : styles.tr}>
              <Text style={styles.th}>{row.l}</Text>
              <Text style={styles.td}>{row.v}</Text>
            </View>
          ))}
        </View>

        {/* Breakdown başlığı + tablosu tek wrap={false} blok — orphan
            başlık önlenir. Eski hâlinde h2 page 2 sonunda kalıyor, table
            page 3'e itiliyordu (kullanıcı raporladı boşluk). */}
        <View wrap={false}>
          <Text style={styles.h2}>{L.breakdownH2}</Text>
          <View style={styles.table}>
            {[
              { l: L.rowQrScans, v: fmt(data.scanned) },
              { l: L.rowReviews, v: `+${fmt(data.reviewers)}` },
              { l: L.rowFiltered, v: fmt(data.filteredLowReviews) },
              {
                l: L.rowProjectedGoogle,
                v: `${data.currentGoogle.toFixed(1)} → ${data.projectedGoogle.toFixed(1)}`,
              },
              { l: L.rowNewCustomers, v: `+${fmt(data.newCustomers)}` },
              {
                l: L.rowMonthlyUplift,
                v: `${data.currency}${fmt(Math.round(data.monthlyUplift))}`,
              },
              {
                l: L.rowYearlyUplift,
                v: `${data.currency}${fmt(Math.round(data.yearlyUplift))}`,
              },
              {
                l: L.rowAiSaved,
                v: `${data.aiHoursSaved.toFixed(1)} ${L.aiSavedSuffix}`,
              },
            ].map((row, i, arr) => (
              <View key={row.l} style={i === arr.length - 1 ? styles.trLast : styles.tr}>
                <Text style={styles.th}>{row.l}</Text>
                <Text style={styles.tdMono}>{row.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 90-day milestone roadmap — m1/m2/m3 STRINGS hazırdı, ilk kez render */}
        <View wrap={false}>
          <Text style={styles.h2}>{L.milestoneH2}</Text>
          <Text style={[styles.body, { marginBottom: 12, color: C.n500 }]}>
            {L.milestoneLead}
          </Text>
          {[
            { eyebrow: L.m1Eyebrow, title: L.m1Title, body: L.m1Body },
            { eyebrow: L.m2Eyebrow, title: L.m2Title, body: L.m2Body },
            {
              eyebrow: L.m3Eyebrow,
              title: L.m3Title,
              body: `${L.m3BodyA}${
                data.paybackMonths
                  ? `${L.m3PaybackA}${data.paybackMonths}${L.m3PaybackB}`
                  : L.m3PaybackNoneSuffix
              }${L.m3BodyB}`,
            },
          ].map((m, i, arr) => (
            <View
              key={m.eyebrow}
              style={[
                styles.milestoneCard,
                i === arr.length - 1 ? { marginBottom: 0 } : {},
              ]}
              wrap={false}
            >
              <Text style={styles.milestoneEyebrow}>{m.eyebrow}</Text>
              <Text style={styles.milestoneTitle}>{m.title}</Text>
              <Text style={styles.milestoneBody}>{m.body}</Text>
            </View>
          ))}
        </View>

        {/* Platform breakdown */}
        {data.platformBreakdown.length > 0 && (
          <>
            <Text style={styles.h2}>{L.platformH2}</Text>
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

        {/* Social proof strip — kalibrasyon kaynağı + cohort + filter rate.
            STRINGS'te social* key'leri hazır, ilk kez render edilir. */}
        <View wrap={false} style={{ marginTop: 18 }}>
          <View style={styles.socialRow}>
            <View style={styles.socialCell}>
              <Text style={styles.socialValue}>{L.socialBusinessesValue}</Text>
              <Text style={styles.socialLabel}>{L.socialActiveBusinesses}</Text>
            </View>
            <View style={styles.socialCell}>
              <Text style={styles.socialValue}>{L.socialLiftValue}</Text>
              <Text style={styles.socialLabel}>{L.socialAvgLift}</Text>
            </View>
            <View style={styles.socialCell}>
              <Text style={styles.socialValue}>{L.socialFilterValue}</Text>
              <Text style={styles.socialLabel}>{L.socialFilterRate}</Text>
            </View>
            <View style={styles.socialCell}>
              <Text style={[styles.socialValue, { fontSize: 13 }]}>
                {L.socialBrightLocal}
              </Text>
              <Text style={styles.socialLabel}>{L.socialCalibration}</Text>
            </View>
          </View>
        </View>

        {/* CTA — sonraki adım + risk-free strip */}
        <View style={styles.cta} wrap={false}>
          <Text style={styles.ctaTitle}>{L.ctaTitle}</Text>
          <Text style={styles.ctaBody}>
            {L.ctaBodyA}{' '}{PLAN_LABEL[data.plan] ?? data.plan}
            {L.ctaBodyB}
          </Text>
          <Text style={styles.ctaBody}>
            <Text style={{ fontFamily: 'Inter-Bold' }}>{L.ctaDemoLabel}</Text>
            {' '}{locale === 'en' ? 'buaze.com/contact' : 'buaze.com/iletisim'} · <Text style={{ fontFamily: 'Inter-Bold' }}>{L.ctaEmailLabel}</Text>{' '}
            hello@buaze.com
          </Text>
          <Text style={styles.ctaLink}>buaze.com</Text>
          {/* 3 risk-free güven chip'i (STRINGS riskFree1/2/3) */}
          <View style={styles.riskFreeRow}>
            {[L.riskFree1, L.riskFree2, L.riskFree3].map((label) => (
              <View key={label} style={styles.riskFreeChip}>
                <View style={styles.riskFreeDot} />
                <Text style={styles.riskFreeText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>{L.footerNotePage2}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
