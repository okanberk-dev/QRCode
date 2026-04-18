import { ShieldCheck, Info, CheckCircle2, ExternalLink, Globe, Lock, UserCheck } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: `${t.google_compliance_page_title} | Buaze`,
    description: t.google_compliance_home_desc,
  };
}

export default async function GoogleCompliancePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  const points = [
    {
      title: t.google_compliance_point1_title,
      desc: t.google_compliance_point1_desc,
      icon: <Lock className="text-[#FDBF1D]" size={24} />,
    },
    {
      title: t.google_compliance_point2_title,
      desc: t.google_compliance_point2_desc,
      icon: <ShieldCheck className="text-[#FDBF1D]" size={24} />,
    },
    {
      title: t.google_compliance_point3_title,
      desc: t.google_compliance_point3_desc,
      icon: <UserCheck className="text-[#FDBF1D]" size={24} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans selection:bg-[#FDBF1D]/30 pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <main className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#FDBF1D] text-[#1f1e1d] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border-2 border-[#1f1e1d] shadow-[3px_4px_0_0_#1f1e1d] mb-4">
              <Globe size={14} />
              {t.google_compliance_badge}
            </div>
            <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-tight">
              {t.google_compliance_page_title}
            </h1>
            <p className="text-[18px] text-[#6b6760] font-medium max-w-[700px] mx-auto">
              {t.google_compliance_page_subtitle}
            </p>
          </div>

          {/* Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {points.map((point, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] space-y-4">
                <div className="w-12 h-12 bg-[#FCFBF7] rounded-xl border-2 border-[#1f1e1d] flex items-center justify-center">
                  {point.icon}
                </div>
                <h3 className="text-xl font-bold">{point.title}</h3>
                <p className="text-sm text-[#6b6760] leading-relaxed">
                  {point.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Policy Section */}
          <div className="bg-[#1f1e1d] text-white p-8 sm:p-12 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_16px_0_0_#FDBF1D] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDBF1D]/10 blur-[80px] rounded-full -mr-32 -mt-32" />
             
             <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 text-[#FDBF1D] text-[12px] font-black uppercase tracking-widest">
                  <Info size={16} />
                  {locale === 'tr' ? 'POLİTİKA BİLGİSİ' : 'POLICY INFORMATION'}
                </div>
                <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight">
                  {t.google_compliance_policy_title}
                </h2>
                <p className="text-[#ada89f] text-[16px] leading-relaxed">
                  {t.google_compliance_policy_desc}
                </p>
                
                <div className="pt-4">
                  <Link 
                    href="https://support.google.com/contributionpolicy/answer/7400114?hl=en" 
                    target="_blank"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FDBF1D] text-[#1f1e1d] font-black text-[14px] rounded-lg border-2 border-[#1f1e1d] shadow-[4px_4px_0_0_#fff] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#fff] transition-all"
                  >
                    {t.google_compliance_link_text}
                    <ExternalLink size={16} />
                  </Link>
                </div>
             </div>
          </div>

          {/* Extra Commitment */}
          <div className="mt-20 text-center space-y-6 border-t border-[#e8e4de] pt-16">
             <div className="flex justify-center gap-2 text-[#FDBF1D]">
                {[1,2,3,4,5].map(i => <CheckCircle2 key={i} size={20} fill="#FDBF1D" strokeWidth={0} />)}
             </div>
             <p className="text-[14px] text-[#ada89f] font-medium max-w-[600px] mx-auto italic">
                {locale === 'tr' 
                  ? '"İşletmenizin başarısı, müşterilerinizle kurduğunuz gerçek ve güvene dayalı bağdadır. Buaze olarak bu bağı teknolojiyle korumayı taahhüt ediyoruz."'
                  : '"Your business success lies in the genuine and trust-based bond you build with your customers. As Buaze, we commit to protecting this bond through technology."'}
             </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
