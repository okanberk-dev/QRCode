import type { Metadata } from 'next';
import { Target, Eye, ShieldCheck, Heart, Users, Zap } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { cookies } from 'next/headers';

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
  return {
    title: {
      absolute: locale === 'tr' ? 'Hakkımızda | Buaze' : 'About Us | Buaze'
    },
    description: locale === 'tr'
      ? 'Buaze ekibini tanıyın ve işletmelerin dijital itibarını nasıl profesyonelleştirdiğimizi keşfedin.'
      : 'Meet the Buaze team and discover how we professionalize digital reputation for businesses.',
    openGraph: {
      title: locale === 'tr' ? 'Hakkımızda | Buaze' : 'About Us | Buaze',
      description: locale === 'tr' ? 'Buaze ekibini tanıyın...' : 'Meet the Buaze team...',
    },
    alternates: {
      canonical: `https://buaze.com/${locale}/about`,
      languages: { 'tr': 'https://buaze.com/tr/about', 'en': 'https://buaze.com/en/about' },
    },
  };
}


export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const values = [
    { icon: <ShieldCheck size={22} />, title: t.about_val1_title, desc: t.about_val1_desc },
    { icon: <Zap size={22} />, title: t.about_val2_title, desc: t.about_val2_desc },
    { icon: <Heart size={22} />, title: t.about_val3_title, desc: t.about_val3_desc },
    { icon: <Users size={22} />, title: t.about_val4_title, desc: t.about_val4_desc },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Page Header ─── */}
      <section className="pt-20 sm:pt-32 pb-12 sm:pb-14 px-5 sm:px-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FDBF1D]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[4px_4px_0_0_#1f1e1d]">
               <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
               <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{locale === 'tr' ? 'BİZ KİMİZ?' : 'WHO ARE WE?'}</span>
            </div>
            <h1 className="text-[34px] sm:text-[72px] font-black leading-[1] sm:leading-[0.95] tracking-tight text-[#1f1e1d]">
              {t.about_hero_title_1}{' '}
              <span className="text-[#ea580c] block sm:inline">{t.about_hero_title_2}</span>
            </h1>
            <p className="text-[16px] sm:text-[20px] text-[#6b6760] font-bold leading-relaxed max-w-[600px]">
              {t.about_hero_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Mission & Vision (3D Cards) ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#F7F4F0] border-t border-[#e8e4de]">
        <div className="max-w-[1200px] mx-auto text-center mb-16 sm:mb-20">
           <p className="text-[12px] font-black uppercase tracking-widest text-[#ea580c] mb-4">{locale === 'tr' ? 'GELECEĞİ ŞEKİLLENDİRİYORUZ' : 'SHAPING THE FUTURE'}</p>
           <h2 className="text-[34px] sm:text-[56px] font-black text-[#111827] tracking-tight leading-[1.1] sm:leading-none">
              {locale === 'tr' ? 'Amacımız ve Vizyonumuz' : 'Our Purpose & Vision'}
           </h2>
        </div>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {/* Mission */}
          <div className="bg-white p-8 sm:p-14 rounded-[32px] sm:rounded-[40px] border-[2.5px] sm:border-[3px] border-[#1f1e1d] shadow-[8px_10px_0_0_#1f1e1d] sm:shadow-[12px_14px_0_0_#1f1e1d] space-y-6 flex flex-col items-start transition-transform hover:-translate-y-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FDBF1D] border-[2.5px] sm:border-[3px] border-[#1f1e1d] text-[#111827] rounded-2xl flex items-center justify-center shadow-[4px_4px_0_0_#1f1e1d]">
              <Target size={28} className="sm:size-8" strokeWidth={2.5} />
            </div>
            <h2 className="text-[26px] sm:text-[34px] font-black text-[#111827] tracking-tight leading-tight">{t.about_mission_title}</h2>
            <p className="text-[15px] sm:text-[17px] text-[#6b6760] leading-relaxed font-bold">{t.about_mission_desc}</p>
          </div>

          {/* Vision */}
          <div className="bg-[#111827] p-8 sm:p-14 rounded-[32px] sm:rounded-[40px] border-[2.5px] sm:border-[3px] border-[#1f1e1d] shadow-[8px_10px_0_0_#ea580c] sm:shadow-[12px_14px_0_0_#ea580c] space-y-6 flex flex-col items-start transition-transform hover:-translate-y-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#ea580c] border-[2.5px] sm:border-[3px] border-[#1f1e1d] text-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0_0_#000]">
               <Eye size={28} className="sm:size-8" strokeWidth={2.5} />
            </div>
            <h2 className="text-[26px] sm:text-[34px] font-black text-white tracking-tight leading-tight">{t.about_vision_title}</h2>
            <p className="text-[15px] sm:text-[17px] text-[#ada89f] leading-relaxed font-bold">{t.about_vision_desc}</p>
          </div>
        </div>
      </section>

      {/* ─── Values (Enriched 3D Grid) ─── */}
      <section className="py-20 sm:py-40 px-5 sm:px-8 bg-[#1f1e1d] overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FDBF1D]/5 rounded-full blur-[150px] -z-0" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-12 sm:mb-24 space-y-4 text-center sm:text-left">
            <p className="text-[11px] sm:text-[13px] font-black text-[#FDBF1D] uppercase tracking-widest">{locale === 'tr' ? 'TEMEL DEĞERLERİMİZ' : 'OUR CORE VALUES'}</p>
            <h2 className="text-[34px] sm:text-[56px] font-black text-white tracking-tight leading-[1.1] sm:leading-none">{t.about_values_title}</h2>
            <p className="text-[15px] sm:text-[16px] font-bold text-[#ada89f] max-w-[500px] mx-auto sm:mx-0">{t.about_values_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, i) => (
              <div key={i} className="bg-white/5 border-[2.5px] sm:border-[3px] border-[#3d3a36] rounded-[24px] sm:rounded-[32px] p-7 sm:p-10 hover:bg-white/10 hover:border-[#FDBF1D]/50 transition-all group space-y-5 sm:space-y-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FDBF1D] text-[#111827] rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[3px_3px_0_0_#000] sm:shadow-[4px_4px_0_0_#000]">
                  {value.icon}
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-[18px] sm:text-[20px] font-black text-white uppercase tracking-tighter leading-tight">{value.title}</h4>
                  <p className="text-[13px] sm:text-[14px] text-[#ada89f] leading-relaxed font-bold">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white border-[3px] sm:border-[4px] border-[#1f1e1d] rounded-[32px] sm:rounded-[50px] p-8 sm:p-20 shadow-[10px_12px_0_0_#FDBF1D] sm:shadow-[15px_20px_0_0_#FDBF1D] flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-12 text-center md:text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FDBF1D]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
            <div className="space-y-4 sm:space-y-6 relative">
              <h3 className="text-[28px] sm:text-[48px] font-black text-[#111827] tracking-tight leading-[1.1]">
                {locale === 'tr' ? 'Hemen başlayın, ilk 14 gün bizden.' : 'Start today, first 14 days on us.'}
              </h3>
              <p className="text-[16px] sm:text-[19px] text-[#6b6760] font-bold">
                {locale === 'tr' ? 'Kredi kartı gerekmez, 5 dakikada kurulum.' : 'No credit card required, 5-minute setup.'}
              </p>
            </div>
            <Link
              href={`${base}/auth/register`}
              className="w-full sm:w-auto flex-shrink-0 px-10 py-5 sm:py-6 bg-[#111827] text-white text-[17px] sm:text-[18px] font-black rounded-[20px] sm:rounded-[24px] border-[3.5px] sm:border-[4px] border-[#1f1e1d] shadow-[0_6px_0_0_#000] sm:shadow-[0_8px_0_0_#000] hover:bg-[#1f1e1d] transition-all active:translate-y-[6px] sm:active:translate-y-[8px] active:shadow-none uppercase tracking-widest relative z-10"
            >
              {locale === 'tr' ? 'Ücretsiz Dene' : 'Start Free Trial'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
