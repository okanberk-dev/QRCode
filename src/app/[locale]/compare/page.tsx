import type { Metadata } from 'next';
import { Check, X, Info, Zap, Shield, BarChart3, Users, Smartphone, Globe, ArrowRight, Table } from 'lucide-react';
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
      languages: { 'tr': 'https://buaze.com/tr/compare', 'en': 'https://buaze.com/en/compare' },
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

  const FeatureIcon = ({ status }: { status: boolean | 'limited' }) => {
    if (status === true) return <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center mx-auto border-2 border-[#10b981]"><Check size={20} className="text-[#10b981]" /></div>;
    if (status === 'limited') return <div className="w-8 h-8 rounded-full bg-[#F4B400]/10 flex items-center justify-center mx-auto border-2 border-[#F4B400]"><Info size={20} className="text-[#F4B400]" /></div>;
    return <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mx-auto border-2 border-red-200"><X size={20} className="text-red-400" /></div>;
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1A2332] font-sans pt-[64px] selection:bg-[#F4B400]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero Section ─── */}
      <section className="pt-20 sm:pt-32 pb-12 px-5 sm:px-8 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#F4B400]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-[1200px] mx-auto text-center relative">
          <div className="max-w-[800px] mx-auto space-y-6 sm:space-y-8">
            <h1 className="text-[34px] sm:text-[72px] font-black leading-[1] sm:leading-[0.95] tracking-tight">
              {t.compare_hero_h1.split(' ').slice(0, -3).join(' ')} <br className="hidden sm:block"/>
              <span className="text-[#F4B400]">{t.compare_hero_h1.split(' ').slice(-3).join(' ')}</span>
            </h1>
            <p className="text-[17px] sm:text-[22px] text-[#2A3444] font-bold leading-relaxed px-2">
              {t.compare_hero_p}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="py-12 sm:py-16 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto">
          <div className="bg-white rounded-[32px] sm:rounded-[40px] border-[3px] sm:border-[4px] border-[#1A2332] shadow-md sm:shadow-md overflow-hidden">
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full border-collapse min-w-[640px] sm:min-w-0">
                <thead>
                  <tr className="bg-[#1A2332] text-white">
                    <th className="p-5 sm:p-8 text-left text-[11px] sm:text-[14px] font-black uppercase tracking-widest border-b border-white/10">{t.compare_feat_name}</th>
                    <th className="p-5 sm:p-8 text-center text-[11px] sm:text-[14px] font-black uppercase tracking-widest border-b border-white/10 text-[#F4B400]">{t.compare_buaze}</th>
                    <th className="p-5 sm:p-8 text-center text-[11px] sm:text-[14px] font-black uppercase tracking-widest border-b border-white/10">{t.compare_static}</th>
                    <th className="p-5 sm:p-8 text-center text-[11px] sm:text-[14px] font-black uppercase tracking-widest border-b border-white/10">{t.compare_sheet}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {rows.map((row, i) => (
                    <tr key={i} className="group hover:bg-[#F8F6F1] transition-colors">
                      <td className="p-5 sm:p-8 text-[14px] sm:text-[17px] font-black group-hover:pl-10 transition-all">{row.label}</td>
                      <td className="p-5 sm:p-8 text-center"><FeatureIcon status={row.buaze} /></td>
                      <td className="p-5 sm:p-8 text-center"><FeatureIcon status={row.static} /></td>
                      <td className="p-5 sm:p-8 text-center"><FeatureIcon status={row.sheet} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-12 text-[10px] sm:text-[12px] font-black text-[#8a847a] uppercase tracking-wider">
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[#10b981]" /> {t.compare_yes}
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-red-300" /> {t.compare_no}
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[#F4B400]" /> {t.compare_limited}
             </div>
          </div>

          {/* New Specific VS Links */}
          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <Link href={`${base}/vs/spreadsheet`} className="group p-6 sm:p-8 bg-[#F8F6F1] rounded-[24px] sm:rounded-[32px] border-[2.5px] sm:border-[3px] border-[#1A2332] hover:bg-[#F4B400]/10 transition-all hover:-translate-y-2">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl border-2 border-[#1A2332] flex items-center justify-center">
                     <Table size={20} className="sm:size-6 text-[#F4B400]" />
                  </div>
                  <ArrowRight size={20} className="sm:size-6 text-[#6B7280] group-hover:text-[#1A2332] transition-colors" />
               </div>
               <h3 className="text-[18px] sm:text-[20px] font-black mb-2 leading-tight">{locale === 'tr' ? 'Buaze vs Spreadsheet' : 'Buaze vs Spreadsheet'}</h3>
               <p className="text-[13px] sm:text-[14px] text-[#2A3444] font-bold leading-relaxed">
                  {locale === 'tr'
                    ? 'Excel tablolarının operasyonel kör noktalarından kurtulun ve otomasyonun gücünü keşfedin.'
                    : 'Get rid of the operational blind spots of Excel spreadsheets and discover the power of automation.'}
               </p>
            </Link>

            <Link href={`${base}/vs/individual-qr`} className="group p-6 sm:p-8 bg-[#F8F6F1] rounded-[24px] sm:rounded-[32px] border-[2.5px] sm:border-[3px] border-[#1A2332] hover:bg-[#F4B400]/10 transition-all hover:-translate-y-2">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl border-2 border-[#1A2332] flex items-center justify-center">
                     <Smartphone size={20} className="sm:size-6 text-[#6366f1]" />
                  </div>
                  <ArrowRight size={20} className="sm:size-6 text-[#6B7280] group-hover:text-[#1A2332] transition-colors" />
               </div>
               <h3 className="text-[18px] sm:text-[20px] font-black mb-2 leading-tight">{locale === 'tr' ? 'Buaze vs Bireysel QR' : 'Buaze vs Individual QR'}</h3>
               <p className="text-[13px] sm:text-[14px] text-[#2A3444] font-bold leading-relaxed">
                  {locale === 'tr'
                    ? 'Statik QR kodların link kısıtlamalarını ve itibar risklerini profesyonel dinamik altyapı ile aşın.'
                    : 'Overcome the link limitations and reputation risks of static QR codes with a professional dynamic infrastructure.'}
               </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Deeper Dive ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white overflow-hidden">
        <div className="max-w-[1200px] mx-auto space-y-24 sm:space-y-32">
          
          {/* Section 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
            <div className="space-y-6 sm:space-y-8">
               <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#F4B400]/10 rounded-2xl flex items-center justify-center border-2 border-[#1A2332]">
                  <Zap size={28} className="sm:size-8 text-[#1A2332]" />
               </div>
               <h2 className="text-[30px] sm:text-[48px] font-black tracking-tight leading-[1.1] sm:leading-none">
                  {locale === 'tr' ? 'Neden Statik QR Kullanmamalısınız?' : 'Why You Shouldn\'t Use Static QR Codes?'}
               </h2>
               <div className="space-y-4 text-[16px] sm:text-[19px] text-[#2A3444] font-medium leading-relaxed">
                  <p>
                    {locale === 'tr' 
                      ? 'Ücretsiz oluşturulan statik QR kodların linkini bir kez bastığınızda bir daha değiştiremezsiniz. Menünüz değişirse, Google linkiniz güncellenirse tüm baskı maliyetleriniz çöpe gider.'
                      : 'Once you print a free static QR code, you can never change its link. If your menu changes or your Google link is updated, all your printing costs go to waste.'}
                  </p>
                  <p>
                    {locale === 'tr'
                      ? 'Buaze\'de ise kodunuz değişmez, yönlendirdiğiniz sayfa ise panelinizden bir saniyede güncellenir.'
                      : 'With Buaze, your code stays the same, while the target page is updated from your panel in a second.'}
                  </p>
               </div>
            </div>
            <div className="bg-[#F8F6F1] rounded-[32px] sm:rounded-[48px] p-8 sm:p-12 border-[2.5px] sm:border-[3px] border-[#1A2332] shadow-md sm:shadow-md">
               <div className="space-y-6">
                  <div className="bg-red-50 p-5 sm:p-6 rounded-2xl border-2 border-red-200">
                     <p className="text-red-600 font-black text-[12px] sm:text-[14px] uppercase tracking-widest">{locale === 'tr' ? 'RİSK: STATİK QR' : 'RISK: STATIC QR'}</p>
                     <p className="text-red-900 font-bold mt-2 text-[15px] sm:text-[16px]">{locale === 'tr' ? 'Geri dönülemez baskı hataları ve veri kaybı.' : 'Irreversible printing errors and data loss.'}</p>
                  </div>
                  <div className="bg-green-50 p-5 sm:p-6 rounded-2xl border-2 border-green-200">
                     <p className="text-green-600 font-black text-[12px] sm:text-[14px] uppercase tracking-widest">{locale === 'tr' ? 'ÇÖZÜM: BUAZE DİNAMİK' : 'SOLUTION: BUAZE DYNAMIC'}</p>
                     <p className="text-green-900 font-bold mt-2 text-[15px] sm:text-[16px]">{locale === 'tr' ? 'Esneklik, takip edilebilirlik ve güven.' : 'Flexibility, traceability, and trust.'}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
            <div className="lg:order-2 space-y-6 sm:space-y-8">
               <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#F4B400]/10 rounded-2xl flex items-center justify-center border-2 border-[#1A2332]">
                  <BarChart3 size={28} className="sm:size-8 text-[#F4B400]" />
               </div>
               <h2 className="text-[30px] sm:text-[48px] font-black tracking-tight leading-[1.1] sm:leading-none">
                  {locale === 'tr' ? 'Excel Tablolarının Gizli Maliyeti' : 'The Hidden Cost of Excel Tables'}
               </h2>
               <div className="space-y-4 text-[16px] sm:text-[19px] text-[#2A3444] font-medium leading-relaxed">
                  <p>
                    {locale === 'tr' 
                      ? 'Manuel veri girişi zamanınızı çalar. Bir müşteriniz olumsuz bir deneyim yaşadığında, bunu bir Excel tablosunda 3 gün sonra görmek o müşteriyi çoktan kaybettiğiniz anlamına gelir.'
                      : 'Manual data entry steals your time. Seeing a negative experience in an Excel table 3 days later means you\'ve already lost that customer.'}
                  </p>
                  <p>
                    {locale === 'tr'
                      ? 'Buaze ile olumsuz her deneyim saniyeler içinde telefonunuza bildirim olarak düşer. Kriz anında müdahale şansı tanır.'
                      : 'With Buaze, every negative experience hits your phone as a notification within seconds. It offers a chance to intervene during a crisis.'}
                  </p>
               </div>
            </div>
            <div className="lg:order-1 relative">
                <div className="absolute inset-0 bg-[#F4B400]/5 rounded-[32px] sm:rounded-[48px] translate-x-3 translate-y-3 sm:translate-x-4 sm:translate-y-4 -z-10" />
                <div className="bg-[#1A2332] rounded-[32px] sm:rounded-[48px] p-8 sm:p-12 text-white border-[3px] border-[#1A2332]">
                   <p className="text-[11px] sm:text-[12px] font-black text-[#F4B400] uppercase tracking-[0.2em] mb-6 sm:mb-8">{locale === 'tr' ? 'OPERASYONEL FARK' : 'OPERATIONAL DIFFERENCE'}</p>
                   <div className="space-y-6 sm:space-y-8">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-red-400" />
                         <span className="text-[#6B7280] font-medium text-[14px] sm:text-[16px]">{locale === 'tr' ? 'Excel: Ortalama Reaksiyon - 72 Saat' : 'Excel: Average Reaction - 72 Hours'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                         <span className="text-white font-black text-[14px] sm:text-[16px]">{locale === 'tr' ? 'Buaze: Ortalama Reaksiyon - 4 Dakika' : 'Buaze: Average Reaction - 4 Minutes'}</span>
                      </div>
                   </div>
                </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 sm:py-32 px-5 sm:px-8 bg-[#F8F6F1] border-t border-[#E8ECF2]">
        <div className="max-w-[800px] mx-auto text-center space-y-10 sm:space-y-12">
            <h2 className="text-[32px] sm:text-[56px] font-black tracking-tight leading-[1.1] sm:leading-none">
              {locale === 'tr' ? 'Profesyonel İtibar Yönetimine Geçin' : 'Switch to Professional Reputation Management'}
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6">
              <Link
                href={`${base}/auth/register`}
                className="w-full sm:w-auto px-10 py-5 bg-[#F4B400] text-[#1A2332] text-[17px] sm:text-[18px] font-black rounded-2xl border-[4.5px] border-[#1A2332] shadow-sm hover:bg-[#F4B400] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-wider"
              >
                {t.hero_cta}
              </Link>
              <Link
                href={`${base}/pricing`}
                className="group flex items-center gap-2 text-[15px] font-black text-[#2A3444] hover:text-[#1A2332] transition-colors"
              >
                <span>{locale === 'tr' ? 'Fiyatlandırmayı İncele' : 'Explore Pricing'}</span>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
