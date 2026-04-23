import { Check, X, Shield, Zap, BarChart3, ArrowRight, Table, MousePointer2, AlertCircle } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import type { Locale, Translations } from '@/lib/translations';
import { CtaButton } from '@/components/ui/CtaButton';
import { ReactNode } from 'react';

interface ComparisonRow {
  label: string;
  buaze: ReactNode;
  competitor: ReactNode;
  isHeader?: boolean;
}

interface ComparisonLayoutProps {
  locale: Locale;
  t: Translations;
  vsName: string; // e.g., 'Spreadsheet' or 'Individual QR'
  heroTitle: string;
  heroDesc: string;
  rows: ComparisonRow[];
  argumentTitle: string;
  argumentDesc: string;
}

export default function ComparisonLayout({
  locale,
  t,
  vsName,
  heroTitle,
  heroDesc,
  rows,
  argumentTitle,
  argumentDesc,
}: ComparisonLayoutProps) {
  const base = `/${locale}`;

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] font-sans pt-[64px] selection:bg-[#C6F24E]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero */}
      <section className="pt-20 sm:pt-32 pb-16 sm:pb-24 px-5 sm:px-8 bg-[#FFFFFF] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C6F24E]/5 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3" />
        <div className="max-w-[1200px] mx-auto relative text-center space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#0A0A0A] rounded-full shadow-md">
            <Shield size={16} className="text-[#C6F24E]" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
              {locale === 'tr' ? `BUAZE VS ${vsName.toUpperCase()}` : `BUAZE VS ${vsName.toUpperCase()}`}
            </span>
          </div>
          <h1 className="text-[34px] sm:text-[72px] font-extrabold leading-[1] sm:leading-[0.95] tracking-tight text-[#0A0A0A] max-w-[900px] mx-auto">
            {heroTitle}
          </h1>
          <p className="text-[17px] sm:text-[22px] text-[#1A1A1A] font-bold leading-relaxed max-w-[700px] mx-auto">
            {heroDesc}
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-white border-y border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-12 sm:mb-16 text-center space-y-4">
               <h2 className="text-[28px] sm:text-[48px] font-extrabold tracking-tight">{t.compare_title}</h2>
               <p className="text-[15px] sm:text-[16px] text-[#1A1A1A] font-bold max-w-2xl mx-auto">{t.compare_subtitle}</p>
          </div>

          <div className="overflow-x-auto touch-pan-x rounded-[24px] sm:rounded-[32px] border sm:border border-[#0A0A0A] shadow-md sm:shadow-md">
            <table className="w-full border-collapse bg-white min-w-[600px] sm:min-w-0">
              <thead>
                <tr className="bg-[#0A0A0A] text-white">
                  <th className="p-4 sm:p-6 text-left text-[11px] sm:text-[14px] font-black uppercase tracking-widest border-r border-white/10">{t.compare_feat_name}</th>
                  <th className="p-4 sm:p-6 text-center text-[12px] sm:text-[16px] font-black uppercase tracking-widest border-r border-white/10 bg-[#C6F24E] text-[#0A0A0A]">{t.compare_buaze}</th>
                  <th className="p-4 sm:p-6 text-center text-[11px] sm:text-[14px] font-black uppercase tracking-widest">{vsName}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#0A0A0A]/5">
                {rows.map((row, i) => (
                  <tr key={i} className={row.isHeader ? 'bg-[#FFFFFF]' : 'hover:bg-[#FFFFFF]/50 transition-colors'}>
                    <td className={`p-4 sm:p-6 border-r-2 border-[#0A0A0A]/5 ${row.isHeader ? 'font-black text-[#1A1A1A] text-[11px] sm:text-[12px] uppercase' : 'font-bold text-[#0A0A0A] text-[14px] sm:text-[16px]'}`}>
                      {row.label}
                    </td>
                    <td className="p-4 sm:p-6 text-center border-r-2 border-[#0A0A0A]/5 bg-[#C6F24E]/5 font-black text-[#0A0A0A]">
                      {row.buaze}
                    </td>
                    <td className="p-4 sm:p-6 text-center font-bold text-[#1A1A1A] text-[14px] sm:text-[16px]">
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Deep Argument Section */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FFFFFF]">
         <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 items-center">
            <div className="space-y-6 sm:space-y-8">
               <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#C6F24E]/10 rounded-2xl border-2 border-[#C6F24E]/20 flex items-center justify-center">
                  <AlertCircle size={28} className="sm:size-8 text-[#C6F24E]" />
               </div>
               <h2 className="text-[30px] sm:text-[54px] font-extrabold leading-[1.1] tracking-tight text-[#0A0A0A]">
                  {argumentTitle}
               </h2>
               <div className="text-[16px] sm:text-[18px] text-[#4a4742] leading-relaxed font-medium space-y-4 sm:space-y-6">
                  {argumentDesc.split('\n').map((p, i) => <p key={i}>{p}</p>)}
               </div>
               <div className="pt-4">
                  <CtaButton variant="primary" href={`${base}/auth/register`} className="w-full sm:w-auto">
                     {locale === 'tr' ? 'Profesyonel İtibara Geçin' : 'Switch to Professional Reputation'}
                  </CtaButton>
               </div>
            </div>
            <div className="relative group">
               <div className="absolute inset-0 bg-[#C6F24E] rounded-[32px] sm:rounded-[40px] rotate-2 scale-105 opacity-20 group-hover:rotate-1 transition-transform" />
               <div className="relative bg-white p-8 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-[#0A0A0A] shadow-md sm:shadow-md space-y-6 sm:space-y-8">
                  <div className="flex items-center gap-4 border-b-2 border-[#EDEDED] pb-6">
                     <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#10b981] rounded-xl flex items-center justify-center text-white">
                        <BarChart3 size={20} className="sm:size-6" />
                     </div>
                     <div>
                        <div className="text-[13px] sm:text-[14px] font-black">{locale === 'tr' ? 'BUAZE ETKİSİ' : 'BUAZE IMPACT'}</div>
                        <div className="text-[10px] sm:text-[11px] font-bold text-[#1A1A1A] uppercase tracking-widest">{locale === 'tr' ? 'Gerçek Zamanlı Veri' : 'Real-time Data'}</div>
                     </div>
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                     {[
                        { label: locale === 'tr' ? 'Geri Bildirim Hızı' : 'Feedback Speed', value: '4dk' },
                        { label: locale === 'tr' ? 'Yorum Dönüşümü' : 'Review Conversion', value: '%68' },
                        { label: locale === 'tr' ? 'Müşteri Kaybı' : 'Churn Rate', value: '-%90' },
                     ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-[#FFFFFF] p-4 rounded-xl border border-[#0A0A0A]/5">
                           <span className="font-bold text-[#1A1A1A] text-[14px] sm:text-[16px]">{item.label}</span>
                           <span className="font-black text-[#0A0A0A] text-[16px] sm:text-[18px]">{item.value}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* NEW: SEO Deep Content (Pain Points & Verdict) */}
      <section className="py-20 sm:py-24 px-5 sm:px-8 bg-white border-t border-[#EDEDED]">
         <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16">
            <div className="space-y-4 sm:space-y-6">
               <h3 className="text-[22px] sm:text-[24px] font-extrabold flex items-center gap-2">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-[14px] sm:text-[16px]">!</span>
                  {t.compare_pain_title}
               </h3>
               <p className="text-[15px] sm:text-[16px] text-[#1A1A1A] font-medium leading-relaxed">
                  {vsName === 'Spreadsheet' ? t.compare_pain_spreadsheet : t.compare_pain_static}
               </p>
            </div>
            <div className="space-y-4 sm:space-y-6 p-6 sm:p-8 bg-[#FFFFFF] rounded-[24px] sm:rounded-[32px] border-2 border-[#0A0A0A] shadow-md sm:shadow-md">
               <h3 className="text-[22px] sm:text-[24px] font-extrabold flex items-center gap-2">
                  <Zap size={22} className="sm:size-6 text-[#C6F24E]" />
                  {t.compare_verdict_title}
               </h3>
               <p className="text-[14px] sm:text-[15px] text-[#0A0A0A] font-bold leading-relaxed">
                  {t.compare_verdict_desc}
               </p>
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 px-5 sm:px-8 bg-[#0A0A0A] text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C6F24E]/5 rounded-full blur-[150px]" />
        <div className="max-w-[800px] mx-auto text-center space-y-8 sm:space-y-10 relative z-10">
          <h2 className="text-[32px] sm:text-[64px] font-extrabold leading-[1.1] sm:leading-[1] tracking-tight">
            {locale === 'tr' ? 'Daha Fazla Beklemeyin' : 'Don\'t Wait Any Longer'}
          </h2>
          <p className="text-[17px] sm:text-[20px] text-white/80 font-medium max-w-[600px] mx-auto">
             {locale === 'tr' ? 'Onlarca işletme gibi siz de manuel süreçleri geride bırakın.' : 'Join dozens of businesses leaving manual processes behind.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4">
            <CtaButton variant="primary" href={`${base}/auth/register`} className="w-full sm:w-auto px-10">
               {locale === 'tr' ? '14 Gün Ücretsiz Deneyin' : 'Start 14-Day Free Trial'}
            </CtaButton>
            <CtaButton variant="secondary" href={`${base}/contact`} className="w-full sm:w-auto px-10">
               {locale === 'tr' ? 'Satış Ekibiyle Görüş' : 'Talk to Sales Team'}
            </CtaButton>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
