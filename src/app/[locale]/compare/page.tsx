import type { Metadata } from 'next';
import { Check, X, Info, Zap, Shield, BarChart3, Users, Smartphone, Globe, ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
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

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const rows = [
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
    if (status === 'limited') return <div className="w-8 h-8 rounded-full bg-[#FDBF1D]/10 flex items-center justify-center mx-auto border-2 border-[#FDBF1D]"><Info size={20} className="text-[#FDBF1D]" /></div>;
    return <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mx-auto border-2 border-red-200"><X size={20} className="text-red-400" /></div>;
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero Section ─── */}
      <section className="pt-24 pb-16 px-5 sm:px-8 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#FDBF1D]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-[1200px] mx-auto text-center relative">
          <div className="max-w-[800px] mx-auto space-y-8">
            <h1 className="text-[44px] sm:text-[72px] font-black leading-[0.95] tracking-tight">
              {t.compare_hero_h1.split(' ').slice(0, -3).join(' ')} <br/>
              <span className="text-[#ea580c]">{t.compare_hero_h1.split(' ').slice(-3).join(' ')}</span>
            </h1>
            <p className="text-[18px] sm:text-[22px] text-[#6b6760] font-bold leading-relaxed">
              {t.compare_hero_p}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="py-16 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto">
          <div className="bg-white rounded-[40px] border-[4px] border-[#1f1e1d] shadow-[15px_20px_0_0_#1f1e1d] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1f1e1d] text-white">
                  <th className="p-8 text-left text-[14px] font-black uppercase tracking-widest border-b border-white/10">{t.compare_feat_name}</th>
                  <th className="p-8 text-center text-[14px] font-black uppercase tracking-widest border-b border-white/10 text-[#FDBF1D]">{t.compare_buaze}</th>
                  <th className="p-8 text-center text-[14px] font-black uppercase tracking-widest border-b border-white/10 hidden sm:table-cell">{t.compare_static}</th>
                  <th className="p-8 text-center text-[14px] font-black uppercase tracking-widest border-b border-white/10 hidden sm:table-cell">{t.compare_sheet}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e4de]">
                {rows.map((row, i) => (
                  <tr key={i} className="group hover:bg-[#FCFBF7] transition-colors">
                    <td className="p-8 text-[15px] sm:text-[17px] font-black group-hover:pl-10 transition-all">{row.label}</td>
                    <td className="p-8 text-center"><FeatureIcon status={row.buaze} /></td>
                    <td className="p-8 text-center hidden sm:table-cell"><FeatureIcon status={row.static} /></td>
                    <td className="p-8 text-center hidden sm:table-cell"><FeatureIcon status={row.sheet} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 flex justify-center gap-12 text-[12px] font-black text-[#8a847a]">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#10b981]" /> {t.compare_yes}
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-red-300" /> {t.compare_no}
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#FDBF1D]" /> {t.compare_limited}
             </div>
          </div>
        </div>
      </section>

      {/* ─── Deeper Dive ─── */}
      <section className="py-32 px-5 sm:px-8 bg-white">
        <div className="max-w-[1200px] mx-auto space-y-32">
          
          {/* Section 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
               <div className="w-16 h-16 bg-[#FDBF1D]/10 rounded-2xl flex items-center justify-center border-2 border-[#1f1e1d]">
                  <Zap size={32} className="text-[#1f1e1d]" />
               </div>
               <h2 className="text-[36px] sm:text-[48px] font-black tracking-tight leading-none">
                  {locale === 'tr' ? 'Neden Statik QR Kullanmamalısınız?' : 'Why You Shouldn\'t Use Static QR Codes?'}
               </h2>
               <div className="space-y-4 text-[17px] sm:text-[19px] text-[#6b6760] font-medium leading-relaxed">
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
            <div className="bg-[#FCFBF7] rounded-[48px] p-12 border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#FDBF1D]">
               <div className="space-y-6">
                  <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-200">
                     <p className="text-red-600 font-black text-[14px] uppercase tracking-widest">{locale === 'tr' ? 'RİSK: STATİK QR' : 'RISK: STATIC QR'}</p>
                     <p className="text-red-900 font-bold mt-2">{locale === 'tr' ? 'Geri dönülemez baskı hataları ve veri kaybı.' : 'Irreversible printing errors and data loss.'}</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200">
                     <p className="text-green-600 font-black text-[14px] uppercase tracking-widest">{locale === 'tr' ? 'ÇÖZÜM: BUAZE DİNAMİK' : 'SOLUTION: BUAZE DYNAMIC'}</p>
                     <p className="text-green-900 font-bold mt-2">{locale === 'tr' ? 'Esneklik, takip edilebilirlik ve güven.' : 'Flexibility, traceability, and trust.'}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2 space-y-8">
               <div className="w-16 h-16 bg-[#ea580c]/10 rounded-2xl flex items-center justify-center border-2 border-[#1f1e1d]">
                  <BarChart3 size={32} className="text-[#ea580c]" />
               </div>
               <h2 className="text-[36px] sm:text-[48px] font-black tracking-tight leading-none">
                  {locale === 'tr' ? 'Excel Tablolarının Gizli Maliyeti' : 'The Hidden Cost of Excel Tables'}
               </h2>
               <div className="space-y-4 text-[17px] sm:text-[19px] text-[#6b6760] font-medium leading-relaxed">
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
                <div className="absolute inset-0 bg-[#ea580c]/5 rounded-[48px] translate-x-4 translate-y-4 -z-10" />
                <div className="bg-[#1f1e1d] rounded-[48px] p-12 text-white border-[3px] border-[#1f1e1d]">
                   <p className="text-[12px] font-black text-[#FDBF1D] uppercase tracking-[0.2em] mb-8">{locale === 'tr' ? 'OPERASYONEL FARK' : 'OPERATIONAL DIFFERENCE'}</p>
                   <div className="space-y-8">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-red-400" />
                         <span className="text-[#ada89f] font-medium">{locale === 'tr' ? 'Excel: Ortalama Reaksiyon - 72 Saat' : 'Excel: Average Reaction - 72 Hours'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                         <span className="text-white font-black">{locale === 'tr' ? 'Buaze: Ortalama Reaksiyon - 4 Dakika' : 'Buaze: Average Reaction - 4 Minutes'}</span>
                      </div>
                   </div>
                </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-32 px-5 sm:px-8 bg-[#F7F4F0] border-t border-[#e8e4de]">
        <div className="max-w-[800px] mx-auto text-center space-y-12">
            <h2 className="text-[36px] sm:text-[56px] font-black tracking-tight leading-none">
              {locale === 'tr' ? 'Profesyonel İtibar Yönetimine Geçin' : 'Switch to Professional Reputation Management'}
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href={`${base}/auth/register`}
                className="px-10 py-5 bg-[#FDBF1D] text-[#1f1e1d] text-[18px] font-black rounded-2xl border-[4px] border-[#1f1e1d] shadow-[0_8px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[8px] active:shadow-none uppercase tracking-wider"
              >
                {t.hero_cta}
              </Link>
              <Link
                href={`${base}/pricing`}
                className="group flex items-center gap-2 text-[15px] font-black text-[#6b6760] hover:text-[#1f1e1d] transition-colors"
              >
                <span>{locale === 'tr' ? 'Fiyatlandırmayı İncele' : 'Explore Pricing'}</span>
                <ArrowRight size={20} />
              </Link>
            </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
