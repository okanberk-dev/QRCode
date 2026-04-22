import type { Metadata } from 'next';
import { BadgeCheck, BarChart3, TrendingUp, Users, ArrowRight, Quote, Zap, Building2, MapPin } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';

export const dynamic = 'force-dynamic';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import Image from 'next/image';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: t.pl_case_hero_title + ' | Buaze',
    description: t.pl_case_hero_desc,
    alternates: {
      canonical: `https://buaze.com/${locale}/case-study/pizza-locale`,
      languages: { 'tr': 'https://buaze.com/tr/case-study/pizza-locale', 'en': 'https://buaze.com/en/case-study/pizza-locale' },
    },
  };
}

export default async function PizzaLocaleCaseStudy({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const metrics = [
    { 
      icon: <TrendingUp size={24} className="text-[#FF9A14]" />, 
      value: '+420%', 
      label: t.pl_case_metric_growth_label,
      desc: locale === 'tr' ? '90 gün sonunda geri bildirim artışı' : 'Feedback increase after 90 days'
    },
    { 
      icon: <Zap size={24} className="text-[#FF9A14]" />, 
      value: '4 dk', 
      label: t.pl_case_metric_speed_label,
      desc: locale === 'tr' ? 'Operasyonel yanıt hızı' : 'Operational response speed'
    },
    { 
      icon: <Building2 size={24} className="text-[#6366f1]" />, 
      value: '12', 
      label: t.pl_case_metric_locations_label,
      desc: locale === 'tr' ? 'Aktif yönetilen şube sayısı' : 'Active managed branches'
    },
    { 
      icon: <Users size={24} className="text-[#10b981]" />, 
      value: '4.8', 
      label: 'Google Rating',
      desc: locale === 'tr' ? 'Genel puan ortalaması' : 'Global rating average'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#0F2348] font-sans pt-[64px] selection:bg-[#FF9A14]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero Section ─── */}
      <section className="relative pt-20 pb-20 sm:pb-32 overflow-hidden bg-[#0F2348] text-white">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF9A14]/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF9A14]/5 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
        
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 max-w-[900px] mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9A14] text-[#0F2348] rounded-full border-2 border-[#0F2348] shadow-[3px_3px_0_0_#FF9A14] sm:shadow-[4px_4px_0_0_#FF9A14]">
                <BadgeCheck size={16} className="sm:size-[18px]" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em]">{t.pl_case_hero_badge}</span>
            </div>
            <h1 className="text-[32px] sm:text-[64px] font-black leading-[1.1] sm:leading-[1.05] tracking-tight">
                {t.pl_case_hero_title}
            </h1>
            <p className="text-[17px] sm:text-[22px] text-[#6B7B93] font-medium leading-relaxed max-w-[700px]">
                {t.pl_case_hero_desc}
            </p>
            <div className="flex items-center gap-2 text-[#FF9A14] font-black uppercase tracking-widest text-[11px] sm:text-[13px]">
                <MapPin size={14} className="sm:size-[16px]" />
                {locale === 'tr' ? 'İzmir • İstanbul • Ankara • Bursa' : 'London • New York • Berlin • Paris'}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics Bar ─── */}
      <section className="relative -mt-10 sm:-mt-16 px-5 sm:px-8">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white p-5 sm:p-8 rounded-2xl border-[2.5px] sm:border-[3px] border-[#0F2348] shadow-[4px_6px_0_0_#FF9A14] sm:shadow-[8px_10px_0_0_#FF9A14] hover:-translate-y-2 transition-transform h-full">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#F5F4F1] border-2 border-[#0F2348]/10 flex items-center justify-center">
                   <div className="scale-90 sm:scale-100">{m.icon}</div>
                </div>
              </div>
              <div className="text-[28px] sm:text-[42px] font-black text-[#0F2348] leading-none mb-1 sm:mb-2">{m.value}</div>
              <div className="text-[11px] sm:text-[14px] font-black text-[#0F2348] uppercase tracking-wide mb-1 line-clamp-1">{m.label}</div>
              <div className="text-[10px] sm:text-[12px] text-[#243554] font-medium leading-tight">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── The Story ─── */}
      <section className="py-16 sm:py-32 px-5 sm:px-8">
        <div className="max-w-[900px] mx-auto space-y-16 sm:space-y-24">
          {/* Challenge */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-start text-center md:text-left">
            <div className="md:col-span-4 self-center mx-auto md:mx-0 w-48 sm:w-full">
                <div className="w-full aspect-square bg-[#FF9A14]/10 rounded-[32px] border-2 border-[#0F2348] flex items-center justify-center p-8 sm:p-10">
                    <Building2 size={80} className="sm:size-[120px] text-[#0F2348] opacity-20" />
                </div>
            </div>
            <div className="md:col-span-8 space-y-4 sm:space-y-6">
                <h2 className="text-[28px] sm:text-[42px] font-black tracking-tight leading-tight">{t.pl_case_challenge_title}</h2>
                <div className="text-[16px] sm:text-[19px] text-[#4a4742] leading-relaxed font-medium space-y-4">
                    <p>{t.pl_case_challenge_desc}</p>
                    <p>
                        {locale === 'tr' 
                          ? 'Hamurundaki kaliteyi tüm şubelerinde standardize eden Pizza Locale, dijitaldeki "sessiz çoğunluğu" harekete geçirmek ve her lokasyondaki operasyonel detayı merkezi bir panelden izlemek istiyordu.'
                          : 'Standardizing its quality across all branches, Pizza Locale wanted to activate the "silent majority" in the digital space and monitor operational details at every location from a centralized panel.'}
                    </p>
                </div>
            </div>
          </div>

          <div className="h-[2px] bg-[#C9D0DB]/50 w-full" />

          {/* Solution */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-start text-center md:text-left">
            <div className="md:col-span-8 order-2 md:order-1 space-y-4 sm:space-y-6">
                <h2 className="text-[28px] sm:text-[42px] font-black tracking-tight leading-tight">{t.pl_case_solution_title}</h2>
                <div className="text-[16px] sm:text-[19px] text-[#4a4742] leading-relaxed font-medium space-y-4">
                    <p>{t.pl_case_solution_desc}</p>
                    <p>
                        {locale === 'tr'
                          ? 'Dinamik QR altyapımız ile her şube için özelleştirilmiş, garson ve masayı bile takip edebilen bir yapı kuruldu. Geri bildirimler sadece Google\'a yönlendirilmekle kalmadı; şube yöneticilerine anlık Telegram ve Email bildirimleri olarak düştü.'
                          : 'With our dynamic QR infrastructure, a structure customized for each branch was established, even tracking waitstaff and tables. Feedback was not only directed to Google; it also fell to branch managers as instant Telegram and Email notifications.'}
                    </p>
                </div>
            </div>
            <div className="md:col-span-4 order-1 md:order-2 self-center mx-auto md:mx-0 w-48 sm:w-full">
                <div className="w-full aspect-square bg-[#FF9A14]/10 rounded-[32px] border-2 border-[#0F2348] flex items-center justify-center p-8 sm:p-10">
                    <Zap size={80} className="sm:size-[120px] text-[#FF9A14] opacity-20" />
                </div>
            </div>
          </div>

          <div className="h-[2px] bg-[#C9D0DB]/50 w-full" />

          {/* Result */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-start text-center md:text-left">
            <div className="md:col-span-4 self-center mx-auto md:mx-0 w-48 sm:w-full">
                <div className="w-full aspect-square bg-[#10b981]/10 rounded-[32px] border-2 border-[#0F2348] flex items-center justify-center p-8 sm:p-10">
                    <BarChart3 size={80} className="sm:size-[120px] text-[#10b981] opacity-20" />
                </div>
            </div>
            <div className="md:col-span-8 space-y-4 sm:space-y-6">
                <h2 className="text-[28px] sm:text-[42px] font-black tracking-tight leading-tight">{t.pl_case_results_title}</h2>
                <div className="text-[16px] sm:text-[19px] text-[#4a4742] leading-relaxed font-medium space-y-4">
                    <p>{t.pl_case_results_desc}</p>
                    <p>
                        {locale === 'tr'
                          ? 'Yıllık bazda toplanan geri bildirim sayısı 5 katına çıkarken, Google Haritalar üzerindeki görünürlük %300 oranında arttı. En önemlisi, Pizza Locale yönetimi mutfak ve servis arasındaki dengeyi veriye dayalı olarak yönetmeye başladı.'
                          : 'While the number of feedbacks collected annually increased fivefold, visibility on Google Maps increased by 300%. Most importantly, Pizza Locale management began managing the balance between the kitchen and service based on data.'}
                    </p>
                </div>
            </div>
          </div>

          <div className="h-[2px] bg-[#C9D0DB]/50 w-full" />

          {/* Before & After Comparison */}
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-[24px] sm:text-[36px] font-black tracking-tight uppercase">
                {locale === 'tr' ? 'Dönüşüm Özeti' : 'Transformation Summary'}
              </h2>
              <p className="text-[15px] sm:text-[16px] text-[#243554] font-bold">{locale === 'tr' ? 'Manuel süreçlerden profesyonel operasyona geçiş.' : 'Transition from manual processes to professional operations.'}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {/* Before */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border-[2.5px] sm:border-[3px] border-[#C9D0DB] space-y-6 opacity-60">
                <div className="flex items-center gap-3 text-[#6B7B93]">
                   <div className="w-8 h-8 rounded-full bg-[#6B7B93]/20 flex items-center justify-center font-black text-[14px]">1</div>
                   <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest">{locale === 'tr' ? 'BUAZE ÖNCESİ' : 'BEFORE BUAZE'}</span>
                </div>
                <ul className="space-y-4">
                  {[
                    locale === 'tr' ? 'Masalarda işlevsiz, statik QR kodlar' : 'Static, dysfunctional QR codes on tables',
                    locale === 'tr' ? 'Negatif yorumların Google\'a doğrudan sızması' : 'Negative reviews leaking directly to Google',
                    locale === 'tr' ? 'Mutfak-servis performansında veri eksikliği' : 'Lack of data in kitchen-service performance',
                    locale === 'tr' ? 'Haftalık 10-15 parça rastgele geri bildirim' : '10-15 random feedbacks per week',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2 text-[14px] font-medium text-[#243554]">
                      <span className="text-red-500 mt-0.5">✕</span> {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* After */}
              <div className="bg-[#0F2348] p-7 sm:p-8 rounded-2xl border-[2.5px] sm:border-[3px] border-[#FF9A14] shadow-[6px_8px_0_0_#FF9A14] sm:shadow-[8px_10px_0_0_#FF9A14] space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 sm:opacity-10 pointer-events-none">
                   <Zap size={80} className="sm:size-[100px] text-[#FF9A14]" />
                </div>
                <div className="flex items-center gap-3 text-[#FF9A14] relative z-10">
                   <div className="w-8 h-8 rounded-full bg-[#FF9A14] text-[#0F2348] flex items-center justify-center font-black text-[14px]">2</div>
                   <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest">{locale === 'tr' ? 'BUAZE SONRASI' : 'AFTER BUAZE'}</span>
                </div>
                <ul className="space-y-4 relative z-10">
                  {[
                    locale === 'tr' ? 'Dinamik, şube-masa takipli akıllı QR' : 'Dynamic, location-tracked smart QRs',
                    locale === 'tr' ? 'Negatiflerin anında yönetime iletilmesi' : 'Instant routing of negative feedback',
                    locale === 'tr' ? 'Müdür panelinde şeffaf performans verisi' : 'Transparent performance data for managers',
                    locale === 'tr' ? 'Günlük 50+ doğrulanmış müşteri görüşü' : '50+ verified customer insights daily',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2 text-[14px] font-bold text-white">
                      <BadgeCheck size={18} className="text-[#FF9A14] flex-shrink-0" /> {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="h-[2px] bg-[#C9D0DB]/50 w-full" />

          {/* Scaling Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-[28px] sm:text-[42px] font-black tracking-tight leading-tight">
                {locale === 'tr' ? '1\'den 12 Şubeye: Büyüme Rehberi' : '1 to 12 Branches: The Scaling Blueprint'}
              </h2>
              <div className="text-[16px] sm:text-[17px] text-[#4a4742] leading-relaxed font-medium space-y-4">
                <p>
                  {locale === 'tr'
                    ? 'Pizza Locale, Buaze\'yi sadece bir yorum toplama aracı olarak değil, bir kalite kontrol sistemi olarak kullandı. Her yeni açılan şubede Buaze entegrasyonu "açılış paketi"nin ayrılmaz bir parçası oldu.'
                    : 'Pizza Locale used Buaze not just as a feedback tool, but as a quality control system. In every new branch opened, Buaze integration became an inseparable part of the "opening package."'}
                </p>
                <p>
                  {locale === 'tr'
                    ? 'Merkezi yönetim, tüm şubelerin haftalık memnuniyet skorlarını yan yana getirerek "Haftalık Servis Raporu" oluşturdu. Bu sayede operasyonel zayıflıklar gün yüzüne çıkarıldı ve şubeler arası tatlı bir rekabet oluştu.'
                    : 'Central management generated a "Weekly Service Report" by comparing the satisfaction scores of all branches. This way, operational weaknesses were brought to light, creating a healthy competition between branches.'}
                </p>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
               <div className="bg-white p-6 rounded-[32px] border-[2.5px] border-[#0F2348] shadow-[8px_10px_0_0_#0F2348]">
                  <div className="text-[10px] font-black text-[#6B7B93] uppercase tracking-widest mb-4">{locale === 'tr' ? 'ZİNCİR YÖNETİMİ' : 'CHAIN MANAGEMENT'}</div>
                  <div className="space-y-4">
                     {[
                       { name: locale === 'tr' ? 'Çeşme' : 'Downtown', score: '4.9', width: '98%' },
                       { name: locale === 'tr' ? 'Alsancak' : 'Metropolitan', score: '4.8', width: '94%' },
                       { name: locale === 'tr' ? 'Bağdat Cad.' : 'Waterfront', score: '4.7', width: '88%' },
                       { name: locale === 'tr' ? 'Bursa' : 'Uptown', score: '4.9', width: '96%' },
                     ].map((item, i) => (
                       <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-[13px] font-black">
                             <span>{item.name}</span>
                             <span className="text-[#FF9A14]">{item.score} ★</span>
                          </div>
                          <div className="h-2 bg-[#F5F4F1] rounded-full overflow-hidden border border-[#0F2348]/5">
                             <div className="h-full bg-[#10b981]" style={{ width: item.width }} />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Quote Section ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#0F2348]">
        <div className="max-w-[1000px] mx-auto text-center space-y-10 sm:space-y-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF9A14] border-[3px] border-[#0F2348] shadow-[6px_6px_0_0_#FF9A14] sm:shadow-[8px_8px_0_0_#FF9A14]">
                <Quote size={28} className="sm:size-32 text-[#0F2348] translate-x-0.5" fill="currentColor" />
            </div>
            <p className="text-[22px] sm:text-[42px] font-black text-white leading-tight italic">
                {locale === 'tr'
                  ? '"Buaze ile dijital itibarımızı yönetmek, artık bir iş yükü değil, büyümemizi sağlayan bir yakıt haline geldi. 12 şubemizde de aynı kaliteyi ölçebiliyoruz."'
                  : '"Managing our digital reputation with Buaze is no longer a chore; it has become the fuel that drives our growth. We can measure the same quality across all 12 branches."'}
            </p>
            <div className="space-y-2">
                <div className="w-16 h-1 bg-[#FF9A14] mx-auto" />
                <p className="text-[14px] sm:text-[16px] font-black text-[#6B7B93] uppercase tracking-widest leading-relaxed">
                  {locale === 'tr' ? 'Bölge Sorumlusu, Pizza Locale' : 'Regional Manager, Pizza Locale'}
                </p>
            </div>
        </div>
      </section>

      {/* NEW: Operational Deep Dive (Regional Manager Insight) */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white overflow-hidden">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20 items-center">
            <div className="relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#FF9A14]/10 rounded-full blur-3xl" />
                <div className="relative space-y-6 sm:space-y-8">
                    <h2 className="text-[30px] sm:text-[54px] font-black tracking-tight leading-[1.1] text-[#0F2348]">
                        {locale === 'tr' ? 'Bölge Sorumlusunun Gözünden Operasyon' : 'Operations Through the Regional Manager\'s Eyes'}
                    </h2>
                    <div className="space-y-6 text-[16px] sm:text-[18px] text-[#4a4742] leading-relaxed font-medium">
                        <p>
                            {locale === 'tr'
                              ? 'Pizza Locale bölge sorumlusu için her sabah Buaze paneliyle başlıyor. 12 farklı lokasyondaki operasyonel nabız, tek bir ekrandan izlenebiliyor.'
                              : 'For the Pizza Locale regional manager, every morning starts with the Buaze dashboard. The operational pulse across 12 different locations can be monitored from a single screen.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4">
                            <div className="p-6 bg-[#F5F4F1] rounded-xl sm:rounded-2xl border-2 border-[#0F2348]/5">
                                <Users size={22} className="sm:size-24 text-[#FF9A14] mb-3 sm:mb-4" />
                                <h4 className="font-black text-[15px] sm:text-[16px] mb-2">{locale === 'tr' ? 'Personel Takibi' : 'Staff Tracking'}</h4>
                                <p className="text-[13px] sm:text-[14px] text-[#243554]">{locale === 'tr' ? 'Hangi garsonun daha fazla pozitif geri bildirim aldığını anlık görün.' : 'See instantly which waiter receives more positive feedback.'}</p>
                            </div>
                            <div className="p-6 bg-[#F5F4F1] rounded-xl sm:rounded-2xl border-2 border-[#0F2348]/5">
                                <MapPin size={22} className="sm:size-24 text-[#10b981] mb-3 sm:mb-4" />
                                <h4 className="font-black text-[15px] sm:text-[16px] mb-2">{locale === 'tr' ? 'Kritik Müdahale' : 'Critical Intervention'}</h4>
                                <p className="text-[13px] sm:text-[14px] text-[#243554]">{locale === 'tr' ? 'Olumsuz geri bildirimler doğrudan cep telefonuna saniyeler içinde düşer.' : 'Negative feedback hits the mobile phone directly within seconds.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative">
                <div className="bg-[#0F2348] rounded-[32px] sm:rounded-[48px] p-8 sm:p-10 text-white border-[3px] sm:border-[4px] border-[#0F2348] shadow-[10px_12px_0_0_#FF9A14] sm:shadow-[20px_24px_0_0_#FF9A14]">
                    <div className="space-y-6 sm:space-y-8">
                        <div className="flex justify-between items-center border-b border-white/10 pb-5 sm:pb-6">
                            <span className="text-[10px] sm:text-[12px] font-black uppercase tracking-widest text-[#FF9A14]">{locale === 'tr' ? 'CANLI OPERASYON AKIŞI' : 'LIVE OPERATIONAL FLOW'}</span>
                            <span className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-green-400">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {locale === 'tr' ? 'AKTİF' : 'ACTIVE'}
                            </span>
                        </div>
                        <div className="space-y-5 sm:space-y-6">
                            {[
                                { time: '12:42', msg: locale === 'tr' ? 'Alsancak Şubesi: Yeni 5 Yıldız' : 'Metropolitan Branch: New 5 Stars', color: 'text-green-400' },
                                { time: '12:45', msg: locale === 'tr' ? 'Bursa Şubesi: Operasyonel Geri Bildirim' : 'Uptown Branch: Operational Feedback', color: 'text-[#FF9A14]' },
                                { time: '12:50', msg: locale === 'tr' ? 'Çeşme Şubesi: Google Maps Yönlendirme' : 'Downtown Branch: Google Maps Routing', color: 'text-green-400' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 sm:gap-4 text-[13px] sm:text-[14px]">
                                    <span className="text-[#6B7B93] font-mono">{item.time}</span>
                                    <span className={`font-bold ${item.color}`}>{item.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* NEW: Scaling Roadmap (1 to 12) */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#F5F4F1]">
        <div className="max-w-[1000px] mx-auto space-y-16 sm:space-y-20">
            <div className="text-center space-y-4">
                <h2 className="text-[30px] sm:text-[54px] font-black tracking-tight leading-none text-[#0F2348]">
                    {locale === 'tr' ? '1\'den 12\'ye Büyüme Yol Haritası' : 'Roadmap from 1 to 12 Branches'}
                </h2>
                <p className="text-[16px] sm:text-[18px] text-[#243554] font-bold">{locale === 'tr' ? 'Pizza Locale, Buaze ile her adımını ölçeklendirdi.' : 'Pizza Locale scaled every step with Buaze.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {[
                    { 
                        step: '01', 
                        title: locale === 'tr' ? 'Pilot Başlangıç' : 'Pilot Launch', 
                        desc: locale === 'tr' ? 'İlk şubede dijital itibar test edildi, manuel süreçler terk edildi.' : 'Digital reputation tested in the first branch, manual processes abandoned.' 
                    },
                    { 
                        step: '02', 
                        title: locale === 'tr' ? 'Standardizasyon' : 'Standardization', 
                        desc: locale === 'tr' ? 'Geri bildirim akışı "açılış paketi" standardı haline getirildi.' : 'Feedback flow became an "opening package" standard.' 
                    },
                    { 
                        step: '03', 
                        title: locale === 'tr' ? 'Zincir Yönetimi' : 'Chain Management', 
                        desc: locale === 'tr' ? '12 lokasyondan gelen verilerle marka kalitesi zirveye taşındı.' : 'Brand quality peak with data from 12 locations.' 
                    },
                ].map((item, i) => (
                    <div key={i} className="p-8 bg-white rounded-[32px] border-[2.5px] sm:border-[3px] border-[#0F2348] shadow-[6px_8px_0_0_#0F2348] sm:shadow-[8px_10px_0_0_#0F2348] relative group">
                        <div className="text-[40px] sm:text-[48px] font-black text-[#FF9A14]/20 absolute top-4 right-8 group-hover:text-[#FF9A14]/20 transition-colors">{item.step}</div>
                        <h4 className="text-[18px] sm:text-[20px] font-black mb-3 relative z-10">{item.title}</h4>
                        <p className="text-[14px] sm:text-[15px] text-[#243554] font-medium leading-relaxed relative z-10">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* ─── Dashboard Preview Mockup ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white">
        <div className="max-w-[1100px] mx-auto space-y-12 sm:space-y-16 text-center">
            <div className="space-y-4">
                <h2 className="text-[28px] sm:text-[54px] font-black tracking-tight leading-tight">
                    {locale === 'tr' ? 'Veriyle Yönetin, Güvenle Büyüyün' : 'Manage with Data, Grow with Confidence'}
                </h2>
                <p className="text-[15px] sm:text-[18px] text-[#243554] font-bold max-w-[600px] mx-auto">
                    {locale === 'tr' ? 'Siz de Pizza Locale gibi şeffaf bir geri bildirim ekosistemi kurabilirsiniz.' : 'You too can establish a transparent feedback ecosystem like Pizza Locale.'}
                </p>
            </div>
            
            <div className="relative bg-white rounded-[32px] sm:rounded-[48px] border-[3px] sm:border-[4px] border-[#0F2348] p-3 sm:p-5 shadow-[12px_16px_0_0_#FF9A14] sm:shadow-[20px_24px_0_0_#FF9A14] overflow-hidden">
                {/* Real-style Dashboard Mockup Container */}
                <div className="aspect-[16/10] bg-[#F5F4F1] rounded-[24px] sm:rounded-[32px] border-2 border-[#0F2348] flex overflow-hidden shadow-inner font-sans">
                   {/* Mini Sidebar */}
                   <div className="hidden sm:flex w-16 lg:w-20 bg-[#0F2348] border-r border-[#0F2348]/20 flex-col items-center py-6 gap-6">
                      <div className="w-10 h-10 rounded-xl bg-[#FF9A14] flex items-center justify-center font-black text-[#0F2348]">B</div>
                      <div className="space-y-4">
                         {[1, 2, 3, 4].map(i => (
                           <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 1 ? 'bg-[#FF9A14]/10 text-[#FF9A14]' : 'text-gray-500'}`}>
                             {i === 1 ? <TrendingUp size={16} /> : <div className="w-4 h-1 bg-current opacity-20 rounded-full" />}
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Main Content Area */}
                   <div className="flex-1 flex flex-col min-w-0">
                      {/* Top Header */}
                      <div className="h-12 sm:h-16 border-b border-[#0F2348]/10 bg-white flex items-center justify-between px-6">
                         <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-[#0F2348]">{locale === 'tr' ? 'CANLI PANEL' : 'LIVE DASHBOARD'}</span>
                         </div>
                         <div className="flex gap-1.5">
                           {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200" />)}
                         </div>
                      </div>

                      {/* Viewport content */}
                      <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-hidden text-left">
                        {/* Welcome */}
                        <div className="space-y-1">
                          <h4 className="text-sm sm:text-xl font-black text-[#0F2348]">{locale === 'tr' ? 'Hoş Geldin, Mert! 👋' : 'Welcome, James! 👋'}</h4>
                          <div className="h-1.5 w-24 bg-[#FF9A14] rounded-full" />
                        </div>

                        {/* Mini Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                           {[
                             { label: 'Total', val: '4.8', color: 'bg-emerald-50 text-emerald-600', icon: '★' },
                             { label: 'New', val: '12', color: 'bg-orange-50 text-orange-600', icon: '◎' },
                             { label: 'Views', val: '420%', color: 'bg-blue-50 text-blue-600', icon: '◈' },
                             { label: 'Active', val: '100%', color: 'bg-purple-50 text-purple-600', icon: '✓' }
                           ].map((s, i) => (
                             <div key={i} className="bg-white p-3 sm:p-4 rounded-xl border border-[#0F2348]/10 shadow-sm flex flex-col gap-1 sm:gap-2">
                               <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${s.color} flex items-center justify-center text-[10px] sm:text-xs font-black`}>{s.icon}</div>
                               <div className="text-sm sm:text-lg font-black text-[#0F2348]">{s.val}</div>
                               <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#6B7B93]">{s.label}</div>
                             </div>
                           ))}
                        </div>

                        {/* Chart Area mockup */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#0F2348]/10 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0F2348] opacity-40">{locale === 'tr' ? 'MEMNUNİYET TRENDİ' : 'SATISFACTION TREND'}</span>
                            <div className="flex gap-2">
                              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                              <div className="w-20 h-2 bg-gray-100 rounded-full" />
                            </div>
                          </div>
                          <div className="h-24 sm:h-32 flex items-end gap-1.5 sm:gap-2 pt-4">
                             {[40, 60, 45, 90, 65, 80, 55, 100, 70, 85, 95, 60].map((h, i) => (
                               <div key={i} className="flex-1 bg-[#0F2348]/5 rounded-t-md relative group">
                                 <div 
                                   className="absolute bottom-0 w-full bg-[#FF9A14] rounded-t-md transition-all group-hover:bg-[#FF9A14]" 
                                   style={{ height: `${h}%` }} 
                                 />
                               </div>
                             ))}
                          </div>
                        </div>

                        {/* Recent Activity List mockup */}
                        <div className="space-y-3">
                           <span className="text-[9px] font-black uppercase tracking-widest text-[#6B7B93]">{locale === 'tr' ? 'SON AKTİVİTELER' : 'RECENT ACTIVITIES'}</span>
                           <div className="space-y-2">
                             {[
                               { name: 'John D.', star: 5, t: '2m ago' },
                               { name: 'Sarah K.', star: 4, t: '5m ago' },
                               { name: 'Mike R.', star: 5, t: '12m ago' }
                             ].map((a, i) => (
                               <div key={i} className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-dashed border-[#0F2348]/10 text-[10px] sm:text-xs font-bold">
                                 <div className="flex items-center gap-3">
                                   <div className="w-6 h-6 rounded-full bg-[#FF9A14] flex items-center justify-center text-[9px] font-black">?</div>
                                   <span className="text-[#0F2348]">{a.name}</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                   <div className="flex text-[#FF9A14]">{'★'.repeat(a.star)}</div>
                                   <span className="text-[#6B7B93] font-medium">{a.t}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
            </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 border-t border-[#C9D0DB]">
        <div className="max-w-[1200px] mx-auto text-center space-y-10 sm:space-y-12">
           <h2 className="text-[32px] sm:text-[56px] font-black tracking-tight leading-[1.1]">
              {locale === 'tr' ? 'Kendi Başarı Hikayenizi Yazmaya Başlayın' : 'Start Writing Your Own Success Story'}
           </h2>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link
                href={`${base}/auth/register`}
                className="w-full sm:w-auto px-10 py-5 bg-[#FF9A14] text-[#0F2348] text-[17px] sm:text-[18px] font-black rounded-2xl border-[3.5px] sm:border-[4px] border-[#0F2348] shadow-[0_6px_0_0_#FF9A14] sm:shadow-[0_8px_0_0_#FF9A14] hover:bg-[#EAB308] transition-all active:translate-y-[6px] sm:active:translate-y-[8px] active:shadow-none uppercase tracking-wider"
              >
                {t.hero_cta}
              </Link>
              <Link
                href={`${base}/contact`}
                className="group flex items-center gap-2 text-[15px] font-black text-[#243554] hover:text-[#0F2348] transition-colors"
              >
                <span>{locale === 'tr' ? 'Satış Ekibiyle Görüş' : 'Talk to Sales Team'}</span>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
           </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
