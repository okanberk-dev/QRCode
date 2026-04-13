import type { Metadata } from 'next';
import { Target, Eye, ShieldCheck, Heart, Users, Zap } from 'lucide-react';
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
  return {
    title: locale === 'tr' ? 'Hakkımızda — Buaze' : 'About Us — Buaze',
    description: locale === 'tr'
      ? 'Buaze olarak işletmelerin dijital itibarını yönetmelerine yardımcı olmak için çalışıyoruz.'
      : 'At Buaze, we help businesses manage their digital reputation.',
    alternates: {
      canonical: `https://buaze.com/${locale}/about`,
      languages: { 'tr': 'https://buaze.com/tr/about', 'en': 'https://buaze.com/en/about' },
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
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
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Page Header */}
      <section className="pt-16 sm:pt-20 pb-14 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[640px]">
            <p className="text-[13px] font-semibold text-[#FDBF1D] uppercase tracking-widest mb-4">
              {locale === 'tr' ? 'Hakkımızda' : 'About Us'}
            </p>
            <h1 className="text-[36px] sm:text-[48px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#1f1e1d] mb-5">
              {t.about_hero_title_1}{' '}
              <span className="text-[#FDBF1D]">{t.about_hero_title_2}</span>
            </h1>
            <p className="text-[16px] text-[#6b6760] leading-relaxed">
              {t.about_hero_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-white overflow-hidden">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative">
             <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#FDBF1D]/10 rounded-full blur-3xl" />
             <div className="bg-[#f0ede8] rounded-[2rem] border-[3px] border-[#1f1e1d] p-4 shadow-[12px_14px_0_0_#1f1e1d] transform -rotate-1">
                <img 
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800" 
                  alt="Team work" 
                  className="rounded-2xl w-full h-[400px] object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-500"
                />
             </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Dijital İtibarı İnsan Odaklı Yapmak' : 'Making Reputation Human-Centric'}
            </h2>
            <div className="space-y-4 text-[15px] sm:text-[16px] text-[#4a4742] leading-relaxed">
              <p>
                {locale === 'tr' 
                  ? 'Buaze, küçük işletme sahiplerinin her gün karşılaştığı büyük bir sorunu çözmek için doğdu: Dijital platformların kaosu içinde boğulmadan gerçek müşteri geri bildirimlerine nasıl ulaşılır?' 
                  : 'Buaze was born to solve a problem that small business owners face every day: How to reach genuine customer feedback without drowning in the chaos of digital platforms?'}
              </p>
              <p>
                {locale === 'tr'
                  ? 'Geleneksel yorum toplama yöntemlerinin yavaş, verimsiz ve çoğu zaman tek taraflı olduğunu fark ettik. Bu yüzden, teknolojiyi (QR kodları ve akıllı algoritmaları) kullanarak işletme ve müşteri arasında köprü kuracak, her iki taraf için de süreci zahmetsiz hale getirecek bir sistem geliştirdik.'
                  : 'We realized that traditional review collection methods were slow, inefficient, and often one-sided. That\'s why we built a system that uses technology to bridge the gap between businesses and customers, making the process effortless for both sides.'}
              </p>
              <div className="pt-4 grid grid-cols-2 gap-8">
                 <div>
                    <div className="text-[32px] font-black text-[#FDBF1D]">500+</div>
                    <div className="text-[12px] font-bold text-[#ada89f] uppercase tracking-widest">{locale === 'tr' ? 'MUTLU İŞLETME' : 'HAPPY BUSINESSES'}</div>
                 </div>
                 <div>
                    <div className="text-[32px] font-black text-[#FDBF1D]">1.2M</div>
                    <div className="text-[12px] font-bold text-[#ada89f] uppercase tracking-widest">{locale === 'tr' ? 'TOPLANAN YORUM' : 'REVIEWS COLLECTED'}</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-14 sm:py-20 px-5 sm:px-8 bg-[#F7F4F0]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mission */}
          <div className="bg-white p-8 sm:p-10 rounded-xl border border-[#e8e4de] space-y-5">
            <div className="w-11 h-11 bg-[#FDBF1D]/10 text-[#1f1e1d] rounded-lg flex items-center justify-center">
              <Target size={22} className="text-[#FDBF1D]" />
            </div>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.01em]">{t.about_mission_title}</h2>
            <p className="text-[14px] sm:text-[15px] text-[#6b6760] leading-relaxed">{t.about_mission_desc}</p>
          </div>

          {/* Vision */}
          <div className="bg-white p-8 sm:p-10 rounded-xl border border-[#e8e4de] space-y-5">
            <div className="w-11 h-11 bg-[#FDBF1D]/10 rounded-lg flex items-center justify-center">
               <Eye size={22} className="text-[#FDBF1D]" />
            </div>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.01em]">{t.about_vision_title}</h2>
            <p className="text-[14px] sm:text-[15px] text-[#6b6760] leading-relaxed">{t.about_vision_desc}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 sm:py-20 px-5 sm:px-8 bg-[#1f1e1d]">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <p className="text-[13px] font-semibold text-[#FDBF1D] uppercase tracking-widest mb-3">{locale === 'tr' ? 'Değerlerimiz' : 'Our Values'}</p>
            <h2 className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-[-0.02em]">{t.about_values_title}</h2>
            <p className="text-[14px] text-[#6b6760] mt-2">{t.about_values_subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value, i) => (
              <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-6 sm:p-7 hover:bg-white/8 transition-colors space-y-4">
                <div className="w-10 h-10 bg-[#FDBF1D]/15 text-[#FDBF1D] rounded-lg flex items-center justify-center">
                  {value.icon}
                </div>
                <h4 className="text-[15px] font-bold text-white">{value.title}</h4>
                <p className="text-[13px] text-[#6b6760] leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-[#F7F4F0] border border-[#e8e4de] rounded-xl p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-[22px] sm:text-[26px] font-extrabold text-[#1f1e1d] tracking-[-0.01em] mb-2">
                {locale === 'tr' ? 'Hemen başlayın, 14 gün ücretsiz.' : 'Get started, free for 14 days.'}
              </h3>
              <p className="text-[14px] text-[#6b6760]">
                {locale === 'tr' ? 'Kredi kartı gerekmez.' : 'No credit card required.'}
              </p>
            </div>
            <Link
              href={`${base}/auth/register`}
              className="flex-shrink-0 px-7 py-3.5 bg-[#FDBF1D] text-[#1f1e1d] text-[15px] font-extrabold rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[4px] active:shadow-none"
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
