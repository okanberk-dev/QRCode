import type { Metadata } from 'next';
import { Check, X, Minus } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: t.compare_title + ' | Buaze',
    description: t.compare_subtitle,
    alternates: {
      canonical: `https://buaze.com/${locale}/compare`,
      languages: { tr: 'https://buaze.com/tr/compare', en: 'https://buaze.com/en/compare' },
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  type FeatureStatus = boolean | 'limited';
  type Row = { label: string; buaze: FeatureStatus; static: FeatureStatus; sheet: FeatureStatus };

  const rows: Row[] = [
    { label: t.compare_f1, buaze: true, static: false, sheet: false },
    { label: t.compare_f2, buaze: true, static: false, sheet: false },
    { label: t.compare_f3, buaze: true, static: false, sheet: false },
    { label: t.compare_f4, buaze: true, static: false, sheet: 'limited' },
    { label: t.compare_f5, buaze: true, static: false, sheet: false },
    { label: t.compare_f6, buaze: true, static: false, sheet: 'limited' },
    { label: t.compare_f7, buaze: true, static: 'limited', sheet: 'limited' },
  ];

  const FeatureIcon = ({ status, highlight }: { status: FeatureStatus; highlight?: boolean }) => {
    if (status === true)
      return (
        <span
          className={`inline-flex w-7 h-7 rounded-full items-center justify-center ${
            highlight ? 'bg-[#C6F24E]' : 'bg-[#EAF9B8]'
          }`}
        >
          <Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} />
        </span>
      );
    if (status === 'limited')
      return (
        <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF3C7] items-center justify-center">
          <Minus size={14} className="text-[#92400E]" strokeWidth={2.5} />
        </span>
      );
    return (
      <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center">
        <X size={14} className="text-[#B91C1C]" strokeWidth={2.5} />
      </span>
    );
  };

  const heroWords = t.compare_hero_h1.split(' ');
  const heroHead = heroWords.slice(0, -3).join(' ');
  const heroTail = heroWords.slice(-3).join(' ');

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-24 pb-12 sm:pb-16">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="cmpHeroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cmpHeroGrid)" />
        </svg>
        <div className="relative max-w-[900px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Karşılaştırma' : 'Comparison'}
          </span>
          <h1 className="mt-5 text-[38px] sm:text-[60px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]">
            {heroHead}{' '}
            <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">{heroTail}</span>
          </h1>
          <p className="mt-6 text-[15px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[620px] mx-auto">
            {t.compare_hero_p}
          </p>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1000px] mx-auto">
          <div className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#EDEDED]">
                    <th className="p-5 pulse-eyebrow text-[#737373] text-left">{t.compare_feat_name}</th>
                    <th className="p-5 pulse-eyebrow text-[#0A0A0A] text-center bg-[#EAF9B8]">
                      {t.compare_buaze}
                    </th>
                    <th className="p-5 pulse-eyebrow text-[#737373] text-center">{t.compare_static}</th>
                    <th className="p-5 pulse-eyebrow text-[#737373] text-center">{t.compare_sheet}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="p-5 text-[14px] font-medium text-[#0A0A0A]">{row.label}</td>
                      <td className="p-5 text-center bg-[#EAF9B8]/30">
                        <FeatureIcon status={row.buaze} highlight />
                      </td>
                      <td className="p-5 text-center">
                        <FeatureIcon status={row.static} />
                      </td>
                      <td className="p-5 text-center">
                        <FeatureIcon status={row.sheet} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-6 text-[12px] text-[#525252]">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#EAF9B8] flex items-center justify-center">
                <Check size={10} className="text-[#0A0A0A]" strokeWidth={3} />
              </span>
              {t.compare_yes}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                <Minus size={10} className="text-[#92400E]" strokeWidth={3} />
              </span>
              {t.compare_limited}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                <X size={10} className="text-[#B91C1C]" strokeWidth={3} />
              </span>
              {t.compare_no}
            </div>
          </div>

          {/* Specific comparison links */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link
              href={`${base}/vs/spreadsheet`}
              className="group p-7 bz-card hover:border-[#C6F24E] transition-colors"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="w-11 h-11 bg-[#EAF9B8] rounded-lg flex items-center justify-center">
                  <span className="pulse-eyebrow text-[#0A0A0A]">XLS</span>
                </div>
                <span
                  aria-hidden
                  className="text-[#737373] group-hover:text-[#0A0A0A] group-hover:translate-x-0.5 transition-all"
                >
                  →
                </span>
              </div>
              <h3 className="text-[18px] font-medium text-[#0A0A0A] leading-tight mb-2">
                {isTr ? 'Buaze vs Spreadsheet' : 'Buaze vs Spreadsheet'}
              </h3>
              <p className="text-[13px] text-[#525252] leading-relaxed">
                {isTr
                  ? 'Excel tablolarının operasyonel kör noktalarından kurtulun; otomasyonun gücünü keşfedin.'
                  : "Get rid of Excel's operational blind spots; discover the power of automation."}
              </p>
            </Link>

            <Link
              href={`${base}/vs/individual-qr`}
              className="group p-7 bz-card hover:border-[#C6F24E] transition-colors"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="w-11 h-11 bg-[#EAF9B8] rounded-lg flex items-center justify-center">
                  <span className="pulse-eyebrow text-[#0A0A0A]">QR</span>
                </div>
                <span
                  aria-hidden
                  className="text-[#737373] group-hover:text-[#0A0A0A] group-hover:translate-x-0.5 transition-all"
                >
                  →
                </span>
              </div>
              <h3 className="text-[18px] font-medium text-[#0A0A0A] leading-tight mb-2">
                {isTr ? 'Buaze vs Bireysel QR' : 'Buaze vs Individual QR'}
              </h3>
              <p className="text-[13px] text-[#525252] leading-relaxed">
                {isTr
                  ? 'Statik QR kodların link kısıtlamalarını ve itibar risklerini profesyonel dinamik altyapı ile aşın.'
                  : 'Overcome the link limitations and reputation risks of static QR codes with a professional dynamic infrastructure.'}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Deeper Dive ─── */}
      <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto space-y-20 sm:space-y-24">
          {/* Section 1: Static QR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Statik QR riski' : 'Static QR risk'}
              </span>
              <h2 className="mt-4 text-[26px] sm:text-[42px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Neden statik QR kullanmamalısınız?' : "Why you shouldn't use static QR."}
              </h2>
              <div className="mt-5 space-y-4 text-[16px] text-[#525252] leading-[1.65]">
                <p>
                  {isTr
                    ? 'Ücretsiz oluşturulan statik QR kodların linkini bir kez bastığınızda bir daha değiştiremezsiniz. Menünüz değişirse, Google linkiniz güncellenirse tüm baskı maliyetleriniz çöpe gider.'
                    : 'Once you print a free static QR code, you can never change its link. If your menu changes or your Google link is updated, all your printing costs go to waste.'}
                </p>
                <p>
                  {isTr
                    ? "Buaze'de ise kodunuz değişmez, yönlendirdiğiniz sayfa panelinizden bir saniyede güncellenir."
                    : 'With Buaze, your code stays the same, while the target page is updated from your panel in a second.'}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-[#EDEDED] space-y-4">
              <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-[#FECACA]">
                <span className="pulse-eyebrow text-[#B91C1C]">
                  {isTr ? 'RİSK · STATİK QR' : 'RISK · STATIC QR'}
                </span>
                <p className="mt-2 text-[15px] font-medium text-[#0A0A0A]">
                  {isTr ? 'Geri dönülemez baskı hataları, veri kaybı.' : 'Irreversible print errors, data loss.'}
                </p>
              </div>
              <div className="bg-[#EAF9B8] p-5 rounded-2xl border border-[#C6F24E]">
                <span className="pulse-eyebrow text-[#0A0A0A]">
                  {isTr ? 'ÇÖZÜM · BUAZE DİNAMİK' : 'SOLUTION · BUAZE DYNAMIC'}
                </span>
                <p className="mt-2 text-[15px] font-medium text-[#0A0A0A]">
                  {isTr ? 'Esneklik, takip edilebilirlik, güven.' : 'Flexibility, traceability, trust.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Excel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="lg:order-2">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Excel gizli maliyeti' : "Excel's hidden cost"}
              </span>
              <h2 className="mt-4 text-[26px] sm:text-[42px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Excel tablolarının gizli maliyeti.' : 'The hidden cost of Excel.'}
              </h2>
              <div className="mt-5 space-y-4 text-[16px] text-[#525252] leading-[1.65]">
                <p>
                  {isTr
                    ? 'Manuel veri girişi zamanınızı çalar. Olumsuz deneyimi Excel\'de üç gün sonra görmek, o müşteriyi çoktan kaybettiğiniz anlamına gelir.'
                    : 'Manual data entry steals your time. Seeing a negative experience in Excel three days later means you\'ve already lost that customer.'}
                </p>
                <p>
                  {isTr
                    ? 'Buaze ile her olumsuz deneyim saniyeler içinde telefonunuza bildirim olarak düşer. Kriz anında müdahale şansı tanır.'
                    : 'With Buaze, every negative experience hits your phone as a notification within seconds. It offers a chance to intervene during a crisis.'}
                </p>
              </div>
            </div>
            <div className="lg:order-1 bg-[#0A0A0A] rounded-3xl p-8 sm:p-10 text-white">
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'Operasyonel fark' : 'Operational difference'}
              </span>
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                  <span className="text-white/70 text-[15px]">
                    {isTr ? 'Excel · Ortalama reaksiyon 72 saat' : 'Excel · Avg reaction 72 hours'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                  <span className="text-white text-[15px] font-medium">
                    {isTr ? 'Buaze · Ortalama reaksiyon 4 dakika' : 'Buaze · Avg reaction 4 minutes'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[48px] font-medium tracking-[-0.035em] leading-[1.05] text-[#0A0A0A]">
            {isTr ? 'Profesyonel itibar yönetimine geçin.' : 'Switch to professional reputation management.'}
          </h2>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {t.hero_cta}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Planları incele' : 'Browse plans'}
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
