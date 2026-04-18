import { TrendingUp, BarChart3, Users2, Zap, ArrowRight, Quote } from 'lucide-react';
import type { Locale, Translations } from '@/lib/translations';

interface CaseStudiesProps {
  locale: Locale;
  t: Translations;
}

export default function CaseStudies({ locale, t }: CaseStudiesProps) {
  const cases = [
    {
      title: t.case_growth_title,
      metric: t.case_growth_metric,
      desc: t.case_growth_desc,
      icon: <TrendingUp size={24} className="text-[#ea580c]" />,
      color: 'bg-[#ea580c]/5',
      borderColor: 'border-[#ea580c]/20',
    },
    {
      title: t.case_conv_title,
      metric: t.case_conv_metric,
      desc: t.case_conv_desc,
      icon: <Zap size={24} className="text-[#FDBF1D]" />,
      color: 'bg-[#FDBF1D]/5',
      borderColor: 'border-[#FDBF1D]/20',
    },
    {
      title: t.case_scale_title,
      metric: t.case_scale_metric,
      desc: t.case_scale_desc,
      icon: <Users2 size={24} className="text-[#6366f1]" />,
      color: 'bg-[#6366f1]/5',
      borderColor: 'border-[#6366f1]/20',
    },
    {
      title: t.case_speed_title,
      metric: t.case_speed_metric,
      desc: t.case_speed_desc,
      icon: <BarChart3 size={24} className="text-[#10b981]" />,
      color: 'bg-[#10b981]/5',
      borderColor: 'border-[#10b981]/20',
    },
  ];

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 bg-white overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F7F4F0] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 sm:mb-20">
          <div className="max-w-[600px] space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FCFBF7] border border-[#e8e4de] rounded-full">
              <span className="w-1.5 h-1.5 bg-[#ea580c] rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#6b6760]">
                {locale === 'tr' ? 'BAŞARI HİKAYELERİ' : 'SUCCESS STORIES'}
              </span>
            </div>
            <h2 className="text-[36px] sm:text-[54px] font-black text-[#1f1e1d] leading-[0.95] tracking-[-0.04em]">
              {t.case_study_title.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-[#ea580c]">{t.case_study_title.split(' ').slice(-1)}</span>
            </h2>
            <p className="text-[17px] sm:text-[19px] text-[#6b6760] font-bold leading-relaxed">
              {t.case_study_subtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {cases.map((cs, i) => (
            <div
              key={i}
              className={`group flex flex-col p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] bg-white hover:-translate-y-2 transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-8">
                <div className={`w-12 h-12 ${cs.color} rounded-xl border border-black/5 flex items-center justify-center`}>
                  {cs.icon}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={18} className="text-[#ada89f]" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[42px] sm:text-[48px] font-black text-[#1f1e1d] leading-none tracking-tighter">
                  {cs.metric}
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-[#1f1e1d] leading-tight mb-2">
                    {cs.title}
                  </h3>
                  <p className="text-[13px] text-[#6b6760] font-medium leading-relaxed mb-4">
                    {cs.desc}
                  </p>
                  {cs.title === t.case_scale_title && (
                    <Link 
                      href={`/${locale}/case-study/pizza-locale`}
                      className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#ea580c] hover:gap-2 transition-all uppercase tracking-wider"
                    >
                      {t.case_learn_more}
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mini Quote Section */}
        <div className="mt-20 pt-16 border-t border-[#e8e4de]">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <Link href={`/${locale}/case-study/pizza-locale`} className="flex-shrink-0 group">
              <div className="w-20 h-20 bg-[#FDBF1D] rounded-full border-2 border-[#1f1e1d] shadow-[4px_4px_0_0_#1f1e1d] flex items-center justify-center group-hover:-translate-y-1 transition-transform">
                <Quote size={32} fill="currentColor" className="text-[#1f1e1d] translate-x-0.5" />
              </div>
            </Link>
            <div className="space-y-6">
              <Link href={`/${locale}/case-study/pizza-locale`} className="block hover:opacity-80 transition-opacity">
                <p className="text-[20px] sm:text-[24px] font-bold text-[#1f1e1d] leading-snug italic italic">
                  {locale === 'tr'
                    ? '"Buaze ile dijital itibarımızı yönetmek, artık bir iş yükü değil, büyümemizi sağlayan bir yakıt haline geldi."'
                    : '"Managing our digital reputation with Buaze is no longer a chore; it has become the fuel that drives our growth."'}
                </p>
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-12 h-0.5 bg-[#ea580c]" />
                <p className="text-[14px] font-black text-[#6b6760] uppercase tracking-widest">
                  {locale === 'tr' ? 'Bölge Sorumlusu, Pizza Locale' : 'Regional Manager, Pizza Locale'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
