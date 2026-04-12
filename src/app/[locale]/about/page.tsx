import type { Metadata } from 'next';
import { Target, Eye, ShieldCheck, Heart, Users, Zap } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Hakkımızda — Buaze' : 'About Us — Buaze',
    description: locale === 'tr'
      ? 'Buaze olarak işletmelerin dijital itibarını yönetmelerine yardımcı olmak için çalışıyoruz. Misyonumuz ve vizyonumuz hakkında bilgi edinin.'
      : 'At Buaze, we help businesses manage their digital reputation. Learn about our mission and vision.',
    alternates: {
      canonical: `https://buaze.com/${locale}/about`,
      languages: {
        'tr': 'https://buaze.com/tr/about',
        'en': 'https://buaze.com/en/about',
      },
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

  const values = [
    { icon: <ShieldCheck />, title: t.about_val1_title, desc: t.about_val1_desc },
    { icon: <Zap />, title: t.about_val2_title, desc: t.about_val2_desc },
    { icon: <Heart />, title: t.about_val3_title, desc: t.about_val3_desc },
    { icon: <Users />, title: t.about_val4_title, desc: t.about_val4_desc },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero Section */}
      <section className="pt-48 pb-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight">
            {t.about_hero_title_1} <br />
            <span className="text-[#FDBF1D]">{t.about_hero_title_2}</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium">
            {t.about_hero_subtitle}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 space-y-6">
            <div className="w-16 h-16 bg-[#FDBF1D]/10 text-[#FDBF1D] rounded-2xl flex items-center justify-center">
              <Target size={32} />
            </div>
            <h2 className="text-3xl font-black">{t.about_mission_title}</h2>
            <p className="text-gray-500 leading-relaxed font-bold">
              {t.about_mission_desc}
            </p>
          </div>

          <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 space-y-6">
            <div className="w-16 h-16 bg-[#79C5D1]/10 text-[#79C5D1] rounded-2xl flex items-center justify-center">
              <Eye size={32} />
            </div>
            <h2 className="text-3xl font-black">{t.about_vision_title}</h2>
            <p className="text-gray-500 leading-relaxed font-bold">
              {t.about_vision_desc}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-[#111827] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black mb-4">{t.about_values_title}</h2>
            <p className="text-gray-400 font-bold">{t.about_values_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, i) => (
              <div key={i} className="space-y-4 p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="text-[#FDBF1D]">{value.icon}</div>
                <h4 className="text-xl font-black">{value.title}</h4>
                <p className="text-gray-400 text-sm font-bold">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#79C5D1]/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
