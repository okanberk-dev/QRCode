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
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero */}
      <section className="pt-20 sm:pt-32 pb-24 px-5 sm:px-8 bg-[#F7F4F0] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ea580c]/5 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3" />
        <div className="max-w-[1200px] mx-auto relative text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[4px_4px_0_0_#FDBF1D]">
            <Shield size={16} className="text-[#ea580c]" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              {locale === 'tr' ? `BUAZE VS ${vsName.toUpperCase()}` : `BUAZE VS ${vsName.toUpperCase()}`}
            </span>
          </div>
          <h1 className="text-[44px] sm:text-[72px] font-black leading-[0.95] tracking-[-0.04em] text-[#1f1e1d] max-w-[900px] mx-auto">
            {heroTitle}
          </h1>
          <p className="text-[18px] sm:text-[22px] text-[#6b6760] font-bold leading-relaxed max-w-[700px] mx-auto">
            {heroDesc}
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-5 sm:px-8 bg-white border-y border-[#e8e4de]">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-16 text-center space-y-4">
               <h2 className="text-[32px] sm:text-[48px] font-black tracking-tight">{t.compare_title}</h2>
               <p className="text-[#6b6760] font-bold max-w-2xl mx-auto">{t.compare_subtitle}</p>
          </div>

          <div className="overflow-x-auto rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-[#1f1e1d] text-white">
                  <th className="p-6 text-left text-[14px] font-black uppercase tracking-widest border-r border-white/10">{t.compare_feat_name}</th>
                  <th className="p-6 text-center text-[16px] font-black uppercase tracking-widest border-r border-white/10 bg-[#FDBF1D] text-[#1f1e1d]">{t.compare_buaze}</th>
                  <th className="p-6 text-center text-[14px] font-black uppercase tracking-widest">{vsName}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#1f1e1d]/5">
                {rows.map((row, i) => (
                  <tr key={i} className={row.isHeader ? 'bg-[#FCFBF7]' : 'hover:bg-[#FCFBF7]/50 transition-colors'}>
                    <td className={`p-6 border-r-2 border-[#1f1e1d]/5 ${row.isHeader ? 'font-black text-[#6b6760] text-[12px] uppercase' : 'font-bold text-[#1f1e1d]'}`}>
                      {row.label}
                    </td>
                    <td className="p-6 text-center border-r-2 border-[#1f1e1d]/5 bg-[#FDBF1D]/5 font-black text-[#1f1e1d]">
                      {row.buaze}
                    </td>
                    <td className="p-6 text-center font-bold text-[#6b6760]">
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
      <section className="py-32 px-5 sm:px-8 bg-[#FCFBF7]">
         <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
               <div className="w-16 h-16 bg-[#ea580c]/10 rounded-2xl border-2 border-[#ea580c]/20 flex items-center justify-center">
                  <AlertCircle size={32} className="text-[#ea580c]" />
               </div>
               <h2 className="text-[36px] sm:text-[54px] font-black leading-[1] tracking-tight text-[#1f1e1d]">
                  {argumentTitle}
               </h2>
               <div className="text-[18px] text-[#4a4742] leading-relaxed font-medium space-y-6">
                  {argumentDesc.split('\n').map((p, i) => <p key={i}>{p}</p>)}
               </div>
               <div className="pt-4">
                  <CtaButton variant="primary" href={`${base}/auth/register`}>
                     {locale === 'tr' ? 'Profesyonel İtibara Geçin' : 'Switch to Professional Reputation'}
                  </CtaButton>
               </div>
            </div>
            <div className="relative group">
               <div className="absolute inset-0 bg-[#FDBF1D] rounded-[40px] rotate-2 scale-105 opacity-20 group-hover:rotate-1 transition-transform" />
               <div className="relative bg-white p-10 rounded-[40px] border-[3px] border-[#1f1e1d] shadow-[12px_16px_0_0_#1f1e1d] space-y-8">
                  <div className="flex items-center gap-4 border-b-2 border-[#e8e4de] pb-6">
                     <div className="w-12 h-12 bg-[#10b981] rounded-xl flex items-center justify-center text-white">
                        <BarChart3 size={24} />
                     </div>
                     <div>
                        <div className="text-[14px] font-black">{locale === 'tr' ? 'BUAZE ETKİSİ' : 'BUAZE IMPACT'}</div>
                        <div className="text-[11px] font-bold text-[#6b6760] uppercase tracking-widest">{locale === 'tr' ? 'Gerçek Zamanlı Veri' : 'Real-time Data'}</div>
                     </div>
                  </div>
                  <div className="space-y-6">
                     {[
                        { label: locale === 'tr' ? 'Geri Bildirim Hızı' : 'Feedback Speed', value: '4dk' },
                        { label: locale === 'tr' ? 'Yorum Dönüşümü' : 'Review Conversion', value: '%68' },
                        { label: locale === 'tr' ? 'Müşteri Kaybı' : 'Churn Rate', value: '-%90' },
                     ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-[#FCFBF7] p-4 rounded-xl border border-[#1f1e1d]/5">
                           <span className="font-bold text-[#6b6760]">{item.label}</span>
                           <span className="font-black text-[#1f1e1d] text-[18px]">{item.value}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* NEW: SEO Deep Content (Pain Points & Verdict) */}
      <section className="py-24 px-5 sm:px-8 bg-white border-t border-[#e8e4de]">
         <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
               <h3 className="text-[24px] font-black flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-[16px]">!</span>
                  {t.compare_pain_title}
               </h3>
               <p className="text-[#6b6760] font-medium leading-relaxed">
                  {vsName === 'Spreadsheet' ? t.compare_pain_spreadsheet : t.compare_pain_static}
               </p>
            </div>
            <div className="space-y-6 p-8 bg-[#FCFBF7] rounded-[32px] border-2 border-[#1f1e1d] shadow-[6px_8px_0_0_#FDBF1D]">
               <h3 className="text-[24px] font-black flex items-center gap-2">
                  <Zap size={24} className="text-[#ea580c]" />
                  {t.compare_verdict_title}
               </h3>
               <p className="text-[15px] text-[#1f1e1d] font-bold leading-relaxed">
                  {t.compare_verdict_desc}
               </p>
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-5 sm:px-8 bg-[#1f1e1d] text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FDBF1D]/5 rounded-full blur-[150px]" />
        <div className="max-w-[800px] mx-auto text-center space-y-10 relative z-10">
          <h2 className="text-[40px] sm:text-[64px] font-black leading-[1] tracking-tight">
            {locale === 'tr' ? 'Daha Fazla Beklemeyin' : 'Don\'t Wait Any Longer'}
          </h2>
          <p className="text-[20px] text-[#ada89f] font-medium max-w-[600px] mx-auto">
             {locale === 'tr' ? 'Onlarca işletme gibi siz de manuel süreçleri geride bırakın.' : 'Join dozens of businesses leaving manual processes behind.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <CtaButton variant="primary" href={`${base}/auth/register`}>
               {locale === 'tr' ? '14 Gün Ücretsiz Deneyin' : 'Start 14-Day Free Trial'}
            </CtaButton>
            <CtaButton variant="secondary" href={`${base}/contact`}>
               {locale === 'tr' ? 'Satış Ekibiyle Görüş' : 'Talk to Sales Team'}
            </CtaButton>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
